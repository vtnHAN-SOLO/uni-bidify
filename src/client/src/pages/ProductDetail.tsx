// src/pages/ProductDetail.tsx

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/input/button'
import { Badge } from '@/components/ui/data-display/badge'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/data-display/card'
import { Separator } from '@/components/ui/data-display/separator'
import { Input } from '@/components/ui/input/input'
import { Textarea } from '@/components/ui/input/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/data-display/avatar'
import { Label } from '@/components/ui/input/label'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/overlay/alert-dialog'
import {
	Heart,
	Share2,
	TrendingUp,
	Star,
	Calendar,
	Package,
	MessageSquare,
	Gavel,
	ShoppingCart,
	Ban,
	Send,
	Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import {
	fetchProductDetail,
	fetchRelatedProducts,
} from '@/services/api/products.api'
import {
	placeBid,
	getBidHistory,
	getMyBid,
	rejectBid,
	buyNow,
} from '@/services/api/bids.api'
import {
	getProductQuestions,
	askQuestion,
	answerQuestion,
} from '@/services/api/questions.api'
import { Header } from '@/components/Header'
import { AdminHeader } from './admin/AdminHeader'
import { ProductCard } from '@/components/ProductCard'
import { CountdownTimer } from '@/components/CountdownTimer'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/services/types/auth.types'
import type { ProductDetailDTO } from '../services/types/product.types'

const ProductDetail = () => {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const { toast } = useToast()
	const { user, isAuthenticated } = useAuth()
	const queryClient = useQueryClient()

	// Check user roles
	const isAdmin = user?.role === UserRole.ADMIN
	const isSeller = user?.role === UserRole.SELLER

	// Fetch product details first (so we can use product data for computed values)
	const {
		data: product,
		isLoading,
		error,
	} = useQuery<ProductDetailDTO>({
		queryKey: ['product', id],
		queryFn: () => fetchProductDetail(id!),
		enabled: !!id,
	})

	// Fetch related products
	const { data: relatedProductsData } = useQuery({
		queryKey: ['relatedProducts', id],
		queryFn: () => fetchRelatedProducts(id!),
		enabled: !!id,
	})

	// Check if current user is the product seller
	const isProductSeller = product?.sellerId === user?.id

	// Check if current user is the winner (highest bidder)
	const isWinner = product?.highestBidderId === user?.id

	// Check if auction has ended
	const isAuctionEnded = product ? (product.isSold || new Date(product.endTime) <= new Date()) : false

	// Check if user should be redirected to order completion page
	const shouldRedirectToOrder = isAuctionEnded && product?.highestBidderId && (isProductSeller || isWinner)

	// Fetch bid history from API
	const { data: bidHistoryData, isLoading: isBidHistoryLoading } = useQuery({
		queryKey: ['bidHistory', id],
		queryFn: () => getBidHistory(id!),
		enabled: !!id,
	})

	// Fetch user's current bid
	const { data: myBidData } = useQuery({
		queryKey: ['myBid', id],
		queryFn: () => getMyBid(id!),
		enabled: !!id && isAuthenticated,
	})

	// Fetch Q&A from API
	const { data: questionsData, isLoading: isQuestionsLoading } = useQuery({
		queryKey: ['questions', id],
		queryFn: () => getProductQuestions(id!),
		enabled: !!id,
	})

	// State management
	const [selectedImage, setSelectedImage] = useState(0)
	const [maxBidAmount, setMaxBidAmount] = useState(0)
	const [question, setQuestion] = useState('')
	const [replyText, setReplyText] = useState('')
	const [replyingTo, setReplyingTo] = useState<string | null>(null)
	const [isFavorite, setIsFavorite] = useState(false)
	const [showBidConfirm, setShowBidConfirm] = useState(false)
	const [showBuyNowConfirm, setShowBuyNowConfirm] = useState(false)

	// Data from API
	const relatedProducts = relatedProductsData?.products || []
	const bidHistory = bidHistoryData?.data?.bids || []
	const questions = questionsData?.data?.questions || []
	const myBid = myBidData?.data

	// Update maxBidAmount when product loads
	useEffect(() => {
		if (product) {
			const minBid = product.currentPrice + (product.priceStep || 0)
			setMaxBidAmount(myBid?.maxPrice || minBid)
		}
	}, [product, myBid])

	// Redirect seller/winner to order completion page when auction ends
	useEffect(() => {
		if (shouldRedirectToOrder && id) {
			navigate(`/order-completion/${id}`)
		}
	}, [shouldRedirectToOrder, id, navigate])

	// Place bid mutation
	const placeBidMutation = useMutation({
		mutationFn: (data: { productId: string; maxPrice: number }) =>
			placeBid(data),
		onSuccess: (response) => {
			if (response.success) {
				toast({
					title: response.data.isWinner ? 'Đặt giá thành công!' : 'Đã đặt giá',
					description: response.message,
				})
				// Refresh product and bid history
				queryClient.invalidateQueries({ queryKey: ['product', id] })
				queryClient.invalidateQueries({ queryKey: ['bidHistory', id] })
				queryClient.invalidateQueries({ queryKey: ['myBid', id] })
			}
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi đặt giá',
				description: error.response?.data?.error || 'Không thể đặt giá',
				variant: 'destructive',
			})
		},
	})

	// Buy now mutation
	const buyNowMutation = useMutation({
		mutationFn: (productId: string) => buyNow(productId),
		onSuccess: (response) => {
			toast({
				title: 'Mua ngay thành công!',
				description: response.message,
			})
			// Navigate to order completion page
			navigate(`/order-completion/${id}`)
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi mua ngay',
				description: error.response?.data?.error || 'Không thể mua ngay',
				variant: 'destructive',
			})
		},
	})

	// Reject bid mutation (for seller)
	const rejectBidMutation = useMutation({
		mutationFn: (bidId: string) => rejectBid(bidId),
		onSuccess: (response) => {
			toast({
				title: 'Đã từ chối',
				description: response.message,
			})
			queryClient.invalidateQueries({ queryKey: ['product', id] })
			queryClient.invalidateQueries({ queryKey: ['bidHistory', id] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể từ chối',
				variant: 'destructive',
			})
		},
	})

	// Ask question mutation
	const askQuestionMutation = useMutation({
		mutationFn: (data: { productId: string; question: string }) =>
			askQuestion(data),
		onSuccess: (response) => {
			toast({
				title: 'Đã gửi câu hỏi',
				description: 'Người bán sẽ nhận được thông báo qua email',
			})
			setQuestion('')
			queryClient.invalidateQueries({ queryKey: ['questions', id] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể gửi câu hỏi',
				variant: 'destructive',
			})
		},
	})

	// Answer question mutation (for seller)
	const answerQuestionMutation = useMutation({
		mutationFn: (data: { questionId: string; answer: string }) =>
			answerQuestion(data.questionId, { answer: data.answer }),
		onSuccess: () => {
			toast({
				title: 'Đã trả lời câu hỏi',
				description: 'Người hỏi sẽ nhận được thông báo qua email',
			})
			setReplyText('')
			setReplyingTo(null)
			queryClient.invalidateQueries({ queryKey: ['questions', id] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể trả lời',
				variant: 'destructive',
			})
		},
	})

	const handlePlaceBid = () => {
		if (!isAuthenticated) {
			toast({
				title: 'Vui lòng đăng nhập',
				description: 'Bạn cần đăng nhập để đặt giá',
				variant: 'destructive',
			})
			return
		}
		if (!id || !maxBidAmount) return

		// Validate bid amount
		const minBid = (product?.currentPrice || 0) + (product?.priceStep || 0)
		if (maxBidAmount < minBid) {
			toast({
				title: 'Giá đặt không hợp lệ',
				description: `Giá đặt tối thiểu phải là ${minBid.toLocaleString('vi-VN')}₫`,
				variant: 'destructive',
			})
			return
		}

		// Show confirmation dialog
		setShowBidConfirm(true)
	}

	const confirmPlaceBid = () => {
		if (!id || !maxBidAmount) return
		placeBidMutation.mutate({ productId: id, maxPrice: maxBidAmount })
		setShowBidConfirm(false)
	}

	const handleBuyNow = () => {
		if (!isAuthenticated) {
			toast({
				title: 'Vui lòng đăng nhập',
				description: 'Bạn cần đăng nhập để mua ngay',
				variant: 'destructive',
			})
			return
		}
		if (!id || !product?.buyNowPrice) return
		setShowBuyNowConfirm(true)
	}

	const confirmBuyNow = () => {
		if (!id) return
		buyNowMutation.mutate(id)
		setShowBuyNowConfirm(false)
	}

	const handleRejectBid = (bidId: string, bidderName: string) => {
		rejectBidMutation.mutate(bidId)
	}

	const handleSubmitQuestion = (e: React.FormEvent) => {
		e.preventDefault()
		if (!isAuthenticated) {
			toast({
				title: 'Vui lòng đăng nhập',
				description: 'Bạn cần đăng nhập để đặt câu hỏi',
				variant: 'destructive',
			})
			return
		}
		if (!id || !question.trim()) return
		askQuestionMutation.mutate({ productId: id, question: question.trim() })
	}

	const handleReplyQuestion = (questionId: string) => {
		if (!replyText.trim()) return
		answerQuestionMutation.mutate({ questionId, answer: replyText.trim() })
	}

	return (
		<div className="min-h-screen bg-background">
			{isAdmin ? <AdminHeader /> : <Header />}

			{isLoading ? (
				<main className="container py-8">
					<div className="flex justify-center py-16">
						<p className="text-muted-foreground">
							Đang tải thông tin sản phẩm...
						</p>
					</div>
				</main>
			) : error || !product ? (
				<main className="container py-8">
					<div className="flex justify-center py-16">
						<div className="text-center">
							<p className="text-destructive mb-4">
								Không tìm thấy sản phẩm
							</p>
							<Link to="/">
								<Button>Quay lại trang chủ</Button>
							</Link>
						</div>
					</div>
				</main>
			) : isAuctionEnded && !shouldRedirectToOrder ? (
				// Show ended auction info for users who are not seller or winner
				<main className="container py-8">
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Image Gallery */}
						<div className="space-y-4">
							<div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
								<img
									src={product.images?.[0] || '/placeholder.png'}
									alt={product.name}
									className="h-full w-full object-cover opacity-75"
								/>
								<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
									<Badge variant="destructive" className="text-lg px-4 py-2">
										Đã kết thúc
									</Badge>
								</div>
							</div>
							<div className="grid grid-cols-4 gap-2">
								{product.images?.map((image, idx) => (
									<div
										key={idx}
										className="relative aspect-square overflow-hidden rounded-lg border-2 border-transparent opacity-50"
									>
										<img
											src={image}
											alt={`${product.name} ${idx + 1}`}
											className="h-full w-full object-cover"
										/>
									</div>
								))}
							</div>
						</div>

						{/* Product Info - Ended */}
						<div className="space-y-6">
							<div>
								<Badge variant="secondary" className="mb-2">
									{product.categoryName || 'Danh mục'}
								</Badge>
								<h1 className="text-3xl font-bold leading-tight">
									{product.name}
								</h1>
							</div>

							<Card className="border-destructive">
								<CardContent className="p-6 space-y-4">
									<div className="text-center py-4">
										<Badge variant="destructive" className="text-lg px-4 py-2 mb-4">
											Phiên đấu giá đã kết thúc
										</Badge>
										<p className="text-muted-foreground">
											{product.isSold
												? 'Sản phẩm đã được bán.'
												: 'Phiên đấu giá đã kết thúc.'}
										</p>
									</div>

									<Separator />

									<div className="flex items-end justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Giá kết thúc
											</p>
											<p className="text-3xl font-bold text-muted-foreground">
												{product.currentPrice.toLocaleString('vi-VN')}₫
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm text-muted-foreground">
												Số lượt đấu giá
											</p>
											<p className="text-xl font-semibold">
												{product.bidCount || 0}
											</p>
										</div>
									</div>

									<Separator />

									<div className="space-y-3">
										<div className="flex items-center gap-3">
											<Avatar className="h-10 w-10">
												<AvatarFallback className="bg-primary text-primary-foreground">
													{product.sellerName?.[0] || 'S'}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<p className="font-semibold">{product.sellerName}</p>
												<div className="flex items-center gap-1 text-sm text-muted-foreground">
													<Star className="h-3 w-3 fill-accent text-accent" />
													<span>
														{product.sellerRating}% ({product.sellerTotalRatings} đánh giá)
													</span>
												</div>
											</div>
										</div>

										{product.highestBidderName && product.highestBidderName !== 'Chưa có' && (
											<p className="text-sm text-muted-foreground">
												Người chiến thắng:{' '}
												<span className="font-semibold">{product.highestBidderName}</span>
											</p>
										)}
									</div>
								</CardContent>
							</Card>

							<div className="flex gap-2">
								<Link to="/" className="flex-1">
									<Button variant="outline" className="w-full">
										Quay lại trang chủ
									</Button>
								</Link>
								<Link to="/products" className="flex-1">
									<Button className="w-full">
										Xem sản phẩm khác
									</Button>
								</Link>
							</div>
						</div>
					</div>

					{/* Description */}
					<div className="mt-12">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Package className="h-5 w-5" />
									Mô tả sản phẩm
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="prose prose-sm max-w-none whitespace-pre-wrap">
									{product.description}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Related Products */}
					{relatedProducts.length > 0 && (
						<div className="mt-12">
							<h2 className="mb-6 text-2xl font-bold">
								Sản phẩm khác cùng chuyên mục
							</h2>
							<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
								{relatedProducts.map((p) => (
									<ProductCard
										key={p._id}
										id={p._id}
										image={p.images?.[0] || '/images/placeholder.jpg'}
										title={p.name}
										currentPrice={p.currentPrice}
										buyNowPrice={p.buyNowPrice}
										highestBidder={p.highestBidderName || 'Chưa có'}
										bidCount={p.bidCount || 0}
										endTime={new Date(p.endTime)}
										isNew={p.isNew}
										category={p.categoryName || 'Khác'}
									/>
								))}
							</div>
						</div>
					)}
				</main>
			) : (
				<main className="container py-8">
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Image Gallery */}
						<div className="space-y-4">
							<div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
								<img
									src={
										product.images?.[selectedImage] ||
										'/placeholder.png'
									}
									alt={product.name}
									className="h-full w-full object-cover"
								/>
								<div className="absolute right-4 top-4 flex gap-2">
									<Button
										variant="secondary"
										size="icon"
										className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
										onClick={() =>
											setIsFavorite(!isFavorite)
										}
									>
										<Heart
											className={`h-5 w-5 transition-all ${
												isFavorite
													? 'fill-red-500 text-red-500'
													: 'text-gray-700 hover:text-red-500'
											}`}
										/>
									</Button>
									<Button
										variant="secondary"
										size="icon"
										className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
									>
										<Share2 className="h-5 w-5" />
									</Button>
								</div>
							</div>

							<div className="grid grid-cols-4 gap-2">
								{product.images?.map((image, idx) => (
									<button
										key={idx}
										onClick={() => setSelectedImage(idx)}
										className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
											selectedImage === idx
												? 'border-primary'
												: 'border-transparent hover:border-muted-foreground'
										}`}
									>
										<img
											src={image}
											alt={`${product.name} ${idx + 1}`}
											className="h-full w-full object-cover"
										/>
									</button>
								))}
							</div>
						</div>

						{/* Product Info */}
						<div className="space-y-6">
							<div>
								<Badge variant="secondary" className="mb-2">
									{product.categoryName || 'Danh mục'}
								</Badge>
								<h1 className="text-3xl font-bold leading-tight">
									{product.name}
								</h1>
							</div>

							<CountdownTimer
								endTime={new Date(product.endTime)}
							/>

							<Card>
								<CardContent className="p-6 space-y-4">
									<div className="flex items-end justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Giá hiện tại
											</p>
											<p className="text-4xl font-bold text-primary">
												{product.currentPrice.toLocaleString(
													'vi-VN'
												)}
												₫
											</p>
										</div>
										{product.buyNowPrice && (
											<div className="text-right">
												<p className="text-sm text-muted-foreground">
													Mua ngay
												</p>
												<p className="text-2xl font-bold text-accent">
													{product.buyNowPrice.toLocaleString(
														'vi-VN'
													)}
													₫
												</p>
											</div>
										)}
									</div>

									<Separator />

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div className="flex items-center gap-2">
											<TrendingUp className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												Số lượt đấu giá:
											</span>
											<span className="font-semibold">
												{product.bidCount || 0}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												Đăng:
											</span>
											<span className="font-semibold">
												{formatDistanceToNow(
													new Date(
														product.createdAt ||
															product.endTime
													),
													{
														addSuffix: true,
														locale: vi,
													}
												)}
											</span>
										</div>
									</div>

									<Separator />

									{/* ✅ Seller info - now from API */}
									<div className="space-y-3">
										<div className="flex items-center gap-3">
											<Avatar className="h-10 w-10">
												<AvatarFallback className="bg-primary text-primary-foreground">
													{product.sellerName?.[0] ||
														'S'}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<p className="font-semibold">
													{product.sellerName}
												</p>
												<div className="flex items-center gap-1 text-sm text-muted-foreground">
													<Star className="h-3 w-3 fill-accent text-accent" />
													<span>
														{product.sellerRating}%
														(
														{
															product.sellerTotalRatings
														}{' '}
														đánh giá)
													</span>
												</div>
											</div>
										</div>

										<p className="text-sm text-muted-foreground">
											Người đặt giá cao nhất:{' '}
											<span className="font-semibold">
												{product.highestBidderName ||
													'Chưa có'}
											</span>
										</p>
									</div>
								</CardContent>
							</Card>

							{/* Bidding Section */}
							<Card className="border-primary">
								<CardContent className="p-6 space-y-4">
									{/* Show current user's bid status */}
									{myBid && (
										<div className={`p-3 rounded-lg ${myBid.isWinning ? 'bg-green-100 border border-green-500' : 'bg-yellow-100 border border-yellow-500'}`}>
											<p className={`text-sm font-medium ${myBid.isWinning ? 'text-green-700' : 'text-yellow-700'}`}>
												{myBid.isWinning ? '🏆 Bạn đang dẫn đầu!' : '⚠️ Bạn đã bị vượt qua'}
											</p>
											<p className="text-sm text-muted-foreground">
												Giá tối đa của bạn: {myBid.maxPrice.toLocaleString('vi-VN')}₫
											</p>
										</div>
									)}

									<div className="space-y-2">
										<label className="text-sm font-medium">
											Đặt giá tối đa (Auto-bid)
										</label>
										<div className="flex gap-2">
											<Input
												type="number"
												value={maxBidAmount}
												onChange={(e) =>
													setMaxBidAmount(
														Number(e.target.value)
													)
												}
												min={
													product.currentPrice +
													(product.priceStep || 0)
												}
												step={
													product.priceStep || 100000
												}
												className="text-lg font-semibold"
												disabled={isProductSeller}
											/>
											<span className="flex items-center text-lg font-semibold">
												₫
											</span>
										</div>
										<p className="text-sm text-muted-foreground">
											Bước giá:{' '}
											{(
												product.priceStep || 0
											).toLocaleString('vi-VN')}
											₫ | Giá tối thiểu:{' '}
											{(
												product.currentPrice +
												(product.priceStep || 0)
											).toLocaleString('vi-VN')}
											₫
										</p>
										<p className="text-xs text-blue-600">
											💡 Hệ thống sẽ tự động đấu giá cho bạn đến mức giá tối đa này
										</p>
									</div>

									<div className="flex gap-2">
										<Button
											size="lg"
											className="flex-1"
											onClick={handlePlaceBid}
											disabled={placeBidMutation.isPending || isProductSeller}
										>
											{placeBidMutation.isPending ? (
												<Loader2 className="mr-2 h-5 w-5 animate-spin" />
											) : (
												<Gavel className="mr-2 h-5 w-5" />
											)}
											{isProductSeller ? 'Không thể đấu giá' : 'Đặt giá'}
										</Button>
										{product.buyNowPrice && (
											<Button
												size="lg"
												variant="outline"
												className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
												disabled={isProductSeller || buyNowMutation.isPending}
												onClick={handleBuyNow}
											>
												{buyNowMutation.isPending ? (
													<Loader2 className="mr-2 h-5 w-5 animate-spin" />
												) : (
													<ShoppingCart className="mr-2 h-5 w-5" />
												)}
												Mua ngay
											</Button>
										)}
									</div>

									{product.autoExtend && (
										<p className="text-xs text-muted-foreground text-center">
											⚡ Sản phẩm có tự động gia hạn 10
											phút nếu có lượt đấu giá mới trước
											khi kết thúc 5 phút
										</p>
									)}
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Product Details Tabs */}
					<div className="mt-12 grid gap-8 lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-8">
							{/* Description */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Package className="h-5 w-5" />
										Mô tả sản phẩm
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="prose prose-sm max-w-none whitespace-pre-wrap">
										{product.description}
									</div>
								</CardContent>
							</Card>

							{/* Q&A Section - Using API */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<MessageSquare className="h-5 w-5" />
										Câu hỏi & Trả lời ({questions.length})
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-6">
									{isQuestionsLoading ? (
										<div className="flex justify-center py-4">
											<Loader2 className="h-6 w-6 animate-spin" />
										</div>
									) : questions.length === 0 ? (
										<p className="text-center text-muted-foreground py-4">
											Chưa có câu hỏi nào
										</p>
									) : (
										questions.map((qa) => (
											<div key={qa._id} className="space-y-3">
												<div className="rounded-lg bg-muted p-4">
													<div className="flex items-start gap-3">
														<Avatar className="h-8 w-8">
															<AvatarFallback>
																{qa.askerName?.[0] || 'U'}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<p className="text-sm font-semibold">
																{qa.askerName}
															</p>
															<p className="text-sm text-muted-foreground">
																{formatDistanceToNow(
																	new Date(qa.createdAt),
																	{
																		addSuffix: true,
																		locale: vi,
																	}
																)}
															</p>
															<p className="mt-2">
																{qa.question}
															</p>
														</div>
													</div>
												</div>

												{qa.answer ? (
													<div className="ml-8 rounded-lg border bg-background p-4">
														<div className="flex items-start gap-3">
															<Avatar className="h-8 w-8">
																<AvatarFallback className="bg-primary text-primary-foreground">
																	{product?.sellerName?.[0] || 'S'}
																</AvatarFallback>
															</Avatar>
															<div className="flex-1">
																<p className="text-sm font-semibold">
																	{product?.sellerName || 'Người bán'}
																</p>
																<p className="text-sm text-muted-foreground">
																	{qa.answeredAt && formatDistanceToNow(
																		new Date(qa.answeredAt),
																		{
																			addSuffix: true,
																			locale: vi,
																		}
																	)}
																</p>
																<p className="mt-2">
																	{qa.answer}
																</p>
															</div>
														</div>
													</div>
												) : (
													isProductSeller && (
														<div className="ml-8">
															{replyingTo === qa._id ? (
																<div className="space-y-2 rounded-lg border bg-background p-4">
																	<Label>
																		Trả lời câu hỏi
																	</Label>
																	<Textarea
																		value={replyText}
																		onChange={(e) =>
																			setReplyText(e.target.value)
																		}
																		placeholder="Nhập câu trả lời..."
																		className="min-h-[80px]"
																	/>
																	<div className="flex gap-2">
																		<Button
																			size="sm"
																			onClick={() =>
																				handleReplyQuestion(qa._id)
																			}
																			disabled={answerQuestionMutation.isPending}
																		>
																			{answerQuestionMutation.isPending ? (
																				<Loader2 className="h-4 w-4 mr-1 animate-spin" />
																			) : (
																				<Send className="h-4 w-4 mr-1" />
																			)}
																			Gửi
																		</Button>
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() => {
																				setReplyingTo(null)
																				setReplyText('')
																			}}
																		>
																			Hủy
																		</Button>
																	</div>
																</div>
															) : (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		setReplyingTo(qa._id)
																	}
																>
																	<MessageSquare className="h-4 w-4 mr-1" />
																	Trả lời
																</Button>
															)}
														</div>
													)
												)}
											</div>
										))
									)}

									{/* Ask question form - only for non-sellers */}
									{!isProductSeller && (
										<>
											<Separator />
											<form
												onSubmit={handleSubmitQuestion}
												className="space-y-3"
											>
												<label className="text-sm font-medium">
													Đặt câu hỏi cho người bán
												</label>
												<Textarea
													value={question}
													onChange={(e) =>
														setQuestion(e.target.value)
													}
													placeholder="Nhập câu hỏi của bạn (ít nhất 10 ký tự)..."
													required
													minLength={10}
												/>
												<Button
													type="submit"
													disabled={askQuestionMutation.isPending || question.length < 10}
												>
													{askQuestionMutation.isPending ? (
														<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													) : null}
													Gửi câu hỏi
												</Button>
											</form>
										</>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Bid History - Using API */}
						<div>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TrendingUp className="h-5 w-5" />
										Lịch sử đấu giá ({bidHistory.length})
									</CardTitle>
								</CardHeader>
								<CardContent>
									{isBidHistoryLoading ? (
										<div className="flex justify-center py-4">
											<Loader2 className="h-6 w-6 animate-spin" />
										</div>
									) : bidHistory.length === 0 ? (
										<p className="text-center text-muted-foreground py-4">
											Chưa có lượt đấu giá nào
										</p>
									) : (
										<div className="space-y-3">
											{bidHistory.map((bid, idx) => (
												<div
													key={bid._id}
													className={`rounded-lg p-3 ${
														idx === 0
															? 'bg-primary/10 border border-primary'
															: bid.isOwnBid
																? 'bg-blue-50 border border-blue-200'
																: 'bg-muted'
													}`}
												>
													<div className="flex items-center justify-between mb-2">
														<div>
															<p className="font-semibold flex items-center gap-2">
																{bid.bidderName}
																{bid.isOwnBid && (
																	<Badge variant="secondary" className="text-xs">
																		Bạn
																	</Badge>
																)}
																{idx === 0 && (
																	<Badge className="text-xs">
																		Dẫn đầu
																	</Badge>
																)}
															</p>
															<p className="text-xs text-muted-foreground">
																{formatDistanceToNow(
																	new Date(bid.createdAt),
																	{
																		addSuffix: true,
																		locale: vi,
																	}
																)}
																{bid.bidderRating >= 0 && (
																	<span className="ml-2">
																		⭐ {bid.bidderRating}%
																	</span>
																)}
															</p>
														</div>
														<p
															className={`font-bold ${idx === 0 ? 'text-primary' : ''}`}
														>
															{bid.price.toLocaleString('vi-VN')}₫
														</p>
													</div>
													{/* Seller can reject bids */}
													{isProductSeller && !bid.isOwnBid && (
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button
																	variant="destructive"
																	size="sm"
																	className="w-full"
																	disabled={rejectBidMutation.isPending}
																>
																	<Ban className="h-4 w-4 mr-1" />
																	Từ chối
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>
																		Xác nhận từ chối lượt đấu giá
																	</AlertDialogTitle>
																	<AlertDialogDescription>
																		Bạn có chắc chắn muốn từ chối lượt đấu giá của{' '}
																		{bid.bidderName}? Người này sẽ không được phép
																		đấu giá sản phẩm này nữa.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>Hủy</AlertDialogCancel>
																	<AlertDialogAction
																		onClick={() =>
																			handleRejectBid(bid._id, bid.bidderName)
																		}
																	>
																		Xác nhận
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													)}
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Related Products */}
					{relatedProducts.length > 0 && (
						<div className="mt-12">
							<h2 className="mb-6 text-2xl font-bold">
								Sản phẩm khác cùng chuyên mục
							</h2>
							<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
								{relatedProducts.map((product) => (
									<ProductCard
										key={product._id}
										id={product._id}
										image={
											product.images?.[0] ||
											'/images/placeholder.jpg'
										}
										title={product.name}
										currentPrice={product.currentPrice}
										buyNowPrice={product.buyNowPrice}
										highestBidder={
											product.highestBidderName ||
											'Chưa có'
										}
										bidCount={product.bidCount || 0}
										endTime={new Date(product.endTime)}
										isNew={product.isNew}
										category={
											product.categoryName || 'Khác'
										}
									/>
								))}
							</div>
						</div>
					)}
				</main>
			)}

			{/* Bid Confirmation Dialog */}
			<AlertDialog open={showBidConfirm} onOpenChange={setShowBidConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Xác nhận đặt giá</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							<p>Bạn có chắc chắn muốn đặt giá cho sản phẩm này?</p>
							<div className="bg-muted p-3 rounded-lg mt-2">
								<p className="font-medium">{product?.name}</p>
								<p className="text-lg font-bold text-primary mt-1">
									Giá đặt: {maxBidAmount.toLocaleString('vi-VN')}₫
								</p>
							</div>
							<p className="text-sm text-muted-foreground mt-2">
								Lưu ý: Hệ thống sẽ tự động đấu giá cho bạn cho đến khi đạt giá tối đa này.
							</p>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Hủy</AlertDialogCancel>
						<AlertDialogAction onClick={confirmPlaceBid}>
							Xác nhận đặt giá
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Buy Now Confirmation Dialog */}
			<AlertDialog open={showBuyNowConfirm} onOpenChange={setShowBuyNowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Xác nhận mua ngay</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							<p>Bạn có chắc chắn muốn mua ngay sản phẩm này?</p>
							<div className="bg-muted p-3 rounded-lg mt-2">
								<p className="font-medium">{product?.name}</p>
								<p className="text-lg font-bold text-accent mt-1">
									Giá mua ngay: {product?.buyNowPrice?.toLocaleString('vi-VN')}₫
								</p>
							</div>
							<p className="text-sm text-muted-foreground mt-2">
								Lưu ý: Phiên đấu giá sẽ kết thúc ngay lập tức và bạn sẽ là người chiến thắng. Bạn cần thanh toán sau khi xác nhận.
							</p>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Hủy</AlertDialogCancel>
						<AlertDialogAction onClick={confirmBuyNow} className="bg-accent hover:bg-accent/90">
							Xác nhận mua ngay
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export default ProductDetail
