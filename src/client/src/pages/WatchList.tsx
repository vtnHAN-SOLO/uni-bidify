import { useState, useMemo } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { Heart, Filter, Grid3x3, List, Search } from 'lucide-react'
import { Button } from '@/components/ui/input/button'
import { Input } from '@/components/ui/input/input'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/navigation/dropdown-menu'
import { Card, CardContent } from '@/components/ui/data-display/card'
import { useQuery } from '@tanstack/react-query'
import { fetchWatchlist } from '@/services/api/watchlist.api'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'

export default function WatchList() {
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
	const [sortBy, setSortBy] = useState<'newest' | 'ending' | 'price'>(
		'newest'
	)
	const [searchQuery, setSearchQuery] = useState('')
	const { user } = useAuth()

	// ✅ Fetch watchlist from backend
	const { data, isLoading, isError } = useQuery({
		queryKey: ['watchlist'],
		queryFn: fetchWatchlist,
		enabled: !!user, // Only fetch if user is logged in
	})

	const watchList = useMemo(() => data?.watchlist ?? [], [data?.watchlist])

	// ✅ Filter watchlist based on search query
	const filteredWatchList = useMemo(() => {
		if (!searchQuery.trim()) return watchList

		const query = searchQuery.toLowerCase().trim()
		return watchList.filter((product) => {
			const nameMatch = product.name.toLowerCase().includes(query)
			const categoryMatch = product.categoryName
				?.toLowerCase()
				.includes(query)
			return nameMatch || categoryMatch
		})
	}, [watchList, searchQuery])

	// ✅ Sort filtered watchlist
	const sortedWatchList = useMemo(() => {
		const sorted = [...filteredWatchList]
		switch (sortBy) {
			case 'ending':
				return sorted.sort(
					(a, b) =>
						new Date(a.endTime).getTime() -
						new Date(b.endTime).getTime()
				)
			case 'price':
				return sorted.sort((a, b) => b.currentPrice - a.currentPrice)
			case 'newest':
			default:
				// Sort by endTime descending (products ending later = newer)
				return sorted.sort(
					(a, b) =>
						new Date(b.endTime).getTime() -
						new Date(a.endTime).getTime()
				)
		}
	}, [filteredWatchList, sortBy])

	// Calculate statistics
	const stats = {
		total: watchList.length,
		endingSoon: watchList.filter((p) => {
			const hoursLeft =
				(new Date(p.endTime).getTime() - Date.now()) / (1000 * 60 * 60)
			return hoursLeft < 24 && hoursLeft > 0
		}).length,
		active: watchList.filter((p) => {
			return new Date(p.endTime).getTime() > Date.now()
		}).length,
	}

	// ✅ Handle not logged in
	if (!user) {
		return (
			<>
				<Header /> {/* ✅ ADD HEADER */}
				<div className="container mx-auto px-4 py-8 max-w-7xl">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16">
							<Heart className="h-16 w-16 text-muted-foreground mb-4" />
							<h3 className="text-xl font-semibold mb-2">
								Vui lòng đăng nhập
							</h3>
							<p className="text-muted-foreground mb-6">
								Bạn cần đăng nhập để xem danh sách yêu thích
							</p>
							<Button asChild>
								<a href="/auth">Đăng nhập</a>
							</Button>
						</CardContent>
					</Card>
				</div>
			</>
		)
	}

	// ✅ Handle loading
	if (isLoading) {
		return (
			<>
				<Header /> {/* ✅ ADD HEADER */}
				<div className="container mx-auto px-4 py-8 max-w-7xl">
					<div className="flex items-center justify-center h-64">
						<p className="text-muted-foreground">
							Đang tải danh sách yêu thích...
						</p>
					</div>
				</div>
			</>
		)
	}

	// ✅ Handle error
	if (isError) {
		return (
			<>
				<Header /> {/* ✅ ADD HEADER */}
				<div className="container mx-auto px-4 py-8 max-w-7xl">
					<Card className="border-destructive">
						<CardContent className="pt-6">
							<p className="text-destructive">
								Có lỗi khi tải danh sách yêu thích. Vui lòng thử
								lại.
							</p>
						</CardContent>
					</Card>
				</div>
			</>
		)
	}

	return (
		<>
			<Header /> {/* ✅ ADD HEADER */}
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* ✅ HEADER SECTION */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-auction">
								<Heart className="h-6 w-6 text-white fill-white" />
							</div>
							<div>
								<h1 className="text-3xl font-bold tracking-tight">
									Danh sách yêu thích
								</h1>
								<p className="text-muted-foreground mt-1">
									Theo dõi các sản phẩm bạn quan tâm
								</p>
							</div>
						</div>

						{watchList.length > 0 && (
							<div className="flex items-center gap-2">
								{/* Sort Dropdown */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="gap-2"
										>
											<Filter className="h-4 w-4" />
											<span className="hidden sm:inline">
												Sắp xếp
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => setSortBy('newest')}
										>
											Mới nhất
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setSortBy('ending')}
										>
											Sắp kết thúc
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setSortBy('price')}
										>
											Giá cao nhất
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								{/* View Mode Toggle */}
								<div className="hidden md:flex items-center border rounded-md">
									<Button
										variant={
											viewMode === 'grid'
												? 'default'
												: 'ghost'
										}
										size="sm"
										onClick={() => setViewMode('grid')}
										className="rounded-r-none"
									>
										<Grid3x3 className="h-4 w-4" />
									</Button>
									<Button
										variant={
											viewMode === 'list'
												? 'default'
												: 'ghost'
										}
										size="sm"
										onClick={() => setViewMode('list')}
										className="rounded-l-none"
									>
										<List className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</div>

					{/* ✅ SEARCH BAR */}
					{watchList.length > 0 && (
						<div className="mt-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Tìm kiếm trong danh sách yêu thích..."
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									className="pl-10 h-10"
								/>
							</div>
							{searchQuery && (
								<p className="text-sm text-muted-foreground mt-2">
									Tìm thấy{' '}
									<span className="font-semibold text-foreground">
										{filteredWatchList.length}
									</span>{' '}
									sản phẩm
									{filteredWatchList.length !==
										watchList.length && (
										<>
											{' '}
											trong tổng số{' '}
											<span className="font-semibold text-foreground">
												{watchList.length}
											</span>
										</>
									)}
								</p>
							)}
						</div>
					)}
				</div>

				{/* ✅ STATISTICS CARDS */}
				{watchList.length > 0 && (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											Tổng số sản phẩm
										</p>
										<h3 className="text-2xl font-bold mt-1">
											{stats.total}
										</h3>
									</div>
									<div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
										<Heart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* ✅ WATCHLIST CONTENT */}
				{watchList.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
								<Heart className="h-12 w-12 text-muted-foreground" />
							</div>
							<h3 className="text-xl font-semibold mb-2">
								Danh sách yêu thích trống
							</h3>
							<p className="text-muted-foreground text-center max-w-sm mb-6">
								Bạn chưa thêm sản phẩm nào vào danh sách yêu
								thích. Hãy khám phá và theo dõi các sản phẩm bạn
								quan tâm!
							</p>
							<Button asChild>
								<a href="/">Khám phá sản phẩm</a>
							</Button>
						</CardContent>
					</Card>
				) : sortedWatchList.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
								<Search className="h-12 w-12 text-muted-foreground" />
							</div>
							<h3 className="text-xl font-semibold mb-2">
								Không tìm thấy sản phẩm
							</h3>
							<p className="text-muted-foreground text-center max-w-sm mb-6">
								Không có sản phẩm nào phù hợp với từ khóa "
								{searchQuery}". Hãy thử tìm kiếm với từ khóa
								khác.
							</p>
							<Button
								variant="outline"
								onClick={() => setSearchQuery('')}
							>
								Xóa tìm kiếm
							</Button>
						</CardContent>
					</Card>
				) : (
					<div
						className={
							viewMode === 'grid'
								? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
								: 'flex flex-col gap-4'
						}
					>
						{sortedWatchList.map((product) => (
							<ProductCard
								key={product._id}
								id={product._id}
								image={product.images[0]}
								title={product.name}
								currentPrice={product.currentPrice}
								buyNowPrice={product.buyNowPrice}
								highestBidder="****"
								bidCount={product.bidCount || 0}
								endTime={new Date(product.endTime)}
								isNew={product.isNew}
								category={
									product.categoryName
										? product.categoryName
										: 'Khác'
								}
							/>
						))}
					</div>
				)}
			</div>
		</>
	)
}
