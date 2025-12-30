import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'

// ==================== TYPES ====================

export interface AskQuestionRequest {
	productId: string
	question: string
}

export interface AskQuestionResponse {
	success: boolean
	message: string
	data: {
		_id: string
		question: string
		askerName: string
		createdAt: string
	}
}

export interface AnswerQuestionRequest {
	answer: string
}

export interface AnswerQuestionResponse {
	success: boolean
	message: string
	data: {
		_id: string
		question: string
		answer: string
		answeredAt: string
	}
}

export interface Question {
	_id: string
	question: string
	answer: string | null
	askerName: string
	createdAt: string
	answeredAt: string | null
}

export interface ProductQuestionsResponse {
	success: boolean
	data: {
		questions: Question[]
		total: number
		page: number
		totalPages: number
	}
}

export interface SellerQuestion {
	_id: string
	question: string
	answer: string | null
	askerName: string
	productId: string
	productName: string
	productImage: string
	createdAt: string
	answeredAt: string | null
}

export interface SellerQuestionsResponse {
	success: boolean
	data: {
		questions: SellerQuestion[]
		total: number
		page: number
		totalPages: number
	}
}

// ==================== API FUNCTIONS ====================

/**
 * Ask a question about a product
 * @param data - productId and question text
 */
export const askQuestion = async (
	data: AskQuestionRequest
): Promise<AskQuestionResponse> => {
	const response = await apiClient.post<AskQuestionResponse>(
		API_ENDPOINTS.QUESTIONS.ASK,
		data
	)
	return response.data
}

/**
 * Answer a question (Seller only)
 * @param questionId - Question ID
 * @param data - Answer text
 */
export const answerQuestion = async (
	questionId: string,
	data: AnswerQuestionRequest
): Promise<AnswerQuestionResponse> => {
	const response = await apiClient.put<AnswerQuestionResponse>(
		API_ENDPOINTS.QUESTIONS.ANSWER(questionId),
		data
	)
	return response.data
}

/**
 * Get all questions for a product
 * @param productId - Product ID
 * @param page - Page number
 * @param limit - Items per page
 */
export const getProductQuestions = async (
	productId: string,
	page: number = 1,
	limit: number = 20
): Promise<ProductQuestionsResponse> => {
	const response = await apiClient.get<ProductQuestionsResponse>(
		API_ENDPOINTS.QUESTIONS.PRODUCT_QUESTIONS(productId),
		{ params: { page, limit } }
	)
	return response.data
}

/**
 * Get all questions for seller's products (Seller only)
 * @param page - Page number
 * @param limit - Items per page
 * @param answered - Filter by answered status ('true', 'false', or undefined for all)
 */
export const getSellerQuestions = async (
	page: number = 1,
	limit: number = 20,
	answered?: 'true' | 'false'
): Promise<SellerQuestionsResponse> => {
	const response = await apiClient.get<SellerQuestionsResponse>(
		API_ENDPOINTS.QUESTIONS.SELLER_QUESTIONS,
		{ params: { page, limit, answered } }
	)
	return response.data
}

export default {
	askQuestion,
	answerQuestion,
	getProductQuestions,
	getSellerQuestions,
}
