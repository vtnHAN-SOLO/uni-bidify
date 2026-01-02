import express, { Request, Response } from 'express'
import assert from 'assert'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import passport from 'passport'
import axios from 'axios'
import { EMAIL_PROVIDER } from '../../Data/Constants/index.js'
import Keys from '../../Config/Keys.js'
import User from '../../Models/User.js'
import Auth from '../../Middleware/Auth.js'
import MailService from '../../Services/MailService/index.js'
import rateLimit from 'express-rate-limit'
import { generateOTPWithExpiry, verifyOTP } from '../../Utility/otp.utils.js'
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY

const authLimiter = rateLimit({
	windowMs: 1, // 15 minutes: 15 * 60 * 1000
	max: 100, // 5 attempts per window: 5
	message: 'Too many attempts. Please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	// Optional: Store in Redis for distributed systems
	// store: new RedisStore({ client: redisClient })
})

// Helper function to verify reCAPTCHA
async function verifyRecaptcha(
	token: string,
	expectedAction: string
): Promise<{
	success: boolean
	score: number
	action: string
}> {
	try {
		const response = await axios.post(
			`https://www.google.com/recaptcha/api/siteverify`,
			null,
			{
				params: {
					secret: RECAPTCHA_SECRET_KEY,
					response: token,
				},
				timeout: 5000,
			}
		)

		const { success, score, action, hostname } = response.data

		// ✅ Validate action matches
		if (action !== expectedAction) {
			console.error(
				`Action mismatch: expected ${expectedAction}, got ${action}`
			)
			return { success: false, score: 0, action }
		}

		// ✅ Optional: Validate hostname
		// if (hostname !== 'yourdomain.com') {
		//     console.error('Hostname mismatch')
		//     return { success: false, score: 0, action }
		// }

		return { success, score: score || 0, action }
	} catch (error) {
		console.error('reCAPTCHA verification error:', error)
		return { success: false, score: 0, action: '' }
	}
}

/** Router for authentication-related routes */
const router = express.Router()

// Extract JWT secret and token life from config
const { secret, tokenLife } = Keys.jwt
assert(secret, 'JWT secret is not configured.')
assert(tokenLife, 'JWT token life is not configured.')

/**
 * Login route.
 * Authenticates user with email and password.
 *
 * @route POST /login
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
	try {
		const { email, password, recaptchaToken } = req.body
		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return res.status(400).json({
				error: 'Vui lòng xác minh reCAPTCHA.',
			})
		}

		const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'login')
		console.log('reCAPTCHA verification:', {
			action: recaptchaResult.action,
			score: recaptchaResult.score,
			success: recaptchaResult.success,
			email: email,
			timestamp: new Date().toISOString(),
		})
		if (recaptchaResult.score < 0.3) {
			console.warn('🚨 SUSPICIOUS ACTIVITY:', {
				score: recaptchaResult.score,
				email,
				ip: req.ip,
			})
			// Optional: Send to monitoring service (Datadog, Sentry, etc.)
		}
		if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
			return res.status(400).json({
				error: 'Xác minh reCAPTCHA thất bại. Vui lòng thử lại.',
			})
		}

		// Validate input
		if (!email) {
			return res
				.status(400)
				.json({ error: 'Vui lòng nhập địa chỉ email.' })
		}
		if (!password) {
			return res.status(400).json({ error: 'Vui lòng nhập mật khẩu.' })
		}

		// Find user by email
		const user = await User.findOne({ email })
		if (!user) {
			// Dùng thông báo chung để bảo mật (không tiết lộ email có tồn tại hay không)
			return res
				.status(400)
				.send({ error: 'Email hoặc mật khẩu không đúng.' })
		}

		// Ensure user registered via email, not social provider
		if (user.provider !== EMAIL_PROVIDER.Email) {
			return res.status(400).send({
				error: `Email này đã được đăng ký qua ${user.provider}.`,
			})
		}

		// Ensure user has a password set
		if (!user.password) {
			return res
				.status(400)
				.json({ error: 'Tài khoản chưa được thiết lập mật khẩu.' })
		}

		// Check password FIRST before checking verification status
		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) {
			// Dùng thông báo chung để bảo mật
			return res.status(400).json({
				success: false,
				error: 'Email hoặc mật khẩu không đúng.',
			})
		}

		// Only after password is verified, check if account needs OTP verification
		if (!user.isVerified) {
			// Generate new OTP and send to user
			const { otp, expires } = generateOTPWithExpiry()
			user.otp = otp
			user.otpExpires = expires
			await user.save()

			// Send OTP email
			await MailService.sendMail(user.email, 'register-otp', {
				otp,
				expiresIn: '10 minutes',
				name: { firstName: user.firstName, lastName: user.lastName },
			})

			console.log('✅ OTP resent for unverified login:', email)
			console.log('🔐 OTP (DEV ONLY):', otp)

			// Return special response for frontend to redirect to OTP page
			return res.status(200).json({
				success: false,
				needsVerification: true,
				email: user.email,
				message: 'Tài khoản chưa được xác thực. Mã OTP đã được gửi đến email của bạn.',
			})
		}

		// Create JWT token
		const payload = { id: user.id as string }
		const token = jwt.sign(payload, secret as jwt.Secret, {
			expiresIn: tokenLife as any,
		})

		// Respond with user info and token
		res.status(200).json({
			success: true,
			token: `Bearer ${token}`,
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: `${user.firstName} ${user.lastName}`,
				email: user.email,
				address: user.address,
				role: user.role,
			},
		})
	} catch (error: any) {
		// Handle errors
		res.status(400).json({
			error:
				error.message ||
				'Your request could not be processed. Please try again.',
		})
	}
})

/**
 * Registration route.
 * Registers a new user and sends a signup email.
 *
 * @route POST /register
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
	try {
		const {
			email,
			firstName,
			lastName,
			password,
			address,
			recaptchaToken,
		} = req.body
		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return res.status(400).json({
				error: 'Vui lòng xác minh reCAPTCHA.',
			})
		}

		const recaptchaResult = await verifyRecaptcha(
			recaptchaToken,
			'register'
		)
		console.log('reCAPTCHA verification:', {
			action: recaptchaResult.action,
			score: recaptchaResult.score,
			success: recaptchaResult.success,
			email: email,
			timestamp: new Date().toISOString(),
		})
		if (recaptchaResult.score < 0.3) {
			console.warn('🚨 SUSPICIOUS ACTIVITY:', {
				score: recaptchaResult.score,
				email,
				ip: req.ip,
			})
			// Optional: Send to monitoring service (Datadog, Sentry, etc.)
		}
		if (!recaptchaResult.success || recaptchaResult.score < 0.6) {
			return res.status(400).json({
				error: 'Xác minh reCAPTCHA thất bại. Vui lòng thử lại.',
			})
		}

		// Validate input
		if (!email) {
			return res
				.status(400)
				.json({ error: 'Vui lòng nhập địa chỉ email.' })
		}
		if (!firstName || !lastName) {
			return res
				.status(400)
				.json({ error: 'Vui lòng nhập họ và tên.' })
		}
		if (!password) {
			return res.status(400).json({ error: 'Vui lòng nhập mật khẩu.' })
		}

		// Check if user already exists
		if (await User.findOne({ email })) {
			return res
				.status(400)
				.json({ error: 'Email này đã được sử dụng.' })
		}

		// Hash password
		const salt = await bcrypt.genSalt(10)
		const hash = await bcrypt.hash(password, salt)
		const { otp, expires } = generateOTPWithExpiry()
		// Create new user
		const user = new User()
		user.email = email
		user.password = hash
		user.firstName = firstName
		user.lastName = lastName
		user.address = address
		user.isVerified = false // ✅ Not verified yet
		user.otp = otp // ✅ Store OTP
		user.otpExpires = expires // ✅ Store expiry
		// Save user to database
		const registeredUser = await user.save()

		// Send signup email
		await MailService.sendMail(registeredUser.email, 'register-otp', {
			otp,
			expiresIn: '10 minutes',
			name: { firstName, lastName },
		})
		console.log('✅ Registration OTP sent to:', email)
		console.log('🔐 OTP (DEV ONLY):', otp) // ⚠️ Remove in production!
		// Create JWT token
		const token = jwt.sign({ id: registeredUser.id }, secret, {
			expiresIn: tokenLife as any,
		})

		// Respond with user info and token
		res.status(200).json({
			success: true,
			message:
				'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.',
			email: registeredUser.email, // Send email back for OTP verification step
		})
	} catch (error: any) {
		// Handle errors
		res.status(400).json({
			error:
				error.message ||
				'Không thể xử lý yêu cầu. Vui lòng thử lại.',
		})
	}
})

/**
 * ✅ NEW: Verify registration OTP
 * @route POST /verify-otp
 */
router.post('/verify-otp', authLimiter, async (req: Request, res: Response) => {
	try {
		const { email, otpCode } = req.body

		// Validate input
		if (!email || !otpCode) {
			return res.status(400).json({
				error: 'Vui lòng nhập email và mã OTP.',
			})
		}

		// Find user
		const user = await User.findOne({ email })

		if (!user) {
			return res.status(400).json({
				error: 'Email hoặc mã OTP không hợp lệ.',
			})
		}

		// Check if already verified
		if (user.isVerified) {
			return res.status(400).json({
				error: 'Tài khoản đã được xác thực. Vui lòng đăng nhập.',
			})
		}

		// Verify OTP
		const verification = verifyOTP(user.otp, otpCode, user.otpExpires)

		if (!verification.valid) {
			return res.status(400).json({
				error: verification.reason,
			})
		}

		// ✅ Mark user as verified
		user.isVerified = true
		user.otp = undefined // Clear OTP
		user.otpExpires = undefined
		await user.save()

		// ✅ Send welcome email
		await MailService.sendMail(user.email, 'signup', {
			name: { firstName: user.firstName, lastName: user.lastName },
		})

		// ✅ Generate JWT token
		const token = jwt.sign({ id: user.id }, secret, {
			expiresIn: tokenLife as any,
		})

		console.log('✅ User verified and logged in:', email)

		// Respond with user info and token
		res.status(200).json({
			success: true,
			message: 'Xác thực email thành công! Chào mừng bạn!',
			token: `Bearer ${token}`,
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				fullName: `${user.firstName} ${user.lastName}`,
				address: user.address,
				role: user.role,
			},
		})
	} catch (error: any) {
		console.error('❌ Verify OTP error:', error)
		res.status(400).json({
			error: error.message || 'Không thể xác thực OTP.',
		})
	}
})

/**
 * ✅ NEW: Resend registration OTP
 * @route POST /resend-otp
 */
router.post('/resend-otp', authLimiter, async (req: Request, res: Response) => {
	try {
		const { email } = req.body
		console.log('🔵 [RESEND OTP] Request for:', email) // ✅ ADD
		// Validate input
		if (!email) {
			return res.status(400).json({
				error: 'Vui lòng nhập địa chỉ email.',
			})
		}

		// Find user
		const user = await User.findOne({ email })

		if (!user) {
			console.log('❌ [RESEND OTP] User not found:', email)
			return res.status(400).json({
				error: 'Không tìm thấy tài khoản với email này.',
			})
		}

		// Check if already verified
		if (user.isVerified) {
			console.log('⚠️ [RESEND OTP] Already verified:', email)
			return res.status(400).json({
				error: 'Tài khoản đã được xác thực. Vui lòng đăng nhập.',
			})
		}

		// ✅ Generate new OTP
		const { otp, expires } = generateOTPWithExpiry()

		user.otp = otp
		user.otpExpires = expires
		await user.save()

		// Send OTP email
		await MailService.sendMail(user.email, 'register-otp', {
			otp,
			expiresIn: '10 minutes',
			name: { firstName: user.firstName, lastName: user.lastName },
		})

		console.log('✅ OTP resent to:', email)
		console.log('🔐 OTP (DEV ONLY):', otp)

		res.status(200).json({
			success: true,
			message: 'Mã OTP mới đã được gửi đến email của bạn.',
		})
	} catch (error: any) {
		console.error('❌ Resend OTP error:', error)
		res.status(400).json({
			error: error.message || 'Không thể gửi lại mã OTP.',
		})
	}
})

/**
 * ✅ NEW: Request password reset OTP
 * @route POST /auth/forgot-password
 */
router.post(
	'/forgot-password',
	authLimiter,
	async (req: Request, res: Response) => {
		try {
			const { email, recaptchaToken } = req.body

			// Verify reCAPTCHA
			if (!recaptchaToken) {
				return res.status(400).json({
					error: 'Vui lòng xác minh reCAPTCHA.',
				})
			}

			const recaptchaResult = await verifyRecaptcha(
				recaptchaToken,
				'forgot_password'
			)

			console.log('reCAPTCHA verification:', {
				action: recaptchaResult.action,
				score: recaptchaResult.score,
				email,
			})

			if (!recaptchaResult.success || recaptchaResult.score < 0.4) {
				return res.status(400).json({
					error: 'Xác minh reCAPTCHA thất bại.',
				})
			}

			// Validate email
			if (!email) {
				return res.status(400).json({
					error: 'Vui lòng nhập địa chỉ email.',
				})
			}

			// Find user
			const user = await User.findOne({ email })

			if (!user) {
				// ⚠️ Security: Don't reveal if email exists
				return res.status(200).json({
					success: true,
					message:
						'Nếu email tồn tại, mã OTP đã được gửi.',
				})
			}

			// Generate OTP
			const { otp, expires } = generateOTPWithExpiry()

			// Save OTP to user
			user.otp = otp
			user.otpExpires = expires
			await user.save()

			// Send OTP email
			await MailService.sendMail(user.email, 'reset-otp', {
				otp,
				expiresIn: '10 minutes',
				name: { firstName: user.firstName, lastName: user.lastName },
			})

			console.log('✅ OTP sent to:', email)
			console.log('🔐 OTP (DEV ONLY):', otp) // ⚠️ Remove in production!

			res.status(200).json({
				success: true,
				message: 'Mã OTP đã được gửi đến email của bạn.',
			})
		} catch (error: any) {
			console.error('❌ Forgot password error:', error)
			res.status(400).json({
				error: error.message || 'Không thể xử lý yêu cầu.',
			})
		}
	}
)

/**
 * ✅ NEW: Verify OTP and generate reset token
 * @route POST /auth/verify-reset-otp
 */
router.post(
	'/verify-reset-otp',
	authLimiter,
	async (req: Request, res: Response) => {
		try {
			const { email, otp } = req.body

			// Validate input
			if (!email || !otp) {
				return res.status(400).json({
					error: 'Vui lòng nhập email và mã OTP.',
				})
			}

			// Find user
			const user = await User.findOne({ email })

			if (!user) {
				return res.status(400).json({
					error: 'Email hoặc mã OTP không hợp lệ.',
				})
			}

			// Verify OTP
			const verification = verifyOTP(user.otp, otp, user.otpExpires)

			if (!verification.valid) {
				return res.status(400).json({
					error: verification.reason,
				})
			}

			// Generate reset token (valid for 30 minutes)
			const resetToken = crypto.randomBytes(32).toString('hex')
			user.resetPasswordToken = resetToken
			user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000)

			// Clear OTP
			user.otp = undefined
			user.otpExpires = undefined

			await user.save()

			console.log('✅ OTP verified for:', email)

			res.status(200).json({
				success: true,
				message: 'Xác thực OTP thành công.',
				resetToken, // Send to frontend
			})
		} catch (error: any) {
			console.error('❌ Verify OTP error:', error)
			res.status(400).json({
				error: error.message || 'Không thể xác thực OTP.',
			})
		}
	}
)

/**
 * ✅ NEW: Reset password with token
 * @route POST /auth/reset-password
 */
router.post(
	'/reset-password',
	authLimiter,
	async (req: Request, res: Response) => {
		try {
			const { resetToken, newPassword } = req.body

			// Validate input
			if (!resetToken || !newPassword) {
				return res.status(400).json({
					error: 'Vui lòng cung cấp mã xác thực và mật khẩu mới.',
				})
			}

			if (newPassword.length < 6) {
				return res.status(400).json({
					error: 'Mật khẩu phải có ít nhất 6 ký tự.',
				})
			}

			// Find user by reset token
			const user = await User.findOne({
				resetPasswordToken: resetToken,
				resetPasswordExpires: { $gt: Date.now() },
			})

			if (!user) {
				return res.status(400).json({
					error: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
				})
			}

			// Hash new password
			const salt = await bcrypt.genSalt(10)
			const hash = await bcrypt.hash(newPassword, salt)

			// Update password and clear reset fields
			user.password = hash
			user.resetPasswordToken = undefined
			user.resetPasswordExpires = undefined
			user.otp = undefined
			user.otpExpires = undefined

			await user.save()

			// Send confirmation email
			await MailService.sendMail(user.email, 'reset-confirmation', {
				name: { firstName: user.firstName, lastName: user.lastName },
			})

			console.log('✅ Password reset for:', user.email)

			res.status(200).json({
				success: true,
				message:
					'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
			})
		} catch (error: any) {
			console.error('❌ Reset password error:', error)
			res.status(400).json({
				error: error.message || 'Không thể đặt lại mật khẩu.',
			})
		}
	}
)

/**
 * Forgot password route.
 * Sends a password reset email to the user.
 *
 * @route POST /forgot
 */
router.post('/forgot', authLimiter, async (req: Request, res: Response) => {
	try {
		const { email, recaptchaToken } = req.body
		if (!recaptchaToken) {
			return res.status(400).json({
				error: 'reCAPTCHA token is required.',
			})
		}

		const recaptchaResult = await verifyRecaptcha(
			recaptchaToken,
			'forgot_password'
		)
		console.log('reCAPTCHA verification:', {
			action: recaptchaResult.action,
			score: recaptchaResult.score,
			success: recaptchaResult.success,
			email: email,
			timestamp: new Date().toISOString(),
		})
		if (recaptchaResult.score < 0.3) {
			console.warn('🚨 SUSPICIOUS ACTIVITY:', {
				score: recaptchaResult.score,
				email,
				ip: req.ip,
			})
			// Optional: Send to monitoring service (Datadog, Sentry, etc.)
		}
		if (!recaptchaResult.success || recaptchaResult.score < 0.4) {
			return res.status(400).json({
				error: 'reCAPTCHA verification failed.',
			})
		}
		// Validate input
		if (!email) {
			return res
				.status(400)
				.json({ error: 'You must enter an email address.' })
		}

		// Find user by email
		const existingUser = await User.findOne({ email })
		if (!existingUser) {
			return res
				.status(400)
				.send({ error: 'No user found for this email address.' })
		}

		// Generate reset token
		const buffer = crypto.randomBytes(48)
		const resetToken = buffer.toString('hex')

		// Set reset token and expiry on user
		existingUser.resetPasswordToken = resetToken
		existingUser.resetPasswordExpires = new Date(Date.now() + 3600000) // 1 hour
		await existingUser.save()

		// Send reset email
		await MailService.sendMail(existingUser.email, 'reset', { resetToken })

		res.status(200).json({
			success: true,
			message:
				'Please check your email for the link to reset your password.',
		})
	} catch (error: any) {
		// Handle errors
		res.status(400).json({
			error:
				error.message ||
				'Your request could not be processed. Please try again.',
		})
	}
})

/**
 * Password reset route (with token).
 * Resets the user's password using a reset token.
 *
 * @route POST /reset/:token
 */
router.post('/reset/:token', async (req: Request, res: Response) => {
	try {
		const { password } = req.body

		// Validate input
		if (!password) {
			return res.status(400).json({ error: 'You must enter a password.' })
		}

		// Find user by reset token and check expiry
		const resetUser = await User.findOne({
			resetPasswordToken: req.params.token,
			resetPasswordExpires: { $gt: Date.now() },
		})
		if (!resetUser) {
			return res.status(400).json({
				error: 'Your token has expired. Please attempt to reset your password again.',
			})
		}

		// Hash new password
		const salt = await bcrypt.genSalt(10)
		const hash = await bcrypt.hash(password, salt)

		// Update user password and clear reset token
		resetUser.password = hash
		resetUser.resetPasswordToken = undefined
		resetUser.resetPasswordExpires = undefined
		await resetUser.save()

		// Send confirmation email
		await MailService.sendMail(resetUser.email, 'reset-confirmation', {})

		res.status(200).json({
			success: true,
			message:
				'Password changed successfully. Please login with your new password.',
		})
	} catch (error: any) {
		// Handle errors
		res.status(400).json({
			error:
				error.message ||
				'Your request could not be processed. Please try again.',
		})
	}
})

/**
 * Authenticated password reset route.
 * Allows logged-in users to change their password.
 *
 * @route POST /reset
 */
router.post('/reset', Auth, async (req: Request, res: Response) => {
	try {
		const { password, confirmPassword } = req.body
		const email = (req.user as any).email

		// Validate input and authentication
		if (!email) {
			return res.status(401).send('Unauthenticated')
		}
		if (!password) {
			return res.status(400).json({ error: 'You must enter a password.' })
		}

		// Find user by email
		const existingUser = await User.findOne({ email })
		if (!existingUser) {
			return res
				.status(400)
				.json({ error: 'That email address is already in use.' })
		}

		// Check old password
		const isMatch = await bcrypt.compare(
			password,
			existingUser.password as string
		)
		if (!isMatch) {
			return res
				.status(400)
				.json({ error: 'Please enter your correct old password.' })
		}

		// Hash new password
		const salt = await bcrypt.genSalt(10)
		const hash = await bcrypt.hash(confirmPassword, salt)
		existingUser.password = hash
		await existingUser.save()

		// Send confirmation email
		await MailService.sendMail(existingUser.email, 'reset-confirmation', {})

		res.status(200).json({
			success: true,
			message:
				'Password changed successfully. Please login with your new password.',
		})
	} catch (error: any) {
		// Handle errors
		res.status(400).json({
			error:
				error.message ||
				'Your request could not be processed. Please try again.',
		})
	}
})

/**
 * Get current user route.
 * Returns current authenticated user's information.
 *
 * @route GET /me
 */
router.get('/me', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any).id

		console.log('🔄 Fetching user info for ID:', userId)

		// Find user by ID
		const user = await User.findById(userId).select('-password') // Exclude password

		if (!user) {
			console.log('❌ User not found:', userId)
			return res.status(404).json({
				error: 'User not found.',
			})
		}

		console.log('✅ User found:', user.email)

		// Respond with user info
		res.status(200).json({
			success: true,
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: `${user.firstName} ${user.lastName}`,
				email: user.email,
				address: user.address,
				role: user.role,
				provider: user.provider,
				createdAt: user.createdAt,
				sellerExpiryDate: user.sellerExpiryDate, // Add seller expiry date
				upgradeRequestStatus: user.upgradeRequestStatus,
			},
		})
	} catch (error: any) {
		console.error('❌ Get current user error:', error)
		res.status(400).json({
			error:
				error.message ||
				'Your request could not be processed. Please try again.',
		})
	}
})

/**
 * Logout route.
 * Logs out the current user.
 *
 * @route POST /logout
 */
router.post('/logout', Auth, async (req: Request, res: Response) => {
	try {
		const userId = (req.user as any).id
		const userEmail = (req.user as any).email

		console.log('✅ User logged out:', { id: userId, email: userEmail })

		res.status(200).json({
			success: true,
			message: 'Logged out successfully.',
		})
	} catch (error: any) {
		console.error('❌ Logout error:', error)
		res.status(400).json({
			error: error.message || 'Failed to logout.',
		})
	}
})

/**
 * Google OAuth login route.
 * Redirects to Google for authentication.
 *
 * @route GET /google
 */
router.get(
	'/google',
	passport.authenticate('google', {
		session: false,
		scope: ['profile', 'email'],
		accessType: 'offline',
		approvalPrompt: 'force',
	} as any)
)

/**
 * Google OAuth callback route.
 * Handles Google authentication response and redirects to client.
 *
 * @route GET /google/callback
 */
router.get(
	'/google/callback',
	passport.authenticate('google', {
		failureRedirect: `${Keys.app.clientURL}/login`,
		session: false,
	}),
	(req: Request, res: Response) => {
		// Generate JWT token for authenticated user
		const payload = { id: (req.user as any).id }
		const token = jwt.sign(payload, secret, { expiresIn: tokenLife as any })
		const jwtToken = `Bearer ${token}`

		// Redirect to client with token
		res.redirect(`${Keys.app.clientURL}/Auth/success?token=${jwtToken}`)
	}
)

export default router
