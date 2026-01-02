import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import Auth from '../../Middleware/Auth.js'
import Role from '../../Middleware/Role.js'
import User from '../../Models/User.js'
import Category from '../../Models/Category.js'
import Product from '../../Models/Product.js'
import Settings from '../../Models/Settings.js'
import { ROLES, UPGRADE_REQUEST_STATUS } from '../../Data/Constants/index.js'

const router = express.Router()

// ============================================
// CATEGORIES MANAGEMENT
// ============================================

/**
 * GET /api/admin/categories
 * Get all categories with product count
 * Parent categories show total count of their own products + all child categories' products
 */
router.get(
	'/categories',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const categories = await Category.find().lean()

			// ✅ First pass: Get direct product count for each category
			const categoryProductCounts: Record<string, number> = {}
			for (const category of categories as any[]) {
				const directCount = await Product.countDocuments({
					category: category._id,
				})
				categoryProductCounts[category._id.toString()] = directCount
			}

			// ✅ Build map of parent -> children for easier lookup
			const childrenMap: Record<string, string[]> = {}
			for (const category of categories as any[]) {
				if (category.parent) {
					const parentId = category.parent.toString()
					if (!childrenMap[parentId]) {
						childrenMap[parentId] = []
					}
					childrenMap[parentId]!.push(category._id.toString())
				}
			}

			// ✅ Calculate total count for each category (including children)
			const getTotalCount = (categoryId: string): number => {
				let total = categoryProductCounts[categoryId] || 0
				const children = childrenMap[categoryId] || []
				for (const childId of children) {
					total += getTotalCount(childId) // Recursive for nested categories
				}
				return total
			}

			// ✅ Map categories with correct product counts
			const categoriesWithCount = (categories as any[]).map((category: any) => {
				const categoryId = category._id.toString()
				const children = childrenMap[categoryId]
				const hasChildren = children !== undefined && children.length > 0

				return {
					id: categoryId,
					name: category.name,
					parent: category.parent
						? category.parent.toString()
						: null,
					// Parent categories show total (own + children), child categories show direct count
					productCount: hasChildren
						? getTotalCount(categoryId)
						: categoryProductCounts[categoryId] || 0,
				}
			})

			return res.json({
				success: true,
				categories: categoriesWithCount,
				count: categoriesWithCount.length,
			})
		} catch (error: any) {
			console.error('Get categories error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy danh sách danh mục.',
			})
		}
	}
)

/**
 * POST /api/admin/categories
 * Create a new category
 */
router.post(
	'/categories',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { name, parent } = req.body

			// ✅ Validate input
			if (!name || name.trim() === '') {
				return res.status(400).json({
					error: 'Tên danh mục là bắt buộc.',
				})
			}

			// ✅ Check if category already exists
			const existingCategory = await Category.findOne({
				name: name.trim(),
			})
			if (existingCategory) {
				return res.status(400).json({
					error: 'Danh mục đã tồn tại.',
				})
			}

			// ✅ If parent is provided, verify it exists
			let parentId = null
			if (parent) {
				const parentCategory = await Category.findById(parent)
				if (!parentCategory) {
					return res.status(404).json({
						error: 'Không tìm thấy danh mục cha.',
					})
				}
				parentId = parent
			}

			// ✅ Create new category
			const newCategory = new Category({
				name: name.trim(),
				parent: parentId,
			})

			await newCategory.save()

			return res.status(201).json({
				success: true,
				message: 'Tạo danh mục thành công.',
				category: {
					id: newCategory._id.toString(),
					name: newCategory.name,
					parent: newCategory.parent
						? newCategory.parent.toString()
						: null,
					productCount: 0,
				},
			})
		} catch (error: any) {
			console.error('Create category error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể tạo danh mục.',
			})
		}
	}
)

/**
 * DELETE /api/admin/categories/:id
 * Delete category (only if no products)
 */
/**
 * PUT /api/admin/categories/:id
 * Update a category (name and parent)
 */
router.put(
	'/categories/:id',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params
			const { name, parent } = req.body

			// ✅ Validate input
			if (!name || name.trim() === '') {
				return res.status(400).json({
					error: 'Tên danh mục là bắt buộc.',
				})
			}

			// ✅ Check if category exists
			const category = await Category.findById(id)
			if (!category) {
				return res.status(404).json({ error: 'Không tìm thấy danh mục.' })
			}

			// ✅ If parent is provided, verify it exists and is not the same as id
			let parentId = null
			if (parent) {
				if (parent === id) {
					return res.status(400).json({
						error: 'Danh mục không thể là cha của chính nó.',
					})
				}
				const parentCategory = await Category.findById(parent)
				if (!parentCategory) {
					return res.status(404).json({
						error: 'Không tìm thấy danh mục cha.',
					})
				}
				parentId = parent
			}

			// ✅ Update category
			category.name = name.trim()
			category.parent = parentId || undefined
			await category.save()

			return res.json({
				success: true,
				message: 'Cập nhật danh mục thành công.',
				category: {
					id: category._id.toString(),
					name: category.name,
					parent: category.parent ? category.parent.toString() : null,
				},
			})
		} catch (error: any) {
			console.error('Update category error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể cập nhật danh mục.',
			})
		}
	}
)

router.delete(
	'/categories/:id',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params

			const category = await Category.findById(id)
			if (!category) {
				return res.status(404).json({ error: 'Không tìm thấy danh mục.' })
			}

			// ✅ Check if category has products
			const productCount = await Product.countDocuments({
				category: id,
			})
			if (productCount > 0) {
				return res.status(400).json({
					error: 'Không thể xóa danh mục đang có sản phẩm.',
				})
			}

			await Category.findByIdAndDelete(id)

			return res.json({
				success: true,
				message: 'Xóa danh mục thành công.',
			})
		} catch (error: any) {
			console.error('Delete category error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể xóa danh mục.',
			})
		}
	}
)

// ============================================
// USERS MANAGEMENT
// ============================================

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get(
	'/users',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { page = 1, limit = 10, role, status } = req.query

			const skip = ((Number(page) || 1) - 1) * (Number(limit) || 10)

			// ✅ Build filter query
			const filter: any = {}
			if (role && role !== 'all') {
				filter.role = role
			}
			if (status && status !== 'all') {
				if (status === 'active') {
					filter.isActive = true
				} else if (status === 'blocked') {
					filter.isActive = false
				}
			}

			// ✅ Get total count
			const total = await User.countDocuments(filter)

			// ✅ Get users
			const users = await User.find(filter)
				.select(
					'-password -otp -resetPasswordToken -resetPasswordExpires'
				)
				.skip(skip)
				.limit(Number(limit) || 10)
				.sort({ createdAt: -1 })
				.lean()

			const mappedUsers = users.map((user: any) => ({
				id: user._id.toString(),
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: `${user.firstName} ${user.lastName}`,
				email: user.email,
				role: user.role,
				positiveReviews: user.positiveReviews,
				negativeReviews: user.negativeReviews,
				totalReviews: user.positiveReviews + user.negativeReviews,
				rating:
					user.positiveReviews + user.negativeReviews > 0
						? Math.round(
								(user.positiveReviews /
									(user.positiveReviews +
										user.negativeReviews)) *
									100
							)
						: 0,
				status: user.isActive ? 'active' : 'blocked',
				isVerified: user.isVerified,
				createdAt: user.createdAt,
			}))

			return res.json({
				success: true,
				users: mappedUsers,
				pagination: {
					total,
					page: Number(page) || 1,
					limit: Number(limit) || 10,
					pages: Math.ceil(total / (Number(limit) || 10)),
				},
			})
		} catch (error: any) {
			console.error('Get users error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy danh sách người dùng.',
			})
		}
	}
)

/**
 * GET /api/admin/users/upgrade-requests
 * Get all pending upgrade requests
 */
router.get(
	'/users/upgrade-requests',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const upgradeRequests = await User.find({
				upgradeRequestStatus: UPGRADE_REQUEST_STATUS.Pending,
			})
				.select(
					'firstName lastName email positiveReviews negativeReviews createdAt'
				)
				.sort({ createdAt: -1 })
				.lean()

			const mappedRequests = upgradeRequests.map((user: any) => ({
				id: user._id.toString(),
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: `${user.firstName} ${user.lastName}`,
				email: user.email,
				positiveReviews: user.positiveReviews,
				negativeReviews: user.negativeReviews,
				totalReviews: user.positiveReviews + user.negativeReviews,
				rating:
					user.positiveReviews + user.negativeReviews > 0
						? Math.round(
								(user.positiveReviews /
									(user.positiveReviews +
										user.negativeReviews)) *
									100
							)
						: 0,
				requestedAt: user.createdAt,
			}))

			return res.json({
				success: true,
				upgradeRequests: mappedRequests,
				count: mappedRequests.length,
			})
		} catch (error: any) {
			console.error('Get upgrade requests error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy danh sách yêu cầu nâng cấp.',
			})
		}
	}
)

/**
 * PUT /api/admin/users/:id/upgrade
 * Approve or reject upgrade request
 */
router.put(
	'/users/:id/upgrade',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params
			const { action, rejectionReason } = req.body // action: 'approve' | 'reject'

			// ✅ Validate input
			if (!action || !['approve', 'reject'].includes(action)) {
				return res.status(400).json({
					error: "Hành động phải là 'approve' hoặc 'reject'.",
				})
			}

			const user = await User.findById(id)
			if (!user) {
				return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
			}

			if (user.upgradeRequestStatus !== UPGRADE_REQUEST_STATUS.Pending) {
				return res.status(400).json({
					error: 'Người dùng này không có yêu cầu nâng cấp đang chờ.',
				})
			}

			if (action === 'approve') {
				// ✅ Approve upgrade
				user.role = ROLES.Seller
				user.upgradeRequestStatus = UPGRADE_REQUEST_STATUS.Approved
				// ✅ Set seller expiry date (7 days from now)
				const expiryDate = new Date()
				expiryDate.setDate(expiryDate.getDate() + 7)
				user.sellerExpiryDate = expiryDate
			} else {
				// ✅ Reject upgrade
				if (!rejectionReason) {
					return res.status(400).json({
						error: 'Lý do từ chối là bắt buộc.',
					})
				}
				user.upgradeRequestStatus = UPGRADE_REQUEST_STATUS.Rejected
			}

			await user.save()

			return res.json({
				success: true,
				message:
					action === 'approve'
						? 'Phê duyệt nâng cấp thành công.'
						: 'Từ chối nâng cấp thành công.',
				user: {
					id: user._id.toString(),
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					upgradeRequestStatus: user.upgradeRequestStatus,
					sellerExpiryDate: user.sellerExpiryDate,
				},
			})
		} catch (error: any) {
			console.error('Update upgrade request error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể cập nhật yêu cầu nâng cấp.',
			})
		}
	}
)

/**
 * GET /api/admin/users/:id
 * Get user profile details
 */
router.get(
	'/users/:id',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params

			const user = await User.findById(id)
				.select(
					'-password -otp -resetPasswordToken -resetPasswordExpires'
				)
				.lean()

			if (!user) {
				return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
			}

			return res.json({
				success: true,
				user: {
					id: (user as any)._id.toString(),
					firstName: user.firstName,
					lastName: user.lastName,
					fullName: `${user.firstName} ${user.lastName}`,
					email: user.email,
					address: user.address || '',
					role: user.role,
					positiveReviews: user.positiveReviews,
					negativeReviews: user.negativeReviews,
					totalReviews: user.positiveReviews + user.negativeReviews,
					rating:
						user.positiveReviews + user.negativeReviews > 0
							? Math.round(
									(user.positiveReviews /
										(user.positiveReviews +
											user.negativeReviews)) *
										100
								)
							: 0,
					status: user.isActive ? 'active' : 'blocked',
					isVerified: user.isVerified,
					createdAt: user.createdAt,
					upgradeRequestStatus: user.upgradeRequestStatus,
				},
			})
		} catch (error: any) {
			console.error('Get user detail error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy thông tin người dùng.',
			})
		}
	}
)

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 * - Only allows creating Bidder or Admin roles (Seller must be upgraded from Bidder)
 * - Sends OTP verification email like normal registration
 */
router.post(
	'/users',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { firstName, lastName, email, address, role } = req.body

			// ✅ Validate required fields
			if (!firstName || !lastName || !email || !address) {
				return res.status(400).json({
					error: 'Họ, tên, email và địa chỉ là bắt buộc.',
				})
			}

			// ✅ Only allow Bidder or Admin roles
			const allowedRoles = [ROLES.Bidder, ROLES.Admin]
			const selectedRole = role || ROLES.Bidder
			if (!allowedRoles.includes(selectedRole)) {
				return res.status(400).json({
					error: 'Chỉ được phép tạo tài khoản Người mua hoặc Admin. Người bán phải được nâng cấp từ Người mua.',
				})
			}

			// ✅ Check if email already exists
			const existingUser = await User.findOne({ email })
			if (existingUser) {
				return res.status(400).json({
					error: 'Email này đã được sử dụng.',
				})
			}

			// ✅ Create new user with default password and unverified status
			// OTP will be sent when user tries to login for the first time
			const defaultPassword = 'password123'
			const hashedPassword = await bcrypt.hash(defaultPassword, 10)
			const newUser = new User({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.toLowerCase(),
				address: address.trim(),
				password: hashedPassword,
				role: selectedRole,
				isVerified: false, // Must verify via OTP on first login
				isActive: true,
			})

			await newUser.save()

			return res.status(201).json({
				success: true,
				message:
					'Tạo người dùng thành công. Mật khẩu mặc định: ' +
					defaultPassword +
					'. Khi đăng nhập lần đầu, người dùng sẽ nhận OTP qua email để xác thực.',
				user: {
					id: newUser._id.toString(),
					firstName: newUser.firstName,
					lastName: newUser.lastName,
					email: newUser.email,
					role: newUser.role,
					status: newUser.isActive ? 'active' : 'blocked',
					isVerified: newUser.isVerified,
				},
			})
		} catch (error: any) {
			console.error('Create user error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể tạo người dùng.',
			})
		}
	}
)

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete(
	'/users/:id',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params

			// ✅ Check if user exists
			const user = await User.findById(id)
			if (!user) {
				return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
			}

			// ✅ Prevent deleting admin users
			if (user.role === ROLES.Admin) {
				return res.status(400).json({
					error: 'Không thể xóa tài khoản Admin.',
				})
			}

			// ✅ Delete user
			await User.findByIdAndDelete(id)

			return res.json({
				success: true,
				message: 'Xóa người dùng thành công.',
			})
		} catch (error: any) {
			console.error('Delete user error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể xóa người dùng.',
			})
		}
	}
)

/**
 * PUT /api/admin/users/:id/status
 * Update user status (active/blocked)
 */
router.put(
	'/users/:id/status',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params
			const { status } = req.body // status: 'active' | 'blocked'

			// ✅ Validate input
			if (!status || !['active', 'blocked'].includes(status)) {
				return res.status(400).json({
					error: "Trạng thái phải là 'active' hoặc 'blocked'.",
				})
			}

			const user = await User.findById(id)
			if (!user) {
				return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
			}

			user.isActive = status === 'active'
			await user.save()

			return res.json({
				success: true,
				message: 'Cập nhật trạng thái người dùng thành công.',
				user: {
					id: user._id.toString(),
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					status: user.isActive ? 'active' : 'blocked',
				},
			})
		} catch (error: any) {
			console.error('Update user status error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể cập nhật trạng thái người dùng.',
			})
		}
	}
)

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

/**
 * GET /api/admin/products
 * Get all products with pagination
 */
router.get(
	'/products',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { page = 1, limit = 20 } = req.query

			const skip = ((Number(page) || 1) - 1) * (Number(limit) || 20)

			// ✅ Get total count
			const total = await Product.countDocuments()

			// ✅ Get products with pagination
			const products = await Product.find()
				.populate('category', 'name')
				.skip(skip)
				.limit(Number(limit) || 20)
				.sort({ createdAt: -1 })
				.lean()

			const mappedProducts = products.map((product: any) => ({
				_id: product._id.toString(),
				name: product.name,
				description: product.description,
				images: product.images || [],
				currentPrice: product.currentPrice,
				buyNowPrice: product.buyNowPrice,
				endTime: product.endTime,
				bidCount: product.bidCount || 0,
				categoryName: product.category?.name || 'N/A',
				highestBidder: product.highestBidder,
				isSold: product.isSold,
			}))

			return res.json({
				success: true,
				products: mappedProducts,
				pagination: {
					total,
					page: Number(page) || 1,
					limit: Number(limit) || 20,
					pages: Math.ceil(total / (Number(limit) || 20)),
				},
			})
		} catch (error: any) {
			console.error('Get products error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy danh sách sản phẩm.',
			})
		}
	}
)

/**
 * GET /api/admin/products/:id
 * Get product details
 */
router.get(
	'/products/:id',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params

			const product = await Product.findById(id)
				.populate('category', 'name')
				.populate(
					'seller',
					'firstName lastName email positiveReviews negativeReviews'
				) // ✅ Add seller info
				.lean()

			if (!product) {
				return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' })
			}

			// ✅ Calculate seller rating
			const seller = product.seller as any
			const sellerPositiveReviews = seller?.positiveReviews || 0
			const sellerNegativeReviews = seller?.negativeReviews || 0
			const sellerTotalRatings =
				sellerPositiveReviews + sellerNegativeReviews
			const sellerRating =
				sellerTotalRatings > 0
					? Math.round(
							(sellerPositiveReviews / sellerTotalRatings) * 100
						)
					: 0

			return res.json({
				success: true,
				product: {
					id: (product as any)._id.toString(),
					name: product.name,
					description: product.description,
					images: product.images || [],
					currentPrice: product.currentPrice,
					buyNowPrice: product.buyNowPrice,
					startPrice: product.startPrice,
					priceStep: product.priceStep,
					startTime: product.startTime,
					endTime: product.endTime,
					bidCount: product.bidCount || 0,
					categoryId: product.category
						? (product.category as any)._id.toString()
						: null,
					categoryName: product.category
						? (product.category as any).name
						: null,
					// ✅ Seller info
					sellerId: seller?._id ? seller._id.toString() : null,
					sellerName:
						seller?.firstName && seller?.lastName
							? `${seller.firstName} ${seller.lastName}`
							: 'Người bán',
					sellerEmail: seller?.email,
					sellerRating,
					sellerTotalRatings,

					highestBidder: product.highestBidder,
					isSold: product.isSold,
					autoExtend: product.autoExtend,
					createdAt: product.createdAt,
				},
			})
		} catch (error: any) {
			console.error('Get product detail error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy thông tin sản phẩm.',
			})
		}
	}
)

/**
 * DELETE /api/admin/products/:id
 * Delete a product (remove it from the system)
 */
router.delete(
	'/products/:id',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params

			const product = await Product.findById(id)
			if (!product) {
				return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' })
			}

			// ✅ Delete product
			await Product.findByIdAndDelete(id)

			return res.json({
				success: true,
				message: 'Xóa sản phẩm thành công.',
			})
		} catch (error: any) {
			console.error('Delete product error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể xóa sản phẩm.',
			})
		}
	}
)

// ============================================
// AUCTION SETTINGS MANAGEMENT
// ============================================

/**
 * GET /api/admin/settings
 * Get auction settings (auto-extend configuration)
 */
router.get(
	'/settings',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			// Find existing settings or create default
			let settings = await Settings.findOne().lean()

			if (!settings) {
				// Create default settings if none exist
				const newSettings = new Settings({
					triggerMinutes: 5,
					extensionMinutes: 10,
				})
				await newSettings.save()
				settings = newSettings.toObject()
			}

			return res.json({
				success: true,
				settings: {
					triggerMinutes: settings.triggerMinutes,
					extensionMinutes: settings.extensionMinutes,
					updatedAt: settings.updatedAt,
				},
			})
		} catch (error: any) {
			console.error('Get settings error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể lấy cài đặt.',
			})
		}
	}
)

/**
 * PUT /api/admin/settings
 * Update auction settings
 */
router.put(
	'/settings',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { triggerMinutes, extensionMinutes } = req.body

			// Validate input
			if (
				triggerMinutes !== undefined &&
				(triggerMinutes < 1 || triggerMinutes > 60)
			) {
				return res.status(400).json({
					error: 'Thời gian kích hoạt phải từ 1 đến 60 phút.',
				})
			}

			if (
				extensionMinutes !== undefined &&
				(extensionMinutes < 1 || extensionMinutes > 120)
			) {
				return res.status(400).json({
					error: 'Thời gian gia hạn phải từ 1 đến 120 phút.',
				})
			}

			// Build update object - only include fields that are provided
			const updateFields: Record<string, number> = {}
			if (triggerMinutes !== undefined) {
				updateFields.triggerMinutes = triggerMinutes
			}
			if (extensionMinutes !== undefined) {
				updateFields.extensionMinutes = extensionMinutes
			}

			// Check if settings exist
			const existingSettings = await Settings.findOne().lean()

			let updatedSettings
			if (existingSettings) {
				// Update existing settings
				updatedSettings = await Settings.findOneAndUpdate(
					{},
					{ $set: updateFields },
					{ new: true }
				).lean()
			} else {
				// Create new settings with defaults for missing fields
				const newSettings = new Settings({
					triggerMinutes: triggerMinutes ?? 5,
					extensionMinutes: extensionMinutes ?? 10,
				})
				await newSettings.save()
				updatedSettings = newSettings.toObject()
			}

			return res.json({
				success: true,
				message: 'Cài đặt đã được cập nhật thành công.',
				settings: {
					triggerMinutes: updatedSettings?.triggerMinutes ?? 5,
					extensionMinutes: updatedSettings?.extensionMinutes ?? 10,
					updatedAt: updatedSettings?.updatedAt,
				},
			})
		} catch (error: any) {
			console.error('Update settings error:', error)
			return res.status(500).json({
				error: error.message || 'Không thể cập nhật cài đặt.',
			})
		}
	}
)

export default router
