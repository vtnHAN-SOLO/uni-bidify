import express, { Request, Response } from 'express'
import Auth from '../../Middleware/Auth.js'
import Role from '../../Middleware/Role.js'
import User from '../../Models/User.js'
import Category from '../../Models/Category.js'
import Product from '../../Models/Product.js'
import { ROLES, UPGRADE_REQUEST_STATUS } from '../../Data/Constants/index.js'

const router = express.Router()

// ============================================
// CATEGORIES MANAGEMENT
// ============================================

/**
 * GET /api/admin/categories
 * Get all categories with product count
 */
router.get(
	'/categories',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const categories = await Category.find().lean()

			// ✅ Get product count for each category
			const categoriesWithCount = await Promise.all(
				(categories as any[]).map(async (category: any) => {
					const productCount = await Product.countDocuments({
						category: category._id,
					})

					return {
						id: category._id.toString(),
						name: category.name,
						parent: category.parent
							? category.parent.toString()
							: null,
						productCount,
					}
				})
			)

			return res.json({
				success: true,
				categories: categoriesWithCount,
				count: categoriesWithCount.length,
			})
		} catch (error: any) {
			console.error('Get categories error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to get categories.',
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
					error: 'Category name is required.',
				})
			}

			// ✅ Check if category already exists
			const existingCategory = await Category.findOne({
				name: name.trim(),
			})
			if (existingCategory) {
				return res.status(400).json({
					error: 'Category already exists.',
				})
			}

			// ✅ If parent is provided, verify it exists
			let parentId = null
			if (parent) {
				const parentCategory = await Category.findById(parent)
				if (!parentCategory) {
					return res.status(404).json({
						error: 'Parent category not found.',
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
				message: 'Category created successfully.',
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
				error: error.message || 'Failed to create category.',
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
					error: 'Category name is required.',
				})
			}

			// ✅ Check if category exists
			const category = await Category.findById(id)
			if (!category) {
				return res.status(404).json({ error: 'Category not found.' })
			}

			// ✅ If parent is provided, verify it exists and is not the same as id
			let parentId = null
			if (parent) {
				if (parent === id) {
					return res.status(400).json({
						error: 'A category cannot be its own parent.',
					})
				}
				const parentCategory = await Category.findById(parent)
				if (!parentCategory) {
					return res.status(404).json({
						error: 'Parent category not found.',
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
				message: 'Category updated successfully.',
				category: {
					id: category._id.toString(),
					name: category.name,
					parent: category.parent ? category.parent.toString() : null,
				},
			})
		} catch (error: any) {
			console.error('Update category error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to update category.',
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
				return res.status(404).json({ error: 'Category not found.' })
			}

			// ✅ Check if category has products
			const productCount = await Product.countDocuments({
				category: id,
			})
			if (productCount > 0) {
				return res.status(400).json({
					error: 'Cannot delete category with existing products.',
				})
			}

			await Category.findByIdAndDelete(id)

			return res.json({
				success: true,
				message: 'Category deleted successfully.',
			})
		} catch (error: any) {
			console.error('Delete category error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to delete category.',
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
				error: error.message || 'Failed to get users.',
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
				error: error.message || 'Failed to get upgrade requests.',
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
					error: "Action must be 'approve' or 'reject'.",
				})
			}

			const user = await User.findById(id)
			if (!user) {
				return res.status(404).json({ error: 'User not found.' })
			}

			if (user.upgradeRequestStatus !== UPGRADE_REQUEST_STATUS.Pending) {
				return res.status(400).json({
					error: 'This user has no pending upgrade request.',
				})
			}

			if (action === 'approve') {
				// ✅ Approve upgrade
				user.role = ROLES.Seller
				user.upgradeRequestStatus = UPGRADE_REQUEST_STATUS.Approved
			} else {
				// ✅ Reject upgrade
				if (!rejectionReason) {
					return res.status(400).json({
						error: 'Rejection reason is required.',
					})
				}
				user.upgradeRequestStatus = UPGRADE_REQUEST_STATUS.Rejected
			}

			await user.save()

			return res.json({
				success: true,
				message:
					action === 'approve'
						? 'Upgrade approved successfully.'
						: 'Upgrade rejected successfully.',
				user: {
					id: user._id.toString(),
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					upgradeRequestStatus: user.upgradeRequestStatus,
				},
			})
		} catch (error: any) {
			console.error('Update upgrade request error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to update upgrade request.',
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
				return res.status(404).json({ error: 'User not found.' })
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
				error: error.message || 'Failed to get user detail.',
			})
		}
	}
)

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post(
	'/users',
	Auth,
	Role.check(ROLES.Admin),
	async (req: Request, res: Response) => {
		try {
			const { firstName, lastName, email, address, role } = req.body

			// ✅ Validate required fields
			if (!firstName || !lastName || !email) {
				return res.status(400).json({
					error: 'First name, last name, and email are required.',
				})
			}

			// ✅ Check if email already exists
			const existingUser = await User.findOne({ email })
			if (existingUser) {
				return res.status(400).json({
					error: 'User with this email already exists.',
				})
			}

			// ✅ Create new user with default password
			const defaultPassword = 'Admin@123456'
			const newUser = new User({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.toLowerCase(),
				address: address || '',
				password: defaultPassword,
				role: role || ROLES.Bidder,
				isVerified: true,
				isActive: true,
			})

			await newUser.save()

			return res.status(201).json({
				success: true,
				message:
					'User created successfully. Default password: ' +
					defaultPassword,
				user: {
					id: newUser._id.toString(),
					firstName: newUser.firstName,
					lastName: newUser.lastName,
					email: newUser.email,
					role: newUser.role,
					status: newUser.isActive ? 'active' : 'blocked',
				},
			})
		} catch (error: any) {
			console.error('Create user error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to create user.',
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
				return res.status(404).json({ error: 'User not found.' })
			}

			// ✅ Prevent deleting admin users
			if (user.role === ROLES.Admin) {
				return res.status(400).json({
					error: 'Cannot delete admin users.',
				})
			}

			// ✅ Delete user
			await User.findByIdAndDelete(id)

			return res.json({
				success: true,
				message: 'User deleted successfully.',
			})
		} catch (error: any) {
			console.error('Delete user error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to delete user.',
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
					error: "Status must be 'active' or 'blocked'.",
				})
			}

			const user = await User.findById(id)
			if (!user) {
				return res.status(404).json({ error: 'User not found.' })
			}

			user.isActive = status === 'active'
			await user.save()

			return res.json({
				success: true,
				message: 'User status updated successfully.',
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
				error: error.message || 'Failed to update user status.',
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
				bidCount: product.idCount || 0,
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
				error: error.message || 'Failed to get products.',
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
				return res.status(404).json({ error: 'Product not found.' })
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
				error: error.message || 'Failed to get product detail.',
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
				return res.status(404).json({ error: 'Product not found.' })
			}

			// ✅ Delete product
			await Product.findByIdAndDelete(id)

			return res.json({
				success: true,
				message: 'Product deleted successfully.',
			})
		} catch (error: any) {
			console.error('Delete product error:', error)
			return res.status(500).json({
				error: error.message || 'Failed to delete product.',
			})
		}
	}
)

export default router
