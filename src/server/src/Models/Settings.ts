import { Schema, model } from 'mongoose'

/**
 * Mongoose schema for the Settings model.
 * Stores system-wide auction settings.
 * Uses a singleton pattern - only one document should exist.
 */
const SettingsSchema = new Schema(
	{
		// Auto-extend trigger time in minutes (default: 5)
		// When a bid is placed within this time before auction ends, auto-extend is triggered
		triggerMinutes: { type: Number, default: 5, min: 1, max: 60 },

		// Auto-extend extension time in minutes (default: 10)
		// How many minutes to extend the auction when triggered
		extensionMinutes: { type: Number, default: 10, min: 1, max: 120 },
	},
	{ timestamps: true }
)

export default model('Settings', SettingsSchema)
