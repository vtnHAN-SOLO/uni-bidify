import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { mockProducts } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { userApi } from '@/services'
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
	const { data: profileData, isLoading: isLoadingProfile } = useQuery({
		queryKey: ['userProfile'],
		queryFn: userApi.getProfile,
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
									<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
										<div className="flex items-center gap-2">
											<Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
											<span className="font-semibold">
												{profile?.ratingPercentage || 0}
												%
											</span>
										</div>
										<span className="text-sm text-muted-foreground">
											{profile?.totalReviews || 0} đánh
											giá
										</span>
									</div>

									<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
										<div className="flex items-center gap-2">
											<ThumbsUp className="h-5 w-5 text-green-500" />
											<span className="font-semibold">
												{profile?.positiveReviews || 0}
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
											Các sản phẩm đang trong phiên đấu
											giá
										</CardDescription>
									</CardHeader>
									<CardContent>
										{mockProducts.length === 0 ? (
											<p className="text-muted-foreground text-center py-8">
												Bạn chưa có sản phẩm nào
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{mockProducts
													.slice(0, 6)
													.map((product) => (
														<ProductCard
															key={product.id}
															{...product}
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
											Các sản phẩm đã kết thúc đấu giá
										</CardDescription>
									</CardHeader>
									<CardContent>
										{mockProducts.length === 0 ? (
											<p className="text-muted-foreground text-center py-8">
												Bạn chưa bán sản phẩm nào
											</p>
										) : (
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{mockProducts
													.slice(6, 10)
													.map((product) => (
														<ProductCard
															key={product.id}
															{...product}
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
												Đánh giá từ người mua
											</CardTitle>
										</div>
										<CardDescription>
											Lịch sử đánh giá của bạn
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{profile && (
												<div className="border-t pt-4">
													<p className="text-sm text-muted-foreground mb-2">
														Tổng hợp đánh giá
													</p>
													<div className="grid grid-cols-2 gap-4 mb-4">
														<div>
															<p className="text-2xl font-bold text-green-600">
																{
																	profile.positiveReviews
																}
															</p>
															<p className="text-sm text-muted-foreground">
																Tích cực
															</p>
														</div>
														<div>
															<p className="text-2xl font-bold text-red-600">
																{
																	profile.negativeReviews
																}
															</p>
															<p className="text-sm text-muted-foreground">
																Tiêu cực
															</p>
														</div>
													</div>
													{profile.totalReviews ===
														0 && (
														<p className="text-muted-foreground text-center py-4">
															Bạn chưa có đánh giá
															nào
														</p>
													)}
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
