import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'
import {
	UserProfile,
	UpdateProfileRequest,
	UpdateProfileResponse,
	WatchlistResponse,
	WatchlistToggleResponse,
	BiddingHistoryResponse,
} from '../types/user.types'

export const userApi = {
	/**
	 * GET /api/users/profile
	 * Get current user's profile information
	 */
	getProfile: async (): Promise<{ success: boolean; user: UserProfile }> => {
		const response = await apiClient.get(API_ENDPOINTS.USERS.PROFILE)
		return response.data
	},

	/**
	 * PUT /api/users/profile
	 * Update current user's profile information
	 */
	updateProfile: async (
		data: UpdateProfileRequest
	): Promise<UpdateProfileResponse> => {
		const response = await apiClient.put(API_ENDPOINTS.USERS.PROFILE, data)
		return response.data
	},

	/**
	 * GET /api/users/watchlist
	 * Get current user's watchlist
	 */
	getWatchlist: async (): Promise<WatchlistResponse> => {
		const response = await apiClient.get(API_ENDPOINTS.USERS.WATCHLIST)
		return response.data
	},

	/**
	 * POST /api/users/watchlist/:productId
	 * Add/Remove product to/from watchlist
	 */
	toggleWatchlist: async (
		productId: string
	): Promise<WatchlistToggleResponse> => {
		const response = await apiClient.post(
			`${API_ENDPOINTS.USERS.WATCHLIST}/${productId}`
		)
		return response.data
	},

	/**
	 * GET /api/users/bidding-history
	 * Get current user's bidding history with optional status filter
	 */
	getBiddingHistory: async (
		status?: 'active' | 'won' | 'lost'
	): Promise<BiddingHistoryResponse> => {
		const params = status ? { status } : {}
		const response = await apiClient.get(
			API_ENDPOINTS.USERS.BIDDING_HISTORY,
			{
				params,
			}
		)
		return response.data
	},

	/**
	 * Alias: Get active bidding auctions
	 */
	getActiveBidding: async (): Promise<BiddingHistoryResponse> => {
		return userApi.getBiddingHistory('active')
	},

	/**
	 * Alias: Get won auctions
	 */
	getWonAuctions: async (): Promise<BiddingHistoryResponse> => {
		return userApi.getBiddingHistory('won')
	},

	/**
	 * Alias: Get lost auctions
	 */
	getLostAuctions: async (): Promise<BiddingHistoryResponse> => {
		return userApi.getBiddingHistory('lost')
	},
}
