import cron from 'node-cron'
import User from '../../Models/User.js'
import Product from '../../Models/Product.js'
import { ROLES, UPGRADE_REQUEST_STATUS } from '../../Data/Constants/index.js'

/**
 * SellerExpiryScheduler - Handles automatic revocation of expired seller permissions
 * Runs every hour to check for sellers whose permissions have expired
 */
const SellerExpiryScheduler = {
	task: null as cron.ScheduledTask | null,

	/**
	 * Start the seller expiry scheduler
	 * Runs every hour to check for expired sellers
	 */
	start(): void {
		console.log('🕐 Starting Seller Expiry Scheduler...')

		// Run every hour: '0 * * * *'
		this.task = cron.schedule('0 * * * *', async () => {
			await this.processExpiredSellers()
		})

		console.log('✅ Seller Expiry Scheduler started - checking every hour')
	},

	/**
	 * Stop the scheduler
	 */
	stop(): void {
		if (this.task) {
			this.task.stop()
			console.log('🛑 Seller Expiry Scheduler stopped')
		}
	},

	/**
	 * Process all sellers whose permissions have expired
	 * - If seller has no active products → revert to Bidder
	 * - If seller has active products → keep as Seller (but they can't create new products)
	 */
	async processExpiredSellers(): Promise<void> {
		try {
			const now = new Date()

			// Find sellers whose permissions have expired
			const expiredSellers = await User.find({
				role: ROLES.Seller,
				sellerExpiryDate: { $lte: now },
			}).lean()

			if (expiredSellers.length === 0) {
				return // No expired sellers to process
			}

			console.log(`📋 Found ${expiredSellers.length} expired seller(s) to process...`)

			for (const seller of expiredSellers) {
				await this.processSeller(seller as any)
			}
		} catch (error) {
			console.error('❌ Error processing expired sellers:', error)
		}
	},

	/**
	 * Process a single expired seller
	 */
	async processSeller(seller: {
		_id: any
		firstName: string
		lastName: string
		email: string
		sellerExpiryDate: Date
	}): Promise<void> {
		try {
			const now = new Date()

			// Check if seller has any active products (not ended, not sold)
			const activeProductsCount = await Product.countDocuments({
				seller: seller._id,
				endTime: { $gt: now },
				isSold: false,
			})

			if (activeProductsCount > 0) {
				// Seller has active products - keep as seller but they can't create new products
				// The middleware will handle blocking new product creation
				console.log(
					`📦 Seller ${seller.firstName} ${seller.lastName} has ${activeProductsCount} active product(s) - keeping seller role`
				)
				return
			}

			// Seller has no active products - revert to Bidder
			await User.findByIdAndUpdate(seller._id, {
				role: ROLES.Bidder,
				upgradeRequestStatus: UPGRADE_REQUEST_STATUS.None,
				$unset: { sellerExpiryDate: 1 }, // Remove expiry date field
			})

			console.log(
				`🔄 Reverted ${seller.firstName} ${seller.lastName} (${seller.email}) to Bidder - no active products`
			)
		} catch (error) {
			console.error(`❌ Error processing seller ${seller._id}:`, error)
		}
	},

	/**
	 * Manually trigger processing (for testing or admin use)
	 */
	async runNow(): Promise<{ processed: number; reverted: number }> {
		console.log('🔄 Manually triggering seller expiry processing...')

		const now = new Date()

		// Get all expired sellers
		const expiredSellers = await User.find({
			role: ROLES.Seller,
			sellerExpiryDate: { $lte: now },
		}).lean()

		let revertedCount = 0

		for (const seller of expiredSellers) {
			// Check if seller has active products
			const activeProductsCount = await Product.countDocuments({
				seller: seller._id,
				endTime: { $gt: now },
				isSold: false,
			})

			if (activeProductsCount === 0) {
				// Revert to Bidder
				await User.findByIdAndUpdate(seller._id, {
					role: ROLES.Bidder,
					upgradeRequestStatus: UPGRADE_REQUEST_STATUS.None,
					$unset: { sellerExpiryDate: 1 },
				})
				revertedCount++
			}
		}

		return {
			processed: expiredSellers.length,
			reverted: revertedCount,
		}
	},
}

export default SellerExpiryScheduler
