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

// ============================================
// Watchlist Types
// ============================================

export interface WatchlistProduct {
	_id: string
	name: string
	description: string
	images: string[]
	startPrice: number
	priceStep: number
	currentPrice: number
	buyNowPrice?: number
	endTime: string
	bidCount: number
	categoryName: string
	categoryId: string
	sellerName: string
	sellerId: string
	highestBidderName: string
	highestBidderId?: string
	isNew: boolean
}

export interface WatchlistResponse {
	success: boolean
	watchlist: WatchlistProduct[]
	count: number
}

export interface WatchlistToggleResponse {
	success: boolean
	message: string
	isAdded: boolean
	watchlistCount: number
}

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
