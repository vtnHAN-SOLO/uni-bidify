import { Schema, model } from 'mongoose'

/**
 * Mongoose schema for the Question model.
 * Questions are asked by bidders to sellers about products.
 */
const QuestionSchema = new Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		asker: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		question: {
			type: String,
			required: true,
			trim: true,
		},
		answer: {
			type: String,
			trim: true,
		},
		answeredAt: {
			type: Date,
		},
	},
	{ timestamps: true }
)

// Index for faster queries
QuestionSchema.index({ product: 1, createdAt: -1 })

export default model('Question', QuestionSchema)
