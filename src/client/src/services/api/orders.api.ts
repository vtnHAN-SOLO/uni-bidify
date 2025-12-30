import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'

// ==================== TYPES ====================

export type OrderStatus =
	| 'AWAITING_PAYMENT'
	| 'PAYMENT_SUBMITTED'
	| 'SELLER_CONFIRMED'
	| 'BUYER_CONFIRMED'
	| 'COMPLETED'
	| 'CANCELLED'

export interface OrderProduct {
	_id: string
	name: string
	image: string
}

export interface OrderUser {
	_id: string
	name: string
	email: string
	address?: string
}

export interface Order {
	_id: string
	status: OrderStatus
	finalPrice: number
	shippingAddress?: string
	paymentProof?: string
	paymentSubmittedAt?: string
	shippingInvoice?: string
	sellerConfirmedAt?: string
	buyerConfirmedAt?: string
	buyerRated: boolean
	sellerRated: boolean
	cancelledAt?: string
	cancelReason?: string
	createdAt: string
}

export interface OrderDetailResponse {
	success: boolean
	data: {
		order: Order
		product: OrderProduct
		buyer: OrderUser
		seller: OrderUser
		userRole: 'buyer' | 'seller' | 'admin'
	}
}

export interface SubmitPaymentRequest {
	paymentProof: string
	shippingAddress: string
}

export interface SubmitPaymentResponse {
	success: boolean
	message: string
	data: {
		status: OrderStatus
		paymentSubmittedAt: string
	}
}

export interface ConfirmShippingRequest {
	shippingInvoice: string
}

export interface ConfirmShippingResponse {
	success: boolean
	message: string
	data: {
		status: OrderStatus
		shippingInvoice: string
		sellerConfirmedAt: string
	}
}

export interface ConfirmReceivedResponse {
	success: boolean
	message: string
	data: {
		status: OrderStatus
		buyerConfirmedAt: string
	}
}

export interface CancelOrderRequest {
	reason?: string
}

export interface CancelOrderResponse {
	success: boolean
	message: string
	data: {
		status: OrderStatus
		cancelledAt: string
		cancelReason: string
	}
}

export interface RateOrderRequest {
	rating: 1 | -1
	comment: string
}

export interface RateOrderResponse {
	success: boolean
	message: string
	data: {
		status: OrderStatus
		buyerRated: boolean
		sellerRated: boolean
	}
}

export interface SendMessageRequest {
	content: string
}

export interface Message {
	_id: string
	senderName: string
	senderId: string
	content: string
	createdAt: string
	isOwn: boolean
}

export interface SendMessageResponse {
	success: boolean
	message: string
	data: {
		message: Message
	}
}

export interface GetMessagesResponse {
	success: boolean
	data: {
		messages: Message[]
	}
}

export interface MyOrderItem {
	_id: string
	status: OrderStatus
	finalPrice: number
	product: OrderProduct
	buyer: { _id: string; name: string }
	seller: { _id: string; name: string }
	userRole: 'buyer' | 'seller'
	createdAt: string
}

export interface MyOrdersResponse {
	success: boolean
	data: {
		orders: MyOrderItem[]
		total: number
		page: number
		totalPages: number
	}
}

// ==================== API FUNCTIONS ====================

/**
 * Get order details for a product
 * @param productId - Product ID
 */
export const getOrderByProduct = async (
	productId: string
): Promise<OrderDetailResponse> => {
	const response = await apiClient.get<OrderDetailResponse>(
		API_ENDPOINTS.ORDERS.PRODUCT_ORDER(productId)
	)
	return response.data
}

/**
 * Submit payment proof and shipping address (Buyer)
 * @param orderId - Order ID
 * @param data - Payment proof URL and shipping address
 */
export const submitPayment = async (
	orderId: string,
	data: SubmitPaymentRequest
): Promise<SubmitPaymentResponse> => {
	const response = await apiClient.put<SubmitPaymentResponse>(
		API_ENDPOINTS.ORDERS.SUBMIT_PAYMENT(orderId),
		data
	)
	return response.data
}

/**
 * Confirm shipping with invoice (Seller)
 * @param orderId - Order ID
 * @param data - Shipping invoice/tracking number
 */
export const confirmShipping = async (
	orderId: string,
	data: ConfirmShippingRequest
): Promise<ConfirmShippingResponse> => {
	const response = await apiClient.put<ConfirmShippingResponse>(
		API_ENDPOINTS.ORDERS.CONFIRM_SHIPPING(orderId),
		data
	)
	return response.data
}

/**
 * Confirm receipt of item (Buyer)
 * @param orderId - Order ID
 */
export const confirmReceived = async (
	orderId: string
): Promise<ConfirmReceivedResponse> => {
	const response = await apiClient.put<ConfirmReceivedResponse>(
		API_ENDPOINTS.ORDERS.CONFIRM_RECEIVED(orderId)
	)
	return response.data
}

/**
 * Cancel order
 * @param orderId - Order ID
 * @param data - Cancel reason (optional)
 */
export const cancelOrder = async (
	orderId: string,
	data?: CancelOrderRequest
): Promise<CancelOrderResponse> => {
	const response = await apiClient.put<CancelOrderResponse>(
		API_ENDPOINTS.ORDERS.CANCEL(orderId),
		data
	)
	return response.data
}

/**
 * Rate the other party
 * @param orderId - Order ID
 * @param data - Rating (+1/-1) and comment
 */
export const rateOrder = async (
	orderId: string,
	data: RateOrderRequest
): Promise<RateOrderResponse> => {
	const response = await apiClient.post<RateOrderResponse>(
		API_ENDPOINTS.ORDERS.RATE(orderId),
		data
	)
	return response.data
}

/**
 * Send a message in order chat
 * @param orderId - Order ID
 * @param data - Message content
 */
export const sendMessage = async (
	orderId: string,
	data: SendMessageRequest
): Promise<SendMessageResponse> => {
	const response = await apiClient.post<SendMessageResponse>(
		API_ENDPOINTS.ORDERS.SEND_MESSAGE(orderId),
		data
	)
	return response.data
}

/**
 * Get all messages in order chat
 * @param orderId - Order ID
 */
export const getMessages = async (
	orderId: string
): Promise<GetMessagesResponse> => {
	const response = await apiClient.get<GetMessagesResponse>(
		API_ENDPOINTS.ORDERS.GET_MESSAGES(orderId)
	)
	return response.data
}

/**
 * Get user's orders
 * @param role - Filter by role ('buyer', 'seller', or 'all')
 * @param status - Filter by order status
 * @param page - Page number
 * @param limit - Items per page
 */
export const getMyOrders = async (
	role: 'buyer' | 'seller' | 'all' = 'all',
	status?: OrderStatus,
	page: number = 1,
	limit: number = 20
): Promise<MyOrdersResponse> => {
	const response = await apiClient.get<MyOrdersResponse>(
		API_ENDPOINTS.ORDERS.MY_ORDERS,
		{ params: { role, status, page, limit } }
	)
	return response.data
}

export default {
	getOrderByProduct,
	submitPayment,
	confirmShipping,
	confirmReceived,
	cancelOrder,
	rateOrder,
	sendMessage,
	getMessages,
	getMyOrders,
}
