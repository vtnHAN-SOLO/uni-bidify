import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/Header'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/input/button'
import { Input } from '@/components/ui/input/input'
import { Checkbox } from '@/components/ui/input/checkbox'
import { Label } from '@/components/ui/input/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/input/select'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { searchProducts, SearchProductsParams } from '@/services/api/products.api'
import { fetchCategories, Category } from '@/services/api/categories.api'

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => {
			clearTimeout(timer)
		}
	}, [value, delay])

	return debouncedValue
}

export default function Search() {
	const [searchParams, setSearchParams] = useSearchParams()
	const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
	const [category, setCategory] = useState(
		searchParams.get('category') || 'all'
	)
	const [sortBy, setSortBy] = useState<'endTime-desc' | 'price-asc' | 'price-desc'>('endTime-desc')
	const [includeEnded, setIncludeEnded] = useState(
		searchParams.get('includeEnded') === 'true'
	)
	const [currentPage, setCurrentPage] = useState(1)
	const productsPerPage = 12

	// Debounce search query for real-time search (300ms delay)
	const debouncedSearchQuery = useDebounce(searchQuery, 300)
	const debouncedCategory = useDebounce(category, 300)

	// Track if this is the initial load from URL
	const isInitialLoad = useRef(true)

	// Fetch categories for dropdown
	const { data: categories = [] } = useQuery({
		queryKey: ['categories'],
		queryFn: fetchCategories,
	})

	// Only use parent categories for search filter
	const parentCategories = categories.map((parent: Category) => ({
		id: parent._id,
		name: parent.name,
	}))

	// Build search params for API using debounced values
	const [sortField, sortOrder] = sortBy.split('-') as ['endTime' | 'price', 'asc' | 'desc']
	const apiParams: SearchProductsParams = {
		page: currentPage,
		limit: productsPerPage,
		sort: sortField === 'price' ? 'currentPrice' : 'endTime',
		order: sortOrder,
	}

	// Use debounced values for real-time search
	if (debouncedSearchQuery.trim()) {
		apiParams.q = debouncedSearchQuery.trim()
	}
	if (debouncedCategory && debouncedCategory !== 'all') {
		apiParams.categoryName = debouncedCategory
	}
	if (includeEnded) {
		apiParams.includeEnded = true
	}

	// Update URL when debounced values change (not on initial load)
	useEffect(() => {
		if (isInitialLoad.current) {
			isInitialLoad.current = false
			return
		}

		const params = new URLSearchParams()
		if (debouncedSearchQuery.trim()) {
			params.set('q', debouncedSearchQuery.trim())
		}
		if (debouncedCategory !== 'all') {
			params.set('category', debouncedCategory)
		}
		if (includeEnded) {
			params.set('includeEnded', 'true')
		}
		setSearchParams(params, { replace: true })
		setCurrentPage(1)
	}, [debouncedSearchQuery, debouncedCategory, includeEnded, setSearchParams])

	// Fetch search results
	const {
		data: searchResult,
		isLoading,
		isFetching,
	} = useQuery({
		queryKey: ['searchProducts', apiParams],
		queryFn: () => searchProducts(apiParams),
	})

	const products = searchResult?.data?.products || []
	const totalProducts = searchResult?.data?.total || 0
	const totalPages = searchResult?.data?.totalPages || 1

	// Keep handleSearch for form submit (optional, for pressing Enter key)
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		// Form submit is now optional - search happens automatically via debounce
	}

	const handleSortChange = (value: string) => {
		setSortBy(value as 'endTime-desc' | 'price-asc' | 'price-desc')
		setCurrentPage(1)
	}

	const handleCategoryChange = (value: string) => {
		setCategory(value)
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />

			<main className="container py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-6">
						Tìm kiếm sản phẩm
					</h1>

					<form onSubmit={handleSearch} className="space-y-4">
						<div className="flex gap-4">
							<div className="flex-1">
								<Input
									type="search"
									placeholder="Tìm kiếm sản phẩm..."
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									className="h-12"
								/>
							</div>
							<Select
								value={category}
								onValueChange={handleCategoryChange}
							>
								<SelectTrigger className="w-[250px] h-12">
									<SelectValue placeholder="Chọn danh mục" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										Tất cả danh mục
									</SelectItem>
									{parentCategories.map((cat) => (
										<SelectItem
											key={cat.id}
											value={cat.name}
										>
											{cat.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="submit" size="lg" className="h-12">
								<SearchIcon className="h-5 w-5 mr-2" />
								Tìm kiếm
							</Button>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="includeEnded"
								checked={includeEnded}
								onCheckedChange={(checked) =>
									setIncludeEnded(checked === true)
								}
							/>
							<Label
								htmlFor="includeEnded"
								className="text-sm text-muted-foreground cursor-pointer"
							>
								Bao gồm sản phẩm đã kết thúc đấu giá
							</Label>
						</div>
					</form>
				</div>

				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							{isLoading ? (
								<p className="text-muted-foreground">
									Đang tìm kiếm...
								</p>
							) : (
								<p className="text-muted-foreground">
									{totalProducts > 0 ? (
										<>
											Tìm thấy{' '}
											<span className="font-semibold text-foreground">
												{totalProducts}
											</span>{' '}
											kết quả
										</>
									) : (
										'Không tìm thấy sản phẩm nào'
									)}
								</p>
							)}
						</div>

						{totalProducts > 0 && (
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Sắp xếp:
								</span>
								<Select
									value={sortBy}
									onValueChange={handleSortChange}
								>
									<SelectTrigger className="w-[200px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="endTime-desc">
											Sắp kết thúc
										</SelectItem>
										<SelectItem value="price-asc">
											Giá tăng dần
										</SelectItem>
										<SelectItem value="price-desc">
											Giá giảm dần
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<span className="ml-2">Đang tải...</span>
					</div>
				) : products.length > 0 ? (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8 relative">
							{isFetching && !isLoading && (
								<div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								</div>
							)}
							{products.map((product) => (
								<ProductCard
									key={product._id}
									id={product._id}
									title={product.name}
									currentPrice={product.currentPrice}
									image={product.images[0] || ''}
									endTime={new Date(product.endTime)}
									bidCount={product.bidCount || 0}
									isNew={product.isNew}
									highestBidder={product.highestBidderName || 'Chưa có'}
									category={product.categoryName || ''}
									buyNowPrice={product.buyNowPrice}
								/>
							))}
						</div>

						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-2">
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setCurrentPage((p) =>
											Math.max(1, p - 1)
										)
									}
									disabled={currentPage === 1 || isFetching}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>

								{Array.from(
									{ length: Math.min(totalPages, 5) },
									(_, i) => {
										// Show pages around current page
										let page: number
										if (totalPages <= 5) {
											page = i + 1
										} else if (currentPage <= 3) {
											page = i + 1
										} else if (currentPage >= totalPages - 2) {
											page = totalPages - 4 + i
										} else {
											page = currentPage - 2 + i
										}
										return page
									}
								).map((page) => (
									<Button
										key={page}
										variant={
											currentPage === page
												? 'default'
												: 'outline'
										}
										onClick={() => setCurrentPage(page)}
										disabled={isFetching}
										className="min-w-[40px]"
									>
										{page}
									</Button>
								))}

								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setCurrentPage((p) =>
											Math.min(totalPages, p + 1)
										)
									}
									disabled={currentPage === totalPages || isFetching}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						)}
					</>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground text-lg">
							Thử tìm kiếm với từ khóa khác hoặc thay đổi danh mục
						</p>
					</div>
				)}
			</main>
		</div>
	)
}
