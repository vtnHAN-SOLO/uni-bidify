import express, { Request, Response } from 'express'
import Auth from '../../Middleware/Auth.js'
import User from '../../Models/User.js'
import Product from '../../Models/Product.js'
import Bid from '../../Models/Bid.js'
import bcrypt from 'bcryptjs'

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
			return res.status(404).json({ error: 'User not found.' })
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
			error: error.message || 'Failed to get profile.',
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
			return res.status(404).json({ error: 'User not found.' })
		}

		// ✅ Update basic information
		if (firstName) user.firstName = firstName
		if (lastName) user.lastName = lastName
		if (address) user.address = address

		// ✅ Handle password change
		if (newPassword) {
			if (!currentPassword) {
				return res.status(400).json({
					error: 'Current password is required to change password.',
				})
			}

			// Verify current password
			const isPasswordMatch = await bcrypt.compare(
				currentPassword,
				user.password!
			)
			if (!isPasswordMatch) {
				return res.status(400).json({
					error: 'Current password is incorrect.',
				})
			}

			// Hash new password
			const hashedPassword = await bcrypt.hash(newPassword, 10)
			user.password = hashedPassword
		}

		await user.save()

		return res.json({
			success: true,
			message: 'Profile updated successfully.',
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
			error: error.message || 'Failed to update profile.',
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
			return res.status(404).json({ error: 'User not found.' })
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
			error: error.message || 'Failed to get watchlist.',
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
			const { productId } = req.params

			// Check if product exists
			const product = await Product.findById(productId)
			if (!product) {
				return res.status(404).json({ error: 'Product not found.' })
			}

			const user = await User.findById(userId)
			if (!user) {
				return res.status(404).json({ error: 'User not found.' })
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
					message: 'Product removed from watchlist.',
					isAdded: false,
					watchlistCount: user.watchlist.length,
				})
			} else {
				// Add to watchlist
				user.watchlist.push(productId as any)
				await user.save()

				return res.json({
					success: true,
					message: 'Product added to watchlist.',
					isAdded: true,
					watchlistCount: user.watchlist.length,
				})
			}
		} catch (error: any) {
			console.error('Update watchlist error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to update watchlist.',
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
			error: error.message || 'Failed to get bidding history.',
		})
	}
})

export default router
