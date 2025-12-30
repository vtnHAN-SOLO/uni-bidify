// ============================================
// CATEGORY TYPES
// ============================================

export interface AdminCategory {
	id: string
	name: string
	parent?: string | null
	productCount: number
	createdAt?: string
	updatedAt?: string
}

export interface CreateCategoryRequest {
	name: string
	parent?: string | null
}

export interface UpdateCategoryRequest {
	name: string
	parent?: string | null
}

// ============================================
// USER TYPES
// ============================================

export interface AdminUser {
	id: string
	firstName: string
	lastName: string
	fullName: string
	email: string
	address?: string
	role: 'ROLE BIDDER' | 'ROLE SELLER' | 'ROLE ADMIN'
	positiveReviews: number
	negativeReviews: number
	totalReviews: number
	rating: number
	status: 'active' | 'blocked'
	isVerified: boolean
	createdAt: string
	upgradeRequestStatus?: string
}

export interface AdminUpgradeRequest {
	id: string
	firstName: string
	lastName: string
	fullName: string
	email: string
	positiveReviews: number
	negativeReviews: number
	totalReviews: number
	rating: number
	requestedAt: string
}

export interface UpdateUserStatusRequest {
	status: 'active' | 'blocked'
}

export interface UpdateUpgradeRequest {
	action: 'approve' | 'reject'
	rejectionReason?: string
}

export interface CreateUserRequest {
	firstName: string
	lastName: string
	email: string

	address?: string
	role?: 'ROLE BIDDER' | 'ROLE SELLER' | 'ROLE ADMIN'
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface GetCategoriesResponse {
	success: boolean
	categories: AdminCategory[]
	count: number
}

export interface CreateCategoryResponse {
	success: boolean
	message: string
	category: AdminCategory
}

export interface GetUsersResponse {
	success: boolean
	users: AdminUser[]
	pagination: {
		total: number
		page: number
		limit: number
		pages: number
	}
}

export interface GetUpgradeRequestsResponse {
	success: boolean
	upgradeRequests: AdminUpgradeRequest[]
	count: number
}

export interface UpdateUpgradeResponse {
	success: boolean
	message: string
	user: {
		id: string
		email: string
		firstName: string
		lastName: string
		role: string
		upgradeRequestStatus: string
	}
}
