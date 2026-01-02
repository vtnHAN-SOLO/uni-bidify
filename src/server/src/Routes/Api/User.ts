import express, { Request, Response } from 'express'
import Auth from '../../Middleware/Auth.js'
import User from '../../Models/User.js'
import Product from '../../Models/Product.js'
import Bid from '../../Models/Bid.js'
import Review from '../../Models/Review.js'
import bcrypt from 'bcryptjs'
import { ROLES, UPGRADE_REQUEST_STATUS } from '../../Data/Constants/index.js'

const router = express.Router()

/**
 * GET /api/users/profile
 * Get current user's profile information
 */
router.get('/profile', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id

		const user = await User.findById(userId).select('-password').lean()

		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		// Calculate rating percentage
		const totalReviews = user.positiveReviews + user.negativeReviews
		const ratingPercentage =
			totalReviews > 0
				? Math.round((user.positiveReviews / totalReviews) * 100)
				: 0

		return res.json({
			success: true,
			user: {
				id: user._id.toString(),
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: `${user.firstName} ${user.lastName}`,
				address: user.address || '',
				role: user.role,
				isVerified: user.isVerified,
				isActive: user.isActive,
				positiveReviews: user.positiveReviews,
				negativeReviews: user.negativeReviews,
				totalReviews,
				ratingPercentage,
				upgradeRequestStatus: user.upgradeRequestStatus,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		})
	} catch (error: any) {
		console.error('Get profile error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể lấy thông tin tài khoản.',
		})
	}
})

/**
 * PUT /api/users/profile
 * Update current user's profile information
 */
router.put('/profile', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id
		const { firstName, lastName, address, currentPassword, newPassword } =
			req.body

		const user = await User.findById(userId)

		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		// ✅ Update basic information
		if (firstName) user.firstName = firstName
		if (lastName) user.lastName = lastName
		if (address) user.address = address

		// ✅ Handle password change
		if (newPassword) {
			if (!currentPassword) {
				return res.status(400).json({
					error: 'Vui lòng nhập mật khẩu hiện tại để thay đổi mật khẩu.',
				})
			}

			// Verify current password
			const isPasswordMatch = await bcrypt.compare(
				currentPassword,
				user.password!
			)
			if (!isPasswordMatch) {
				return res.status(400).json({
					error: 'Mật khẩu hiện tại không đúng.',
				})
			}

			// Hash new password
			const hashedPassword = await bcrypt.hash(newPassword, 10)
			user.password = hashedPassword
		}

		await user.save()

		return res.json({
			success: true,
			message: 'Cập nhật thông tin thành công.',
			user: {
				id: user._id.toString(),
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: `${user.firstName} ${user.lastName}`,
				address: user.address,
				role: user.role,
			},
		})
	} catch (error: any) {
		console.error('Update profile error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể cập nhật thông tin.',
		})
	}
})

/**
 * GET /api/users/watchlist
 * Get current user's watchlist
 */
router.get('/watchlist', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id

		const user = await User.findById(userId)
			.populate({
				path: 'watchlist',
				model: 'Product',
				populate: [
					{
						path: 'category',
						model: 'Category',
						select: 'name',
					},
					{
						path: 'highestBidder',
						model: 'User',
						select: 'firstName lastName',
					},
					{
						path: 'seller',
						model: 'User',
						select: 'firstName lastName',
					},
				],
			})
			.lean()

		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		const mapProductToDTO = (product: any) => ({
			_id: product._id.toString(),
			name: product.name,
			description: product.description,
			images: product.images,
			startPrice: product.startPrice,
			priceStep: product.priceStep,
			currentPrice: product.currentPrice,
			buyNowPrice: product.buyNowPrice,
			endTime: product.endTime.toISOString(),
			bidCount: product.bidCount ?? 0,
			categoryName: product.category?.name || 'Chưa phân loại',
			categoryId: product.category?._id.toString(),
			sellerName: product.seller
				? `${product.seller.firstName} ${product.seller.lastName}`
				: 'Chưa xác định',
			sellerId: product.seller?._id.toString(),
			highestBidderName: product.highestBidder
				? `****${product.highestBidder.lastName || product.highestBidder.firstName || ''}`
				: 'Chưa có',
			highestBidderId: product.highestBidder?._id.toString(),
			isNew: false,
		})

		const watchlist = (user.watchlist as any[]).map(mapProductToDTO)

		return res.json({
			success: true,
			watchlist,
			count: watchlist.length,
		})
	} catch (error: any) {
		console.error('Get watchlist error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể lấy danh sách yêu thích.',
		})
	}
})

/**
 * POST /api/users/watchlist/:productId
 * Add/Remove product to watchlist
 */
router.post(
	'/watchlist/:productId',
	Auth,
	async (req: Request, res: Response) => {
		try {
			const userId = (req.user as any)._id
			const userRole = (req.user as any).role
			const { productId } = req.params

			// Admin cannot use watchlist - view only
			if (userRole === ROLES.Admin) {
				return res.status(403).json({
					error: 'Admin không được phép sử dụng danh sách yêu thích.',
				})
			}

			// Check if product exists
			const product = await Product.findById(productId)
			if (!product) {
				return res.status(404).json({ error: 'Sản phẩm không tồn tại.' })
			}

			const user = await User.findById(userId)
			if (!user) {
				return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
			}

			// Check if already in watchlist
			const isInWatchlist = user.watchlist.some(
				(id) => id.toString() === productId
			)

			if (isInWatchlist) {
				// Remove from watchlist
				user.watchlist = user.watchlist.filter(
					(id) => id.toString() !== productId
				)
				await user.save()

				return res.json({
					success: true,
					message: 'Đã xóa sản phẩm khỏi danh sách yêu thích.',
					isAdded: false,
					watchlistCount: user.watchlist.length,
				})
			} else {
				// Add to watchlist
				user.watchlist.push(productId as any)
				await user.save()

				return res.json({
					success: true,
					message: 'Đã thêm sản phẩm vào danh sách yêu thích.',
					isAdded: true,
					watchlistCount: user.watchlist.length,
				})
			}
		} catch (error: any) {
			console.error('Update watchlist error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể cập nhật danh sách yêu thích.',
			})
		}
	}
)

/**
 * GET /api/users/bidding-history
 * Get current user's bidding history
 */
router.get('/bidding-history', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id
		const { status } = req.query // 'active', 'won', 'lost'

		// ✅ Get all bids by user
		const query: any = { bidder: userId }

		// Filter by status if provided
		if (status === 'active') {
			// Get active auctions (end time in future)
			const now = new Date()
			query.createdAt = { $exists: true } // Get all bids
		}

		const bids = await Bid.find(query)
			.populate({
				path: 'product',
				model: 'Product',
				select: 'name images currentPrice endTime bidCount category seller highestBidder',
				populate: [
					{
						path: 'category',
						model: 'Category',
						select: 'name',
					},
					{
						path: 'seller',
						model: 'User',
						select: 'firstName lastName',
					},
					{
						path: 'highestBidder',
						model: 'User',
						select: 'firstName lastName',
					},
				],
			})
			.sort({ createdAt: -1 })
			.lean()

		// ✅ Map to DTO and determine if won/lost/active
		const biddingHistory = bids.map((bid: any) => {
			const product = bid.product
			const now = new Date()
			const isActive = new Date(product.endTime) > now

			const isWon =
				!isActive &&
				product.highestBidder &&
				product.highestBidder._id.toString() === userId.toString()

			const auctionStatus = isActive ? 'active' : isWon ? 'won' : 'lost'

			return {
				bidId: bid._id.toString(),
				productId: product._id.toString(),
				productName: product.name,
				productImage: product.images?.[0],
				bidAmount: bid.bidAmount,
				bidTime: bid.createdAt.toISOString(),
				currentPrice: product.currentPrice,
				endTime: product.endTime.toISOString(),
				categoryName: product.category?.name,
				sellerName: product.seller
					? `${product.seller.firstName} ${product.seller.lastName}`
					: 'Chưa xác định',
				isHighestBid:
					product.highestBidder &&
					product.highestBidder._id.toString() ===
						bid.bidder.toString(),
				auctionStatus, // 'active', 'won', 'lost'
			}
		})

		// ✅ Filter by status if needed
		let filtered = biddingHistory
		if (status === 'active') {
			filtered = biddingHistory.filter(
				(b) => b.auctionStatus === 'active'
			)
		} else if (status === 'won') {
			filtered = biddingHistory.filter((b) => b.auctionStatus === 'won')
		} else if (status === 'lost') {
			filtered = biddingHistory.filter((b) => b.auctionStatus === 'lost')
		}

		return res.json({
			success: true,
			biddingHistory: filtered,
			count: filtered.length,
			total: biddingHistory.length,
		})
	} catch (error: any) {
		console.error('Get bidding history error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể lấy lịch sử đấu giá.',
		})
	}
})

/**
 * GET /api/users/reviews
 * Get reviews received by current user
 */
router.get('/reviews', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id

		// Get all reviews where current user is the reviewed user
		const reviews = await Review.find({ reviewedUser: userId })
			.populate({
				path: 'reviewer',
				model: 'User',
				select: 'firstName lastName',
			})
			.populate({
				path: 'product',
				model: 'Product',
				select: 'name images',
			})
			.sort({ createdAt: -1 })
			.lean()

		const reviewsDTO = reviews.map((review: any) => ({
			_id: review._id.toString(),
			rating: review.rating,
			comment: review.comment,
			reviewerName: review.reviewer
				? `${review.reviewer.firstName} ${review.reviewer.lastName}`
				: 'Người dùng ẩn danh',
			reviewerId: review.reviewer?._id.toString(),
			productName: review.product?.name || 'Sản phẩm đã xóa',
			productImage: review.product?.images?.[0],
			productId: review.product?._id.toString(),
			createdAt: review.createdAt.toISOString(),
		}))

		// Calculate summary
		const positiveCount = reviews.filter((r: any) => r.rating === 1).length
		const negativeCount = reviews.filter((r: any) => r.rating === -1).length
		const totalCount = reviews.length
		const ratingPercentage =
			totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0

		return res.json({
			success: true,
			reviews: reviewsDTO,
			summary: {
				total: totalCount,
				positive: positiveCount,
				negative: negativeCount,
				ratingPercentage,
			},
		})
	} catch (error: any) {
		console.error('Get reviews error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể lấy danh sách đánh giá.',
		})
	}
})

/**
 * POST /api/users/upgrade-request
 * Request upgrade from Bidder to Seller
 */
router.post('/upgrade-request', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id

		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		// Check if user is already a Seller or Admin
		if (user.role === ROLES.Seller || user.role === ROLES.Admin) {
			return res.status(400).json({
				error: 'Bạn đã là Seller hoặc Admin, không cần nâng cấp.',
			})
		}

		// Check if user already has a pending request
		if (user.upgradeRequestStatus === UPGRADE_REQUEST_STATUS.Pending) {
			return res.status(400).json({
				error: 'Bạn đã có yêu cầu nâng cấp đang chờ xử lý.',
			})
		}

		// Update status to Pending (allow re-request if previously rejected)
		user.upgradeRequestStatus = UPGRADE_REQUEST_STATUS.Pending
		await user.save()

		return res.json({
			success: true,
			message: 'Yêu cầu nâng cấp đã được gửi. Vui lòng chờ admin duyệt.',
			upgradeRequestStatus: user.upgradeRequestStatus,
		})
	} catch (error: any) {
		console.error('Upgrade request error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể gửi yêu cầu nâng cấp.',
		})
	}
})

export default router
