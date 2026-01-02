import type { Request, Response, NextFunction } from 'express'
import { ROLES } from '../Data/Constants/index.js'
import Product from '../Models/Product.js'

interface AuthUser {
	_id: string
	role: string
	sellerExpiryDate?: Date
}

/**
 * Middleware to check if seller has valid permission to create new products.
 * - Admin: Always allowed
 * - Seller with valid (non-expired) sellerExpiryDate: Allowed
 * - Seller with expired sellerExpiryDate: Not allowed to create new products
 */
export function checkCanCreateProduct() {
	return async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as AuthUser

		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			})
		}

		// Admin always has permission
		if (user.role === ROLES.Admin) {
			return next()
		}

		// Check if user is a seller
		if (user.role !== ROLES.Seller) {
			return res.status(403).json({
				success: false,
				error: 'Chỉ người bán mới có quyền tạo sản phẩm.',
			})
		}

		// Check if seller has expiry date and if it's expired
		if (user.sellerExpiryDate) {
			const now = new Date()
			const expiryDate = new Date(user.sellerExpiryDate)

			if (now > expiryDate) {
				return res.status(403).json({
					success: false,
					error: 'Quyền bán hàng của bạn đã hết hạn. Bạn không thể tạo sản phẩm mới.',
					code: 'SELLER_EXPIRED',
					sellerExpiryDate: expiryDate,
				})
			}
		}

		return next()
	}
}

/**
 * Middleware to check if seller can access seller features (view products, manage orders, etc.)
 * - Admin: Always allowed
 * - Seller (even expired): Allowed if they have active products
 * - Expired seller with no active products: Revert to Bidder role
 */
export function checkSellerAccess() {
	return async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as AuthUser

		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			})
		}

		// Admin always has permission
		if (user.role === ROLES.Admin) {
			return next()
		}

		// Check if user is a seller
		if (user.role !== ROLES.Seller) {
			return res.status(403).json({
				success: false,
				error: 'Chỉ người bán mới có quyền truy cập.',
			})
		}

		// Seller (even expired) is allowed to access seller features
		// They can view/manage their existing products and orders
		return next()
	}
}

/**
 * Helper function to check if seller is expired
 */
export function isSellerExpired(sellerExpiryDate?: Date): boolean {
	if (!sellerExpiryDate) return false
	return new Date() > new Date(sellerExpiryDate)
}

/**
 * Helper function to check if seller has active (ongoing) products
 */
export async function hasActiveProducts(sellerId: string): Promise<boolean> {
	const now = new Date()
	const activeProductsCount = await Product.countDocuments({
		seller: sellerId,
		endTime: { $gt: now },
		isSold: false,
	})
	return activeProductsCount > 0
}

export default {
	checkCanCreateProduct,
	checkSellerAccess,
	isSellerExpired,
	hasActiveProducts,
}
