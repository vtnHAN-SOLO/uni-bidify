import { Schema, model } from 'mongoose'

/**
 * Mongoose schema for the Review model.
 * Rating: 1 = Positive, -1 = Negative
 */
const ReviewSchema = new Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		reviewedUser: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		rating: { type: Number, enum: [1, -1], required: true },
		comment: { type: String, required: true },
	},
	{ timestamps: true }
)

export default model('Review', ReviewSchema)
