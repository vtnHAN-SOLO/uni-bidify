import { useEffect, useState } from 'react'
import { fetchCategories, type Category } from '@/services'

export const useCategories = () => {
	const [categories, setCategories] = useState<Category[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		// Check if we have cached categories in localStorage
		const cachedCategories = localStorage.getItem('categories')
		const cacheTimestamp = localStorage.getItem('categories_timestamp')
		const now = Date.now()
		const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes (instead of 1 hour)

		// ✅ Check if cache is valid (not expired)
		if (
			cachedCategories &&
			cacheTimestamp &&
			now - parseInt(cacheTimestamp) < CACHE_DURATION
		) {
			try {
				setCategories(JSON.parse(cachedCategories))
				setLoading(false)
				return
			} catch (e) {
				// Invalid cache, continue with fetching
			}
		}

		const loadCategories = async () => {
			try {
				setLoading(true)
				const data = await fetchCategories()
				setCategories(data)
				// Cache the categories for 5 minutes
				localStorage.setItem('categories', JSON.stringify(data))
				localStorage.setItem(
					'categories_timestamp',
					Date.now().toString()
				)
				setError(null)
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error('Failed to load categories')
				)
			} finally {
				setLoading(false)
			}
		}

		loadCategories()
	}, [])

	return { categories, loading, error }
}
