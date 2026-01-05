import { useState, useEffect, useRef } from 'react'
import {
	Search,
	Heart,
	User,
	Menu,
	ChevronDown,
	ChevronRight,
	LogOut,
	LayoutGrid,
	Package,
	Gavel,
	Settings,
	Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/input/button'
import { Input } from '@/components/ui/input/input'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchProducts } from '@/services/api/products.api'
import { formatCompactPrice } from '@/lib/utils'

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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/navigation/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/data-display/avatar'
import { Badge } from '@/components/ui/data-display/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories } from '@/hooks/useCategories'

export const Header = () => {
	const { user, isAuthenticated, logout } = useAuth()
	const navigate = useNavigate()
	const { categories, loading: categoriesLoading } = useCategories()
	const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [showSearchDropdown, setShowSearchDropdown] = useState(false)
	const searchContainerRef = useRef<HTMLDivElement>(null)

	// Debounce search query for dropdown (300ms delay)
	const debouncedSearchQuery = useDebounce(searchQuery, 300)

	// Search products for dropdown
	const { data: searchResult, isLoading: isSearching } = useQuery({
		queryKey: ['headerSearch', debouncedSearchQuery],
		queryFn: () =>
			searchProducts({
				q: debouncedSearchQuery.trim(),
				limit: 5,
				sort: 'endTime',
				order: 'asc',
			}),
		enabled: debouncedSearchQuery.trim().length > 0,
	})

	const searchProducts_results = searchResult?.data?.products || []

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchContainerRef.current &&
				!searchContainerRef.current.contains(event.target as Node)
			) {
				setShowSearchDropdown(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	// Handle search form submit
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		setShowSearchDropdown(false)
		if (searchQuery.trim()) {
			navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
		} else {
			navigate('/search')
		}
	}

	// Handle product click from dropdown
	const handleProductClick = (productId: string) => {
		setShowSearchDropdown(false)
		setSearchQuery('')
		navigate(`/product/${productId}`)
	}

	// Get user initials for avatar
	const getUserInitials = () => {
		if (!user?.fullName) return 'U'

		const names = user.fullName.trim().split(' ')
		if (names.length === 1) {
			return names[0].substring(0, 2).toUpperCase()
		}

		return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
	}

	const getUserDisplayName = () => {
		return user?.fullName || 'User'
	}

	// ✅ NEW: Function to get profile route based on user role
	const getProfileRoute = () => {
		if (!user?.role) return '/profile'

		switch (user.role) {
			case 'ROLE ADMIN':
				return '/admin/profile'
			case 'ROLE SELLER':
				return '/seller/profile'
			case 'ROLE BIDDER':
			default:
				return '/profile'
		}
	}

	// ✅ NEW: Handler for profile navigation
	const handleProfileClick = () => {
		navigate(getProfileRoute())
	}

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-16 items-center justify-between">
				{/* Logo */}
				<Link to="/" className="flex items-center space-x-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-auction">
						<span className="text-lg font-bold text-white">A</span>
					</div>
					<span className="hidden font-bold sm:inline-block text-gradient-auction">
						AuctionHub
					</span>
				</Link>

				{/* Category Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="ml-4 gap-2 font-medium"
						>
							<LayoutGrid className="h-4 w-4" />
							<span className="hidden sm:inline">Danh mục</span>
							<ChevronDown className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-64 p-0"
						sideOffset={8}
					>
						{categoriesLoading ? (
							<div className="p-4 text-center text-sm text-muted-foreground">
								Đang tải...
							</div>
						) : categories.length > 0 ? (
							categories.map((cat) => {
								const hasChildren =
									cat.children && cat.children.length > 0
								const isExpanded = expandedCategory === cat._id

								return (
									<div key={cat._id}>
										<button
											onClick={() => {
												if (hasChildren) {
													setExpandedCategory(
														isExpanded
															? null
															: cat._id
													)
												}
											}}
											className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
										>
											<span>{cat.name}</span>
											{hasChildren && (
												<ChevronRight
													className={`h-4 w-4 transition-transform duration-200 ${
														isExpanded
															? 'rotate-90'
															: ''
													}`}
												/>
											)}
										</button>

										{/* Children categories */}
										{hasChildren && isExpanded && (
											<div className="bg-muted/50">
												{cat.children!.map((child) => (
													<DropdownMenuItem
														key={child._id}
														onClick={() =>
															navigate(
																`/category/${child._id}`
															)
														}
														className="pl-8 py-2.5 cursor-pointer"
													>
														{child.name}
													</DropdownMenuItem>
												))}
											</div>
										)}
									</div>
								)
							})
						) : (
							<div className="p-4 text-center text-sm text-muted-foreground">
								Không có danh mục
							</div>
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Search & User Actions */}
				<div className="flex flex-1 items-center justify-end space-x-4">
					{/* Search Bar with Dropdown */}
					<div
						ref={searchContainerRef}
						className="hidden w-full max-w-sm md:block relative"
					>
						<form
							onSubmit={handleSearch}
							className="flex items-center space-x-2"
						>
							<Input
								type="search"
								placeholder="Tìm kiếm sản phẩm đấu giá..."
								className="h-9"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value)
									setShowSearchDropdown(true)
								}}
								onFocus={() => setShowSearchDropdown(true)}
							/>
							<Button type="submit" size="sm" className="h-9">
								<Search className="h-4 w-4" />
							</Button>
						</form>

						{/* Search Dropdown */}
						{showSearchDropdown && debouncedSearchQuery.trim().length > 0 && (
							<div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
								{isSearching ? (
									<div className="flex items-center justify-center py-4">
										<Loader2 className="h-5 w-5 animate-spin text-primary" />
										<span className="ml-2 text-sm text-muted-foreground">
											Đang tìm kiếm...
										</span>
									</div>
								) : searchProducts_results.length > 0 ? (
									<>
										{searchProducts_results.map((product) => (
											<button
												key={product._id}
												onClick={() => handleProductClick(product._id)}
												className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
											>
												<img
													src={product.images[0] || '/placeholder.jpg'}
													alt={product.name}
													className="w-12 h-12 object-cover rounded"
												/>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														{product.name}
													</p>
													<p className="text-sm text-primary font-semibold">
														{formatCompactPrice(product.currentPrice)}
													</p>
													{product.categoryName && (
														<p className="text-xs text-muted-foreground">
															{product.categoryName}
														</p>
													)}
												</div>
											</button>
										))}
										<button
											onClick={handleSearch as any}
											className="w-full p-3 text-sm text-primary hover:bg-accent transition-colors border-t"
										>
											Xem tất cả kết quả cho "{debouncedSearchQuery}"
										</button>
									</>
								) : (
									<div className="p-4 text-center text-sm text-muted-foreground">
										Không tìm thấy sản phẩm nào
									</div>
								)}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						{isAuthenticated ? (
							<>
								{/* Watchlist */}
								<Link to="/watch-list">
									<Button
										variant="ghost"
										size="icon"
										className="h-9 w-9"
									>
										<Heart className="h-4 w-4" />
										<span className="sr-only">
											Yêu thích
										</span>
									</Button>
								</Link>

								{/* User Menu */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											className="h-9 gap-2 px-2"
										>
											<Avatar className="h-7 w-7">
												<AvatarFallback className="bg-gradient-auction text-white text-xs">
													{getUserInitials()}
												</AvatarFallback>
											</Avatar>
											<span className="hidden md:inline-block text-sm font-medium">
												{getUserDisplayName()}
											</span>
											<ChevronDown className="h-3 w-3 opacity-50" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										className="w-56"
										sideOffset={8}
									>
										<div className="flex items-center justify-start gap-2 p-2">
											<Avatar className="h-8 w-8">
												<AvatarFallback className="bg-gradient-auction text-white">
													{getUserInitials()}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col space-y-1">
												<p className="text-sm font-medium leading-none">
													{getUserDisplayName()}
												</p>
												<p className="text-xs leading-none text-muted-foreground">
													{user?.email}
												</p>
											</div>
										</div>
										<DropdownMenuSeparator />
										{/* ✅ CHANGED: Use onClick handler instead of Link */}
										<DropdownMenuItem
											onClick={handleProfileClick}
											className="cursor-pointer"
										>
											<User className="mr-2 h-4 w-4" />
											<span>Hồ sơ của tôi</span>
										</DropdownMenuItem>

										{/* Seller-specific menu items */}
										{user?.role === 'ROLE SELLER' && (
											<>
												<DropdownMenuItem
													onClick={() => navigate('/seller/products')}
													className="cursor-pointer"
												>
													<Package className="mr-2 h-4 w-4" />
													<span>Quản lý sản phẩm</span>
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => navigate('/seller/create-product')}
													className="cursor-pointer"
												>
													<Gavel className="mr-2 h-4 w-4" />
													<span>Đăng sản phẩm mới</span>
												</DropdownMenuItem>
											</>
										)}

										{/* Admin-specific menu items */}
										{user?.role === 'ROLE ADMIN' && (
											<DropdownMenuItem
												onClick={() => navigate('/admin')}
												className="cursor-pointer"
											>
												<Settings className="mr-2 h-4 w-4" />
												<span>Quản trị hệ thống</span>
											</DropdownMenuItem>
										)}

										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={logout}
											className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
										>
											<LogOut className="mr-2 h-4 w-4" />
											<span>Đăng xuất</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						) : (
							<>
								{/* Guest Actions */}
								<Link to="/auth">
									<Button
										size="sm"
										className="hidden md:inline-flex"
									>
										Đăng nhập
									</Button>
								</Link>
							</>
						)}

						{/* Mobile Menu */}
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9 md:hidden"
						>
							<Menu className="h-4 w-4" />
							<span className="sr-only">Menu</span>
						</Button>
					</div>
				</div>
			</div>
		</header>
	)
}
