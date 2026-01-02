import express, { Request, Response } from 'express'
import User from '../../Models/User.js'
import Product from '../../Models/Product.js'
import Auth from '../../Middleware/Auth.js'

const router = express.Router()

/**
 * GET /api/watchlist
 * Get current user's watchlist
 */
router.get('/', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id

		const user = await User.findById(userId)
			.populate({
				path: 'watchlist',
				model: 'Product',
				populate: [
					// ✅ NESTED POPULATE FOR CATEGORY
					{
						path: 'category',
						model: 'Category',
						select: 'name',
					},
					// ✅ NESTED POPULATE FOR HIGHEST BIDDER
					{
						path: 'highestBidder',
						model: 'User',
						select: 'firstName lastName',
					},
				],
			})
			.lean()

		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		// ✅ MAP WITH CATEGORY AND BIDDER INFO
		const mapDocToDTO = (product: any) => ({
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
			categoryName: product.category?.name || 'Chưa phân loại', // ✅ FIXED
			highestBidderName: product.highestBidder
				? `****${product.highestBidder.lastName || product.highestBidder.firstName || ''}`
				: 'Chưa có',
			isNew: false,
		})

		const watchlist = (user.watchlist as any[]).map(mapDocToDTO)

		return res.json({
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
 * POST /api/watchlist/:productId
 * Add product to watchlist
 */
router.post('/:productId', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id
		const { productId } = req.params

		console.log(
			`[Watchlist] Adding product ${productId} for user ${userId}`
		) // ✅ DEBUG LOG

		// Check if product exists
		const product = await Product.findById(productId)
		if (!product) {
			return res.status(404).json({ error: 'Sản phẩm không tồn tại.' })
		}

		// Add to watchlist if not already there
		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		// ✅ IMPROVED CHECK: Use .some() instead of .includes()
		if (user.watchlist.some((id) => id.toString() === productId)) {
			return res.status(400).json({
				error: 'Sản phẩm đã có trong danh sách yêu thích.',
			})
		}

		user.watchlist.push(productId as any)
		await user.save()

		console.log(
			`[Watchlist] Successfully added. Total: ${user.watchlist.length}`
		) // ✅ DEBUG LOG

		return res.json({
			success: true,
			message: 'Đã thêm sản phẩm vào danh sách yêu thích.',
			watchlistCount: user.watchlist.length,
		})
	} catch (error: any) {
		console.error('[Watchlist] Add error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể thêm vào danh sách yêu thích.',
		})
	}
})

/**
 * DELETE /api/watchlist/:productId
 * Remove product from watchlist
 */
router.delete('/:productId', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id
		const { productId } = req.params

		console.log(
			`[Watchlist] Removing product ${productId} for user ${userId}`
		) // ✅ DEBUG LOG

		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		// Remove from watchlist
		user.watchlist = user.watchlist.filter(
			(id) => id.toString() !== productId
		)
		await user.save()

		console.log(
			`[Watchlist] Successfully removed. Total: ${user.watchlist.length}`
		) // ✅ DEBUG LOG

		return res.json({
			success: true,
			message: 'Đã xóa sản phẩm khỏi danh sách yêu thích.',
			watchlistCount: user.watchlist.length,
		})
	} catch (error: any) {
		console.error('[Watchlist] Remove error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể xóa khỏi danh sách yêu thích.',
		})
	}
})

/**
 * GET /api/watchlist/check/:productId
 * Check if product is in watchlist
 */
router.get('/check/:productId', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any)._id
		const { productId } = req.params

		const user = await User.findById(userId).lean()
		if (!user) {
			return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
		}

		const isInWatchlist = user.watchlist.some(
			(id) => id.toString() === productId
		)

		return res.json({
			isInWatchlist,
			productId,
		})
	} catch (error: any) {
		console.error('[Watchlist] Check error:', error)
		return res.status(500).json({
			error: error.message || 'Không thể kiểm tra danh sách yêu thích.',
		})
	}
})

export default router
