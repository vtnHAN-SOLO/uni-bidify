import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'

// ==================== TYPES ====================

export interface PlaceBidRequest {
	productId: string
	maxPrice: number
}

export interface PlaceBidResponse {
	success: boolean
	message: string
	data: {
		bidId: string
		isWinner: boolean
		currentPrice: number
		yourMaxPrice: number
		wasExtended: boolean
		newEndTime?: string
		bidCount: number
	}
}

export interface BidHistoryItem {
	_id: string
	price: number
	bidderName: string
	bidderId?: string
	bidderRating: number
	createdAt: string
	isOwnBid: boolean
}

export interface BidHistoryResponse {
	success: boolean
	data: {
		bids: BidHistoryItem[]
		total: number
		page: number
		totalPages: number
	}
}

export interface MyBidResponse {
	success: boolean
	data: {
		bidId: string
		price: number
		maxPrice: number
		isWinning: boolean
		createdAt: string
	} | null
	message?: string
}

export interface ParticipatingProduct {
	_id: string
	name: string
	images: string[]
	currentPrice: number
	endTime: string
	bidCount: number
	categoryName: string
	yourMaxBid: number
	yourCurrentBid: number
	isWinning: boolean
	status: string
}

export interface ParticipatingResponse {
	success: boolean
	data: {
		products: ParticipatingProduct[]
		total: number
		page: number
		totalPages: number
	}
}

export interface WonProduct {
	_id: string
	name: string
	images: string[]
	finalPrice: number
	endTime: string
	categoryName: string
	sellerName: string
	sellerEmail: string
	isSold: boolean
}

export interface WonAuctionsResponse {
	success: boolean
	data: {
		products: WonProduct[]
		total: number
		page: number
		totalPages: number
	}
}

export interface RejectBidResponse {
	success: boolean
	message: string
	data: {
		newCurrentPrice: number
		newHighestBidder: string | null
	}
}

export interface BuyNowResponse {
	success: boolean
	message: string
	data: {
		productId: string
		price: number
		productName: string
	}
}

// ==================== API FUNCTIONS ====================

/**
 * Place a bid on a product (Auto-bidding)
 * @param data - productId and maxPrice
 */
export const placeBid = async (
	data: PlaceBidRequest
): Promise<PlaceBidResponse> => {
	const response = await apiClient.post<PlaceBidResponse>(
		API_ENDPOINTS.BIDS.PLACE_BID,
		data
	)
	return response.data
}

/**
 * Get bid history for a product
 * @param productId - Product ID
 * @param page - Page number
 * @param limit - Items per page
 */
export const getBidHistory = async (
	productId: string,
	page: number = 1,
	limit: number = 20
): Promise<BidHistoryResponse> => {
	const response = await apiClient.get<BidHistoryResponse>(
		API_ENDPOINTS.BIDS.PRODUCT_HISTORY(productId),
		{ params: { page, limit } }
	)
	return response.data
}

/**
 * Get current user's bid for a product
 * @param productId - Product ID
 */
export const getMyBid = async (productId: string): Promise<MyBidResponse> => {
	const response = await apiClient.get<MyBidResponse>(
		API_ENDPOINTS.BIDS.MY_BID(productId)
	)
	return response.data
}

/**
 * Get user's participating auctions (active bids)
 * @param page - Page number
 * @param limit - Items per page
 */
export const getParticipatingAuctions = async (
	page: number = 1,
	limit: number = 20
): Promise<ParticipatingResponse> => {
	const response = await apiClient.get<ParticipatingResponse>(
		API_ENDPOINTS.BIDS.USER_PARTICIPATING,
		{ params: { page, limit } }
	)
	return response.data
}

/**
 * Get user's won auctions
 * @param page - Page number
 * @param limit - Items per page
 */
export const getWonAuctions = async (
	page: number = 1,
	limit: number = 20
): Promise<WonAuctionsResponse> => {
	const response = await apiClient.get<WonAuctionsResponse>(
		API_ENDPOINTS.BIDS.USER_WON,
		{ params: { page, limit } }
	)
	return response.data
}

/**
 * Reject a bidder (Seller only)
 * @param bidId - Bid ID to reject
 */
export const rejectBid = async (bidId: string): Promise<RejectBidResponse> => {
	const response = await apiClient.delete<RejectBidResponse>(
		API_ENDPOINTS.BIDS.REJECT(bidId)
	)
	return response.data
}

/**
 * Buy now - instantly purchase the product at buyNowPrice
 * @param productId - Product ID
 */
export const buyNow = async (productId: string): Promise<BuyNowResponse> => {
	const response = await apiClient.post<BuyNowResponse>(
		API_ENDPOINTS.BIDS.BUY_NOW,
		{ productId }
	)
	return response.data
}

export default {
	placeBid,
	getBidHistory,
	getMyBid,
	getParticipatingAuctions,
	getWonAuctions,
	rejectBid,
	buyNow,
}
