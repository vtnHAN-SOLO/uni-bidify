import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'
import type {
	AdminCategory,
	CreateCategoryRequest,
	UpdateCategoryRequest,
	AdminUser,
	AdminUpgradeRequest,
	UpdateUserStatusRequest,
	UpdateUpgradeRequest,
	CreateUserRequest,
	GetCategoriesResponse,
	CreateCategoryResponse,
	GetUsersResponse,
	GetUpgradeRequestsResponse,
	UpdateUpgradeResponse,
} from '../types/admin.types'
import type { ProductDTO } from '../types/product.types'

// ============================================
// CATEGORY API FUNCTIONS
// ============================================

/**
 * Get all categories with product count
 */
export const getCategories = async (): Promise<AdminCategory[]> => {
	const response = await apiClient.get<GetCategoriesResponse>(
		API_ENDPOINTS.ADMIN.CATEGORIES
	)
	return response.data.categories
}

/**
 * Create a new category
 */
export const createCategory = async (
	data: CreateCategoryRequest
): Promise<AdminCategory> => {
	const response = await apiClient.post<CreateCategoryResponse>(
		API_ENDPOINTS.ADMIN.CATEGORIES,
		data
	)
	return response.data.category
}

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
	await apiClient.delete(API_ENDPOINTS.ADMIN.DELETE_CATEGORY(categoryId))
}

/**
 * Update a category
 */
export const updateCategory = async (
	categoryId: string,
	data: UpdateCategoryRequest
): Promise<AdminCategory> => {
	const response = await apiClient.put<{
		success: boolean
		message: string
		category: AdminCategory
	}>(API_ENDPOINTS.ADMIN.UPDATE_CATEGORY(categoryId), data)
	return response.data.category
}

// ============================================
// USER API FUNCTIONS
// ============================================

/**
 * Get all users with pagination
 */
export const getUsers = async (
	page: number = 1,
	limit: number = 10,
	role?: string,
	status?: string
): Promise<{ users: AdminUser[]; pagination: any }> => {
	const params = new URLSearchParams()
	params.append('page', page.toString())
	params.append('limit', limit.toString())
	if (role) params.append('role', role)
	if (status) params.append('status', status)

	const response = await apiClient.get<GetUsersResponse>(
		`${API_ENDPOINTS.ADMIN.USERS}?${params.toString()}`
	)
	return {
		users: response.data.users,
		pagination: response.data.pagination,
	}
}

/**
 * Get all pending upgrade requests
 */
export const getUpgradeRequests = async (): Promise<AdminUpgradeRequest[]> => {
	const response = await apiClient.get<GetUpgradeRequestsResponse>(
		API_ENDPOINTS.ADMIN.UPGRADE_REQUESTS
	)
	return response.data.upgradeRequests
}

/**
 * Approve an upgrade request
 */
export const approveUpgrade = async (userId: string): Promise<void> => {
	const request: UpdateUpgradeRequest = {
		action: 'approve',
	}
	await apiClient.put<UpdateUpgradeResponse>(
		API_ENDPOINTS.ADMIN.UPDATE_UPGRADE(userId),
		request
	)
}

/**
 * Reject an upgrade request with reason
 */
export const rejectUpgrade = async (
	userId: string,
	rejectionReason: string
): Promise<void> => {
	const request: UpdateUpgradeRequest = {
		action: 'reject',
		rejectionReason,
	}
	await apiClient.put<UpdateUpgradeResponse>(
		API_ENDPOINTS.ADMIN.UPDATE_UPGRADE(userId),
		request
	)
}

/**
 * Update user status (active/blocked)
 */
export const updateUserStatus = async (
	userId: string,
	status: 'active' | 'blocked'
): Promise<void> => {
	const request: UpdateUserStatusRequest = { status }
	await apiClient.put(API_ENDPOINTS.ADMIN.UPDATE_USER_STATUS(userId), request)
}

/**
 * Get user profile details
 */
export const getUserDetail = async (userId: string): Promise<AdminUser> => {
	const response = await apiClient.get<{
		success: boolean
		user: AdminUser
	}>(API_ENDPOINTS.ADMIN.GET_USER_DETAIL(userId))
	return response.data.user
}

/**
 * Create a new user (admin only)
 */
export const createUser = async (
	data: CreateUserRequest
): Promise<AdminUser> => {
	const response = await apiClient.post<{
		success: boolean
		message: string
		user: AdminUser
	}>(API_ENDPOINTS.ADMIN.CREATE_USER, data)
	return response.data.user
}

/**
 * Delete a user
 */
export const deleteUser = async (userId: string): Promise<void> => {
	await apiClient.delete(API_ENDPOINTS.ADMIN.DELETE_USER(userId))
}

// ============================================
// PRODUCT API FUNCTIONS
// ============================================

/**
 * Delete a product
 */
export const deleteProduct = async (productId: string): Promise<void> => {
	await apiClient.delete(API_ENDPOINTS.ADMIN.DELETE_PRODUCT(productId))
}

/**
 * Get product details
 */
export const getProductDetail = async (productId: string): Promise<any> => {
	const response = await apiClient.get<{
		success: boolean
		product: any
	}>(API_ENDPOINTS.ADMIN.PRODUCT_DETAIL(productId))
	return response.data.product
}

/**
 * Get all products (for admin dashboard)
 */
export const getAdminProducts = async (
	page: number = 1,
	limit: number = 20
): Promise<{ products: ProductDTO[]; pagination: any }> => {
	const params = new URLSearchParams()
	params.append('page', page.toString())
	params.append('limit', limit.toString())

	const response = await apiClient.get<{
		success: boolean
		products: ProductDTO[]
		pagination: {
			total: number
			page: number
			limit: number
			pages: number
		}
	}>(`${API_ENDPOINTS.ADMIN.PRODUCTS}?${params.toString()}`)
	return {
		products: response.data.products,
		pagination: response.data.pagination,
	}
}

// ============================================
// ADMIN API OBJECT (for convenience)
// ============================================

export const adminApi = {
	// Categories
	getCategories,
	createCategory,
	updateCategory,
	deleteCategory,
	// Users
	getUsers,
	getUserDetail,
	createUser,
	deleteUser,
	getUpgradeRequests,
	approveUpgrade,
	rejectUpgrade,
	updateUserStatus,
	// Products
	getAdminProducts,
	getProductDetail,
	deleteProduct,
}
