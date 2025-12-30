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
	Gavel,
	Award,
	ArrowRight,
	Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { userApi } from '@/services'
import { getParticipatingAuctions, getWonAuctions } from '@/services/api/bids.api'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../components/ui/overlay/alert-dialog'

export default function BidderProfile() {
	const [activeTab, setActiveTab] = useState('info')
	const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
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
	const { data: profileData, isLoading: isLoadingProfile } = useQuery({
		queryKey: ['userProfile'],
		queryFn: userApi.getProfile,
		enabled: !!user && !isLoading,
	})

	// ✅ Fetch participating auctions (using new bids API)
	const { data: participatingData, isLoading: isLoadingBidding } = useQuery({
		queryKey: ['participatingAuctions'],
		queryFn: () => getParticipatingAuctions(),
		enabled: !!user && !isLoading,
	})

	// ✅ Fetch won auctions (using new bids API)
	const { data: wonData, isLoading: isLoadingWon } = useQuery({
		queryKey: ['wonAuctions'],
		queryFn: () => getWonAuctions(),
		enabled: !!user && !isLoading,
	})

	// ✅ Fetch reviews received by user
	const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
		queryKey: ['userReviews'],
		queryFn: () => userApi.getReviews(),
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
	const participatingProducts = participatingData?.data?.products || []
	const wonProducts = wonData?.data?.products || []

	const handleSwitchToSeller = () => {
		if (profile?.role === 'ROLE SELLER' || profile?.role === 'ROLE ADMIN') {
			navigate('/seller/profile')
		} else {
			setShowUpgradeDialog(true)
		}
	}

	const handleUpgradeRequest = () => {
		toast.success('Yêu cầu nâng cấp đã được gửi. Vui lòng chờ admin duyệt.')
		setShowUpgradeDialog(false)
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
									<div className="h-24 w-24 rounded-full bg-gradient-auction flex items-center justify-center text-4xl font-bold text-white">
										{profile?.firstName?.charAt(0) || 'U'}
									</div>
								</div>
								<CardTitle className="text-center">
									{profile?.fullName || 'Người dùng'}
								</CardTitle>
								<CardDescription className="text-center">
									{profile?.email}
								</CardDescription>
								<div className="flex justify-center mt-2">
									<Badge variant="outline">
										Người đấu giá
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
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
										onClick={handleSwitchToSeller}
									>
										{profile?.role === 'ROLE SELLER' ? (
											<>
												Chuyển sang hồ sơ Seller
												<ArrowRight className="h-4 w-4" />
											</>
										) : (
											'Yêu cầu nâng cấp Seller'
										)}
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
								<TabsTrigger value="bidding">
									Đang đấu giá
								</TabsTrigger>
								<TabsTrigger value="won">Đã thắng</TabsTrigger>
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
												className="bg-muted"
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

							{/* Bidding Tab */}
							<TabsContent value="bidding">
								<Card>
									<CardHeader>
										<div className="flex items-center gap-2">
											<Gavel className="h-5 w-5" />
											<CardTitle>
												Đang tham gia đấu giá
											</CardTitle>
										</div>
										<CardDescription>
											Các sản phẩm bạn đang đặt giá
										</CardDescription>
									</CardHeader>
									<CardContent>
										{isLoadingBidding ? (
											<p className="text-muted-foreground text-center py-8">
												Đang tải...
											</p>
										) : participatingProducts.length === 0 ? (
											<p className="text-muted-foreground text-center py-8">
												Bạn chưa tham gia đấu giá sản
												phẩm nào
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{participatingProducts.map((item) => (
													<div key={item._id} className="relative">
														<ProductCard
															id={item._id}
															image={item.images?.[0]}
															title={item.name}
															currentPrice={item.currentPrice}
															highestBidder={
																item.isWinning
																	? 'Bạn (Dẫn đầu)'
																	: 'Đã bị vượt qua'
															}
															bidCount={item.bidCount}
															endTime={new Date(item.endTime)}
															category={item.categoryName}
														/>
														{/* Status badge overlay */}
														<Badge
															className={`absolute top-2 left-2 z-10 ${
																item.isWinning
																	? 'bg-green-500'
																	: 'bg-yellow-500'
															}`}
														>
															{item.isWinning ? '🏆 Dẫn đầu' : '⚠️ Bị vượt'}
														</Badge>
														<p className="text-sm text-muted-foreground mt-1 px-2">
															Giá tối đa của bạn: {item.yourMaxBid?.toLocaleString('vi-VN')}₫
														</p>
													</div>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							{/* Won Tab */}
							<TabsContent value="won">
								<Card>
									<CardHeader>
										<div className="flex items-center gap-2">
											<Award className="h-5 w-5" />
											<CardTitle>Đấu giá thắng</CardTitle>
										</div>
										<CardDescription>
											Các sản phẩm bạn đã thắng đấu giá
										</CardDescription>
									</CardHeader>
									<CardContent>
										{isLoadingWon ? (
											<p className="text-muted-foreground text-center py-8">
												Đang tải...
											</p>
										) : wonProducts.length === 0 ? (
											<p className="text-muted-foreground text-center py-8">
												Bạn chưa thắng đấu giá nào
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{wonProducts.map((item) => (
													<div key={item._id} className="relative">
														<ProductCard
															id={item._id}
															image={item.images?.[0]}
															title={item.name}
															currentPrice={item.finalPrice}
															highestBidder={'🏆 Bạn đã thắng'}
															bidCount={0}
															endTime={new Date(item.endTime)}
															category={item.categoryName}
														/>
														<Badge className="absolute top-2 right-2 bg-green-600">
															🎉 Đã thắng
														</Badge>
														<div className="text-sm text-muted-foreground mt-1 px-2">
															<p>Người bán: {item.sellerName}</p>
															{!item.isSold && (
																<Button
																	size="sm"
																	className="mt-2 w-full"
																	onClick={() => navigate(`/order/${item._id}`)}
																>
																	Tiến hành thanh toán
																</Button>
															)}
															{item.isSold && (
																<Badge variant="outline" className="mt-2">
																	✅ Đã hoàn thành giao dịch
																</Badge>
															)}
														</div>
													</div>
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

			{/* Upgrade Request Dialog */}
			<AlertDialog
				open={showUpgradeDialog}
				onOpenChange={setShowUpgradeDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Yêu cầu nâng cấp lên Seller
						</AlertDialogTitle>
						<AlertDialogDescription>
							Bạn chưa được nâng cấp lên Seller. Bạn có muốn gửi
							yêu cầu nâng cấp tài khoản không? Admin sẽ xem xét
							và phê duyệt trong thời gian sớm nhất.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Hủy</AlertDialogCancel>
						<AlertDialogAction onClick={handleUpgradeRequest}>
							Gửi yêu cầu
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
