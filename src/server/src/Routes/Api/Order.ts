import express, { Request, Response } from 'express'
import Order from '../../Models/Order.js'
import Product from '../../Models/Product.js'
import User from '../../Models/User.js'
import Review from '../../Models/Review.js'
import Auth from '../../Middleware/Auth.js'
import { ROLES, TRANSACTION_STEP, RATING } from '../../Data/Constants/index.js'
import { check as checkRole } from '../../Middleware/Role.js'
import { checkSellerAccess } from '../../Middleware/SellerPermission.js'

const router = express.Router()

// ==================== TYPES ====================

interface AuthUser {
	_id: string
	email: string
	role: string
	firstName: string
	lastName: string
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create order when auction ends with a winner
 */
const createOrderForProduct = async (
	productId: string,
	buyerId: string,
	sellerId: string,
	finalPrice: number
): Promise<any> => {
	const existingOrder = await Order.findOne({ product: productId }).lean()
	if (existingOrder) {
		return existingOrder
	}

	const order = await Order.create({
		product: productId,
		buyer: buyerId,
		seller: sellerId,
		finalPrice,
		status: TRANSACTION_STEP.AwaitingPayment,
	})

	return order
}

// ==================== ROUTES ====================

/**
 * GET /api/orders/product/:productId
 * Get order details for a product
 * Only accessible by buyer, seller, or admin
 */
router.get('/product/:productId', Auth, async (req: Request, res: Response) => {
	try {
		const productId = req.params.productId as string
		const user = req.user as AuthUser

		// Get product to verify auction ended
		const product = await Product.findById(productId)
			.populate('seller', 'firstName lastName email')
			.populate('highestBidder', 'firstName lastName email')
			.lean()

		if (!product) {
			return res.status(404).json({
				success: false,
				error: 'Sản phẩm không tồn tại.',
			})
		}

		// Check if auction has ended
		if (new Date() < new Date(product.endTime)) {
			return res.status(400).json({
				success: false,
				error: 'Phiên đấu giá chưa kết thúc.',
			})
		}

		// Check if there's a winner
		if (!product.highestBidder) {
			return res.status(400).json({
				success: false,
				error: 'Phiên đấu giá không có người thắng.',
			})
		}

		const sellerId = (product.seller as any)._id.toString()
		const buyerId = (product.highestBidder as any)._id.toString()

		// Check authorization
		const isAuthorized =
			user._id.toString() === sellerId ||
			user._id.toString() === buyerId ||
			user.role === ROLES.Admin

		if (!isAuthorized) {
			return res.status(403).json({
				success: false,
				error: 'Bạn không có quyền xem đơn hàng này.',
			})
		}

		// Get or create order
		let order = await Order.findOne({ product: productId })
			.populate('buyer', 'firstName lastName email address')
			.populate('seller', 'firstName lastName email')
			.populate('product', 'name images currentPrice')
			.lean()

		if (!order) {
			// Create order if doesn't exist
			await createOrderForProduct(
				productId,
				buyerId as string,
				sellerId as string,
				product.currentPrice
			)

			order = await Order.findOne({ product: productId })
				.populate('buyer', 'firstName lastName email address')
				.populate('seller', 'firstName lastName email')
				.populate('product', 'name images currentPrice')
				.lean()
		}

		const isBuyer = user._id.toString() === buyerId
		const isSeller = user._id.toString() === sellerId

		return res.json({
			success: true,
			data: {
				order: {
					_id: order?._id,
					status: order?.status,
					finalPrice: order?.finalPrice,
					shippingAddress: order?.shippingAddress,
					paymentProof: order?.paymentProof,
					paymentSubmittedAt: order?.paymentSubmittedAt,
					shippingInvoice: order?.shippingInvoice,
					sellerConfirmedAt: order?.sellerConfirmedAt,
					buyerConfirmedAt: order?.buyerConfirmedAt,
					buyerRated: order?.buyerRated,
					sellerRated: order?.sellerRated,
					cancelledAt: order?.cancelledAt,
					cancelReason: order?.cancelReason,
					createdAt: order?.createdAt,
				},
				product: {
					_id: (order?.product as any)?._id,
					name: (order?.product as any)?.name,
					image: (order?.product as any)?.images?.[0],
				},
				buyer: {
					_id: (order?.buyer as any)?._id,
					name: `${(order?.buyer as any)?.firstName} ${(order?.buyer as any)?.lastName}`,
					email: (order?.buyer as any)?.email,
					address: (order?.buyer as any)?.address,
				},
				seller: {
					_id: (order?.seller as any)?._id,
					name: `${(order?.seller as any)?.firstName} ${(order?.seller as any)?.lastName}`,
					email: (order?.seller as any)?.email,
				},
				userRole: isBuyer ? 'buyer' : isSeller ? 'seller' : 'admin',
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching order:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy thông tin đơn hàng.',
		})
	}
})

/**
 * PUT /api/orders/:orderId/payment
 * Step 1: Buyer submits payment proof and shipping address
 *
 * Body: { paymentProof, shippingAddress }
 */
router.put('/:orderId/payment', Auth, async (req: Request, res: Response) => {
	try {
		const { orderId } = req.params
		const { paymentProof, shippingAddress } = req.body
		const user = req.user as AuthUser

		// Validate input
		if (!paymentProof || !shippingAddress) {
			return res.status(400).json({
				success: false,
				error: 'paymentProof và shippingAddress là bắt buộc.',
			})
		}

		// Get order
		const order = await Order.findById(orderId)
		if (!order) {
			return res.status(404).json({
				success: false,
				error: 'Đơn hàng không tồn tại.',
			})
		}

		// Check if user is the buyer
		if (order.buyer.toString() !== user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Chỉ người mua mới có thể thực hiện hành động này.',
			})
		}

		// Check current status
		if (order.status !== TRANSACTION_STEP.AwaitingPayment) {
			return res.status(400).json({
				success: false,
				error: `Không thể cập nhật thanh toán ở trạng thái ${order.status}.`,
			})
		}

		// Update order
		order.paymentProof = paymentProof
		order.shippingAddress = shippingAddress
		order.paymentSubmittedAt = new Date()
		order.status = TRANSACTION_STEP.PaymentSubmitted
		await order.save()

		// TODO: Send email notification to seller

		return res.json({
			success: true,
			message: 'Đã gửi thông tin thanh toán thành công.',
			data: {
				status: order.status,
				paymentSubmittedAt: order.paymentSubmittedAt,
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error submitting payment:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể gửi thông tin thanh toán.',
		})
	}
})

/**
 * PUT /api/orders/:orderId/shipping
 * Step 2: Seller confirms payment and provides shipping info
 *
 * Body: { shippingInvoice }
 */
router.put(
	'/:orderId/shipping',
	Auth,
	checkSellerAccess(), // Allow expired sellers to confirm shipping for their orders
	async (req: Request, res: Response) => {
		try {
			const { orderId } = req.params
			const { shippingInvoice } = req.body
			const user = req.user as AuthUser

			// Validate input
			if (!shippingInvoice) {
				return res.status(400).json({
					success: false,
					error: 'shippingInvoice là bắt buộc.',
				})
			}

			// Get order
			const order = await Order.findById(orderId)
			if (!order) {
				return res.status(404).json({
					success: false,
					error: 'Đơn hàng không tồn tại.',
				})
			}

			// Check if user is the seller (or admin)
			if (
				order.seller.toString() !== user._id.toString() &&
				user.role !== ROLES.Admin
			) {
				return res.status(403).json({
					success: false,
					error: 'Chỉ người bán mới có thể thực hiện hành động này.',
				})
			}

			// Check current status
			if (order.status !== TRANSACTION_STEP.PaymentSubmitted) {
				return res.status(400).json({
					success: false,
					error: `Không thể xác nhận giao hàng ở trạng thái ${order.status}.`,
				})
			}

			// Update order
			order.shippingInvoice = shippingInvoice
			order.sellerConfirmedAt = new Date()
			order.status = TRANSACTION_STEP.SellerConfirmed
			await order.save()

			// TODO: Send email notification to buyer

			return res.json({
				success: true,
				message: 'Đã xác nhận giao hàng thành công.',
				data: {
					status: order.status,
					shippingInvoice: order.shippingInvoice,
					sellerConfirmedAt: order.sellerConfirmedAt,
				},
			})
		} catch (error: unknown) {
			console.error('❌ Error confirming shipping:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể xác nhận giao hàng.',
			})
		}
	}
)

/**
 * PUT /api/orders/:orderId/received
 * Step 3: Buyer confirms receipt of item
 */
router.put('/:orderId/received', Auth, async (req: Request, res: Response) => {
	try {
		const { orderId } = req.params
		const user = req.user as AuthUser

		// Get order
		const order = await Order.findById(orderId)
		if (!order) {
			return res.status(404).json({
				success: false,
				error: 'Đơn hàng không tồn tại.',
			})
		}

		// Check if user is the buyer
		if (order.buyer.toString() !== user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Chỉ người mua mới có thể thực hiện hành động này.',
			})
		}

		// Check current status
		if (order.status !== TRANSACTION_STEP.SellerConfirmed) {
			return res.status(400).json({
				success: false,
				error: `Không thể xác nhận nhận hàng ở trạng thái ${order.status}.`,
			})
		}

		// Update order
		order.buyerConfirmedAt = new Date()
		order.status = TRANSACTION_STEP.BuyerConfirmed
		await order.save()

		// Mark product as sold
		await Product.findByIdAndUpdate(order.product, {
			isSold: true,
			winner: order.buyer,
		})

		// TODO: Send email notification to both parties

		return res.json({
			success: true,
			message: 'Đã xác nhận nhận hàng thành công. Vui lòng đánh giá giao dịch.',
			data: {
				status: order.status,
				buyerConfirmedAt: order.buyerConfirmedAt,
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error confirming receipt:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể xác nhận nhận hàng.',
		})
	}
})

/**
 * PUT /api/orders/:orderId/cancel
 * Cancel order (Seller can cancel anytime)
 *
 * Body: { reason }
 */
router.put('/:orderId/cancel', Auth, async (req: Request, res: Response) => {
	try {
		const { orderId } = req.params
		const { reason } = req.body
		const user = req.user as AuthUser

		// Get order
		const order = await Order.findById(orderId)
		if (!order) {
			return res.status(404).json({
				success: false,
				error: 'Đơn hàng không tồn tại.',
			})
		}

		// Check if already completed or cancelled
		if (
			order.status === TRANSACTION_STEP.Completed ||
			order.status === TRANSACTION_STEP.Cancelled
		) {
			return res.status(400).json({
				success: false,
				error: 'Không thể hủy đơn hàng đã hoàn thành hoặc đã hủy.',
			})
		}

		const isSeller = order.seller.toString() === user._id.toString()
		const isBuyer = order.buyer.toString() === user._id.toString()
		const isAdmin = user.role === ROLES.Admin

		// Only seller, buyer, or admin can cancel
		if (!isSeller && !isBuyer && !isAdmin) {
			return res.status(403).json({
				success: false,
				error: 'Bạn không có quyền hủy đơn hàng này.',
			})
		}

		// Update order
		order.status = TRANSACTION_STEP.Cancelled
		order.cancelledBy = user._id as any
		order.cancelReason = reason || 'Không có lý do'
		order.cancelledAt = new Date()
		await order.save()

		// If seller cancels, auto -1 rating to buyer
		if (isSeller) {
			// Check if review already exists
			const existingReview = await Review.findOne({
				product: order.product,
				reviewer: order.seller,
				reviewedUser: order.buyer,
			})

			if (!existingReview) {
				await Review.create({
					product: order.product,
					reviewer: order.seller,
					reviewedUser: order.buyer,
					rating: RATING.Negative,
					comment: reason || 'Người mua không đáp ứng yêu cầu giao dịch',
				})

				// Update buyer's negative reviews count
				await User.findByIdAndUpdate(order.buyer, {
					$inc: { negativeReviews: 1 },
				})

				// Mark seller as rated in order
				order.sellerRated = true
				await order.save()
			}
		}

		// TODO: Send email notification

		return res.json({
			success: true,
			message: 'Đã hủy đơn hàng.',
			data: {
				status: order.status,
				cancelledAt: order.cancelledAt,
				cancelReason: order.cancelReason,
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error cancelling order:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể hủy đơn hàng.',
		})
	}
})

/**
 * POST /api/orders/:orderId/rate
 * Step 4: Rate the other party
 *
 * Body: { rating, comment }
 * rating: 1 (positive) or -1 (negative)
 */
router.post('/:orderId/rate', Auth, async (req: Request, res: Response) => {
	try {
		const { orderId } = req.params
		const { rating, comment } = req.body
		const user = req.user as AuthUser

		// Validate input
		if (
			!rating ||
			(rating !== RATING.Positive && rating !== RATING.Negative)
		) {
			return res.status(400).json({
				success: false,
				error: 'rating phải là 1 (positive) hoặc -1 (negative).',
			})
		}

		if (!comment || comment.trim().length < 5) {
			return res.status(400).json({
				success: false,
				error: 'comment phải có ít nhất 5 ký tự.',
			})
		}

		// Get order
		const order = await Order.findById(orderId)
		if (!order) {
			return res.status(404).json({
				success: false,
				error: 'Đơn hàng không tồn tại.',
			})
		}

		// Check if order is in correct status (at least BuyerConfirmed)
		const allowedStatuses = [
			TRANSACTION_STEP.BuyerConfirmed,
			TRANSACTION_STEP.Completed,
		]
		if (!allowedStatuses.includes(order.status as TRANSACTION_STEP)) {
			return res.status(400).json({
				success: false,
				error: 'Chỉ có thể đánh giá sau khi đã nhận hàng.',
			})
		}

		const isBuyer = order.buyer.toString() === user._id.toString()
		const isSeller = order.seller.toString() === user._id.toString()

		if (!isBuyer && !isSeller) {
			return res.status(403).json({
				success: false,
				error: 'Chỉ người mua và người bán mới có thể đánh giá.',
			})
		}

		// Check if already rated
		if (isBuyer && order.buyerRated) {
			return res.status(400).json({
				success: false,
				error: 'Bạn đã đánh giá giao dịch này rồi.',
			})
		}

		if (isSeller && order.sellerRated) {
			return res.status(400).json({
				success: false,
				error: 'Bạn đã đánh giá giao dịch này rồi.',
			})
		}

		// Determine who is being rated
		const reviewedUserId = isBuyer ? order.seller : order.buyer

		// Check if review already exists
		const existingReview = await Review.findOne({
			product: order.product,
			reviewer: user._id,
			reviewedUser: reviewedUserId,
		})

		if (existingReview) {
			return res.status(400).json({
				success: false,
				error: 'Bạn đã đánh giá người dùng này trong giao dịch này.',
			})
		}

		// Create review
		await Review.create({
			product: order.product,
			reviewer: user._id,
			reviewedUser: reviewedUserId,
			rating,
			comment: comment.trim(),
		})

		// Update reviewed user's rating count
		if (rating === RATING.Positive) {
			await User.findByIdAndUpdate(reviewedUserId, {
				$inc: { positiveReviews: 1 },
			})
		} else {
			await User.findByIdAndUpdate(reviewedUserId, {
				$inc: { negativeReviews: 1 },
			})
		}

		// Update order rating flags
		if (isBuyer) {
			order.buyerRated = true
		} else {
			order.sellerRated = true
		}

		// Check if both have rated -> mark as completed
		if (order.buyerRated && order.sellerRated) {
			order.status = TRANSACTION_STEP.Completed
		}

		await order.save()

		return res.json({
			success: true,
			message: 'Đã đánh giá thành công.',
			data: {
				status: order.status,
				buyerRated: order.buyerRated,
				sellerRated: order.sellerRated,
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error rating order:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể đánh giá.',
		})
	}
})

/**
 * POST /api/orders/:orderId/message
 * Send a message in order chat
 *
 * Body: { content }
 */
router.post('/:orderId/message', Auth, async (req: Request, res: Response) => {
	try {
		const { orderId } = req.params
		const { content } = req.body
		const user = req.user as AuthUser

		if (!content || content.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Nội dung tin nhắn không được để trống.',
			})
		}

		// Get order
		const order = await Order.findById(orderId)
		if (!order) {
			return res.status(404).json({
				success: false,
				error: 'Đơn hàng không tồn tại.',
			})
		}

		// Check if user is buyer or seller
		const isBuyer = order.buyer.toString() === user._id.toString()
		const isSeller = order.seller.toString() === user._id.toString()

		if (!isBuyer && !isSeller) {
			return res.status(403).json({
				success: false,
				error: 'Bạn không có quyền gửi tin nhắn trong đơn hàng này.',
			})
		}

		// Add message
		order.messages.push({
			sender: user._id as any,
			content: content.trim(),
			createdAt: new Date(),
		})

		await order.save()

		return res.json({
			success: true,
			message: 'Đã gửi tin nhắn.',
			data: {
				message: order.messages[order.messages.length - 1],
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error sending message:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể gửi tin nhắn.',
		})
	}
})

/**
 * GET /api/orders/:orderId/messages
 * Get all messages in order chat
 */
router.get('/:orderId/messages', Auth, async (req: Request, res: Response) => {
	try {
		const { orderId } = req.params
		const user = req.user as AuthUser

		// Get order with messages populated
		const order = (await Order.findById(orderId)
			.populate('messages.sender', 'firstName lastName')
			.lean()) as any

		if (!order) {
			return res.status(404).json({
				success: false,
				error: 'Đơn hàng không tồn tại.',
			})
		}

		// Check if user is buyer or seller
		const isBuyer = order.buyer.toString() === user._id.toString()
		const isSeller = order.seller.toString() === user._id.toString()

		if (!isBuyer && !isSeller && user.role !== ROLES.Admin) {
			return res.status(403).json({
				success: false,
				error: 'Bạn không có quyền xem tin nhắn trong đơn hàng này.',
			})
		}

		const messages = (order.messages || []).map((msg: any) => ({
			_id: msg._id,
			senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
			senderId: msg.sender._id,
			content: msg.content,
			createdAt: msg.createdAt,
			isOwn: msg.sender._id.toString() === user._id.toString(),
		}))

		return res.json({
			success: true,
			data: { messages },
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching messages:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy tin nhắn.',
		})
	}
})

/**
 * GET /api/orders/my-orders
 * Get user's orders (as buyer or seller)
 */
router.get('/my-orders', Auth, async (req: Request, res: Response) => {
	try {
		const user = req.user as AuthUser
		const { role = 'all', status, page = 1, limit = 20 } = req.query

		// Build query
		const query: Record<string, unknown> = {}

		if (role === 'buyer') {
			query.buyer = user._id
		} else if (role === 'seller') {
			query.seller = user._id
		} else {
			query.$or = [{ buyer: user._id }, { seller: user._id }]
		}

		if (status) {
			query.status = status
		}

		// Get orders
		const orders = await Order.find(query)
			.populate('product', 'name images currentPrice')
			.populate('buyer', 'firstName lastName')
			.populate('seller', 'firstName lastName')
			.sort({ createdAt: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Order.countDocuments(query)

		const mappedOrders = orders.map((order: any) => ({
			_id: order._id,
			status: order.status,
			finalPrice: order.finalPrice,
			product: {
				_id: order.product._id,
				name: order.product.name,
				image: order.product.images?.[0],
			},
			buyer: {
				_id: order.buyer._id,
				name: `${order.buyer.firstName} ${order.buyer.lastName}`,
			},
			seller: {
				_id: order.seller._id,
				name: `${order.seller.firstName} ${order.seller.lastName}`,
			},
			userRole:
				order.buyer._id.toString() === user._id.toString()
					? 'buyer'
					: 'seller',
			createdAt: order.createdAt,
		}))

		return res.json({
			success: true,
			data: {
				orders: mappedOrders,
				total,
				page: Number(page),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching orders:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy danh sách đơn hàng.',
		})
	}
})

export default router
