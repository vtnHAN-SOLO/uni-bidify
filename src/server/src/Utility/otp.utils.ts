import crypto from 'crypto'

/**
 * Generate 6-digit OTP
 */
export function generateOTP(): string {
	return crypto.randomInt(100000, 999999).toString()
}

/**
 * Generate OTP with expiry (10 minutes)
 */
export function generateOTPWithExpiry(): { otp: string; expires: Date } {
	const otp = generateOTP()
	const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
	return { otp, expires }
}

/**
 * Verify OTP
 */
export function verifyOTP(
	storedOtp: string | null | undefined,
	inputOtp: string,
	expiresAt: Date | null | undefined
): { valid: boolean; reason?: string } {
	if (!storedOtp || !expiresAt) {
		return {
			valid: false,
			reason: 'Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới.',
		}
	}

	if (new Date() > expiresAt) {
		return {
			valid: false,
			reason: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
		}
	}

	if (storedOtp !== inputOtp) {
		return { valid: false, reason: 'Mã OTP không đúng. Vui lòng thử lại.' }
	}

	return { valid: true }
}
