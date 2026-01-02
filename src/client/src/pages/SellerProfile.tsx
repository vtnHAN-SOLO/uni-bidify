import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/input/button'
import { Input } from '@/components/ui/input/input'
import { Label } from '@/components/ui/input/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/data-display/card'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/navigation/tabs'
import { Badge } from '@/components/ui/data-display/badge'
import { Textarea } from '@/components/ui/input/textarea'
import { ProductCard } from '@/components/ProductCard'
import {
	Star,
	ThumbsUp,
	ThumbsDown,
	Package,
	Award,
	ArrowLeft,
	Loader2,
	Clock,
	AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { userApi } from '@/services'
import { fetchSellerProducts } from '@/services/api/products.api'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

export default function SellerProfile() {
	const [activeTab, setActiveTab] = useState('info')
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		address: '',
		currentPassword: '',
		newPassword: '',
	})
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
	const navigate = useNavigate()
	const { user, isLoading } = useAuth()

	// ✅ Fetch user profile data
	const { data: profileData } = useQuery({
		queryKey: ['userProfile'],
		queryFn: userApi.getProfile,
		enabled: !!user && !isLoading,
	})

	// ✅ Fetch reviews received by user
	const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
		queryKey: ['userReviews'],
		queryFn: () => userApi.getReviews(),
		enabled: !!user && !isLoading,
	})

	// ✅ Fetch seller's active products (đang bán)
	const { data: activeProductsData, isLoading: isLoadingActiveProducts } = useQuery({
		queryKey: ['sellerProducts', 'active'],
		queryFn: () => fetchSellerProducts(1, 50, 'active'),
		enabled: !!user && !isLoading,
	})

	// ✅ Fetch seller's ended products (đã bán)
	const { data: endedProductsData, isLoading: isLoadingEndedProducts } = useQuery({
		queryKey: ['sellerProducts', 'ended'],
		queryFn: () => fetchSellerProducts(1, 50, 'ended'),
		enabled: !!user && !isLoading,
	})

	// Initialize form data from profile
	useEffect(() => {
		if (profileData?.user) {
			setFormData({
				firstName: profileData.user.firstName || '',
				lastName: profileData.user.lastName || '',
				address: profileData.user.address || '',
				currentPassword: '',
				newPassword: '',
			})
		}
	}, [profileData])

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<main className="container py-8">
					<div className="flex items-center justify-center h-64">
						<p className="text-muted-foreground">Đang tải...</p>
					</div>
				</main>
			</div>
		)
	}

	const profile = profileData?.user

	// Calculate seller expiry status
	const sellerExpiryDate = user?.sellerExpiryDate ? new Date(user.sellerExpiryDate) : null
	const now = new Date()
	const isSellerExpired = sellerExpiryDate ? now > sellerExpiryDate : false
	const daysUntilExpiry = sellerExpiryDate
		? Math.ceil((sellerExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
		: null
	const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 2

	const handleSwitchToBidder = () => {
		navigate('/profile')
	}

	const handleUpdateProfile = async () => {
		try {
			setIsUpdatingProfile(true)
			await userApi.updateProfile(formData)
			toast.success('Cập nhật thông tin thành công!')
		} catch (error: any) {
			toast.error(
				error.response?.data?.error || 'Cập nhật thông tin thất bại'
			)
		} finally {
			setIsUpdatingProfile(false)
			window.location.reload()
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />

			<main className="container py-8">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Sidebar */}
					<div className="lg:col-span-1">
						<Card>
							<CardHeader>
								<div className="flex items-center justify-center mb-4">
									<div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-4xl font-bold text-white">
										{profile?.firstName?.charAt(0) || 'S'}
									</div>
								</div>
								<CardTitle className="text-center">
									{profile?.fullName || 'Người dùng'}
								</CardTitle>
								<CardDescription className="text-center">
									{profile?.email}
								</CardDescription>
								<div className="flex justify-center mt-2">
									<Badge className="bg-gradient-to-r from-amber-500 to-orange-600">
										Người bán
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Seller Expiry Warning */}
									{sellerExpiryDate && (
										<div className={`p-3 rounded-lg ${
											isSellerExpired
												? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
												: isExpiringSoon
													? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
													: 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
										}`}>
											<div className="flex items-center gap-2 mb-1">
												{isSellerExpired ? (
													<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
												) : (
													<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
												)}
												<span className={`text-sm font-medium ${
													isSellerExpired
														? 'text-red-700 dark:text-red-300'
														: isExpiringSoon
															? 'text-yellow-700 dark:text-yellow-300'
															: 'text-blue-700 dark:text-blue-300'
												}`}>
													{isSellerExpired
														? 'Quyền bán hàng đã hết hạn'
														: isExpiringSoon
															? 'Sắp hết hạn bán hàng'
															: 'Quyền bán hàng'}
												</span>
											</div>
											<p className={`text-xs ${
												isSellerExpired
													? 'text-red-600 dark:text-red-400'
													: isExpiringSoon
														? 'text-yellow-600 dark:text-yellow-400'
														: 'text-blue-600 dark:text-blue-400'
											}`}>
												{isSellerExpired
													? 'Bạn không thể đăng sản phẩm mới. Vui lòng yêu cầu nâng cấp lại.'
													: `Hết hạn: ${sellerExpiryDate.toLocaleDateString('vi-VN', {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit'
													})} (còn ${daysUntilExpiry} ngày)`
												}
											</p>
										</div>
									)}

									<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
										<div className="flex items-center gap-2">
											<Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
											<span className="font-semibold">
												{reviewsData?.summary?.ratingPercentage || 0}
												%
											</span>
										</div>
										<span className="text-sm text-muted-foreground">
											{reviewsData?.summary?.total || 0} đánh
											giá
										</span>
									</div>

									<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
										<div className="flex items-center gap-2">
											<ThumbsUp className="h-5 w-5 text-green-500" />
											<span className="font-semibold">
												{reviewsData?.summary?.positive || 0}
											</span>
										</div>
										<span className="text-sm text-muted-foreground">
											Tích cực
										</span>
									</div>

									<Button
										variant="outline"
										className="w-full gap-2"
										onClick={handleSwitchToBidder}
									>
										<ArrowLeft className="h-4 w-4" />
										Chuyển sang hồ sơ Bidder
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main Content */}
					<div className="lg:col-span-3">
						<Tabs value={activeTab} onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="info">
									Thông tin
								</TabsTrigger>
								<TabsTrigger value="selling">
									Đang bán
								</TabsTrigger>
								<TabsTrigger value="sold">Đã bán</TabsTrigger>
								<TabsTrigger value="reviews">
									Đánh giá
								</TabsTrigger>
							</TabsList>

							{/* Info Tab */}
							<TabsContent value="info">
								<Card>
									<CardHeader>
										<CardTitle>Thông tin cá nhân</CardTitle>
										<CardDescription>
											Cập nhật thông tin tài khoản của bạn
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="firstName">
												Họ
											</Label>
											<Input
												id="firstName"
												value={formData.firstName}
												onChange={(e) =>
													setFormData({
														...formData,
														firstName:
															e.target.value,
													})
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="lastName">
												Tên
											</Label>
											<Input
												id="lastName"
												value={formData.lastName}
												onChange={(e) =>
													setFormData({
														...formData,
														lastName:
															e.target.value,
													})
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="email">Email</Label>
											<Input
												id="email"
												type="email"
												value={profile?.email || ''}
												disabled
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="address">
												Địa chỉ
											</Label>
											<Textarea
												id="address"
												value={formData.address}
												onChange={(e) =>
													setFormData({
														...formData,
														address: e.target.value,
													})
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="currentPassword">
												Mật khẩu hiện tại
											</Label>
											<Input
												id="currentPassword"
												type="password"
												value={formData.currentPassword}
												onChange={(e) =>
													setFormData({
														...formData,
														currentPassword:
															e.target.value,
													})
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="newPassword">
												Mật khẩu mới
											</Label>
											<Input
												id="newPassword"
												type="password"
												value={formData.newPassword}
												onChange={(e) =>
													setFormData({
														...formData,
														newPassword:
															e.target.value,
													})
												}
											/>
										</div>
										<Button
											onClick={handleUpdateProfile}
											disabled={isUpdatingProfile}
										>
											{isUpdatingProfile
												? 'Đang cập nhật...'
												: 'Cập nhật thông tin'}
										</Button>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Selling Tab */}
							<TabsContent value="selling">
								<Card>
									<CardHeader>
										<div className="flex items-center gap-2">
											<Package className="h-5 w-5" />
											<CardTitle>
												Sản phẩm đang bán
											</CardTitle>
										</div>
										<CardDescription>
											Các sản phẩm đang trong phiên đấu giá ({activeProductsData?.data?.total || 0} sản phẩm)
										</CardDescription>
									</CardHeader>
									<CardContent>
										{isLoadingActiveProducts ? (
											<div className="flex justify-center py-8">
												<Loader2 className="h-6 w-6 animate-spin" />
											</div>
										) : !activeProductsData?.data?.products?.length ? (
											<p className="text-muted-foreground text-center py-8">
												Bạn chưa có sản phẩm nào đang bán
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{activeProductsData.data.products.map((product) => (
													<ProductCard
														key={product._id}
														id={product._id}
														title={product.name}
														image={product.images?.[0] || ''}
														currentPrice={product.currentPrice}
														endTime={new Date(product.endTime)}
														bidCount={product.bidCount || 0}
														highestBidder={product.highestBidderName || 'Chưa có'}
														category={product.categoryName || 'Chưa phân loại'}
													/>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							{/* Sold Tab */}
							<TabsContent value="sold">
								<Card>
									<CardHeader>
										<div className="flex items-center gap-2">
											<Award className="h-5 w-5" />
											<CardTitle>
												Sản phẩm đã bán
											</CardTitle>
										</div>
										<CardDescription>
											Các sản phẩm đã kết thúc đấu giá ({endedProductsData?.data?.total || 0} sản phẩm)
										</CardDescription>
									</CardHeader>
									<CardContent>
										{isLoadingEndedProducts ? (
											<div className="flex justify-center py-8">
												<Loader2 className="h-6 w-6 animate-spin" />
											</div>
										) : !endedProductsData?.data?.products?.length ? (
											<p className="text-muted-foreground text-center py-8">
												Bạn chưa bán sản phẩm nào
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{endedProductsData.data.products.map((product) => (
													<ProductCard
														key={product._id}
														id={product._id}
														title={product.name}
														image={product.images?.[0] || ''}
														currentPrice={product.currentPrice}
														endTime={new Date(product.endTime)}
														bidCount={product.bidCount || 0}
														highestBidder={product.highestBidderName || 'Chưa có'}
														category={product.categoryName || 'Chưa phân loại'}
													/>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							{/* Reviews Tab */}
							<TabsContent value="reviews">
								<Card>
									<CardHeader>
										<div className="flex items-center gap-2">
											<Star className="h-5 w-5" />
											<CardTitle>
												Đánh giá từ người dùng
											</CardTitle>
										</div>
										<CardDescription>
											Lịch sử đánh giá của bạn
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-6">
											{/* Summary */}
											{reviewsData?.summary && (
												<div className="bg-muted/50 rounded-lg p-4">
													<div className="flex items-center justify-between mb-4">
														<p className="text-sm font-medium">
															Tổng hợp đánh giá
														</p>
														<Badge variant="outline" className="text-lg px-3 py-1">
															<Star className="h-4 w-4 fill-yellow-500 text-yellow-500 mr-1" />
															{reviewsData.summary.ratingPercentage}%
														</Badge>
													</div>
													<div className="grid grid-cols-3 gap-4 text-center">
														<div>
															<p className="text-2xl font-bold">
																{reviewsData.summary.total}
															</p>
															<p className="text-sm text-muted-foreground">
																Tổng số
															</p>
														</div>
														<div>
															<p className="text-2xl font-bold text-green-600">
																{reviewsData.summary.positive}
															</p>
															<p className="text-sm text-muted-foreground">
																Tích cực
															</p>
														</div>
														<div>
															<p className="text-2xl font-bold text-red-600">
																{reviewsData.summary.negative}
															</p>
															<p className="text-sm text-muted-foreground">
																Tiêu cực
															</p>
														</div>
													</div>
												</div>
											)}

											{/* Reviews List */}
											{isLoadingReviews ? (
												<div className="flex justify-center py-8">
													<Loader2 className="h-6 w-6 animate-spin" />
												</div>
											) : reviewsData?.reviews.length === 0 ? (
												<p className="text-muted-foreground text-center py-8">
													Bạn chưa có đánh giá nào
												</p>
											) : (
												<div className="space-y-4">
													<p className="text-sm font-medium border-b pb-2">
														Chi tiết đánh giá ({reviewsData?.reviews.length})
													</p>
													{reviewsData?.reviews.map((review) => (
														<div
															key={review._id}
															className="flex gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
														>
															{/* Product Image */}
															{review.productImage && (
																<Link to={`/products/${review.productId}`}>
																	<img
																		src={review.productImage}
																		alt={review.productName}
																		className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
																	/>
																</Link>
															)}

															{/* Review Content */}
															<div className="flex-1 min-w-0">
																<div className="flex items-start justify-between gap-2">
																	<div>
																		<Link
																			to={`/products/${review.productId}`}
																			className="font-medium hover:text-primary line-clamp-1"
																		>
																			{review.productName}
																		</Link>
																		<p className="text-sm text-muted-foreground">
																			Từ: {review.reviewerName}
																		</p>
																	</div>
																	<Badge
																		variant={review.rating === 1 ? 'default' : 'destructive'}
																		className={review.rating === 1 ? 'bg-green-600' : ''}
																	>
																		{review.rating === 1 ? (
																			<>
																				<ThumbsUp className="h-3 w-3 mr-1" />
																				+1
																			</>
																		) : (
																			<>
																				<ThumbsDown className="h-3 w-3 mr-1" />
																				-1
																			</>
																		)}
																	</Badge>
																</div>
																{review.comment && (
																	<p className="text-sm mt-2 text-muted-foreground italic">
																		"{review.comment}"
																	</p>
																)}
																<p className="text-xs text-muted-foreground mt-2">
																	{new Date(review.createdAt).toLocaleDateString('vi-VN', {
																		year: 'numeric',
																		month: 'long',
																		day: 'numeric',
																		hour: '2-digit',
																		minute: '2-digit',
																	})}
																</p>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</main>
		</div>
	)
}
