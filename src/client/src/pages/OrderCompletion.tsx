import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Badge } from '@/components/ui/data-display/badge'
import {
	CheckCircle,
	Package,
	MessageSquare,
	Star,
	ThumbsUp,
	ThumbsDown,
	CreditCard,
	Truck,
	Loader2,
	Send,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
	getOrderByProduct,
	submitPayment,
	confirmShipping,
	confirmReceived,
	rateOrder,
	cancelOrder,
	getMessages,
	sendMessage as sendOrderMessage,
	type OrderStatus,
} from '@/services/api/orders.api'
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
import { XCircle } from 'lucide-react'

// Step mapping from API status
const STATUS_TO_STEP: Record<OrderStatus, number> = {
	AWAITING_PAYMENT: 1,
	PAYMENT_SUBMITTED: 2,
	SELLER_CONFIRMED: 3,
	BUYER_CONFIRMED: 4,
	COMPLETED: 5,
	CANCELLED: 0,
}

const STATUS_LABELS: Record<OrderStatus, string> = {
	AWAITING_PAYMENT: 'Chờ thanh toán',
	PAYMENT_SUBMITTED: 'Đã thanh toán',
	SELLER_CONFIRMED: 'Đang giao hàng',
	BUYER_CONFIRMED: 'Đã nhận hàng',
	COMPLETED: '✅ Hoàn thành',
	CANCELLED: '❌ Đã hủy',
}

export default function OrderCompletion() {
	const { id: productId } = useParams()
	const navigate = useNavigate()
	const { toast } = useToast()
	const { user } = useAuth()
	const queryClient = useQueryClient()
	const messagesEndRef = useRef<HTMLDivElement>(null)

	// Local state
	const [rating, setRating] = useState<1 | -1 | null>(null)
	const [comment, setComment] = useState('')
	const [newMessage, setNewMessage] = useState('')
	const [shippingAddress, setShippingAddress] = useState('')
	const [paymentProof, setPaymentProof] = useState('')
	const [shippingInvoice, setShippingInvoice] = useState('')
	const [cancelReason, setCancelReason] = useState('')
	const [showCancelDialog, setShowCancelDialog] = useState(false)

	// Fetch order data
	const {
		data: orderData,
		isLoading: isLoadingOrder,
		error: orderError,
	} = useQuery({
		queryKey: ['order', productId],
		queryFn: () => getOrderByProduct(productId!),
		enabled: !!productId,
	})

	// Extract data from response
	const order = orderData?.data?.order
	const product = orderData?.data?.product
	const buyer = orderData?.data?.buyer
	const seller = orderData?.data?.seller
	const userRole = orderData?.data?.userRole
	const currentStep = order ? STATUS_TO_STEP[order.status] : 1

	const isBuyer = userRole === 'buyer'
	const isSeller = userRole === 'seller'

	// Fetch messages
	const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
		queryKey: ['orderMessages', order?._id],
		queryFn: () => getMessages(order!._id),
		enabled: !!order?._id,
		refetchInterval: 5000, // Poll every 5 seconds
	})

	const messages = messagesData?.data?.messages || []

	// Scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// Submit payment mutation (buyer)
	const submitPaymentMutation = useMutation({
		mutationFn: (data: { shippingAddress: string; paymentProof: string }) =>
			submitPayment(order!._id, data),
		onSuccess: () => {
			toast({ title: 'Đã xác nhận thanh toán', description: 'Chờ người bán gửi hàng' })
			queryClient.invalidateQueries({ queryKey: ['order', productId] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể xác nhận thanh toán',
				variant: 'destructive',
			})
		},
	})

	// Confirm shipping mutation (seller)
	const confirmShippingMutation = useMutation({
		mutationFn: (data: { shippingInvoice: string }) =>
			confirmShipping(order!._id, data),
		onSuccess: () => {
			toast({ title: 'Đã xác nhận gửi hàng', description: 'Chờ người mua nhận hàng' })
			queryClient.invalidateQueries({ queryKey: ['order', productId] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể xác nhận gửi hàng',
				variant: 'destructive',
			})
		},
	})

	// Confirm received mutation (buyer)
	const confirmReceivedMutation = useMutation({
		mutationFn: () => confirmReceived(order!._id),
		onSuccess: () => {
			toast({ title: 'Đã xác nhận nhận hàng', description: 'Vui lòng đánh giá người bán' })
			queryClient.invalidateQueries({ queryKey: ['order', productId] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể xác nhận nhận hàng',
				variant: 'destructive',
			})
		},
	})

	// Rate order mutation
	const rateOrderMutation = useMutation({
		mutationFn: (data: { rating: 1 | -1; comment: string }) =>
			rateOrder(order!._id, data),
		onSuccess: () => {
			toast({ title: 'Đã gửi đánh giá', description: 'Cảm ơn bạn đã đánh giá!' })
			queryClient.invalidateQueries({ queryKey: ['order', productId] })
			navigate('/')
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể gửi đánh giá',
				variant: 'destructive',
			})
		},
	})

	// Cancel order mutation (Seller only)
	// Backend automatically rates buyer -1 when seller cancels
	const cancelOrderMutation = useMutation({
		mutationFn: async (reason: string) => {
			await cancelOrder(order!._id, { reason })
		},
		onSuccess: () => {
			toast({
				title: 'Đã hủy đơn hàng',
				description: 'Đơn hàng đã được hủy và đánh giá -1 cho người mua',
			})
			setShowCancelDialog(false)
			setCancelReason('')
			queryClient.invalidateQueries({ queryKey: ['order', productId] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể hủy đơn hàng',
				variant: 'destructive',
			})
		},
	})

	// Send message mutation
	const sendMessageMutation = useMutation({
		mutationFn: (content: string) => sendOrderMessage(order!._id, { content }),
		onSuccess: () => {
			setNewMessage('')
			queryClient.invalidateQueries({ queryKey: ['orderMessages', order?._id] })
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description: error.response?.data?.error || 'Không thể gửi tin nhắn',
				variant: 'destructive',
			})
		},
	})

	// Handlers
	const handleSubmitPayment = () => {
		if (!shippingAddress.trim()) {
			toast({
				title: 'Thiếu thông tin',
				description: 'Vui lòng nhập địa chỉ giao hàng',
				variant: 'destructive',
			})
			return
		}
		submitPaymentMutation.mutate({
			shippingAddress,
			paymentProof: paymentProof || 'Đã thanh toán trực tiếp',
		})
	}

	const handleConfirmShipping = () => {
		if (!shippingInvoice.trim()) {
			toast({
				title: 'Thiếu thông tin',
				description: 'Vui lòng nhập mã vận đơn',
				variant: 'destructive',
			})
			return
		}
		confirmShippingMutation.mutate({ shippingInvoice })
	}

	const handleConfirmReceived = () => {
		confirmReceivedMutation.mutate()
	}

	const handleSubmitRating = () => {
		if (rating === null) {
			toast({
				title: 'Thiếu đánh giá',
				description: 'Vui lòng chọn đánh giá tích cực hoặc tiêu cực',
				variant: 'destructive',
			})
			return
		}
		rateOrderMutation.mutate({ rating, comment })
	}

	const handleSendMessage = (e: React.FormEvent) => {
		e.preventDefault()
		if (newMessage.trim() && order) {
			sendMessageMutation.mutate(newMessage.trim())
		}
	}

	const steps = [
		{ number: 1, title: 'Thanh toán', icon: CreditCard },
		{ number: 2, title: 'Gửi hàng', icon: Truck },
		{ number: 3, title: 'Nhận hàng', icon: Package },
		{ number: 4, title: 'Đánh giá', icon: Star },
	]

	// Loading state
	if (isLoadingOrder) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<main className="container py-8 flex justify-center">
					<div className="flex items-center gap-2">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span>Đang tải thông tin đơn hàng...</span>
					</div>
				</main>
			</div>
		)
	}

	// Error state
	if (orderError || !order) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<main className="container py-8 text-center">
					<p className="text-destructive">Không tìm thấy đơn hàng hoặc bạn không có quyền xem.</p>
					<Button className="mt-4" onClick={() => navigate(-1)}>
						Quay lại
					</Button>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />

			<main className="container py-8 max-w-6xl">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold">Hoàn tất đơn hàng</h1>
					<div className="flex items-center gap-3">
						{/* Cancel button for seller - only visible in steps 1-3 */}
						{isSeller && currentStep >= 1 && currentStep <= 3 && order.status !== 'CANCELLED' && (
							<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" size="sm">
										<XCircle className="h-4 w-4 mr-2" />
										Hủy đơn hàng
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Xác nhận hủy đơn hàng?</AlertDialogTitle>
										<AlertDialogDescription>
											Hành động này không thể hoàn tác. Đơn hàng sẽ bị hủy và người mua sẽ tự động nhận đánh giá -1.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<div className="py-4">
										<Label>Lý do hủy</Label>
										<Textarea
											value={cancelReason}
											onChange={(e) => setCancelReason(e.target.value)}
											placeholder="Nhập lý do hủy đơn hàng (vd: Người mua không thanh toán trong thời gian quy định)..."
											className="mt-2"
										/>
									</div>
									<AlertDialogFooter>
										<AlertDialogCancel>Không, giữ đơn hàng</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => cancelOrderMutation.mutate(cancelReason)}
											disabled={cancelOrderMutation.isPending}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{cancelOrderMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : null}
											Xác nhận hủy
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
						<Badge variant={order.status === 'COMPLETED' ? 'default' : order.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
							{STATUS_LABELS[order.status]}
						</Badge>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-6">
						{/* Product Info */}
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<img
										src={product?.image || '/placeholder.png'}
										alt={product?.name}
										className="w-24 h-24 object-cover rounded-lg"
									/>
									<div className="flex-1">
										<h3 className="font-semibold text-lg">
											{product?.name}
										</h3>
										<p className="text-2xl font-bold text-primary mt-1">
											{order.finalPrice?.toLocaleString('vi-VN')}₫
										</p>
										<p className="text-xs text-muted-foreground">Giá thắng đấu giá</p>
									</div>
									<div className="text-sm text-right space-y-2">
										<div>
											<p className="text-muted-foreground">Người bán</p>
											<p className="font-medium">{seller?.name}</p>
											{seller?.email && (
												<p className="text-xs text-muted-foreground">{seller.email}</p>
											)}
										</div>
										<div>
											<p className="text-muted-foreground">Người mua</p>
											<p className="font-medium">{buyer?.name}</p>
											{buyer?.email && (
												<p className="text-xs text-muted-foreground">{buyer.email}</p>
											)}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Progress Steps */}
						<Card>
							<CardHeader>
								<CardTitle>Tiến trình giao dịch</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex justify-between">
									{steps.map((s, index) => (
										<div
											key={s.number}
											className="flex flex-col items-center flex-1"
										>
											<div
												className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
													currentStep >= s.number
														? 'bg-primary text-primary-foreground'
														: 'bg-muted text-muted-foreground'
												}`}
											>
												{currentStep > s.number ? (
													<CheckCircle className="h-6 w-6" />
												) : (
													<s.icon className="h-6 w-6" />
												)}
											</div>
											<p className="text-sm font-medium text-center">
												{s.title}
											</p>
											{index < steps.length - 1 && (
												<div
													className={`h-1 w-full mt-2 ${
														currentStep > s.number
															? 'bg-primary'
															: 'bg-muted'
													}`}
												/>
											)}
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Step Content */}
						<Card>
							<CardHeader>
								<CardTitle>
									{currentStep === 0
										? 'Đơn hàng đã hủy'
										: currentStep <= 4
											? `Bước ${currentStep}: ${steps[currentStep - 1]?.title}`
											: 'Đã hoàn thành'}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Step 1: Payment (Buyer) */}
								{currentStep === 1 && isBuyer && (
									<>
										<div className="space-y-2">
											<Label>Địa chỉ giao hàng *</Label>
											<Textarea
												value={shippingAddress}
												onChange={(e) => setShippingAddress(e.target.value)}
												placeholder="Nhập địa chỉ giao hàng đầy đủ..."
											/>
										</div>
										<div className="space-y-2">
											<Label>Thông tin thanh toán</Label>
											<Input
												value={paymentProof}
												onChange={(e) => setPaymentProof(e.target.value)}
												placeholder="Mã giao dịch hoặc thông tin thanh toán..."
											/>
										</div>
										<Button
											onClick={handleSubmitPayment}
											disabled={submitPaymentMutation.isPending}
										>
											{submitPaymentMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : null}
											Xác nhận đã thanh toán
										</Button>
									</>
								)}

								{currentStep === 1 && isSeller && (
									<p className="text-muted-foreground">
										Đang chờ người mua thanh toán...
									</p>
								)}

								{/* Step 2: Shipping (Seller) */}
								{currentStep === 2 && isSeller && (
									<>
										<div className="p-4 bg-green-50 rounded-lg mb-4">
											<p className="text-green-700 font-medium">
												✅ Người mua đã thanh toán!
											</p>
											<p className="text-sm text-green-600 mt-1">
												Địa chỉ giao hàng: {order.shippingAddress}
											</p>
										</div>
										<div className="space-y-2">
											<Label>Mã vận đơn *</Label>
											<Input
												value={shippingInvoice}
												onChange={(e) => setShippingInvoice(e.target.value)}
												placeholder="Nhập mã vận đơn..."
											/>
										</div>
										<Button
											onClick={handleConfirmShipping}
											disabled={confirmShippingMutation.isPending}
										>
											{confirmShippingMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : null}
											Xác nhận đã gửi hàng
										</Button>
									</>
								)}

								{currentStep === 2 && isBuyer && (
									<div className="p-4 bg-blue-50 rounded-lg">
										<p className="text-blue-700">
											⏳ Đang chờ người bán gửi hàng...
										</p>
									</div>
								)}

								{/* Step 3: Received (Buyer) */}
								{currentStep === 3 && isBuyer && (
									<>
										<div className="p-4 bg-blue-50 rounded-lg mb-4">
											<p className="text-blue-700 font-medium">
												📦 Người bán đã gửi hàng!
											</p>
											{order.shippingInvoice && (
												<p className="text-sm text-blue-600 mt-1">
													Mã vận đơn: {order.shippingInvoice}
												</p>
											)}
										</div>
										<Button
											onClick={handleConfirmReceived}
											disabled={confirmReceivedMutation.isPending}
										>
											{confirmReceivedMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : null}
											Xác nhận đã nhận hàng
										</Button>
									</>
								)}

								{currentStep === 3 && isSeller && (
									<div className="p-4 bg-blue-50 rounded-lg">
										<p className="text-blue-700">
											⏳ Đang chờ người mua xác nhận nhận hàng...
										</p>
									</div>
								)}

								{/* Step 4: Rating */}
								{currentStep === 4 && (
									<>
										<div className="space-y-2">
											<Label>Đánh giá {isBuyer ? 'người bán' : 'người mua'}</Label>
											<div className="flex gap-4">
												<Button
													variant={rating === 1 ? 'default' : 'outline'}
													onClick={() => setRating(1)}
													className={rating === 1 ? 'bg-green-600 hover:bg-green-700' : ''}
												>
													<ThumbsUp className="h-4 w-4 mr-2" />
													Tích cực (+1)
												</Button>
												<Button
													variant={rating === -1 ? 'destructive' : 'outline'}
													onClick={() => setRating(-1)}
												>
													<ThumbsDown className="h-4 w-4 mr-2" />
													Tiêu cực (-1)
												</Button>
											</div>
										</div>
										<div className="space-y-2">
											<Label>Nhận xét</Label>
											<Textarea
												value={comment}
												onChange={(e) => setComment(e.target.value)}
												placeholder="Viết nhận xét của bạn..."
											/>
										</div>
										<Button
											onClick={handleSubmitRating}
											disabled={rateOrderMutation.isPending}
										>
											{rateOrderMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : null}
											Gửi đánh giá
										</Button>
									</>
								)}

								{/* Completed */}
								{currentStep === 5 && (
									<div className="p-4 bg-green-50 rounded-lg text-center">
										<CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
										<p className="text-green-700 font-medium text-lg">
											🎉 Giao dịch đã hoàn thành!
										</p>
										<p className="text-green-600 mt-1">
											Cảm ơn bạn đã sử dụng dịch vụ
										</p>
									</div>
								)}

								{/* Cancelled */}
								{currentStep === 0 && (
									<div className="p-4 bg-red-50 rounded-lg text-center">
										<XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
										<p className="text-red-700 font-medium text-lg">
											Đơn hàng đã bị hủy
										</p>
										{order.cancelReason && (
											<p className="text-red-600 mt-2">
												Lý do: {order.cancelReason}
											</p>
										)}
										{order.cancelledAt && (
											<p className="text-red-500 text-sm mt-1">
												Thời gian: {new Date(order.cancelledAt).toLocaleString('vi-VN')}
											</p>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Chat */}
					<div className="lg:col-span-1">
						<Card className="h-[600px] flex flex-col">
							<CardHeader>
								<div className="flex items-center gap-2">
									<MessageSquare className="h-5 w-5" />
									<CardTitle>Trò chuyện</CardTitle>
								</div>
								<CardDescription>
									Trao đổi với {isBuyer ? 'người bán' : 'người mua'}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col overflow-hidden">
								<div className="flex-1 overflow-y-auto space-y-4 mb-4">
									{isLoadingMessages ? (
										<div className="flex justify-center py-4">
											<Loader2 className="h-5 w-5 animate-spin" />
										</div>
									) : messages.length === 0 ? (
										<p className="text-center text-muted-foreground py-4">
											Chưa có tin nhắn
										</p>
									) : (
										messages.map((msg) => (
											<div
												key={msg._id}
												className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
											>
												<div
													className={`max-w-[80%] rounded-lg p-3 ${
														msg.isOwn
															? 'bg-primary text-primary-foreground'
															: 'bg-muted'
													}`}
												>
													{!msg.isOwn && (
														<p className="text-xs font-medium mb-1">{msg.senderName}</p>
													)}
													<p className="text-sm">{msg.content}</p>
													<p className="text-xs opacity-70 mt-1">
														{new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
															hour: '2-digit',
															minute: '2-digit',
														})}
													</p>
												</div>
											</div>
										))
									)}
									<div ref={messagesEndRef} />
								</div>
								<form onSubmit={handleSendMessage} className="flex gap-2">
									<Input
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										placeholder="Nhập tin nhắn..."
										disabled={sendMessageMutation.isPending}
									/>
									<Button
										type="submit"
										disabled={sendMessageMutation.isPending || !newMessage.trim()}
									>
										{sendMessageMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Send className="h-4 w-4" />
										)}
									</Button>
								</form>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	)
}
