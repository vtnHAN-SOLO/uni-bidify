import assert from 'assert'
import type { Name, Email } from '../../Data/Types/index.js'
import Keys from '../../Config/Keys.js'

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
            <h1>Chào mừng đến AuctionHub!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại AuctionHub! Để hoàn tất đăng ký, vui lòng nhập mã OTP sau:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div class="otp-code">${otp}</div>
            </div>
            <div class="warning">
                <strong>Lưu ý:</strong> Mã OTP sẽ hết hạn sau ${expiresIn}.
            </div>
            <div class="info">
                <strong>Bảo mật:</strong>
                <ul>
                    <li>Không chia sẻ mã OTP này với bất kỳ ai</li>
                    <li>AuctionHub sẽ không bao giờ yêu cầu mã OTP qua điện thoại</li>
                    <li>Nếu bạn không tạo tài khoản này, hãy bỏ qua email này</li>
                </ul>
            </div>
        </div>
    `)

	return {
		subject: 'Xác thực tài khoản AuctionHub - Mã OTP của bạn',
		text: `Xin chào ${fullName},\n\nMã OTP của bạn là: ${otp}\nMã sẽ hết hạn sau ${expiresIn}.\n\nAuctionHub Team`,
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
            <h1>Đặt lại mật khẩu</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP sau:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div class="otp-code">${otp}</div>
            </div>
            <div class="warning">
                <strong>Lưu ý:</strong> Mã OTP sẽ hết hạn sau ${expiresIn}.
            </div>
            <div class="info">
                <strong>Bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này và bảo mật tài khoản ngay.
            </div>
        </div>
    `)

	return {
		subject: 'Đặt lại mật khẩu - Mã OTP của bạn',
		text: `Xin chào ${fullName},\n\nMã OTP đặt lại mật khẩu: ${otp}\nMã sẽ hết hạn sau ${expiresIn}.\n\nAuctionHub Team`,
		html,
	}
}

/**
 * Password Reset Confirmation Email
 */
function confirmResetPasswordEmail(): Email {
	const html = wrapHtml(`
        <div class="header">
            <h1>Mật khẩu đã được thay đổi</h1>
        </div>
        <div class="content">
            <div class="success">
                <p>Mật khẩu của bạn đã được thay đổi thành công.</p>
            </div>
            <div class="warning">
                <strong>Cảnh báo:</strong> Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.
            </div>
        </div>
    `)

	return {
		subject: 'Mật khẩu đã được thay đổi thành công',
		text: 'Mật khẩu của bạn đã được thay đổi thành công. Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay.',
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
            <h1>Chào mừng đến AuctionHub!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <div class="success">
                <p>Tài khoản của bạn đã được xác thực thành công!</p>
            </div>
            <p>Bạn đã sẵn sàng để:</p>
            <ul>
                <li>Khám phá hàng nghìn sản phẩm đấu giá</li>
                <li>Tham gia đấu giá các sản phẩm yêu thích</li>
                <li>Mua ngay với giá tốt nhất</li>
            </ul>
            <div style="text-align: center;">
                <a href="#" class="btn">Bắt đầu khám phá ngay</a>
            </div>
        </div>
    `)

	return {
		subject: 'Chào mừng đến AuctionHub!',
		text: `Xin chào ${fullName}! Tài khoản của bạn đã được tạo thành công. Hãy bắt đầu khám phá các sản phẩm đấu giá ngay!`,
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
            <h1>Đặt giá thành công!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${bidderName}</strong>,</p>
            <div class="success">
                <p>Bạn đã đặt giá thành công cho sản phẩm!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Giá đặt của bạn: <span class="price">${formatCurrency(bidAmount)}</span></p>
                <p>Thời gian kết thúc: <strong>${formatDate(endTime)}</strong></p>
            </div>
            <div class="info">
                <strong>Lưu ý:</strong> Bạn có thể bị vượt giá bất cứ lúc nào. Hãy theo dõi sản phẩm để không bỏ lỡ!
            </div>
        </div>
    `)

	return {
		subject: `Đặt giá thành công - ${productName}`,
		text: `Xin chào ${bidderName},\n\nBạn đã đặt giá ${formatCurrency(bidAmount)} cho sản phẩm "${productName}".\nThời gian kết thúc: ${formatDate(endTime)}`,
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
            <h1>Có lượt đặt giá mới!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${sellerName}</strong>,</p>
            <div class="success">
                <p>Sản phẩm của bạn vừa nhận được lượt đặt giá mới!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Người đặt: <strong>${bidderName}</strong></p>
                <p>Giá mới: <span class="price">${formatCurrency(bidAmount)}</span></p>
                <p>Thời gian kết thúc: <strong>${formatDate(endTime)}</strong></p>
            </div>
        </div>
    `)

	return {
		subject: `Lượt đặt giá mới - ${productName}`,
		text: `Xin chào ${sellerName},\n\nSản phẩm "${productName}" vừa nhận được lượt đặt giá mới từ ${bidderName}.\nGiá hiện tại: ${formatCurrency(bidAmount)}`,
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
	productId: string
}): Email {
	const { productName, previousBid, newBid, previousBidderName, endTime, productId } = data
	const productUrl = `${Keys.app.clientURL}/products/${productId}`

	const html = wrapHtml(`
        <div class="header">
            <h1>Bạn đã bị vượt giá!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${previousBidderName}</strong>,</p>
            <div class="warning">
                <p>Có người khác đã đặt giá cao hơn bạn cho sản phẩm này!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Giá của bạn: <s style="color: #999;">${formatCurrency(previousBid)}</s></p>
                <p>Giá hiện tại: <span class="price">${formatCurrency(newBid)}</span></p>
                <p>Thời gian kết thúc: <strong>${formatDate(endTime)}</strong></p>
            </div>
            <div style="text-align: center;">
                <a href="${productUrl}" class="btn">Đặt giá ngay</a>
            </div>
        </div>
    `)

	return {
		subject: `Bạn đã bị vượt giá - ${productName}`,
		text: `Xin chào ${previousBidderName},\n\nBạn đã bị vượt giá cho sản phẩm "${productName}".\nGiá của bạn: ${formatCurrency(previousBid)}\nGiá hiện tại: ${formatCurrency(newBid)}\nThời gian kết thúc: ${formatDate(endTime)}\n\nĐặt giá ngay: ${productUrl}`,
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
            <h1>Lượt đặt giá bị từ chối</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${bidderName}</strong>,</p>
            <div class="warning">
                <p>Rất tiếc, lượt đặt giá của bạn đã bị từ chối.</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Giá đã đặt: ${formatCurrency(bidAmount)}</p>
                <p><strong>Lý do:</strong> ${reason}</p>
            </div>
            <div class="info">
                <p>Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi để được hỗ trợ.</p>
            </div>
        </div>
    `)

	return {
		subject: `Lượt đặt giá bị từ chối - ${productName}`,
		text: `Xin chào ${bidderName},\n\nLượt đặt giá ${formatCurrency(bidAmount)} của bạn cho sản phẩm "${productName}" đã bị từ chối.\nLý do: ${reason}`,
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
            <h1>Đấu giá đã kết thúc</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${sellerName}</strong>,</p>
            <div class="highlight">
                <p>Phiên đấu giá sản phẩm của bạn đã kết thúc nhưng không có người thắng.</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Giá khởi điểm: ${formatCurrency(startPrice)}</p>
                <p>Kết thúc lúc: ${formatDate(endTime)}</p>
            </div>
            <div class="info">
                <p>Bạn có thể đăng lại sản phẩm hoặc điều chỉnh giá khởi điểm để thu hút người mua.</p>
            </div>
        </div>
    `)

	return {
		subject: `Đấu giá kết thúc - Không có người thắng - ${productName}`,
		text: `Xin chào ${sellerName},\n\nPhiên đấu giá sản phẩm "${productName}" đã kết thúc nhưng không có người thắng.`,
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
            <h1>Chúc mừng! Bạn đã thắng đấu giá!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${winnerName}</strong>,</p>
            <div class="success">
                <p>Chúc mừng! Bạn là người thắng đấu giá!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Giá thắng: <span class="price">${formatCurrency(winningBid)}</span></p>
                <p>Người bán: <strong>${sellerName}</strong></p>
                <p>Kết thúc lúc: ${formatDate(endTime)}</p>
            </div>
            <div class="info">
                <p><strong>Bước tiếp theo:</strong> Vui lòng liên hệ với người bán để hoàn tất giao dịch và thanh toán.</p>
            </div>
        </div>
    `)

	return {
		subject: `Chúc mừng! Bạn đã thắng đấu giá - ${productName}`,
		text: `Xin chào ${winnerName},\n\nChúc mừng! Bạn đã thắng đấu giá sản phẩm "${productName}" với giá ${formatCurrency(winningBid)}.\nVui lòng liên hệ người bán ${sellerName} để hoàn tất giao dịch.`,
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
            <h1>Đấu giá kết thúc thành công!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${sellerName}</strong>,</p>
            <div class="success">
                <p>Phiên đấu giá sản phẩm của bạn đã kết thúc thành công!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Giá thắng: <span class="price">${formatCurrency(winningBid)}</span></p>
                <p>Người thắng: <strong>${winnerName}</strong></p>
                <p>Email: <a href="mailto:${winnerEmail}">${winnerEmail}</a></p>
                <p>Kết thúc lúc: ${formatDate(endTime)}</p>
            </div>
            <div class="info">
                <p><strong>Bước tiếp theo:</strong> Vui lòng liên hệ với người thắng để thỏa thuận việc giao hàng và thanh toán.</p>
            </div>
        </div>
    `)

	return {
		subject: `Đấu giá kết thúc - ${productName}`,
		text: `Xin chào ${sellerName},\n\nPhiên đấu giá sản phẩm "${productName}" đã kết thúc.\nNgười thắng: ${winnerName} (${winnerEmail})\nGiá thắng: ${formatCurrency(winningBid)}`,
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
            <h1>Có câu hỏi mới!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${sellerName}</strong>,</p>
            <div class="highlight">
                <p>Bạn có câu hỏi mới về sản phẩm đấu giá!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p><strong>Người hỏi:</strong> ${buyerName}</p>
                <p><strong>Câu hỏi:</strong></p>
                <blockquote style="border-left: 3px solid #667eea; padding-left: 15px; margin: 15px 0; font-style: italic;">
                    "${question}"
                </blockquote>
            </div>
            <div style="text-align: center;">
                <a href="#" class="btn">Trả lời ngay</a>
            </div>
        </div>
    `)

	return {
		subject: `Câu hỏi mới về sản phẩm - ${productName}`,
		text: `Xin chào ${sellerName},\n\nBạn có câu hỏi mới từ ${buyerName} về sản phẩm "${productName}":\n"${question}"`,
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
            <h1>Người bán đã trả lời!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${recipientName}</strong>,</p>
            <div class="info">
                <p>Người bán đã trả lời câu hỏi về sản phẩm bạn quan tâm!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p><strong>Câu hỏi:</strong></p>
                <blockquote style="border-left: 3px solid #667eea; padding-left: 15px; margin: 15px 0; font-style: italic;">
                    "${question}"
                </blockquote>
                <p><strong>Trả lời từ ${sellerName}:</strong></p>
                <blockquote style="border-left: 3px solid #28a745; padding-left: 15px; margin: 15px 0; background: #f0fff0; padding: 15px;">
                    "${answer}"
                </blockquote>
            </div>
        </div>
    `)

	return {
		subject: `Câu hỏi đã được trả lời - ${productName}`,
		text: `Xin chào ${recipientName},\n\nNgười bán ${sellerName} đã trả lời câu hỏi về sản phẩm "${productName}":\n\nCâu hỏi: "${question}"\nTrả lời: "${answer}"`,
		html,
	}
}

// ============================================
// PRODUCT UPDATE EMAIL TEMPLATES
// ============================================

/**
 * Product Description Updated - Notify Bidders
 */
function productDescriptionUpdatedEmail(data: {
	productName: string
	sellerName: string
	bidderName: string
	productId: string
	updatedAt: Date | string
}): Email {
	const { productName, sellerName, bidderName, productId, updatedAt } = data
	const productUrl = `${Keys.app.clientURL}/products/${productId}`

	const html = wrapHtml(`
        <div class="header">
            <h1>Mô tả sản phẩm đã được cập nhật!</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${bidderName}</strong>,</p>
            <div class="info">
                <p>Người bán <strong>${sellerName}</strong> đã cập nhật mô tả cho sản phẩm bạn đang đấu giá!</p>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p>Cập nhật lúc: <strong>${formatDate(updatedAt)}</strong></p>
            </div>
            <div class="highlight">
                <p><strong>Lưu ý:</strong> Vui lòng xem lại mô tả sản phẩm để nắm bắt thông tin mới nhất trước khi tiếp tục đấu giá.</p>
            </div>
            <div style="text-align: center;">
                <a href="${productUrl}" class="btn">Xem sản phẩm</a>
            </div>
        </div>
    `)

	return {
		subject: `Mô tả sản phẩm đã cập nhật - ${productName}`,
		text: `Xin chào ${bidderName},\n\nNgười bán ${sellerName} đã cập nhật mô tả cho sản phẩm "${productName}".\nCập nhật lúc: ${formatDate(updatedAt)}\n\nXem sản phẩm: ${productUrl}`,
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

		// Product update templates
		case 'product-description-updated':
			message = productDescriptionUpdatedEmail(data)
			break

		default:
			console.warn(`Unknown email type: ${type}`)
	}

	return message
}
