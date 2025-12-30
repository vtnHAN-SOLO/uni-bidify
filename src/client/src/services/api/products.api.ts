import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'
import type {
	ProductDTO,
	HomeProductsResponse,
	ProductsByCategoryNameResponse,
	ProductsListResponse,
} from '../types/product.types'

/**
 * Fetch products for home page (ending soon, most bids, highest price)
 */
export async function fetchHomeProducts(): Promise<HomeProductsResponse> {
	const response = await apiClient.get<HomeProductsResponse>(
		API_ENDPOINTS.PRODUCTS.HOME
	)
	return response.data
}

/**
 * Fetch products by category name (supports Vietnamese with accents)
 */
export async function fetchProductsByCategoryName(
	categoryName: string
): Promise<ProductsByCategoryNameResponse> {
	const response = await apiClient.get<ProductsByCategoryNameResponse>(
		API_ENDPOINTS.PRODUCTS.BY_CATEGORY_NAME(categoryName)
	)
	return response.data
}

export async function fetchEndingSoonProducts(
	page: number = 1,
	limit: number = 20
): Promise<ProductsListResponse> {
	const response = await apiClient.get<ProductsListResponse>(
		API_ENDPOINTS.PRODUCTS.ENDING_SOON,
		{ params: { page, limit } }
	)
	return response.data
}

export async function fetchMostBidsProducts(
	page: number = 1,
	limit: number = 20
): Promise<ProductsListResponse> {
	const response = await apiClient.get<ProductsListResponse>(
		API_ENDPOINTS.PRODUCTS.MOST_BIDS,
		{ params: { page, limit } }
	)
	return response.data
}

export async function fetchHighestPriceProducts(
	page: number = 1,
	limit: number = 20
): Promise<ProductsListResponse> {
	const response = await apiClient.get<ProductsListResponse>(
		API_ENDPOINTS.PRODUCTS.HIGHEST_PRICE,
		{ params: { page, limit } }
	)
	return response.data
}
/**
 * Fetch products by category ID
 */
export async function fetchProductsByCategoryId(
	categoryId: string
): Promise<{
	products: ProductDTO[]
	categoryId: string
	categoryName: string
}> {
	const response = await apiClient.get<{
		products: ProductDTO[]
		categoryId: string
		categoryName: string
	}>(API_ENDPOINTS.PRODUCTS.BY_CATEGORY_ID(categoryId))
	return response.data
}

/**
 * Fetch product details
 */
export async function fetchProductDetail(id: string): Promise<any> {
	const response = await apiClient.get<{
		success: boolean
		product: any
	}>(API_ENDPOINTS.PRODUCTS.DETAIL(id))
	return response.data.product
}

/**
 * Fetch related products (same category, excluding current product)
 */
export async function fetchRelatedProducts(
	id: string
): Promise<{ products: ProductDTO[] }> {
	const response = await apiClient.get<{ products: ProductDTO[] }>(
		API_ENDPOINTS.PRODUCTS.RELATED(id)
	)
	return response.data
}

/**
 * Fetch seller's own products
 */
export async function fetchSellerProducts(
	page: number = 1,
	limit: number = 20,
	status?: 'active' | 'ended'
): Promise<{
	success: boolean
	data: {
		products: ProductDTO[]
		total: number
		page: number
		totalPages: number
	}
}> {
	const response = await apiClient.get<{
		success: boolean
		data: {
			products: ProductDTO[]
			total: number
			page: number
			totalPages: number
		}
	}>(API_ENDPOINTS.PRODUCTS.SELLER_PRODUCTS, {
		params: { page, limit, status },
	})
	return response.data
}

/**
 * Delete a product (seller only, no bids yet)
 */
export async function deleteSellerProduct(
	id: string
): Promise<{ success: boolean; message: string }> {
	const response = await apiClient.delete<{
		success: boolean
		message: string
	}>(API_ENDPOINTS.PRODUCTS.DELETE(id))
	return response.data
}

/**
 * Append additional description to a product (seller only)
 */
export async function appendProductDescription(
	id: string,
	content: string
): Promise<{ success: boolean; message: string; description: string }> {
	const response = await apiClient.put<{
		success: boolean
		message: string
		description: string
	}>(API_ENDPOINTS.PRODUCTS.APPEND_DESCRIPTION(id), { content })
	return response.data
}

/**
 * Create a new product (seller only)
 */
export interface CreateProductData {
	name: string
	description: string
	categoryId: string
	images: string[]
	startPrice: number
	priceStep: number
	currentPrice: number
	buyNowPrice?: number
	endTime: string
	autoExtend?: boolean
	allowUnratedBidders?: boolean
}

export async function createProduct(
	data: CreateProductData
): Promise<{ success: boolean; message: string; product: any }> {
	const response = await apiClient.post<{
		success: boolean
		message: string
		product: any
	}>(API_ENDPOINTS.PRODUCTS.BASE, data)
	return response.data
}

/**
 * Search products with filters
 */
export interface SearchProductsParams {
	q?: string
	categoryName?: string // Search by category name (not ID)
	sort?: 'endTime' | 'currentPrice'
	order?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface SearchProductsResponse {
	success: boolean
	data: {
		products: ProductDTO[]
		total: number
		page: number
		totalPages: number
	}
}

export async function searchProducts(
	params: SearchProductsParams
): Promise<SearchProductsResponse> {
	const response = await apiClient.get<SearchProductsResponse>(
		API_ENDPOINTS.PRODUCTS.SEARCH,
		{ params }
	)
	return response.data
}
