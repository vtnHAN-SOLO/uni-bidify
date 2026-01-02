import assert from 'assert'
import type { Name, Email } from '../../Data/Types/index.js'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format currency in Vietnamese Dong
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
	}).format(amount)
}

/**
 * Format date in Vietnamese locale
 */
function formatDate(date: Date | string): string {
	return new Date(date).toLocaleString('vi-VN', {
		dateStyle: 'full',
		timeStyle: 'short',
	})
}

/**
 * Generate HTML email wrapper
 */
function wrapHtml(content: string): string {
	return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
        .success { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }
        .warning { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0; }
        .info { background: #d1ecf1; padding: 15px; border-left: 4px solid #17a2b8; margin: 15px 0; }
        .product-info { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .price { font-size: 24px; color: #28a745; font-weight: bold; }
        .otp-code { font-size: 32px; letter-spacing: 8px; background: #333; color: white; padding: 15px 30px; border-radius: 8px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        ${content}
        <div class="footer">
            <p>© ${new Date().getFullYear()} AuctionHub. Tất cả quyền được bảo lưu.</p>
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
    </div>
</body>
</html>`
}

// ============================================
// AUTH EMAIL TEMPLATES
// ============================================

/**
 * Registration OTP Email Template
 */
function registrationOtpEmail(data: {
	otp: string
	expiresIn: string
	name: Name
}): Email {
	const { otp, expiresIn, name } = data
	const fullName = `${name.firstName} ${name.lastName}`

	const html = wrapHtml(`
        <div class="header">
            <h1>Chao mung den AuctionHub!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${fullName}</strong>,</p>
            <p>Cam on ban da dang ky tai khoan tai AuctionHub! De hoan tat dang ky, vui long nhap ma OTP sau:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div class="otp-code">${otp}</div>
            </div>
            <div class="warning">
                <strong>Luu y:</strong> Ma OTP se het han sau ${expiresIn}.
            </div>
            <div class="info">
                <strong>Bao mat:</strong>
                <ul>
                    <li>Khong chia se ma OTP nay voi bat ky ai</li>
                    <li>AuctionHub se khong bao gio yeu cau ma OTP qua dien thoai</li>
                    <li>Neu ban khong tao tai khoan nay, hay bo qua email nay</li>
                </ul>
            </div>
        </div>
    `)

	return {
		subject: 'Xac thuc tai khoan AuctionHub - Ma OTP cua ban',
		text: `Xin chao ${fullName},\n\nMa OTP cua ban la: ${otp}\nMa se het han sau ${expiresIn}.\n\nAuctionHub Team`,
		html,
	}
}

/**
 * Reset Password OTP Email Template
 */
function resetPasswordOtpEmail(data: {
	otp: string
	expiresIn: string
	name: Name
}): Email {
	const { otp, expiresIn, name } = data
	const fullName = `${name.firstName} ${name.lastName}`

	const html = wrapHtml(`
        <div class="header">
            <h1>Dat lai mat khau</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${fullName}</strong>,</p>
            <p>Ban da yeu cau dat lai mat khau. Vui long su dung ma OTP sau:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div class="otp-code">${otp}</div>
            </div>
            <div class="warning">
                <strong>Luu y:</strong> Ma OTP se het han sau ${expiresIn}.
            </div>
            <div class="info">
                <strong>Bao mat:</strong> Neu ban khong yeu cau dat lai mat khau, hay bo qua email nay va bao mat tai khoan ngay.
            </div>
        </div>
    `)

	return {
		subject: 'Dat lai mat khau - Ma OTP cua ban',
		text: `Xin chao ${fullName},\n\nMa OTP dat lai mat khau: ${otp}\nMa se het han sau ${expiresIn}.\n\nAuctionHub Team`,
		html,
	}
}

/**
 * Password Reset Confirmation Email
 */
function confirmResetPasswordEmail(): Email {
	const html = wrapHtml(`
        <div class="header">
            <h1>Mat khau da duoc thay doi</h1>
        </div>
        <div class="content">
            <div class="success">
                <p>Mat khau cua ban da duoc thay doi thanh cong.</p>
            </div>
            <div class="warning">
                <strong>Canh bao:</strong> Neu ban khong thuc hien thay doi nay, vui long lien he voi chung toi ngay lap tuc.
            </div>
        </div>
    `)

	return {
		subject: 'Mat khau da duoc thay doi thanh cong',
		text: 'Mat khau cua ban da duoc thay doi thanh cong. Neu ban khong thuc hien thay doi nay, vui long lien he voi chung toi ngay.',
		html,
	}
}

/**
 * Signup Welcome Email
 */
function signupEmail(name: Name): Email {
	const fullName = `${name.firstName} ${name.lastName}`

	const html = wrapHtml(`
        <div class="header">
            <h1>Chao mung den AuctionHub!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${fullName}</strong>,</p>
            <div class="success">
                <p>Tai khoan cua ban da duoc xac thuc thanh cong!</p>
            </div>
            <p>Ban da san sang de:</p>
            <ul>
                <li>Kham pha hang nghin san pham dau gia</li>
                <li>Tham gia dau gia cac san pham yeu thich</li>
                <li>Mua ngay voi gia tot nhat</li>
            </ul>
            <div style="text-align: center;">
                <a href="#" class="btn">Bat dau kham pha ngay</a>
            </div>
        </div>
    `)

	return {
		subject: 'Chao mung den AuctionHub!',
		text: `Xin chao ${fullName}! Tai khoan cua ban da duoc tao thanh cong. Hay bat dau kham pha cac san pham dau gia ngay!`,
		html,
	}
}

// ============================================
// AUCTION EMAIL TEMPLATES
// ============================================

interface BidSuccessData {
	productName: string
	productImage?: string
	bidAmount: number
	previousBid?: number
	endTime: Date | string
	bidderName: string
}

/**
 * Bid Success - Notify Bidder
 */
function bidSuccessBidderEmail(data: BidSuccessData): Email {
	const { productName, bidAmount, endTime, bidderName } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Dat gia thanh cong!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${bidderName}</strong>,</p>
            <div class="success">
                <p>Ban da dat gia thanh cong cho san pham!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Gia dat cua ban: <span class="price">${formatCurrency(bidAmount)}</span></p>
                <p>Thoi gian ket thuc: <strong>${formatDate(endTime)}</strong></p>
            </div>
            <div class="info">
                <strong>Luu y:</strong> Ban co the bi vuot gia bat cu luc nao. Hay theo doi san pham de khong bo lo!
            </div>
        </div>
    `)

	return {
		subject: `Dat gia thanh cong - ${productName}`,
		text: `Xin chao ${bidderName},\n\nBan da dat gia ${formatCurrency(bidAmount)} cho san pham "${productName}".\nThoi gian ket thuc: ${formatDate(endTime)}`,
		html,
	}
}

/**
 * Bid Success - Notify Seller
 */
function bidSuccessSellerEmail(data: BidSuccessData & { sellerName: string }): Email {
	const { productName, bidAmount, endTime, bidderName, sellerName } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Co luot dat gia moi!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${sellerName}</strong>,</p>
            <div class="success">
                <p>San pham cua ban vua nhan duoc luot dat gia moi!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Nguoi dat: <strong>${bidderName}</strong></p>
                <p>Gia moi: <span class="price">${formatCurrency(bidAmount)}</span></p>
                <p>Thoi gian ket thuc: <strong>${formatDate(endTime)}</strong></p>
            </div>
        </div>
    `)

	return {
		subject: `Luot dat gia moi - ${productName}`,
		text: `Xin chao ${sellerName},\n\nSan pham "${productName}" vua nhan duoc luot dat gia moi tu ${bidderName}.\nGia hien tai: ${formatCurrency(bidAmount)}`,
		html,
	}
}

/**
 * Bid Outbid - Notify Previous Bidder
 */
function bidOutbidEmail(data: {
	productName: string
	previousBid: number
	newBid: number
	outbidderName: string
	previousBidderName: string
	endTime: Date | string
}): Email {
	const { productName, previousBid, newBid, previousBidderName, endTime } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Ban da bi vuot gia!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${previousBidderName}</strong>,</p>
            <div class="warning">
                <p>Co nguoi khac da dat gia cao hon ban cho san pham nay!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Gia cua ban: <s style="color: #999;">${formatCurrency(previousBid)}</s></p>
                <p>Gia hien tai: <span class="price">${formatCurrency(newBid)}</span></p>
                <p>Thoi gian ket thuc: <strong>${formatDate(endTime)}</strong></p>
            </div>
            <div style="text-align: center;">
                <a href="#" class="btn">Dat gia ngay</a>
            </div>
        </div>
    `)

	return {
		subject: `Ban da bi vuot gia - ${productName}`,
		text: `Xin chao ${previousBidderName},\n\nBan da bi vuot gia cho san pham "${productName}".\nGia cua ban: ${formatCurrency(previousBid)}\nGia hien tai: ${formatCurrency(newBid)}\nThoi gian ket thuc: ${formatDate(endTime)}`,
		html,
	}
}

/**
 * Bid Rejected - Notify Bidder
 */
function bidRejectedEmail(data: {
	productName: string
	bidAmount: number
	bidderName: string
	reason: string
}): Email {
	const { productName, bidAmount, bidderName, reason } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Luot dat gia bi tu choi</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${bidderName}</strong>,</p>
            <div class="warning">
                <p>Rat tiec, luot dat gia cua ban da bi tu choi.</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Gia da dat: ${formatCurrency(bidAmount)}</p>
                <p><strong>Ly do:</strong> ${reason}</p>
            </div>
            <div class="info">
                <p>Neu ban co thac mac, vui long lien he voi chung toi de duoc ho tro.</p>
            </div>
        </div>
    `)

	return {
		subject: `Luot dat gia bi tu choi - ${productName}`,
		text: `Xin chao ${bidderName},\n\nLuot dat gia ${formatCurrency(bidAmount)} cua ban cho san pham "${productName}" da bi tu choi.\nLy do: ${reason}`,
		html,
	}
}

/**
 * Auction Ended - No Winner (Notify Seller)
 */
function auctionEndedNoWinnerEmail(data: {
	productName: string
	sellerName: string
	startPrice: number
	endTime: Date | string
}): Email {
	const { productName, sellerName, startPrice, endTime } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Dau gia da ket thuc</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${sellerName}</strong>,</p>
            <div class="highlight">
                <p>Phien dau gia san pham cua ban da ket thuc nhung khong co nguoi thang.</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Gia khoi diem: ${formatCurrency(startPrice)}</p>
                <p>Ket thuc luc: ${formatDate(endTime)}</p>
            </div>
            <div class="info">
                <p>Ban co the dang lai san pham hoac dieu chinh gia khoi diem de thu hut nguoi mua.</p>
            </div>
        </div>
    `)

	return {
		subject: `Dau gia ket thuc - Khong co nguoi thang - ${productName}`,
		text: `Xin chao ${sellerName},\n\nPhien dau gia san pham "${productName}" da ket thuc nhung khong co nguoi thang.`,
		html,
	}
}

/**
 * Auction Ended - Notify Winner
 */
function auctionEndedWinnerEmail(data: {
	productName: string
	winnerName: string
	winningBid: number
	sellerName: string
	endTime: Date | string
}): Email {
	const { productName, winnerName, winningBid, sellerName, endTime } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Chuc mung! Ban da thang dau gia!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${winnerName}</strong>,</p>
            <div class="success">
                <p>Chuc mung! Ban la nguoi thang dau gia!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Gia thang: <span class="price">${formatCurrency(winningBid)}</span></p>
                <p>Nguoi ban: <strong>${sellerName}</strong></p>
                <p>Ket thuc luc: ${formatDate(endTime)}</p>
            </div>
            <div class="info">
                <p><strong>Buoc tiep theo:</strong> Vui long lien he voi nguoi ban de hoan tat giao dich va thanh toan.</p>
            </div>
        </div>
    `)

	return {
		subject: `Chuc mung! Ban da thang dau gia - ${productName}`,
		text: `Xin chao ${winnerName},\n\nChuc mung! Ban da thang dau gia san pham "${productName}" voi gia ${formatCurrency(winningBid)}.\nVui long lien he nguoi ban ${sellerName} de hoan tat giao dich.`,
		html,
	}
}

/**
 * Auction Ended - Notify Seller (with winner)
 */
function auctionEndedSellerEmail(data: {
	productName: string
	sellerName: string
	winnerName: string
	winnerEmail: string
	winningBid: number
	endTime: Date | string
}): Email {
	const { productName, sellerName, winnerName, winnerEmail, winningBid, endTime } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Dau gia ket thuc thanh cong!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${sellerName}</strong>,</p>
            <div class="success">
                <p>Phien dau gia san pham cua ban da ket thuc thanh cong!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Gia thang: <span class="price">${formatCurrency(winningBid)}</span></p>
                <p>Nguoi thang: <strong>${winnerName}</strong></p>
                <p>Email: <a href="mailto:${winnerEmail}">${winnerEmail}</a></p>
                <p>Ket thuc luc: ${formatDate(endTime)}</p>
            </div>
            <div class="info">
                <p><strong>Buoc tiep theo:</strong> Vui long lien he voi nguoi thang de thoa thuan viec giao hang va thanh toan.</p>
            </div>
        </div>
    `)

	return {
		subject: `Dau gia ket thuc - ${productName}`,
		text: `Xin chao ${sellerName},\n\nPhien dau gia san pham "${productName}" da ket thuc.\nNguoi thang: ${winnerName} (${winnerEmail})\nGia thang: ${formatCurrency(winningBid)}`,
		html,
	}
}

// ============================================
// QUESTION EMAIL TEMPLATES
// ============================================

/**
 * New Question - Notify Seller
 */
function questionAskedEmail(data: {
	productName: string
	sellerName: string
	buyerName: string
	question: string
}): Email {
	const { productName, sellerName, buyerName, question } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Co cau hoi moi!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${sellerName}</strong>,</p>
            <div class="highlight">
                <p>Ban co cau hoi moi ve san pham dau gia!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p><strong>Nguoi hoi:</strong> ${buyerName}</p>
                <p><strong>Cau hoi:</strong></p>
                <blockquote style="border-left: 3px solid #667eea; padding-left: 15px; margin: 15px 0; font-style: italic;">
                    "${question}"
                </blockquote>
            </div>
            <div style="text-align: center;">
                <a href="#" class="btn">Tra loi ngay</a>
            </div>
        </div>
    `)

	return {
		subject: `Cau hoi moi ve san pham - ${productName}`,
		text: `Xin chao ${sellerName},\n\nBan co cau hoi moi tu ${buyerName} ve san pham "${productName}":\n"${question}"`,
		html,
	}
}

/**
 * Question Answered - Notify Bidders
 */
function questionAnsweredEmail(data: {
	productName: string
	recipientName: string
	sellerName: string
	question: string
	answer: string
}): Email {
	const { productName, recipientName, sellerName, question, answer } = data

	const html = wrapHtml(`
        <div class="header">
            <h1>Nguoi ban da tra loi!</h1>
        </div>
        <div class="content">
            <p>Xin chao <strong>${recipientName}</strong>,</p>
            <div class="info">
                <p>Nguoi ban da tra loi cau hoi ve san pham ban quan tam!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p><strong>Cau hoi:</strong></p>
                <blockquote style="border-left: 3px solid #667eea; padding-left: 15px; margin: 15px 0; font-style: italic;">
                    "${question}"
                </blockquote>
                <p><strong>Tra loi tu ${sellerName}:</strong></p>
                <blockquote style="border-left: 3px solid #28a745; padding-left: 15px; margin: 15px 0; background: #f0fff0; padding: 15px;">
                    "${answer}"
                </blockquote>
            </div>
        </div>
    `)

	return {
		subject: `Cau hoi da duoc tra loi - ${productName}`,
		text: `Xin chao ${recipientName},\n\nNguoi ban ${sellerName} da tra loi cau hoi ve san pham "${productName}":\n\nCau hoi: "${question}"\nTra loi: "${answer}"`,
		html,
	}
}

// ============================================
// LEGACY TEMPLATES (for backward compatibility)
// ============================================

function resetPasswordEmail(resetToken: string): Email {
	return {
		subject: 'Reset Password',
		text:
			'You are receiving this because you have requested to reset your password for your account.\n\n' +
			'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
			`https://reset-password/${resetToken}\n\n` +
			'If you did not request this, please ignore this email and your password will remain unchanged.\n',
	}
}

function contactEmail(): Email {
	return {
		subject: 'Contact Us',
		text: 'We received your message! Our team will contact you soon. \n\n',
	}
}

// ============================================
// TEMPLATE DISPATCHER
// ============================================

/**
 * Prepare email template based on type
 *
 * @param type - type of email
 * @param data - Data for the email
 * @returns The prepared email template or null if type is unknown
 */
export default function (type: string, data: any): Email | null {
	let message: Email | null = null

	switch (type) {
		// Auth templates
		case 'signup':
			assert(data.name, 'Name data is required for signup email')
			message = signupEmail(data.name)
			break

		case 'register-otp':
			assert(data.otp, 'OTP is required')
			assert(data.expiresIn, 'Expiry time is required')
			assert(data.name, 'Name data is required')
			message = registrationOtpEmail(data)
			break

		case 'reset-otp':
			assert(data.otp, 'OTP is required')
			assert(data.expiresIn, 'Expiry time is required')
			assert(data.name, 'Name data is required')
			message = resetPasswordOtpEmail(data)
			break

		case 'reset':
			assert(data.resetToken, 'Reset token is required')
			message = resetPasswordEmail(data.resetToken)
			break

		case 'reset-confirmation':
			message = confirmResetPasswordEmail()
			break

		case 'contact':
			message = contactEmail()
			break

		// Auction - Bid templates
		case 'bid-success-bidder':
			message = bidSuccessBidderEmail(data)
			break

		case 'bid-success-seller':
			message = bidSuccessSellerEmail(data)
			break

		case 'bid-outbid':
			message = bidOutbidEmail(data)
			break

		case 'bid-rejected':
			message = bidRejectedEmail(data)
			break

		// Auction - End templates
		case 'auction-ended-no-winner':
			message = auctionEndedNoWinnerEmail(data)
			break

		case 'auction-ended-winner':
			message = auctionEndedWinnerEmail(data)
			break

		case 'auction-ended-seller':
			message = auctionEndedSellerEmail(data)
			break

		// Question templates
		case 'question-asked':
			message = questionAskedEmail(data)
			break

		case 'question-answered':
			message = questionAnsweredEmail(data)
			break

		default:
			console.warn(`Unknown email type: ${type}`)
	}

	return message
}
