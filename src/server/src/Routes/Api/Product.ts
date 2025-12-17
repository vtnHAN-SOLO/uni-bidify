import express, { Request, Response } from 'express'
import Product from '../../Models/Product.js'
import Category from '../../Models/Category.js'
import Auth from '../../Middleware/Auth.js'
import { ROLES } from '../../Data/Constants/index.js'
import { check as checkRole } from '../../Middleware/Role.js'

const router = express.Router()

export type ProductDTO = {
	_id: string
	name: string
	description: string
	images: string[]
	startPrice: number
	priceStep: number
	currentPrice: number
	buyNowPrice?: number
	endTime: string
	createdAt?: string
	bidCount?: number
	categoryName?: string
	categoryId?: string
	highestBidderName?: string
	isNew?: boolean
	// ✅ ADD: Seller info
	sellerName?: string
	sellerId?: string
	sellerEmail?: string
	sellerRating?: number
	sellerTotalRatings?: number
	// ✅ ADD: Other fields
	startTime?: string
	autoExtend?: boolean
	isSold?: boolean
	updatedAt?: string
}

// Type for document
interface ProductDoc {
	_id: { toString: () => string }
	name: string
	description: string
	images: string[]
	startPrice: number
	priceStep: number
	currentPrice: number
	buyNowPrice?: number
	endTime: Date
	startTime?: Date
	createdAt?: Date
	updatedAt?: Date
	bidCount?: number
	autoExtend?: boolean
	isSold?: boolean
	category?: { _id: { toString: () => string }; name: string }
	seller?: {
		_id: { toString: () => string }
		firstName: string
		lastName: string
		email: string
		positiveReviews: number
		negativeReviews: number
	}
	highestBidder?: { firstName: string; lastName: string }
}

// ✅ HÀM MAP CHUNG (tái sử dụng cho tất cả routes)
const mapDocToDTO = (doc: unknown): ProductDTO => {
	const d = doc as ProductDoc
	// ✅ Calculate seller rating
	const sellerPositiveReviews = d.seller?.positiveReviews || 0
	const sellerNegativeReviews = d.seller?.negativeReviews || 0
	const sellerTotalRatings = sellerPositiveReviews + sellerNegativeReviews
	const sellerRating =
		sellerTotalRatings > 0
			? Math.round((sellerPositiveReviews / sellerTotalRatings) * 100)
			: 0

	return {
		_id: d._id.toString(),
		name: d.name,
		description: d.description,
		images: d.images,
		startPrice: d.startPrice,
		priceStep: d.priceStep,
		currentPrice: d.currentPrice,
		buyNowPrice: d.buyNowPrice,
		endTime: d.endTime.toISOString(),
		startTime: d.startTime ? d.startTime.toISOString() : undefined,
		createdAt: d.createdAt ? d.createdAt.toISOString() : undefined,
		updatedAt: d.updatedAt ? d.updatedAt.toISOString() : undefined,
		bidCount: d.bidCount ?? 0,
		autoExtend: d.autoExtend ?? false,
		isSold: d.isSold ?? false,

		// ✅ Category info
		categoryName: d.category?.name || 'Chưa phân loại',
		categoryId: d.category?._id ? d.category._id.toString() : undefined,

		// ✅ Seller info
		sellerName:
			d.seller?.firstName && d.seller?.lastName
				? `${d.seller.firstName} ${d.seller.lastName}`
				: 'Người bán',
		sellerId: d.seller?._id ? d.seller._id.toString() : undefined,
		sellerEmail: d.seller?.email,
		sellerRating,
		sellerTotalRatings,

		// ✅ Highest bidder info (masked)
		highestBidderName: d.highestBidder?.firstName
			? `****${d.highestBidder.firstName.slice(-3)}`
			: 'Chưa có',

		isNew: false,
	}
}

// GET /api/products/home
router.get('/home', async (req: Request, res: Response) => {
	try {
		const now = new Date()

		const endingSoonDocs = await Product.find({ endTime: { $gt: now } })
			.populate('category', 'name')
			.populate('highestBidder', 'name')
			.sort({ endTime: 1 })
			.limit(5)
			.lean()

		const mostBidsDocs = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'name')
			.sort({ bidCount: -1 })
			.limit(5)
			.lean()

		const highestPriceDocs = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'name')
			.sort({ currentPrice: -1 })
			.limit(5)
			.lean()

		res.json({
			endingSoon: endingSoonDocs.map(mapDocToDTO),
			mostBids: mostBidsDocs.map(mapDocToDTO),
			highestPrice: highestPriceDocs.map(mapDocToDTO),
		})
	} catch (error: unknown) {
		res.status(500).json({ error: String(error) || 'Server error' })
	}
})

// GET /api/products/ending-soon
router.get('/ending-soon', async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query
		const now = new Date()

		const products = await Product.find({ endTime: { $gt: now } })
			.populate('category', 'name')
			.populate('highestBidder', 'name')
			.sort({ endTime: 1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments({ endTime: { $gt: now } })

		res.json({
			products: products.map(mapDocToDTO),
			total,
			page: Number(page),
			totalPages: Math.ceil(total / Number(limit)),
		})
	} catch (error: unknown) {
		res.status(500).json({ error: String(error) || 'Server error' })
	}
})

// GET /api/products/most-bids
router.get('/most-bids', async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query

		const products = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'name')
			.sort({ bidCount: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments()

		res.json({
			products: products.map(mapDocToDTO),
			total,
			page: Number(page),
			totalPages: Math.ceil(total / Number(limit)),
		})
	} catch (error: unknown) {
		res.status(500).json({ error: String(error) || 'Server error' })
	}
})

// GET /api/products/highest-price
router.get('/highest-price', async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query

		const products = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'name')
			.sort({ currentPrice: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments()

		res.json({
			products: products.map(mapDocToDTO),
			total,
			page: Number(page),
			totalPages: Math.ceil(total / Number(limit)),
		})
	} catch (error: unknown) {
		res.status(500).json({ error: String(error) || 'Server error' })
	}
})

// ⚠️ QUAN TRỌNG: Routes với path cụ thể phải đặt trước routes với parameters
// Nếu không, Express sẽ match /:id trước và xem 'by-category-id' là một ID

// GET /api/products/by-category-id/:categoryId - lấy sản phẩm theo categoryId
router.get(
	'/by-category-id/:categoryId',
	async (req: Request, res: Response) => {
		try {
			const { categoryId } = req.params

			if (!categoryId) {
				return res
					.status(400)
					.json({ error: 'Category ID is required.' })
			}

			// Debug log
			console.log('🔍 Fetching products for categoryId:', categoryId)

			// Verify category exists
			const category = await Category.findById(categoryId).lean()
			if (!category) {
				return res.status(404).json({
					error: 'Category not found.',
					categoryId,
				})
			}

			const products = await Product.find({ category: categoryId })
				.populate('category', 'name')
				.populate(
					'seller',
					'firstName lastName email positiveReviews negativeReviews'
				)
				.populate('highestBidder', 'firstName lastName')
				.sort({ endTime: 1 })
				.lean()

			console.log(
				`✅ Found ${products.length} products for category: ${category.name}`
			)

			return res.json({
				products: products.map(mapDocToDTO),
				categoryId,
				categoryName: category.name,
			})
		} catch (error: unknown) {
			console.error('❌ Error fetching products by category ID:', error)
			return res.status(500).json({
				error:
					String(error) || 'Could not fetch products by category ID.',
			})
		}
	}
)

// GET /api/products/by-category/:categoryName

router.get(
	'/by-category/:categoryName',
	async (req: Request, res: Response) => {
		try {
			const { categoryName } = req.params

			if (!categoryName) {
				return res
					.status(400)
					.json({ error: 'Category name is required.' })
			}

			const decodedName = decodeURIComponent(categoryName)

			const category = await Category.findOne({
				name: decodedName,
			}).lean()

			if (!category) {
				return res.status(404).json({
					error: 'Category not found.',
					categoryName: decodedName,
				})
			}

			const products = await Product.find({ category: category._id })
				.populate('category', 'name')
				.populate('highestBidder', 'name')
				.sort({ endTime: 1 })
				.lean()

			return res.json({
				products: products.map(mapDocToDTO),
				categoryName: decodedName,
			})
		} catch (error: unknown) {
			const errorMsg =
				error instanceof Error ? error.message : String(error)
			return res.status(500).json({
				error: errorMsg || 'Could not fetch products by category name.',
			})
		}
	}
)

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const product = await Product.findById(id)
			.populate('category', 'name')
			.populate(
				'seller',
				'firstName lastName email positiveReviews negativeReviews'
			) // ✅ Add reviews
			.populate('highestBidder', 'firstName lastName')
			.lean()

		if (!product) {
			return res.status(404).json({ error: 'Sản phẩm không tìm thấy' })
		}

		return res.json({
			success: true,
			product: mapDocToDTO(product), // ✅ Now includes seller info
		})
	} catch (error: unknown) {
		return res
			.status(500)
			.json({ error: String(error) || 'Could not fetch product.' })
	}
})

// GET /api/products/:id/related - Get 5 other products in same category
router.get('/:id/related', async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const currentProduct = await Product.findById(id).lean()

		if (!currentProduct) {
			return res.status(404).json({ error: 'Product not found' })
		}

		const relatedProducts = await Product.find({
			category: currentProduct.category,
			_id: { $ne: id }, // Exclude current product
		})
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
			.sort({ endTime: 1 })
			.limit(5)
			.lean()

		return res.json({
			products: relatedProducts.map(mapDocToDTO),
		})
	} catch (error: unknown) {
		return res.status(500).json({
			error: String(error) || 'Could not fetch related products',
		})
	}
})

// POST /api/products
router.post(
	'/',
	Auth,
	checkRole(ROLES.Seller, ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const {
				name,
				description,
				categoryId,
				images,
				startPrice,
				priceStep,
				currentPrice,
				buyNowPrice,
				endTime,
				autoExtend,
			} = req.body

			if (
				!name ||
				!description ||
				!categoryId ||
				!images?.length ||
				!startPrice ||
				!priceStep ||
				!currentPrice ||
				!endTime
			) {
				return res
					.status(400)
					.json({ error: 'Missing required fields.' })
			}

			const sellerId = (req.user as Record<string, unknown>)._id

			const product = await Product.create({
				name,
				description,
				category: categoryId,
				seller: sellerId,
				images,
				startPrice,
				priceStep,
				currentPrice,
				buyNowPrice,
				endTime: new Date(endTime),
				autoExtend: autoExtend ?? false,
				isSold: false,
			})

			return res.status(201).json(product)
		} catch (error: unknown) {
			return res
				.status(500)
				.json({ error: String(error) || 'Could not create product.' })
		}
	}
)

export default router
