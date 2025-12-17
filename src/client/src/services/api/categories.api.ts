import { apiClient } from '../config/axios.config'
import { API_ENDPOINTS } from '../config/endpoints'

export interface Category {
	_id: string
	name: string
	parent?: string | null
	children?: Category[]
}

export type CategoriesResponse = Category[]

/**
 * Fetch all categories with their children (hierarchy)
 */
export async function fetchCategories(): Promise<CategoriesResponse> {
	const response = await apiClient.get<CategoriesResponse>(
		API_ENDPOINTS.CATEGORIES.BASE
	)
	return response.data
}

/**
 * Get category details by ID
 */
export async function fetchCategoryDetail(id: string): Promise<Category> {
	const response = await apiClient.get<Category>(
		API_ENDPOINTS.CATEGORIES.DETAIL(id)
	)
	return response.data
}

/**
 * Get child categories by parent ID
 */
export async function fetchChildCategories(
	parentId: string
): Promise<{ parentId: string; children: Category[] }> {
	const response = await apiClient.get<{
		parentId: string
		children: Category[]
	}>(API_ENDPOINTS.CATEGORIES.CHILDREN(parentId))
	return response.data
}
