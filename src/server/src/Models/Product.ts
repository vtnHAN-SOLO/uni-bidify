import { Schema, model } from 'mongoose'

/**
 * Mongoose schema for the Product model.
 */
const ProductSchema = new Schema(
	{
		name: { type: String, required: true },
		description: { type: String, required: true },
		category: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			required: true,
		},
		seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		images: [{ type: String, required: true }],
		startPrice: { type: Number, required: true },
		priceStep: { type: Number, required: true },
		currentPrice: { type: Number, required: true },
		buyNowPrice: { type: Number },
		highestBidder: { type: Schema.Types.ObjectId, ref: 'User' },
		highestBidderMaxPrice: { type: Number, default: 0 }, // Store highest bidder's max auto-bid
		startTime: { type: Date, default: Date.now },
		endTime: { type: Date, required: true },
		autoExtend: { type: Boolean, default: true }, // Default to true for auto-extension
		autoExtendMinutes: { type: Number, default: 5 }, // Minutes before end to trigger extension
		extendDurationMinutes: { type: Number, default: 10 }, // Minutes to extend
		isSold: { type: Boolean, default: false },
		winner: { type: Schema.Types.ObjectId, ref: 'User' },
		bidCount: { type: Number, default: 0 },
		allowUnratedBidders: { type: Boolean, default: false }, // Allow unrated bidders AND bidders with < 80% rating
		rejectedBidders: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Blocked bidders list
		auctionEndProcessed: { type: Boolean, default: false }, // Flag to track if end-of-auction emails were sent
	},
	{ timestamps: true }
)

// Create a text index for full-text search on product name
ProductSchema.index({ name: 'text' })

// Create an ascending index for currentPrice to optimize price-based queries
ProductSchema.index({ currentPrice: 1 })

// Create a descending index for createdAt to optimize sorting by creation date
ProductSchema.index({ createdAt: -1 })

// Create compound indexes for common query patterns to avoid in-memory sorting
ProductSchema.index({ endTime: 1, _id: 1 }) // For sorting by endTime (ending soon)
ProductSchema.index({ bidCount: -1, _id: 1 }) // For sorting by bidCount (most bids)
ProductSchema.index({ currentPrice: -1, _id: 1 }) // For sorting by price (highest price)

export default model('Product', ProductSchema)
