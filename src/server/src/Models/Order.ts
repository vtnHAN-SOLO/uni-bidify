import { Schema, model } from 'mongoose'
import { TRANSACTION_STEP } from '../Data/Constants/index.js'

/**
 * Mongoose schema for the Order model.
 * Orders are created when an auction ends with a winner.
 * Tracks the post-auction workflow between buyer and seller.
 */
const OrderSchema = new Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
			unique: true, // One order per product
		},
		buyer: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		finalPrice: {
			type: Number,
			required: true,
		},
		status: {
			type: String,
			enum: Object.values(TRANSACTION_STEP),
			default: TRANSACTION_STEP.AwaitingPayment,
		},
		// Step 1: Buyer provides payment proof and shipping address
		shippingAddress: {
			type: String,
		},
		paymentProof: {
			type: String, // URL/path to payment proof image
		},
		paymentSubmittedAt: {
			type: Date,
		},
		// Step 2: Seller confirms payment and provides shipping info
		shippingInvoice: {
			type: String, // Tracking number or invoice
		},
		sellerConfirmedAt: {
			type: Date,
		},
		// Step 3: Buyer confirms receipt
		buyerConfirmedAt: {
			type: Date,
		},
		// Step 4: Ratings
		buyerRated: {
			type: Boolean,
			default: false,
		},
		sellerRated: {
			type: Boolean,
			default: false,
		},
		// Cancellation
		cancelledBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		cancelReason: {
			type: String,
		},
		cancelledAt: {
			type: Date,
		},
		// Chat messages between buyer and seller
		messages: [
			{
				sender: {
					type: Schema.Types.ObjectId,
					ref: 'User',
					required: true,
				},
				content: {
					type: String,
					required: true,
				},
				createdAt: {
					type: Date,
					default: Date.now,
				},
			},
		],
	},
	{ timestamps: true }
)

// Indexes for faster queries
OrderSchema.index({ buyer: 1, status: 1 })
OrderSchema.index({ seller: 1, status: 1 })

export default model('Order', OrderSchema)
