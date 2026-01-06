import express, { Request, Response } from 'express'
import Bid from '../../Models/Bid.js'
import Product from '../../Models/Product.js'
import User from '../../Models/User.js'
import Settings from '../../Models/Settings.js'
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
	positiveReviews: number
	negativeReviews: number
}

interface BidDoc {
	_id: { toString: () => string }
	product: { toString: () => string } | ProductDoc
	bidder: { toString: () => string } | BidderDoc
	price: number
	maxPrice?: number
	createdAt: Date
}

interface BidderDoc {
	_id: { toString: () => string }
	firstName: string
	lastName: string
	positiveReviews: number
	negativeReviews: number
}

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
	autoExtend: boolean
	autoExtendMinutes: number
	extendDurationMinutes: number
	isSold: boolean
	bidCount: number
	highestBidder?: { toString: () => string }
	highestBidderMaxPrice: number
	allowUnratedBidders: boolean
	rejectedBidders: Array<{ toString: () => string }>
	seller: { toString: () => string }
	save: () => Promise<ProductDoc>
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate user rating percentage
 * Rating = positive / (positive + negative) * 100
 */
const calculateRating = (positive: number, negative: number): number => {
	const total = positive + negative
	if (total === 0) return -1 // -1 indicates no ratings yet
	return Math.round((positive / total) * 100)
}

/**
 * Check if bidder is eligible to bid
 * - Default: Must have >= 80% rating to bid
 * - If allowUnratedBidders is true: Allow bidders with < 80% rating AND unrated bidders
 */
const canBidderParticipate = (
	bidderPositive: number,
	bidderNegative: number,
	allowUnratedBidders: boolean
): { allowed: boolean; reason?: string } => {
	// If seller allows unrated/low-rating bidders, skip all checks
	if (allowUnratedBidders) {
		return { allowed: true }
	}

	const rating = calculateRating(bidderPositive, bidderNegative)

	// No ratings yet - not allowed by default
	if (rating === -1) {
		return {
			allowed: false,
			reason: 'Bạn chưa có đánh giá. Người bán không cho phép người dùng chưa có đánh giá tham gia đấu giá.',
		}
	}

	// Has ratings - check if rating >= 80% (default requirement)
	if (rating < 80) {
		return {
			allowed: false,
			reason: `Điểm đánh giá của bạn là ${rating}%. Sản phẩm này yêu cầu điểm đánh giá từ 80% trở lên để tham gia đấu giá.`,
		}
	}

	return { allowed: true }
}

/**
 * Get auction settings from database (with default fallback)
 */
const getAuctionSettings = async (): Promise<{
	triggerMinutes: number
	extensionMinutes: number
}> => {
	const settings = await Settings.findOne().lean()
	return {
		triggerMinutes: settings?.triggerMinutes ?? 5,
		extensionMinutes: settings?.extensionMinutes ?? 10,
	}
}

/**
 * Check and apply auto-extension if bid is placed near end time
 * Uses global auction settings from database
 */
const checkAutoExtension = async (product: ProductDoc): Promise<boolean> => {
	if (!product.autoExtend) return false

	// Get settings from database
	const settings = await getAuctionSettings()

	const now = new Date()
	const endTime = new Date(product.endTime)
	const minutesUntilEnd = (endTime.getTime() - now.getTime()) / (1000 * 60)

	// If within triggerMinutes before end, extend by extensionMinutes
	if (minutesUntilEnd > 0 && minutesUntilEnd <= settings.triggerMinutes) {
		const newEndTime = new Date(
			endTime.getTime() + settings.extensionMinutes * 60 * 1000
		)
		product.endTime = newEndTime
		await product.save()
		console.log(
			`⏰ Auto-extended auction ${product._id} by ${settings.extensionMinutes} minutes to ${newEndTime.toISOString()}`
		)
		return true
	}

	return false
}

/**
 * Process auto-bidding logic - IMPLEMENTED FOR USER SCENARIO
 * * Logic Update:
 * - We use an "Effective Max Price" which is min(realMax, buyNowPrice).
 * - If User A (current winner) has Real Max 10500 and BuyNow is 10000 -> Effective Max is 10000.
 * - If User C bids 10000 -> Effective Max is 10000.
 * - Since Effective A == Effective C, User A (Current Holder) keeps the lead.
 * - Final Price becomes 10000.
 */
const processAutoBid = async (
	product: ProductDoc,
	newBidderId: string,
	newBidMaxPrice: number
): Promise<{
	finalPrice: number
	winnerId: string
	winnerMaxPrice: number
	autoBidOccurred: boolean
}> => {
	const currentHighestBidderId = product.highestBidder?.toString()
	const currentHighestMaxPrice = product.highestBidderMaxPrice || 0
	const priceStep = product.priceStep
	const currentPrice = product.currentPrice
	const buyNowPrice = product.buyNowPrice

	// Case 1: No previous bidder
	if (!currentHighestBidderId) {
		let nextPrice = currentPrice + priceStep
		// Cap starting price at buyNowPrice if applicable
		if (buyNowPrice && nextPrice > buyNowPrice) {
			nextPrice = buyNowPrice
		}
		
		return {
			finalPrice: nextPrice,
			winnerId: newBidderId,
			winnerMaxPrice: newBidMaxPrice,
			autoBidOccurred: false,
		}
	}

	// Case 2: Same bidder updating their max price
	if (currentHighestBidderId === newBidderId) {
		return {
			finalPrice: currentPrice,
			winnerId: newBidderId,
			winnerMaxPrice: newBidMaxPrice,
			autoBidOccurred: false,
		}
	}

	// Case 3: Different bidder - CALCULATE EFFECTIVE MAX PRICES
	
	// If buyNowPrice exists, the "Effective Power" of a bid is capped at that price.
	// This ensures that 10500 and 10000 are treated as equal strength (both cover the full price).
	const effectiveCurrentMax = buyNowPrice 
		? Math.min(currentHighestMaxPrice, buyNowPrice) 
		: currentHighestMaxPrice

	const effectiveNewMax = buyNowPrice 
		? Math.min(newBidMaxPrice, buyNowPrice) 
		: newBidMaxPrice

	// BATTLE LOGIC:

	if (effectiveNewMax > effectiveCurrentMax) {
		// New bidder wins because their effective max is strictly higher
		// Price is previous effective max + step
		let finalPrice = effectiveCurrentMax + priceStep
		
		// Cap final price at new bidder's effective max
		if (finalPrice > effectiveNewMax) finalPrice = effectiveNewMax
		
		// Absolute Cap at BuyNowPrice (Redundant given effective calc, but safe)
		if (buyNowPrice && finalPrice > buyNowPrice) finalPrice = buyNowPrice

		return {
			finalPrice,
			winnerId: newBidderId,
			winnerMaxPrice: newBidMaxPrice,
			autoBidOccurred: true,
		}
	}

	if (effectiveCurrentMax > effectiveNewMax) {
		// Current holder wins because their effective max is strictly higher
		let finalPrice = effectiveNewMax + priceStep
		
		// Cap final price at current holder's effective max
		if (finalPrice > effectiveCurrentMax) finalPrice = effectiveCurrentMax

		if (buyNowPrice && finalPrice > buyNowPrice) finalPrice = buyNowPrice

		return {
			finalPrice,
			winnerId: currentHighestBidderId,
			winnerMaxPrice: currentHighestMaxPrice,
			autoBidOccurred: true,
		}
	}

	// TIE CASE (effectiveCurrentMax === effectiveNewMax)
	// Example: User A (10500 -> 10000) vs User C (10000 -> 10000).
	// Logic: Current Holder (User A) holds the tie-breaker advantage.
	{
		// They win at the maximum price
		let finalPrice = effectiveNewMax + priceStep
		
		// Cap at ceiling (which they both hit)
		if (finalPrice > effectiveCurrentMax) finalPrice = effectiveCurrentMax
		if (buyNowPrice && finalPrice > buyNowPrice) finalPrice = buyNowPrice

		return {
			finalPrice, // This will likely be 10000
			winnerId: currentHighestBidderId,
			winnerMaxPrice: currentHighestMaxPrice,
			autoBidOccurred: true,
		}
	}
}
/**
 * Mask username for public display
 * "NguyenVanA" -> "****VanA"
 */
const maskUsername = (firstName: string, lastName: string): string => {
	const fullName = `${firstName} ${lastName}`
	if (fullName.length <= 4) {
		return '****' + fullName
	}
	return '****' + fullName.slice(-4)
}

// ==================== ROUTES ====================

/**
 * POST /api/bids
 * Place a new bid (auto-bidding)
 *
 * Body: { productId, maxPrice }
 * - maxPrice: The maximum price the bidder is willing to pay
 */
router.post('/', Auth, async (req: Request, res: Response) => {
	try {
		const { productId, maxPrice } = req.body
		const user = req.user as AuthUser

		if (!productId || !maxPrice) return res.status(400).json({ success: false, error: 'productId và maxPrice là bắt buộc.' })
		if (typeof maxPrice !== 'number' || maxPrice <= 0) return res.status(400).json({ success: false, error: 'maxPrice phải là số dương.' })

		const product = (await Product.findById(productId)) as ProductDoc | null
		if (!product) return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' })
		if (new Date() > new Date(product.endTime)) return res.status(400).json({ success: false, error: 'Phiên đấu giá đã kết thúc.' })
		if (product.startTime && new Date() < new Date(product.startTime)) return res.status(400).json({ success: false, error: 'Phiên đấu giá chưa bắt đầu.' })
		if (product.isSold) return res.status(400).json({ success: false, error: 'Sản phẩm đã được bán.' })
		if (product.seller.toString() === user._id.toString()) return res.status(400).json({ success: false, error: 'Bạn không thể đấu giá sản phẩm của chính mình.' })
		
		const isRejected = product.rejectedBidders.some(id => id.toString() === user._id.toString())
		if (isRejected) return res.status(403).json({ success: false, error: 'Bạn đã bị từ chối tham gia đấu giá sản phẩm này.' })

		const bidder = await User.findById(user._id).lean()
		if (!bidder) return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin người dùng.' })
		if (user.role === ROLES.Admin) return res.status(403).json({ success: false, error: 'Admin không được phép tham gia đấu giá.' })

		const eligibility = canBidderParticipate(bidder.positiveReviews || 0, bidder.negativeReviews || 0, product.allowUnratedBidders)
		if (!eligibility.allowed) return res.status(403).json({ success: false, error: eligibility.reason })

		const minimumBid = product.currentPrice + product.priceStep
		if (maxPrice < minimumBid) {
			return res.status(400).json({
				success: false,
				error: `Giá tối đa phải ít nhất ${minimumBid.toLocaleString('vi-VN')} VNĐ.`,
				minimumBid,
				currentPrice: product.currentPrice,
			})
		}

		// Save previous highest bidder ID (for outbid notification)
		const previousHighestBidderId = product.highestBidder?.toString()

		// Run Auto-Bid Logic
		const { finalPrice, winnerId, winnerMaxPrice, autoBidOccurred } = await processAutoBid(
			product,
			user._id.toString(),
			maxPrice
		)

		const isWinner = winnerId === user._id.toString()
		
		// === CHECK IF PRICE HIT THE CAP (SCENARIO A WINS AT 10000) ===
		const hitBuyNowCap = product.buyNowPrice && finalPrice >= product.buyNowPrice
		if (hitBuyNowCap) {
			product.isSold = true
			product.endTime = new Date() // End immediately
		}

		// Create bid record(s)
		if (isWinner) {
			await Bid.create({
				product: productId,
				bidder: user._id,
				price: finalPrice,
				maxPrice: maxPrice,
			})
		} else {
			// Loser
			await Bid.create({
				product: productId,
				bidder: user._id,
				price: maxPrice,
				maxPrice: maxPrice,
			})
			// Winner (Auto-defend)
			await Bid.create({
				product: productId,
				bidder: winnerId,
				price: finalPrice,
				maxPrice: winnerMaxPrice,
			})
		}

		product.currentPrice = finalPrice
		product.highestBidder = winnerId as any
		product.highestBidderMaxPrice = winnerMaxPrice
		product.bidCount = (product.bidCount || 0) + (isWinner ? 1 : 2)

		// Only auto-extend if we didn't just sell it
		let wasExtended = false
		if (!hitBuyNowCap) {
			wasExtended = await checkAutoExtension(product)
		}

		if (!wasExtended) {
			await product.save()
		}

		// Notifications
		try {
			const seller = await User.findById(product.seller).lean()
			const bidderInfo = await User.findById(user._id).lean()

			if (seller && bidderInfo) {
				const emailData = {
					productName: product.name,
					bidAmount: finalPrice,
					endTime: product.endTime,
					bidderName: `${bidderInfo.firstName} ${bidderInfo.lastName}`,
				}

				MailService.sendMail(bidderInfo.email, 'bid-success-bidder', emailData).catch(console.error)
				MailService.sendMail(seller.email, 'bid-success-seller', {...emailData, sellerName: `${seller.firstName} ${seller.lastName}`}).catch(console.error)

				if (autoBidOccurred && isWinner) {
					if (previousHighestBidderId && previousHighestBidderId !== user._id.toString()) {
						const previousBidder = await User.findById(previousHighestBidderId).lean()
						if (previousBidder) {
							MailService.sendMail(previousBidder.email, 'bid-outbid', {
								productName: product.name,
								newBid: finalPrice,
								outbidderName: `${bidderInfo.firstName} ${bidderInfo.lastName}`,
								productId: productId
							}).catch(console.error)
						}
					}
				} else if (!isWinner) {
					MailService.sendMail(bidderInfo.email, 'bid-outbid', {
						productName: product.name,
						newBid: finalPrice,
						outbidderName: 'Hệ thống tự động',
						productId: productId
					}).catch(console.error)
				}
			}
		} catch (e) { console.error(e) }

		let message = isWinner 
			? `Bạn đang dẫn đầu với ${finalPrice.toLocaleString('vi-VN')} VNĐ!` 
			: `Giá của bạn đã bị vượt qua.`
			
		if (hitBuyNowCap && isWinner) {
			message = `Chúc mừng! Bạn đã chiến thắng phiên đấu giá với giá tối đa: ${finalPrice.toLocaleString('vi-VN')} VNĐ.`
		}

		return res.status(201).json({
			success: true,
			message,
			data: {
				isWinner,
				currentPrice: finalPrice,
				yourMaxPrice: maxPrice,
				wasExtended,
				bidCount: product.bidCount,
				isSold: product.isSold
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error placing bid:', error)
		return res.status(500).json({ success: false, error: String(error) })
	}
})

/**
 * GET /api/bids/product/:productId
 * Get bid history for a product
 * - Public: masked usernames
 * - Seller/Admin/Own bids: full names visible
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
	try {
		const { productId } = req.params
		const { page = 1, limit = 20 } = req.query

		// Get current user if authenticated
		let currentUserId: string | null = null
		let currentUserRole: string | null = null

		// Try to get user from auth (optional)
		if (req.headers.authorization) {
			try {
				// This is a simplified check - in production you'd verify the JWT
				const user = req.user as AuthUser | undefined
				if (user) {
					currentUserId = user._id
					currentUserRole = user.role
				}
			} catch {
				// Not authenticated - continue as guest
			}
		}

		// Get product to check seller
		const product = await Product.findById(productId).lean()
		if (!product) {
			return res.status(404).json({
				success: false,
				error: 'Sản phẩm không tồn tại.',
			})
		}

		const sellerId = product.seller?.toString()
		const isSellerOrAdmin =
			currentUserId === sellerId || currentUserRole === ROLES.Admin

		// Get bids
		const bids = await Bid.find({ product: productId })
			.populate('bidder', 'firstName lastName positiveReviews negativeReviews')
			.sort({ createdAt: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Bid.countDocuments({ product: productId })

		// Map bids with appropriate masking
		const mappedBids = (bids as unknown as BidDoc[]).map((bid) => {
			const bidder = bid.bidder as BidderDoc
			const bidderId = bidder._id.toString()
			const isOwnBid = currentUserId === bidderId

			// Show full name if: own bid, seller, or admin
			const showFullName = isOwnBid || isSellerOrAdmin

			return {
				_id: bid._id.toString(),
				price: bid.price,
				bidderName: showFullName
					? `${bidder.firstName} ${bidder.lastName}`
					: maskUsername(bidder.firstName, bidder.lastName),
				bidderId: showFullName ? bidderId : undefined,
				bidderRating: calculateRating(
					bidder.positiveReviews || 0,
					bidder.negativeReviews || 0
				),
				createdAt: bid.createdAt.toISOString(),
				isOwnBid,
			}
		})

		return res.json({
			success: true,
			data: {
				bids: mappedBids,
				total,
				page: Number(page),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching bid history:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy lịch sử đấu giá.',
		})
	}
})

/**
 * GET /api/bids/user/participating
 * Get user's active bids (auctions still ongoing)
 */
router.get('/user/participating', Auth, async (req: Request, res: Response) => {
	try {
		const user = req.user as AuthUser
		const { page = 1, limit = 20 } = req.query
		const now = new Date()

		// Find all bids by this user
		const userBids = await Bid.find({ bidder: user._id })
			.distinct('product')
			.lean()

		// Get active products where user has bid
		const activeProducts = await Product.find({
			_id: { $in: userBids },
			endTime: { $gt: now },
			isSold: false,
		})
			.populate('category', 'name')
			.populate('highestBidder', 'firstName lastName')
			.sort({ endTime: 1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments({
			_id: { $in: userBids },
			endTime: { $gt: now },
			isSold: false,
		})

		// Get user's highest bid for each product
		const productsWithBidInfo = await Promise.all(
			(activeProducts as any[]).map(async (product: any) => {
				const userHighestBid = await Bid.findOne({
					product: product._id,
					bidder: user._id,
				})
					.sort({ maxPrice: -1 })
					.lean()

				const isWinning =
					product.highestBidder?._id?.toString() === user._id.toString()

				return {
					_id: product._id.toString(),
					name: product.name,
					images: product.images,
					currentPrice: product.currentPrice,
					endTime: product.endTime,
					bidCount: product.bidCount,
					categoryName: (product.category as any)?.name || 'Chưa phân loại',
					yourMaxBid: userHighestBid?.maxPrice || 0,
					yourCurrentBid: userHighestBid?.price || 0,
					isWinning,
					status: isWinning ? 'Đang dẫn đầu' : 'Đã bị vượt',
				}
			})
		)

		return res.json({
			success: true,
			data: {
				products: productsWithBidInfo,
				total,
				page: Number(page),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching participating auctions:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy danh sách đấu giá đang tham gia.',
		})
	}
})

/**
 * GET /api/bids/user/won
 * Get user's won auctions
 */
router.get('/user/won', Auth, async (req: Request, res: Response) => {
	try {
		const user = req.user as AuthUser
		const { page = 1, limit = 20 } = req.query
		const now = new Date()

		// Find products where user is the winner or highest bidder after auction ended
		const wonProducts = await Product.find({
			$or: [
				{ winner: user._id },
				{
					highestBidder: user._id,
					endTime: { $lt: now },
				},
			],
		})
			.populate('category', 'name')
			.populate('seller', 'firstName lastName email')
			.sort({ endTime: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit))
			.lean()

		const total = await Product.countDocuments({
			$or: [
				{ winner: user._id },
				{
					highestBidder: user._id,
					endTime: { $lt: now },
				},
			],
		})

		const mappedProducts = (wonProducts as any[]).map((product: any) => ({
			_id: product._id.toString(),
			name: product.name,
			images: product.images,
			finalPrice: product.currentPrice,
			endTime: product.endTime,
			categoryName: product.category?.name || 'Chưa phân loại',
			sellerName: product.seller
				? `${product.seller.firstName} ${product.seller.lastName}`
				: 'Người bán',
			sellerEmail: product.seller?.email,
			isSold: product.isSold,
		}))

		return res.json({
			success: true,
			data: {
				products: mappedProducts,
				total,
				page: Number(page),
				totalPages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: unknown) {
		console.error('❌ Error fetching won auctions:', error)
		return res.status(500).json({
			success: false,
			error: String(error) || 'Không thể lấy danh sách đấu giá đã thắng.',
		})
	}
})

/**
 * DELETE /api/bids/:bidId
 * Reject a bidder (Seller only)
 * - Removes bidder from auction
 * - If bidder is current highest, updates to next highest
 * - Adds bidder to rejected list
 */
router.delete(
	'/:bidId',
	Auth,
	checkSellerAccess(), // Allow expired sellers to reject bidders on their active products
	async (req: Request, res: Response) => {
		try {
			const { bidId } = req.params
			const user = req.user as AuthUser

			// Get the bid
			const bid = await Bid.findById(bidId).lean()
			if (!bid) {
				return res.status(404).json({
					success: false,
					error: 'Không tìm thấy bid.',
				})
			}

			// Get the product
			const product = (await Product.findById(bid.product)) as ProductDoc | null
			if (!product) {
				return res.status(404).json({
					success: false,
					error: 'Không tìm thấy sản phẩm.',
				})
			}

			// Check if user is the seller (or admin)
			if (
				product.seller.toString() !== user._id.toString() &&
				user.role !== ROLES.Admin
			) {
				return res.status(403).json({
					success: false,
					error: 'Chỉ người bán mới có quyền từ chối đấu giá.',
				})
			}

			// Check if auction has ended
			if (new Date() > new Date(product.endTime)) {
				return res.status(400).json({
					success: false,
					error: 'Không thể từ chối sau khi phiên đấu giá đã kết thúc.',
				})
			}

			const rejectedBidderId = bid.bidder.toString()

			// Add to rejected list if not already
			if (
				!product.rejectedBidders.some(
					(id) => id.toString() === rejectedBidderId
				)
			) {
				product.rejectedBidders.push(rejectedBidderId as any)
			}

			// If rejected bidder is current highest bidder, find next highest
			if (product.highestBidder?.toString() === rejectedBidderId) {
				// Find the highest bid from non-rejected bidders
				const nextHighestBid = await Bid.findOne({
					product: product._id,
					bidder: { $nin: product.rejectedBidders },
				})
					.sort({ price: -1 })
					.populate('bidder', 'firstName lastName')
					.lean()

				if (nextHighestBid) {
					product.currentPrice = nextHighestBid.price
					product.highestBidder = nextHighestBid.bidder as any
					product.highestBidderMaxPrice = nextHighestBid.maxPrice || 0
				} else {
					// No valid bids left - reset to start price
					product.currentPrice = product.startPrice
					product.highestBidder = undefined
					product.highestBidderMaxPrice = 0
				}
			}

			await product.save()

			// Delete all bids from rejected bidder for this product
			const deletedBids = await Bid.find({
				product: product._id,
				bidder: rejectedBidderId,
			}).lean()

			await Bid.deleteMany({
				product: product._id,
				bidder: rejectedBidderId,
			})

			// ==================== SEND EMAIL TO REJECTED BIDDER ====================
			try {
				const rejectedUser = await User.findById(rejectedBidderId).lean()
				if (rejectedUser && deletedBids.length > 0) {
					const highestBid = Math.max(...deletedBids.map((b: any) => b.price))
					MailService.sendMail(rejectedUser.email, 'bid-rejected', {
						productName: product.name,
						bidAmount: highestBid,
						bidderName: `${rejectedUser.firstName} ${rejectedUser.lastName}`,
						reason: 'Người bán đã từ chối lượt đấu giá của bạn.',
					}).catch((err) =>
						console.error('❌ Failed to send bid-rejected email:', err)
					)
				}
			} catch (emailError) {
				console.error('❌ Error sending rejection email:', emailError)
			}

			return res.json({
				success: true,
				message: 'Đã từ chối người đấu giá thành công.',
				data: {
					newCurrentPrice: product.currentPrice,
					newHighestBidder: product.highestBidder
						? '****' +
							(product.highestBidder as any).lastName?.slice(-3) ||
							'***'
						: null,
				},
			})
		} catch (error: unknown) {
			console.error('❌ Error rejecting bidder:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể từ chối người đấu giá.',
			})
		}
	}
)

/**
 * GET /api/bids/product/:productId/my-bid
 * Get current user's bid info for a specific product
 */
router.get(
	'/product/:productId/my-bid',
	Auth,
	async (req: Request, res: Response) => {
		try {
			const { productId } = req.params
			const user = req.user as AuthUser

			// Get user's highest bid for this product
			const myBid = await Bid.findOne({
				product: productId,
				bidder: user._id,
			})
				.sort({ maxPrice: -1 })
				.lean()

			if (!myBid) {
				return res.json({
					success: true,
					data: null,
					message: 'Bạn chưa đặt giá cho sản phẩm này.',
				})
			}

			// Get product to check if user is winning
			const product = await Product.findById(productId).lean()
			const isWinning =
				product?.highestBidder?.toString() === user._id.toString()

			return res.json({
				success: true,
				data: {
					bidId: myBid._id,
					price: myBid.price,
					maxPrice: myBid.maxPrice,
					isWinning,
					createdAt: myBid.createdAt,
				},
			})
		} catch (error: unknown) {
			console.error('❌ Error fetching user bid:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể lấy thông tin bid của bạn.',
			})
		}
	}
)

/**
 * POST /api/bids/buy-now
 * Buy now - instantly purchase the product at buyNowPrice
 * Body: { productId }
 */
router.post(
	'/buy-now',
	Auth,
	checkRole(ROLES.Bidder, ROLES.Seller),
	async (req: Request, res: Response) => {
		try {
			const user = req.user as AuthUser
			const { productId } = req.body

			if (!productId) {
				return res.status(400).json({
					success: false,
					error: 'Vui lòng cung cấp ID sản phẩm.',
				})
			}

			// Get product
			const product = (await Product.findById(productId)) as ProductDoc | null
			if (!product) {
				return res.status(404).json({
					success: false,
					error: 'Sản phẩm không tồn tại.',
				})
			}

			// Check if product has buyNowPrice
			if (!product.buyNowPrice) {
				return res.status(400).json({
					success: false,
					error: 'Sản phẩm này không có giá mua ngay.',
				})
			}

			// Check if auction has ended
			if (new Date() >= product.endTime) {
				return res.status(400).json({
					success: false,
					error: 'Phiên đấu giá đã kết thúc.',
				})
			}

			// Check if already sold
			if (product.isSold) {
				return res.status(400).json({
					success: false,
					error: 'Sản phẩm đã được bán.',
				})
			}

			// Check if user is the seller
			if (product.seller.toString() === user._id.toString()) {
				return res.status(400).json({
					success: false,
					error: 'Bạn không thể mua sản phẩm của chính mình.',
				})
			}

			// Check if user is rejected
			const isRejected = product.rejectedBidders.some(
				(b) => b.toString() === user._id.toString()
			)
			if (isRejected) {
				return res.status(403).json({
					success: false,
					error: 'Bạn đã bị từ chối tham gia đấu giá sản phẩm này.',
				})
			}

			// Check bidder eligibility
			const bidder = await User.findById(user._id).lean()
			if (!bidder) {
				return res.status(404).json({
					success: false,
					error: 'Không tìm thấy thông tin người dùng.',
				})
			}

			// Check bidder eligibility based on rating settings
			const eligibility = canBidderParticipate(
				bidder.positiveReviews || 0,
				bidder.negativeReviews || 0,
				product.allowUnratedBidders
			)

			if (!eligibility.allowed) {
				return res.status(403).json({
					success: false,
					error: eligibility.reason,
				})
			}

			// Execute buy now - update product
			product.isSold = true
			product.currentPrice = product.buyNowPrice
			product.highestBidder = { toString: () => user._id.toString() } as any
			product.endTime = new Date() // End auction immediately
			await product.save()

			// Create a bid record for buy now
			await Bid.create({
				product: productId,
				bidder: user._id,
				price: product.buyNowPrice,
				maxPrice: product.buyNowPrice,
			})

			// Increment bid count
			await Product.findByIdAndUpdate(productId, {
				$inc: { bidCount: 1 },
			})

			console.log(`✅ Buy now successful: Product ${productId} sold to ${user._id} for ${product.buyNowPrice}`)

			return res.json({
				success: true,
				message: 'Mua ngay thành công! Vui lòng tiến hành thanh toán.',
				data: {
					productId,
					price: product.buyNowPrice,
					productName: product.name,
				},
			})
		} catch (error: unknown) {
			console.error('❌ Buy now error:', error)
			return res.status(500).json({
				success: false,
				error: String(error) || 'Không thể thực hiện mua ngay.',
			})
		}
	}
)

export default router
