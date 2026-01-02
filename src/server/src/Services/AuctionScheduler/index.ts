import cron from 'node-cron'
import Product from '../../Models/Product.js'
import User from '../../Models/User.js'
import MailService from '../MailService/index.js'

/**
 * AuctionScheduler - Handles automatic processing of ended auctions
 * Runs every minute to check for auctions that have ended
 */
const AuctionScheduler = {
	task: null as cron.ScheduledTask | null,

	/**
	 * Start the auction scheduler
	 * Runs every minute to check for ended auctions
	 */
	start(): void {
		console.log('🕐 Starting Auction Scheduler...')

		// Run every minute: '* * * * *'
		this.task = cron.schedule('* * * * *', async () => {
			await this.processEndedAuctions()
		})

		console.log('✅ Auction Scheduler started - checking every minute')
	},

	/**
	 * Stop the scheduler
	 */
	stop(): void {
		if (this.task) {
			this.task.stop()
			console.log('🛑 Auction Scheduler stopped')
		}
	},

	/**
	 * Process all auctions that have ended but not yet been processed
	 */
	async processEndedAuctions(): Promise<void> {
		try {
			const now = new Date()

			// Find products where:
			// - endTime has passed
			// - Not marked as sold (isSold = false)
			// - Not already processed (auctionEndProcessed = false or doesn't exist)
			const endedAuctions = await Product.find({
				endTime: { $lte: now },
				isSold: false,
				auctionEndProcessed: { $ne: true },
			})
				.populate('seller', 'firstName lastName email')
				.populate('highestBidder', 'firstName lastName email')
				.lean()

			if (endedAuctions.length === 0) {
				return // No auctions to process
			}

			console.log(`�� Processing ${endedAuctions.length} ended auction(s)...`)

			for (const product of endedAuctions) {
				await this.processAuction(product as any)
			}
		} catch (error) {
			console.error('❌ Error processing ended auctions:', error)
		}
	},

	/**
	 * Process a single ended auction
	 */
	async processAuction(product: {
		_id: any
		name: string
		startPrice: number
		currentPrice: number
		endTime: Date
		seller: { _id: any; firstName: string; lastName: string; email: string }
		highestBidder?: { _id: any; firstName: string; lastName: string; email: string }
	}): Promise<void> {
		try {
			const sellerName = `${product.seller.firstName} ${product.seller.lastName}`
			const sellerEmail = product.seller.email

			if (product.highestBidder) {
				// ==================== AUCTION ENDED WITH WINNER ====================
				const winnerName = `${product.highestBidder.firstName} ${product.highestBidder.lastName}`
				const winnerEmail = product.highestBidder.email

				console.log(`🎉 Auction ended with winner: ${product.name} - Winner: ${winnerName}`)

				// 1. Send email to winner
				await MailService.sendMail(winnerEmail, 'auction-ended-winner', {
					productName: product.name,
					winnerName,
					winningBid: product.currentPrice,
					sellerName,
					endTime: product.endTime,
				}).catch((err) =>
					console.error(`❌ Failed to send winner email to ${winnerEmail}:`, err)
				)

				// 2. Send email to seller
				await MailService.sendMail(sellerEmail, 'auction-ended-seller', {
					productName: product.name,
					sellerName,
					winnerName,
					winnerEmail,
					winningBid: product.currentPrice,
					endTime: product.endTime,
				}).catch((err) =>
					console.error(`❌ Failed to send seller email to ${sellerEmail}:`, err)
				)
			} else {
				// ==================== AUCTION ENDED WITHOUT WINNER ====================
				console.log(`📭 Auction ended without winner: ${product.name}`)

				// Send email to seller about no winner
				await MailService.sendMail(sellerEmail, 'auction-ended-no-winner', {
					productName: product.name,
					sellerName,
					startPrice: product.startPrice,
					endTime: product.endTime,
				}).catch((err) =>
					console.error(`❌ Failed to send no-winner email to ${sellerEmail}:`, err)
				)
			}

			// Mark auction as processed to avoid duplicate emails
			await Product.findByIdAndUpdate(product._id, {
				auctionEndProcessed: true,
			})

			console.log(`✅ Processed auction: ${product.name}`)
		} catch (error) {
			console.error(`❌ Error processing auction ${product._id}:`, error)
		}
	},

	/**
	 * Manually trigger processing (for testing or admin use)
	 */
	async runNow(): Promise<{ processed: number }> {
		console.log('🔄 Manually triggering auction processing...')
		await this.processEndedAuctions()

		const processedCount = await Product.countDocuments({
			auctionEndProcessed: true,
		})

		return { processed: processedCount }
	},
}

export default AuctionScheduler
