// ============================================
// User Profile Types
// ============================================

export interface UserProfile {
	id: string
	email: string
	firstName: string
	lastName: string
	fullName: string
	address: string
	role: string
	isVerified: boolean
	isActive: boolean
	positiveReviews: number
	negativeReviews: number
	totalReviews: number
	ratingPercentage: number
	upgradeRequestStatus: string
	createdAt: Date | string
	updatedAt: Date | string
}

export interface UpdateProfileRequest {
	firstName?: string
	lastName?: string
	address?: string
	currentPassword?: string
	newPassword?: string
}

export interface UpdateProfileResponse {
	success: boolean
	message: string
	user: {
		id: string
		email: string
		firstName: string
		lastName: string
		fullName: string
		address: string
		role: string
	}
}

// Note: Watchlist types are now defined in watchlist.api.ts

// ============================================
// Bidding History Types
// ============================================

export type AuctionStatus = 'active' | 'won' | 'lost'

export interface BiddingHistoryItem {
	bidId: string
	productId: string
	productName: string
	productImage?: string
	bidAmount: number
	bidTime: string
	currentPrice: number
	endTime: string
	categoryName: string
	sellerName: string
	isHighestBid: boolean
	auctionStatus: AuctionStatus
}

export interface BiddingHistoryResponse {
	success: boolean
	biddingHistory: BiddingHistoryItem[]
	count: number
	total: number
}

// ============================================
// Reviews Types
// ============================================

export interface ReviewItem {
	_id: string
	rating: 1 | -1
	comment: string
	reviewerName: string
	reviewerId: string
	productName: string
	productImage?: string
	productId: string
	createdAt: string
}

export interface ReviewsSummary {
	total: number
	positive: number
	negative: number
	ratingPercentage: number
}

export interface ReviewsResponse {
	success: boolean
	reviews: ReviewItem[]
	summary: ReviewsSummary
}

// ============================================
// Profile Update DTOs
// ============================================

export interface ChangePasswordRequest {
	oldPassword: string
	newPassword: string
}

export interface ProfileUpdatePayload {
	firstName?: string
	lastName?: string
	address?: string
	currentPassword?: string
	newPassword?: string
}
