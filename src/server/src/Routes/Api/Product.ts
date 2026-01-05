import express, { Request, Response } from 'express'
import Product from '../../Models/Product.js'
import Category from '../../Models/Category.js'
import Settings from '../../Models/Settings.js'
import Bid from '../../Models/Bid.js'
import User from '../../Models/User.js'
import Auth from '../../Middleware/Auth.js'
import { ROLES } from '../../Data/Constants/index.js'
import {
	checkCanCreateProduct,
	checkSellerAccess,
} from '../../Middleware/SellerPermission.js'
import MailService from '../../Services/MailService/index.js'

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
	highestBidderId?: string
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
	highestBidder?: {
		_id: { toString: () => string }
		firstName: string
		lastName: string
	}
}

/**
 * Mask username for public display
 * "Pham Thi Gia" -> "**** Gia"
 */
const maskUsername = (firstName: string, lastName: string): string => {
	const fullName = `${firstName} ${lastName}`
	if (fullName.length <= 4) {
		return '****' + fullName
	}
	return '****' + fullName.slice(-4)
}

// ==================== PUBLIC SETTINGS ROUTE ====================

/**
 * GET /api/products/auction-settings
 * Get public auction settings (trigger minutes, extension minutes)
 * This is a public endpoint - no auth required
 */
router.get('/auction-settings', async (_req: Request, res: Response) => {
	try {
		// Get settings from database
		let settings = await Settings.findOne().lean()

		// Return default values if no settings exist
		if (!settings) {
			return res.json({
				success: true,
				settings: {
					triggerMinutes: 5,
					extensionMinutes: 10,
				},
			})
		}

		return res.json({
			success: true,
			settings: {
				triggerMinutes: settings.triggerMinutes ?? 5,
				extensionMinutes: settings.extensionMinutes ?? 10,
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching auction settings:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy cài đặt đấu giá.',
		})
	}
})

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

		// ✅ Highest bidder info (masked) - same logic as bid history
		highestBidderName: d.highestBidder
			? maskUsername(
					d.highestBidder.firstName || '',
					d.highestBidder.lastName || ''
				)
			: 'Chưa có',
		highestBidderId: d.highestBidder?._id
			? d.highestBidder._id.toString()
			: undefined,

		isNew: false,
	}
}

// GET /api/products - List all products with filters/pagination
router.get('/', async (req: Request, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			category,
			minPrice,
			maxPrice,
			sort = 'endTime',
			order = 'asc',
			status, // 'active', 'ended', 'all'
		} = req.query

		const now = new Date()

		// Build query
		const query: Record<string, unknown> = {}

		// Category filter
		if (category) {
			query.category = category
		}

		// Price filter
		if (minPrice || maxPrice) {
			query.currentPrice = {}
			if (minPrice)
				(query.currentPrice as Record<string, number>).$gte =
					Number(minPrice)
			if (maxPrice)
				(query.currentPrice as Record<string, number>).$lte =
					Number(maxPrice)
		}

		// Status filter
		if (status === 'active') {
			query.endTime = { $gt: now }
			query.isSold = false
		} else if (status === 'ended') {
			query.$or = [{ endTime: { $lte: now } }, { isSold: true }]
		}
		// 'all' - no filter

		// Build sort
		const sortField = String(sort)
		const sortOrder = order === 'desc' ? -1 : 1
		const sortQuery: Record<string, 1 | -1> = { [sortField]: sortOrder }

		const products = await Product.find(query)
			.populate('category', 'name')
			.populate(
				'seller',
				'firstName lastName email positiveReviews negativeReviews'
			)
			.populate('highestBidder', 'firstName lastName')
			.sort(sortQuery)
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments(query)

		return res.json({
			success: true,
			data: {
				products: products.map(mapDocToDTO),
				total,
				page: Number(page),
				limit: Number(limit),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy danh sách sản phẩm.',
		})
	}
})

// GET /api/products/search - MongoDB Full-text search
// Features:
// - Full-text search by product name using text index (better multi-word search)
// - Search by category name (finds parent and child categories)
// - Pagination
// - Sort by: relevance score (when searching), endTime (desc), currentPrice (asc)
// - Mark new products (posted within N minutes) with isNew flag
// - Option to include ended auctions
router.get('/search', async (req: Request, res: Response) => {
	try {
		const {
			q, // search query (for product name)
			category, // category ID filter
			categoryName, // category name search
			page = 1,
			limit = 20,
			sort = 'endTime', // 'endTime' or 'currentPrice'
			order, // 'asc' or 'desc' (default: endTime desc, price asc)
			newWithinMinutes = 30, // Products created within N minutes are marked as "new"
			includeEnded = 'false', // Include ended auctions (default: false)
		} = req.query

		const now = new Date()
		const newThreshold = new Date(
			now.getTime() - Number(newWithinMinutes) * 60 * 1000
		)

		// Build base query
		const query: Record<string, unknown> = {}

		// Only filter active auctions if includeEnded is false
		if (includeEnded !== 'true') {
			query.endTime = { $gt: now }
			query.isSold = false
		}

		// Search by product name using MongoDB full-text search
		// This uses the text index defined in Product model for better performance
		let useTextSearch = false
		if (q && String(q).trim().length >= 1) {
			const searchQuery = String(q).trim()

			// Use MongoDB text search for better multi-word search and performance
			query.$text = { $search: searchQuery }
			useTextSearch = true
		}

		// Filter by category ID
		if (category) {
			query.category = category
		}

		// Search by category name (need to find category IDs first)
		// Also include child categories if searching by parent category
		if (categoryName && String(categoryName).trim().length >= 1) {
			const catNameQuery = String(categoryName).trim()
			const escapedCatName = catNameQuery.replace(
				/[.*+?^${}()|[\]\\]/g,
				'\\$&'
			)

			// Find matching categories by name
			const matchingCategories = await Category.find({
				name: { $regex: escapedCatName, $options: 'i' },
			})
				.select('_id')
				.lean()

			if (matchingCategories.length > 0) {
				const categoryIds: unknown[] = []
				for (const c of matchingCategories) {
					categoryIds.push(c._id)
				}

				// Also find child categories of matching parent categories
				const childCategories = await Category.find({
					parent: { $in: categoryIds },
				})
					.select('_id')
					.lean()

				for (const child of childCategories) {
					categoryIds.push(child._id)
				}

				// If already filtering by category, combine with $and
				if (query.category) {
					query.$and = [
						{ category: query.category },
						{ category: { $in: categoryIds } },
					]
					delete query.category
				} else {
					query.category = { $in: categoryIds }
				}
			} else {
				// No matching categories found - return empty result
				return res.json({
					success: true,
					data: {
						products: [],
						query: q || '',
						categoryName: categoryName || '',
						total: 0,
						page: Number(page),
						limit: Number(limit),
						totalPages: 0,
					},
				})
			}
		}

		// Build sort query
		// Default: endTime descending (sắp kết thúc trước), price ascending
		const sortField = String(sort)
		let sortOrder: 1 | -1

		if (order) {
			sortOrder = order === 'desc' ? -1 : 1
		} else {
			// Default sort order based on field
			if (sortField === 'endTime') {
				sortOrder = -1 // Thời gian kết thúc giảm dần (sắp kết thúc trước)
			} else if (sortField === 'currentPrice') {
				sortOrder = 1 // Giá tăng dần
			} else {
				sortOrder = -1
			}
		}

		const sortQuery: Record<string, 1 | -1 | { $meta: string }> = {}

		// If using text search, sort by relevance score first
		if (useTextSearch) {
			sortQuery.score = { $meta: 'textScore' }
		}

		// Then sort by user-specified field
		sortQuery[sortField] = sortOrder

		// Execute query with text score projection if using text search
		const queryBuilder = Product.find(query)

		if (useTextSearch) {
			// Add text score to results for sorting
			queryBuilder.select({ score: { $meta: 'textScore' } })
		}

		const products = await queryBuilder
			.populate('category', 'name')
			.populate(
				'seller',
				'firstName lastName email positiveReviews negativeReviews'
			)
			.populate('highestBidder', 'firstName lastName')
			.sort(sortQuery)
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments(query)

		// Map to DTO and mark new products
		const mappedProducts: ProductDTO[] = []
		for (const doc of products) {
			const dto = mapDocToDTO(doc)
			// Mark as new if created within threshold
			const docAny = doc as unknown as { createdAt?: Date }
			if (
				docAny.createdAt &&
				new Date(docAny.createdAt) >= newThreshold
			) {
				dto.isNew = true
			}
			mappedProducts.push(dto)
		}

		return res.json({
			success: true,
			data: {
				products: mappedProducts,
				query: q ? String(q).trim() : '',
				categoryName: categoryName ? String(categoryName).trim() : '',
				total,
				page: Number(page),
				limit: Number(limit),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		console.error('❌ Search error:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể tìm kiếm sản phẩm.',
		})
	}
})

// GET /api/products/home
router.get('/home', async (req: Request, res: Response) => {
	try {
		const now = new Date()

		const endingSoonDocs = await Product.find({ endTime: { $gt: now } })
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
			.sort({ endTime: 1 })
			.limit(5)
			.lean()

		const mostBidsDocs = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
			.sort({ bidCount: -1 })
			.limit(5)
			.lean()

		const highestPriceDocs = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
			.sort({ currentPrice: -1 })
			.limit(5)
			.lean()

		res.json({
			endingSoon: endingSoonDocs.map(mapDocToDTO),
			mostBids: mostBidsDocs.map(mapDocToDTO),
			highestPrice: highestPriceDocs.map(mapDocToDTO),
		})
	} catch (error: unknown) {
		res.status(500).json({ error: String(error) || 'Lỗi hệ thống' })
	}
})

// GET /api/products/ending-soon
router.get('/ending-soon', async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query
		const now = new Date()

		const products = await Product.find({ endTime: { $gt: now } })
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
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
		res.status(500).json({ error: String(error) || 'Lỗi hệ thống' })
	}
})

// GET /api/products/most-bids
router.get('/most-bids', async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query

		const products = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
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
		res.status(500).json({ error: String(error) || 'Lỗi hệ thống' })
	}
})

// GET /api/products/highest-price
router.get('/highest-price', async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query

		const products = await Product.find()
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
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
		res.status(500).json({ error: String(error) || 'Lỗi hệ thống' })
	}
})

// ⚠️ QUAN TRỌNG: Routes với path cụ thể phải đặt trước routes với parameters
// Nếu không, Express sẽ match /:id trước và xem 'by-category-id' là một ID

// GET /api/products/seller/my-products - Get seller's own products
router.get(
	'/seller/my-products',
	Auth,
	checkSellerAccess(), // Allow expired sellers to view their products
	async (req: Request, res: Response) => {
		try {
			const user = req.user as { _id: string }
			const { page = 1, limit = 20, status } = req.query
			const now = new Date()

			// Build query
			const query: Record<string, unknown> = { seller: user._id }

			if (status === 'active') {
				query.endTime = { $gt: now }
				query.isSold = false
			} else if (status === 'ended') {
				query.$or = [{ endTime: { $lte: now } }, { isSold: true }]
			}

			const products = await Product.find(query)
				.populate('category', 'name')
				.populate('highestBidder', 'firstName lastName')
				.sort({ createdAt: -1 })
				.skip((Number(page) - 1) * Number(limit))
				.limit(Number(limit))
				.lean()

			const total = await Product.countDocuments(query)

			return res.json({
				success: true,
				data: {
					products: products.map(mapDocToDTO),
					total,
					page: Number(page),
					totalPages: Math.ceil(total / Number(limit)),
				},
			})
		} catch (error: unknown) {
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể lấy danh sách sản phẩm.',
			})
		}
	}
)

// GET /api/products/by-category-id/:categoryId - lấy sản phẩm theo categoryId
router.get(
	'/by-category-id/:categoryId',
	async (req: Request, res: Response) => {
		try {
			const { categoryId } = req.params

			if (!categoryId) {
				return res
					.status(400)
					.json({ error: 'Vui lòng cung cấp ID danh mục.' })
			}

			// Debug log
			console.log('🔍 Fetching products for categoryId:', categoryId)

			// Verify category exists
			const category = await Category.findById(categoryId).lean()
			if (!category) {
				return res.status(404).json({
					error: 'Không tìm thấy danh mục.',
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
				error: String(error) || 'Không thể lấy sản phẩm theo danh mục.',
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
					.json({ error: 'Vui lòng cung cấp tên danh mục.' })
			}

			const decodedName = decodeURIComponent(categoryName)

			const category = await Category.findOne({
				name: decodedName,
			}).lean()

			if (!category) {
				return res.status(404).json({
					error: 'Không tìm thấy danh mục.',
					categoryName: decodedName,
				})
			}

			const products = await Product.find({ category: category._id })
				.populate('category', 'name')
				.populate('highestBidder', 'firstName lastName')
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
				error: errorMsg || 'Không thể lấy sản phẩm theo tên danh mục.',
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
		return res.status(500).json({
			error: String(error) || 'Không thể lấy thông tin sản phẩm.',
		})
	}
})

// GET /api/products/:id/related - Get 5 other products in same category
router.get('/:id/related', async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const currentProduct = await Product.findById(id).lean()

		if (!currentProduct) {
			return res.status(404).json({ error: 'Sản phẩm không tồn tại' })
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
			error: String(error) || 'Không thể lấy sản phẩm liên quan',
		})
	}
})

// POST /api/products
router.post(
	'/',
	Auth,
	checkCanCreateProduct(), // Check if seller can create new products (not expired)
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
				allowUnratedBidders,
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
					.json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc.' })
			}

			// Validate minimum 3 images
			if (images.length < 3) {
				return res.status(400).json({
					error: 'Sản phẩm phải có ít nhất 3 hình ảnh.',
				})
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
				autoExtend: autoExtend ?? true,
				allowUnratedBidders: allowUnratedBidders ?? false,
				isSold: false,
			})

			return res.status(201).json({
				success: true,
				message: 'Sản phẩm đã được tạo thành công.',
				product,
			})
		} catch (error: unknown) {
			return res
				.status(500)
				.json({ error: String(error) || 'Không thể tạo sản phẩm.' })
		}
	}
)

// PUT /api/products/:id/description - Append description (not replace)
router.put(
	'/:id/description',
	Auth,
	checkSellerAccess(), // Allow expired sellers to update description of their active products
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params
			const { content } = req.body
			const user = req.user as { _id: string; role: string }

			if (!content || content.trim().length < 10) {
				return res.status(400).json({
					success: false,
					error: 'Nội dung bổ sung phải có ít nhất 10 ký tự.',
				})
			}

			// Get product
			const product = await Product.findById(id)
			if (!product) {
				return res.status(404).json({
					success: false,
					error: 'Sản phẩm không tồn tại.',
				})
			}

			// Check if user is the seller (or admin)
			if (
				product.seller.toString() !== user._id.toString() &&
				user.role !== ROLES.Admin
			) {
				return res.status(403).json({
					success: false,
					error: 'Chỉ người bán mới có quyền cập nhật mô tả.',
				})
			}

			// Check if auction has ended
			if (new Date() > new Date(product.endTime)) {
				return res.status(400).json({
					success: false,
					error: 'Không thể cập nhật mô tả sau khi đấu giá đã kết thúc.',
				})
			}

			// Append description with timestamp marker (HTML format)
			const now = new Date()
			const dateStr = now.toLocaleDateString('vi-VN')
			const timeStr = now.toLocaleTimeString('vi-VN', {
				hour: '2-digit',
				minute: '2-digit',
			})

			const appendedContent = `<hr><p><em>✏️ Cập nhật lúc ${timeStr} ngày ${dateStr}</em></p><div>${content.trim()}</div>`

			product.description = product.description + appendedContent
			await product.save()

			// ==================== SEND EMAIL TO ALL BIDDERS ====================
			try {
				// Get seller info
				const seller = await User.findById(product.seller).lean()

				// Get all unique bidders for this product
				const bidderIds = await Bid.find({ product: id })
					.distinct('bidder')
					.lean()

				if (seller && bidderIds.length > 0) {
					// Get all bidder info
					const bidders = await User.find({ _id: { $in: bidderIds } }).lean()

					const sellerName = `${seller.firstName} ${seller.lastName}`

					// Send email to each bidder
					for (const bidder of bidders) {
						MailService.sendMail(bidder.email, 'product-description-updated', {
							productName: product.name,
							sellerName,
							bidderName: `${bidder.firstName} ${bidder.lastName}`,
							productId: id,
							updatedAt: now,
						}).catch((err) =>
							console.error(`❌ Failed to send description update email to ${bidder.email}:`, err)
						)
					}

					console.log(`✅ Sent description update emails to ${bidders.length} bidder(s) for product ${id}`)
				}
			} catch (emailError) {
				console.error('❌ Error sending description update emails:', emailError)
				// Don't fail the update if email fails
			}

			return res.json({
				success: true,
				message: 'Đã bổ sung mô tả thành công.',
				data: {
					description: product.description,
				},
			})
		} catch (error: unknown) {
			console.error('❌ Error appending description:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể cập nhật mô tả.',
			})
		}
	}
)

// DELETE /api/products/:id - Remove product (admin/seller)
router.delete(
	'/:id',
	Auth,
	checkSellerAccess(), // Allow expired sellers to delete their products (if no bids)
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params
			const user = req.user as { _id: string; role: string }

			// Get product
			const product = await Product.findById(id)
			if (!product) {
				return res.status(404).json({
					success: false,
					error: 'Sản phẩm không tồn tại.',
				})
			}

			// Check authorization
			const isSeller = product.seller.toString() === user._id.toString()
			const isAdmin = user.role === ROLES.Admin

			if (!isSeller && !isAdmin) {
				return res.status(403).json({
					success: false,
					error: 'Bạn không có quyền xóa sản phẩm này.',
				})
			}

			// Seller can only delete if no bids yet
			if (isSeller && !isAdmin) {
				if (product.bidCount && product.bidCount > 0) {
					return res.status(400).json({
						success: false,
						error: 'Không thể xóa sản phẩm đã có người đấu giá.',
					})
				}
			}

			// Delete product
			await Product.findByIdAndDelete(id)

			// TODO: Also delete related bids, questions, etc.

			return res.json({
				success: true,
				message: 'Đã xóa sản phẩm thành công.',
			})
		} catch (error: unknown) {
			console.error('❌ Error deleting product:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể xóa sản phẩm.',
			})
		}
	}
)

export default router
