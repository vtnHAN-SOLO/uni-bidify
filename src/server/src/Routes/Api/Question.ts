import express, { Request, Response } from 'express'
import Question from '../../Models/Question.js'
import Product from '../../Models/Product.js'
import User from '../../Models/User.js'
import Bid from '../../Models/Bid.js'
import Auth from '../../Middleware/Auth.js'
import { ROLES } from '../../Data/Constants/index.js'
import { check as checkRole } from '../../Middleware/Role.js'
import { checkSellerAccess } from '../../Middleware/SellerPermission.js'
import MailService from '../../Services/MailService/index.js'

const router = express.Router()

// ==================== TYPES ====================

interface AuthUser {
	_id: string
	email: string
	role: string
	firstName: string
	lastName: string
}

interface QuestionDoc {
	_id: { toString: () => string }
	product: { toString: () => string } | ProductDoc
	asker: { toString: () => string } | AskerDoc
	question: string
	answer?: string
	answeredAt?: Date
	createdAt: Date
	updatedAt: Date
}

interface AskerDoc {
	_id: { toString: () => string }
	firstName: string
	lastName: string
}

interface ProductDoc {
	_id: { toString: () => string }
	name: string
	seller: { toString: () => string }
}

// ==================== ROUTES ====================

/**
 * POST /api/questions
 * Ask a question about a product
 *
 * Body: { productId, question }
 */
router.post('/', Auth, async (req: Request, res: Response) => {
	try {
		const { productId, question } = req.body
		const user = req.user as AuthUser

		// Validate input
		if (!productId || !question) {
			return res.status(400).json({
				success: false,
				error: 'productId và question là bắt buộc.',
			})
		}

		if (question.trim().length < 10) {
			return res.status(400).json({
				success: false,
				error: 'Câu hỏi phải có ít nhất 10 ký tự.',
			})
		}

		// Get product
		const product = await Product.findById(productId).lean()
		if (!product) {
			return res.status(404).json({
				success: false,
				error: 'Sản phẩm không tồn tại.',
			})
		}

		// Admin cannot ask questions - view only
		if (user.role === ROLES.Admin) {
			return res.status(403).json({
				success: false,
				error: 'Admin không được phép đặt câu hỏi. Chức năng này chỉ dành cho người mua.',
			})
		}

		// Check if user is the seller (sellers can't ask questions on their own products)
		if (product.seller.toString() === user._id.toString()) {
			return res.status(400).json({
				success: false,
				error: 'Bạn không thể đặt câu hỏi cho sản phẩm của chính mình.',
			})
		}

		// Create question
		const newQuestion = await Question.create({
			product: productId,
			asker: user._id,
			question: question.trim(),
		})

		// Populate asker info for response
		const populatedQuestion = await Question.findById(newQuestion._id)
			.populate('asker', 'firstName lastName')
			.lean()

		// ==================== SEND EMAIL TO SELLER ====================
		try {
			const seller = await User.findById(product.seller).lean()
			if (seller) {
				MailService.sendMail(seller.email, 'question-asked', {
					productName: product.name,
					sellerName: `${seller.firstName} ${seller.lastName}`,
					buyerName: `${user.firstName} ${user.lastName}`,
					question: question.trim(),
				}).catch((err) =>
					console.error('❌ Failed to send question-asked email:', err)
				)
			}
		} catch (emailError) {
			console.error('❌ Error sending question email:', emailError)
		}

		return res.status(201).json({
			success: true,
			message: 'Câu hỏi đã được gửi thành công.',
			data: {
				_id: populatedQuestion?._id,
				question: populatedQuestion?.question,
				askerName: `${(populatedQuestion?.asker as any)?.firstName} ${(populatedQuestion?.asker as any)?.lastName}`,
				createdAt: populatedQuestion?.createdAt,
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error creating question:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể gửi câu hỏi.',
		})
	}
})

/**
 * PUT /api/questions/:id/answer
 * Answer a question (Seller only)
 *
 * Body: { answer }
 */
router.put(
	'/:id/answer',
	Auth,
	checkSellerAccess(), // Allow expired sellers to answer questions on their active products
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params
			const { answer } = req.body
			const user = req.user as AuthUser

			// Validate input
			if (!answer || answer.trim().length < 5) {
				return res.status(400).json({
					success: false,
					error: 'Câu trả lời phải có ít nhất 5 ký tự.',
				})
			}

			// Get question with product info
			const question = await Question.findById(id)
				.populate('product', 'seller name')
				.lean()

			if (!question) {
				return res.status(404).json({
					success: false,
					error: 'Câu hỏi không tồn tại.',
				})
			}

			// Check if already answered
			if (question.answer) {
				return res.status(400).json({
					success: false,
					error: 'Câu hỏi này đã được trả lời.',
				})
			}

			// Check if user is the seller of the product (or admin)
			const product = question.product as any
			if (
				product.seller.toString() !== user._id.toString() &&
				user.role !== ROLES.Admin
			) {
				return res.status(403).json({
					success: false,
					error: 'Chỉ người bán mới có quyền trả lời câu hỏi.',
				})
			}

			// Update question with answer
			const updatedQuestion = await Question.findByIdAndUpdate(
				id,
				{
					answer: answer.trim(),
					answeredAt: new Date(),
				},
				{ new: true }
			)
				.populate('asker', 'firstName lastName email')
				.lean()

			// ==================== SEND EMAIL TO ASKER AND BIDDERS ====================
			try {
				const sellerName = `${user.firstName} ${user.lastName}`

				// 1. Get all unique bidders for this product
				const productBids = await Bid.find({ product: product._id })
					.distinct('bidder')
					.lean()

				// 2. Get all unique askers for this product
				const productQuestions = await Question.find({ product: product._id })
					.distinct('asker')
					.lean()

				// 3. Combine and get unique user IDs (bidders + askers)
				const allUserIds = [...new Set([...productBids.map(String), ...productQuestions.map(String)])]

				// 4. Get user info for all
				const users = await User.find({ _id: { $in: allUserIds } })
					.select('firstName lastName email')
					.lean()

				// 5. Send email to each user
				for (const recipient of users) {
					MailService.sendMail(recipient.email, 'question-answered', {
						productName: product.name,
						recipientName: `${recipient.firstName} ${recipient.lastName}`,
						sellerName,
						question: question.question,
						answer: answer.trim(),
					}).catch((err) =>
						console.error(`❌ Failed to send question-answered email to ${recipient.email}:`, err)
					)
				}

				console.log(`📧 Sent question-answered emails to ${users.length} users`)
			} catch (emailError) {
				console.error('❌ Error sending question-answered emails:', emailError)
			}

			return res.json({
				success: true,
				message: 'Câu trả lời đã được gửi thành công.',
				data: {
					_id: updatedQuestion?._id,
					question: updatedQuestion?.question,
					answer: updatedQuestion?.answer,
					answeredAt: updatedQuestion?.answeredAt,
				},
			})
		} catch (error: unknown) {
			console.error('❌ Error answering question:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể trả lời câu hỏi.',
			})
		}
	}
)

/**
 * GET /api/questions/product/:productId
 * Get all questions for a product
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
	try {
		const { productId } = req.params
		const { page = 1, limit = 20 } = req.query

		// Verify product exists
		const product = await Product.findById(productId).lean()
		if (!product) {
			return res.status(404).json({
				success: false,
				error: 'Sản phẩm không tồn tại.',
			})
		}

		// Get questions
		const questions = await Question.find({ product: productId })
			.populate('asker', 'firstName lastName')
			.sort({ createdAt: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Question.countDocuments({ product: productId })

		// Map questions for response
		const mappedQuestions = (questions as unknown as QuestionDoc[]).map(
			(q) => ({
				_id: q._id.toString(),
				question: q.question,
				answer: q.answer || null,
				askerName: `${(q.asker as AskerDoc).firstName} ${(q.asker as AskerDoc).lastName}`,
				createdAt: q.createdAt,
				answeredAt: q.answeredAt || null,
			})
		)

		return res.json({
			success: true,
			data: {
				questions: mappedQuestions,
				total,
				page: Number(page),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching questions:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy danh sách câu hỏi.',
		})
	}
})

/**
 * GET /api/questions/seller
 * Get all questions for seller's products (for seller to manage)
 */
router.get(
	'/seller',
	Auth,
	checkSellerAccess(), // Allow expired sellers to view questions on their products
	async (req: Request, res: Response) => {
		try {
			const user = req.user as AuthUser
			const { page = 1, limit = 20, answered } = req.query

			// Get all products by this seller
			const sellerProducts = await Product.find({ seller: user._id })
				.select('_id')
				.lean()
			const productIds = (sellerProducts as any[]).map((p: any) => p._id)

			// Build query
			const query: Record<string, unknown> = { product: { $in: productIds } }
			if (answered === 'true') {
				query.answer = { $exists: true, $ne: null }
			} else if (answered === 'false') {
				query.answer = { $exists: false }
			}

			// Get questions
			const questions = await Question.find(query)
				.populate('asker', 'firstName lastName')
				.populate('product', 'name images')
				.sort({ createdAt: -1 })
				.skip((Number(page) - 1) * Number(limit))
				.limit(Number(limit))
				.lean()

			const total = await Question.countDocuments(query)

			return res.json({
				success: true,
				data: {
					questions: questions.map((q: any) => ({
						_id: q._id,
						question: q.question,
						answer: q.answer || null,
						askerName: `${q.asker.firstName} ${q.asker.lastName}`,
						productId: q.product._id,
						productName: q.product.name,
						productImage: q.product.images?.[0],
						createdAt: q.createdAt,
						answeredAt: q.answeredAt || null,
					})),
					total,
					page: Number(page),
					totalPages: Math.ceil(total / Number(limit)),
				},
			})
		} catch (error: unknown) {
			console.error('❌ Error fetching seller questions:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể lấy danh sách câu hỏi.',
			})
		}
	}
)

export default router
