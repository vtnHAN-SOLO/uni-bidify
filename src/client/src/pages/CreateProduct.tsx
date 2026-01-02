import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/input/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/input/select'
import { Switch } from '@/components/ui/input/switch'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/overlay/dialog'
import { Badge } from '@/components/ui/data-display/badge'
import { Upload, X, Loader2, Eye, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { fetchCategories, type Category } from '@/services/api/categories.api'
import { createProduct, type CreateProductData, fetchAuctionSettings } from '@/services/api/products.api'
import { useAuth } from '@/contexts/AuthContext'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@/components/ui/feedback/alert'

export default function CreateProduct() {
	const navigate = useNavigate()
	const { user } = useAuth()

	// Check seller expiry
	const sellerExpiryDate = user?.sellerExpiryDate ? new Date(user.sellerExpiryDate) : null
	const isSellerExpired = sellerExpiryDate ? new Date() > sellerExpiryDate : false

	// Form state
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [parentCategoryId, setParentCategoryId] = useState('')
	const [childCategoryId, setChildCategoryId] = useState('')
	const [images, setImages] = useState<string[]>([])
	const [startPrice, setStartPrice] = useState('')
	const [priceStep, setPriceStep] = useState('')
	const [buyNowPrice, setBuyNowPrice] = useState('')
	const [endTime, setEndTime] = useState('')
	const [autoExtend, setAutoExtend] = useState(true)
	const [allowUnratedBidders, setAllowUnratedBidders] = useState(false)

	// Preview modal state
	const [showPreview, setShowPreview] = useState(false)

	// Fetch categories
	const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: fetchCategories,
	})

	// Fetch auction settings
	const { data: auctionSettings } = useQuery({
		queryKey: ['auction-settings'],
		queryFn: fetchAuctionSettings,
	})

	// Get parent categories (categories without parent)
	const parentCategories = categories.filter((cat) => !cat.parent)

	// Get child categories of selected parent
	const childCategories =
		parentCategories.find((cat) => cat._id === parentCategoryId)?.children ||
		[]

	// Reset child category when parent changes
	useEffect(() => {
		setChildCategoryId('')
	}, [parentCategoryId])

	// Create product mutation
	const createProductMutation = useMutation({
		mutationFn: createProduct,
		onSuccess: (response) => {
			toast.success(response.message || 'Đăng sản phẩm thành công!')
			navigate('/seller/products')
		},
		onError: (error: Error & { response?: { data?: { error?: string } } }) => {
			toast.error(
				error.response?.data?.error || 'Không thể đăng sản phẩm. Vui lòng thử lại.'
			)
		},
	})

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files) {
			// Convert files to base64 or upload to storage
			// For now, using placeholder URLs - in production, implement proper image upload
			Array.from(files).forEach((file) => {
				const reader = new FileReader()
				reader.onloadend = () => {
					setImages((prev) => [...prev, reader.result as string])
				}
				reader.readAsDataURL(file)
			})
		}
	}

	const removeImage = (index: number) => {
		setImages(images.filter((_, i) => i !== index))
	}

	const validateForm = (): string | null => {
		if (!name.trim()) return 'Vui lòng nhập tên sản phẩm'
		if (!childCategoryId && !parentCategoryId)
			return 'Vui lòng chọn danh mục'
		if (images.length < 3) return 'Vui lòng tải lên ít nhất 3 ảnh'
		if (!startPrice || Number(startPrice) <= 0)
			return 'Vui lòng nhập giá khởi điểm hợp lệ'
		if (!priceStep || Number(priceStep) <= 0)
			return 'Vui lòng nhập bước giá hợp lệ'
		if (!endTime) return 'Vui lòng chọn thời gian kết thúc'
		if (new Date(endTime) <= new Date())
			return 'Thời gian kết thúc phải sau thời điểm hiện tại'
		if (!description.trim()) return 'Vui lòng nhập mô tả sản phẩm'
		return null
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const error = validateForm()
		if (error) {
			toast.error(error)
			return
		}

		const productData: CreateProductData = {
			name: name.trim(),
			description: description.trim(),
			categoryId: childCategoryId || parentCategoryId,
			images,
			startPrice: Number(startPrice),
			priceStep: Number(priceStep),
			currentPrice: Number(startPrice), // Initial current price = start price
			buyNowPrice: buyNowPrice ? Number(buyNowPrice) : undefined,
			endTime: new Date(endTime).toISOString(),
			autoExtend,
			allowUnratedBidders,
		}

		createProductMutation.mutate(productData)
	}

	const handlePreview = () => {
		const error = validateForm()
		if (error) {
			toast.error(error)
			return
		}
		setShowPreview(true)
	}

	// Get selected category names for display
	const selectedParentCategory = parentCategories.find(
		(cat) => cat._id === parentCategoryId
	)
	const selectedChildCategory = childCategories.find(
		(cat) => cat._id === childCategoryId
	)

	const getCategoryDisplayName = () => {
		if (selectedChildCategory) {
			return `${selectedParentCategory?.name} > ${selectedChildCategory.name}`
		}
		if (selectedParentCategory) {
			return selectedParentCategory.name
		}
		return 'Chưa chọn'
	}

	// If seller is expired, show warning and redirect option
	if (isSellerExpired) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<main className="container py-8 max-w-4xl">
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Quyền bán hàng đã hết hạn</AlertTitle>
						<AlertDescription className="mt-2">
							<p className="mb-4">
								Quyền bán hàng của bạn đã hết hạn vào ngày{' '}
								<strong>
									{sellerExpiryDate?.toLocaleDateString('vi-VN', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})}
								</strong>
								. Bạn không thể đăng sản phẩm mới.
							</p>
							<p className="mb-4">
								Bạn vẫn có thể quản lý các sản phẩm đang bán và thực hiện giao dịch cho đến khi tất cả phiên đấu giá kết thúc.
							</p>
							<div className="flex gap-2">
								<Button onClick={() => navigate('/seller/products')} variant="outline">
									Xem sản phẩm của tôi
								</Button>
								<Button onClick={() => navigate('/profile')}>
									Yêu cầu nâng cấp lại
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />

			<main className="container py-8 max-w-4xl">
				<Card>
					<CardHeader>
						<CardTitle>Đăng sản phẩm đấu giá</CardTitle>
						<CardDescription>
							Điền đầy đủ thông tin sản phẩm để bắt đầu đấu giá
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="title">Tên sản phẩm *</Label>
								<Input
									id="title"
									placeholder="Ví dụ: iPhone 15 Pro Max 256GB"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>

							{/* 2-level Category Selector */}
							<div className="space-y-4">
								<Label>Danh mục *</Label>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label
											htmlFor="parentCategory"
											className="text-sm text-muted-foreground"
										>
											Danh mục chính
										</Label>
										<Select
											value={parentCategoryId}
											onValueChange={setParentCategoryId}
											disabled={isCategoriesLoading}
										>
											<SelectTrigger>
												<SelectValue
													placeholder={
														isCategoriesLoading
															? 'Đang tải...'
															: 'Chọn danh mục chính'
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{parentCategories.map((category) => (
													<SelectItem
														key={category._id}
														value={category._id}
													>
														{category.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label
											htmlFor="childCategory"
											className="text-sm text-muted-foreground"
										>
											Danh mục con
										</Label>
										<Select
											value={childCategoryId}
											onValueChange={setChildCategoryId}
											disabled={
												!parentCategoryId ||
												childCategories.length === 0
											}
										>
											<SelectTrigger>
												<SelectValue
													placeholder={
														!parentCategoryId
															? 'Chọn danh mục chính trước'
															: childCategories.length === 0
																? 'Không có danh mục con'
																: 'Chọn danh mục con'
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{childCategories.map((category) => (
													<SelectItem
														key={category._id}
														value={category._id}
													>
														{category.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
								{parentCategoryId && (
									<p className="text-sm text-muted-foreground">
										Đã chọn: <span className="font-medium">{getCategoryDisplayName()}</span>
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label>Hình ảnh sản phẩm * (Tối thiểu 3 ảnh)</Label>
								<div className="grid grid-cols-3 gap-4">
									{images.map((image, index) => (
										<div
											key={index}
											className="relative aspect-square rounded-lg overflow-hidden border"
										>
											<img
												src={image}
												alt={`Product ${index + 1}`}
												className="w-full h-full object-cover"
											/>
											<Button
												type="button"
												variant="destructive"
												size="icon"
												className="absolute top-2 right-2 h-6 w-6"
												onClick={() => removeImage(index)}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
									{images.length < 10 && (
										<label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
											<div className="text-center">
												<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
												<span className="text-sm text-muted-foreground">
													Tải ảnh lên
												</span>
											</div>
											<input
												type="file"
												accept="image/*"
												multiple
												className="hidden"
												onChange={handleImageUpload}
											/>
										</label>
									)}
								</div>
								{images.length < 3 && (
									<p className="text-sm text-destructive">
										Vui lòng tải lên ít nhất 3 ảnh
									</p>
								)}
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="startPrice">Giá khởi điểm (₫) *</Label>
									<Input
										id="startPrice"
										type="number"
										placeholder="1000000"
										value={startPrice}
										onChange={(e) => setStartPrice(e.target.value)}
										min="1000"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="priceStep">Bước giá (₫) *</Label>
									<Input
										id="priceStep"
										type="number"
										placeholder="100000"
										value={priceStep}
										onChange={(e) => setPriceStep(e.target.value)}
										min="1000"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="buyNowPrice">
									Giá mua ngay (₫) (Tùy chọn)
								</Label>
								<Input
									id="buyNowPrice"
									type="number"
									placeholder="15000000"
									value={buyNowPrice}
									onChange={(e) => setBuyNowPrice(e.target.value)}
									min={startPrice ? Number(startPrice) + 1 : 1}
								/>
								<p className="text-sm text-muted-foreground">
									Để trống nếu không muốn có tùy chọn mua ngay
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="endTime">Thời gian kết thúc *</Label>
								<Input
									id="endTime"
									type="datetime-local"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									min={new Date().toISOString().slice(0, 16)}
									required
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<Label htmlFor="autoExtend">Tự động gia hạn</Label>
									<p className="text-sm text-muted-foreground">
										Tự động gia hạn thêm {auctionSettings?.extensionMinutes ?? 10} phút khi có người đấu giá
										trong {auctionSettings?.triggerMinutes ?? 5} phút cuối
									</p>
								</div>
								<Switch
									id="autoExtend"
									checked={autoExtend}
									onCheckedChange={setAutoExtend}
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<Label htmlFor="allowUnratedBidders">
										Cho phép người mua có điểm đánh giá thấp
									</Label>
									<p className="text-sm text-muted-foreground">
										Mặc định chỉ người mua có điểm đánh giá từ 80% trở
										lên mới được đấu giá. Bật tùy chọn này để cho phép
										tất cả người mua tham gia.
									</p>
								</div>
								<Switch
									id="allowUnratedBidders"
									checked={allowUnratedBidders}
									onCheckedChange={setAllowUnratedBidders}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Mô tả sản phẩm *</Label>
								<Textarea
									id="description"
									placeholder="Mô tả chi tiết về sản phẩm..."
									rows={10}
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									required
								/>
							</div>

							<div className="flex gap-4">
								<Button
									type="submit"
									size="lg"
									className="flex-1"
									disabled={createProductMutation.isPending}
								>
									{createProductMutation.isPending ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Đang đăng...
										</>
									) : (
										'Đăng sản phẩm'
									)}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									onClick={handlePreview}
								>
									<Eye className="h-4 w-4 mr-2" />
									Xem trước
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</main>

			{/* Preview Modal */}
			<Dialog open={showPreview} onOpenChange={setShowPreview}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Xem trước sản phẩm</DialogTitle>
					</DialogHeader>
					<div className="space-y-6">
						{/* Images */}
						<div className="grid grid-cols-4 gap-2">
							{images.slice(0, 4).map((image, index) => (
								<div
									key={index}
									className="aspect-square rounded-lg overflow-hidden border"
								>
									<img
										src={image}
										alt={`Preview ${index + 1}`}
										className="w-full h-full object-cover"
									/>
								</div>
							))}
						</div>

						{/* Product Info */}
						<div>
							<Badge variant="secondary" className="mb-2">
								{getCategoryDisplayName()}
							</Badge>
							<h2 className="text-2xl font-bold">{name || 'Tên sản phẩm'}</h2>
						</div>

						{/* Prices */}
						<div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
							<div>
								<p className="text-sm text-muted-foreground">Giá khởi điểm</p>
								<p className="text-xl font-bold text-primary">
									{Number(startPrice || 0).toLocaleString('vi-VN')}₫
								</p>
							</div>
							{buyNowPrice && (
								<div>
									<p className="text-sm text-muted-foreground">Giá mua ngay</p>
									<p className="text-xl font-bold text-orange-500">
										{Number(buyNowPrice).toLocaleString('vi-VN')}₫
									</p>
								</div>
							)}
							<div>
								<p className="text-sm text-muted-foreground">Bước giá</p>
								<p className="font-semibold">
									{Number(priceStep || 0).toLocaleString('vi-VN')}₫
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Kết thúc</p>
								<p className="font-semibold">
									{endTime
										? new Date(endTime).toLocaleString('vi-VN')
										: 'Chưa chọn'}
								</p>
							</div>
						</div>

						{/* Settings */}
						<div className="flex gap-2 flex-wrap">
							{autoExtend && (
								<Badge variant="outline">Tự động gia hạn</Badge>
							)}
							{allowUnratedBidders && (
								<Badge variant="outline">Cho phép rating thấp</Badge>
							)}
						</div>

						{/* Description */}
						<div>
							<h3 className="font-semibold mb-2">Mô tả sản phẩm</h3>
							<div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap">
								{description || 'Chưa có mô tả'}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
