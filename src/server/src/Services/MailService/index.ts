import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import Keys from '../../Config/Keys.js'
import GetTemplate from './Template.js'

const { host, port, secure, user, pass, from } = Keys.smtp

/**
 * Handle mail sending via Nodemailer (SMTP)
 *
 * @server
 * @class MailService
 */
const MailService = {
	transporter: null as Transporter | null,

	/**
	 * Initialize the transporter
	 */
	init(): Transporter {
		if (!this.transporter) {
			this.transporter = nodemailer.createTransport({
				host,
				port,
				secure, // true for 465, false for 587
				auth: {
					user,
					pass,
				},
			})
			console.log('✅ Mail transporter initialized')
		}
		return this.transporter
	},

	/**
	 * Verify SMTP connection
	 */
	async verify(): Promise<boolean> {
		try {
			const transporter = this.init()
			await transporter.verify()
			console.log('✅ SMTP connection verified')
			return true
		} catch (error) {
			console.error('❌ SMTP connection failed:', error)
			return false
		}
	},

	/**
	 * Send an email using Nodemailer
	 *
	 * @param email - Recipient email address (single or array)
	 * @param type - Type of email to send
	 * @param data - Data for the email template
	 * @returns Promise resolving to send result or error
	 */
	async sendMail(
		email: string | string[],
		type: string,
		data: any
	): Promise<any> {
		try {
			// Initialize transporter if needed
			const transporter = this.init()

			// Prepare email template
			const message = GetTemplate(type, data)
			if (!message) {
				throw new Error(`Failed to prepare email template for type: ${type}`)
			}

			// Configure email parameters
			const mailOptions = {
				from: from,
				to: Array.isArray(email) ? email.join(', ') : email,
				subject: message.subject,
				text: message.text,
				html: message.html, // Support HTML emails
			}

			console.log(`📧 Sending email [${type}] to: ${mailOptions.to}`)

			// Send email
			const result = await transporter.sendMail(mailOptions)
			console.log(`✅ Email sent successfully: ${result.messageId}`)

			return result
		} catch (error) {
			console.error('❌ Failed to send email:', error)
			throw error
		}
	},

	/**
	 * Send email to multiple recipients with different templates
	 * Useful for auction events that notify multiple parties
	 *
	 * @param notifications - Array of {email, type, data}
	 */
	async sendMultiple(
		notifications: Array<{ email: string | string[]; type: string; data: any }>
	): Promise<void> {
		const promises = notifications.map((n) =>
			this.sendMail(n.email, n.type, n.data).catch((err) => {
				console.error(`❌ Failed to send ${n.type} to ${n.email}:`, err)
			})
		)
		await Promise.all(promises)
	},
}

export default MailService
