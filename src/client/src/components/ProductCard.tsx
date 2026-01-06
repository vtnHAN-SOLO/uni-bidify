import { useState, useEffect } from 'react'
import { Clock, TrendingUp, Heart, User, Star, Store } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/data-display/card'
import { Badge } from '@/components/ui/data-display/badge'
import { Button } from '@/components/ui/input/button'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { formatCompactPrice } from '@/lib/utils'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/overlay/hover-card'
import { fetchProductDetail } from '@/services/api/products.api'
import { ProductDetailDTO } from '@/services/types/product.types'
import { Skeleton } from '@/components/ui/data-display/skeleton'

// --- HELPER FUNCTIONS ---

// Format price strictly as requested (e.g., "6.540.782 đ")
const formatFullPrice = (price: number) => {
	return price.toLocaleString('vi-VN') + ' đ'
}

// Helper to safely strip HTML tags and decode entities for preview text
// This turns "<p>New&nbsp;Item</p>" into "New Item"
const getCleanDescriptionSnippet = (htmlContent: string) => {
	if (!htmlContent) return ''
	try {
		// DOMParser is a safe native browser API to parse HTML string into a DOM
		const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
		// .textContent extracts text and ignores tags, automatically handling entities like &nbsp;
		const text = doc.body.textContent || ''
		// Collapse multiple spaces/newlines into a single space for a clean snippet
		return text.replace(/\s+/g, ' ').trim()
	} catch (e) {
		return htmlContent // Fallback if something fails (unlikely)
	}
}

// Hook for the specific countdown format: DD:HH:MM:SS
const useDetailedCountdown = (endTime: Date) => {
	const [timeLeft, setTimeLeft] = useState({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		isExpired: false,
	})

	useEffect(() => {
		const calculate = () => {
			const now = new Date().getTime()
			const end = new Date(endTime).getTime()
			const diff = end - now

			if (diff <= 0) {
				return {
					days: 0,
					hours: 0,
					minutes: 0,
					seconds: 0,
					isExpired: true,
				}
			}

			return {
				days: Math.floor(diff / (1000 * 60 * 60 * 24)),
				hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
				minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
				seconds: Math.floor((diff % (1000 * 60)) / 1000),
				isExpired: false,
			}
		}

		setTimeLeft(calculate()) // Initial calculation

		const timer = setInterval(() => {
			setTimeLeft(calculate())
		}, 1000)

		return () => clearInterval(timer)
	}, [endTime])

	return timeLeft
}

// --- HOVER DETAILS COMPONENT ---

const ProductHoverDetails = ({
	id,
	initialData,
}: {
	id: string
	initialData: ProductCardProps
}) => {
	const [details, setDetails] = useState<ProductDetailDTO | null>(null)
	const [loading, setLoading] = useState(true)
	const { days, hours, minutes, seconds, isExpired } = useDetailedCountdown(
		initialData.endTime
	)

	useEffect(() => {
		let isMounted = true
		const loadData = async () => {
			try {
				const data = await fetchProductDetail(id)
				if (isMounted) {
					setDetails(data)
					setLoading(false)
				}
			} catch (error) {
				console.error('Failed to fetch hover details', error)
				if (isMounted) setLoading(false)
			}
		}
		loadData()
		return () => {
			isMounted = false
		}
	}, [id])

	// Calculate Rating Percentage
	const getRatingPercent = (rating: number) => {
		// Heuristic: If rating is <= 5, assume it's a 5-star scale. Otherwise, assume percent or raw score.
		if (rating <= 5) return Math.round((rating / 5) * 100)
		return Math.round(rating)
	}

	const isSoldOrEnded = isExpired || (details && details.isSold)

	return (
		<div className="space-y-3">
			{/* Header: Title */}
			<div>
				<h4 className="font-bold text-sm leading-tight text-primary line-clamp-2">
					{initialData.title}
				</h4>
				<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
					<span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">
						{initialData.category}
					</span>
				</div>
			</div>

			{/* Pricing Section */}
			<div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
				<div>
					<p className="text-[10px] text-muted-foreground font-medium uppercase">
						Giá hiện tại
					</p>
					<p className="text-base font-bold text-primary">
						{formatFullPrice(
							details ? details.currentPrice : initialData.currentPrice
						)}
					</p>
				</div>
				{initialData.buyNowPrice && (
					<div className="text-right">
						<p className="text-[10px] text-muted-foreground font-medium uppercase">
							Mua ngay
						</p>
						<p className="text-sm font-semibold text-accent">
							{formatFullPrice(initialData.buyNowPrice)}
						</p>
					</div>
				)}
			</div>

			{/* Seller Info */}
			<div className="flex items-center justify-between text-xs border-b pb-2">
				<div className="flex items-center gap-1.5 text-foreground">
					<Store className="h-3.5 w-3.5 text-muted-foreground" />
					{loading ? (
						<Skeleton className="h-4 w-20" />
					) : (
						<span className="font-medium">
							{details?.sellerName || 'Unknown Seller'}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					<span className="text-muted-foreground">Đánh giá:</span>
					{loading ? (
						<Skeleton className="h-4 w-8" />
					) : (
						<div className="flex items-center text-yellow-600 dark:text-yellow-500 font-bold">
							<span>
								{getRatingPercent(details?.sellerRating || 0)}%
							</span>
							<Star className="h-3 w-3 ml-0.5 fill-current" />
						</div>
					)}
				</div>
			</div>

			{/* Description Snippet - FIXED */}
			<div className="text-xs text-muted-foreground">
				{loading ? (
					<div className="space-y-1">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-5/6" />
						<Skeleton className="h-3 w-4/6" />
					</div>
				) : (
					<p className="line-clamp-3 leading-relaxed break-words">
						{/* Use helper to clean the HTML to text */}
						{details?.description
							? getCleanDescriptionSnippet(details.description)
							: 'Chưa có mô tả cho sản phẩm này.'}
					</p>
				)}
			</div>

			{/* Countdown / Status Footer */}
			{isSoldOrEnded ? (
				<div className="flex items-center justify-center gap-2 rounded-md bg-gray-100 dark:bg-gray-800 p-2 text-gray-500 font-semibold text-xs border border-gray-200 dark:border-gray-700">
					<Clock className="h-3.5 w-3.5" />
					<span>Đã kết thúc / Đã bán</span>
				</div>
			) : (
				<div className="rounded-md bg-destructive/5 border border-destructive/20 p-2">
					<p className="text-[10px] text-center text-destructive mb-1 font-medium uppercase tracking-wider">
						Thời gian còn lại
					</p>
					<div className="flex items-center justify-center gap-1 text-sm font-bold text-destructive tabular-nums">
						<div className="flex flex-col items-center min-w-[20px]">
							<span>{String(days).padStart(2, '0')}</span>
							<span className="text-[8px] font-normal text-muted-foreground">
								ngày
							</span>
						</div>
						<span>:</span>
						<div className="flex flex-col items-center min-w-[20px]">
							<span>{String(hours).padStart(2, '0')}</span>
							<span className="text-[8px] font-normal text-muted-foreground">
								giờ
							</span>
						</div>
						<span>:</span>
						<div className="flex flex-col items-center min-w-[20px]">
							<span>{String(minutes).padStart(2, '0')}</span>
							<span className="text-[8px] font-normal text-muted-foreground">
								phút
							</span>
						</div>
						<span>:</span>
						<div className="flex flex-col items-center min-w-[20px]">
							<span>{String(seconds).padStart(2, '0')}</span>
							<span className="text-[8px] font-normal text-muted-foreground">
								giây
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

// --- MAIN PRODUCT CARD COMPONENT ---

interface ProductCardProps {
	id: string
	image: string
	title: string
	currentPrice: number
	buyNowPrice?: number
	highestBidder: string
	bidCount: number
	endTime: Date
	isNew?: boolean
	category: string
	hideWatchlist?: boolean // Hide watchlist button for Admin
}

export const ProductCard = (props: ProductCardProps) => {
	const {
		id,
		image,
		title,
		currentPrice,
		buyNowPrice,
		highestBidder,
		bidCount,
		endTime,
		isNew,
		category,
		hideWatchlist = false,
	} = props

	const timeLeft = formatDistanceToNow(endTime, {
		addSuffix: true,
		locale: vi,
	})
	const isEndingSoon =
		endTime.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 // 3 days
	const isEnded = new Date(endTime) < new Date()
	
	// ✅ USE WATCHLIST CONTEXT
	const { isInWatchlist, toggleWatchlist } = useWatchlist()
	const isFavorite = isInWatchlist(id)

	return (
		<HoverCard openDelay={200} closeDelay={100}>
			<HoverCardTrigger asChild>
				<Link to={`/products/${id}`} className="block h-full">
					<Card className="group h-full overflow-hidden transition-all hover:shadow-elevated flex flex-col">
						<div className="relative aspect-square overflow-hidden bg-muted">
							<img
								src={image}
								alt={title}
								className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>

							{/* ✅ FAVORITE BUTTON - Hide for Admin */}
							{!hideWatchlist && (
								<Button
									variant="ghost"
									size="icon"
									className="absolute right-2 top-2 h-10 w-10 rounded-full
                                   bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
                                   hover:bg-white dark:hover:bg-gray-800
                                   transition-all hover:scale-110 active:scale-95
                                   shadow-md z-10"
									onClick={(e) => {
										e.preventDefault()
										e.stopPropagation() // Prevent link click
										toggleWatchlist(id)
									}}
								>
									<Heart
										className={`h-5 w-5 transition-all ${
											isFavorite
												? 'fill-red-500 text-red-500'
												: 'fill-none text-gray-700 dark:text-gray-400 hover:text-red-500'
										}`}
									/>
								</Button>
							)}

							{isNew && (
								<Badge className="absolute left-2 top-2 bg-accent text-accent-foreground animate-pulse-slow">
									MỚI
								</Badge>
							)}

							{/* Status Badge - Only show one at a time */}
							{isEnded ? (
								<Badge className="absolute left-2 bottom-2 text-white bg-gray-600">
									⏱️ Đã kết thúc
								</Badge>
							) : isEndingSoon ? (
								<Badge className="absolute left-2 bottom-2 bg-destructive text-destructive-foreground">
									<Clock className="mr-1 h-3 w-3" />
									Sắp kết thúc
								</Badge>
							) : null}
						</div>

						<CardContent className="p-4 flex-1 flex flex-col">
							<div className="mb-2">
								<Badge variant="secondary" className="mb-2 text-xs">
									{category}
								</Badge>
								<h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-primary transition-colors">
									{title}
								</h3>
							</div>

							<div className="space-y-2 mt-auto">
								<div className="flex items-baseline justify-between">
									<div>
										<p className="text-xs text-muted-foreground">
											Giá hiện tại
										</p>
										<p className="text-xl font-bold text-primary">
											{formatCompactPrice(currentPrice)}
										</p>
									</div>
									{buyNowPrice && (
										<div className="text-right">
											<p className="text-xs text-muted-foreground">
												Mua ngay
											</p>
											<p className="text-sm font-semibold text-accent">
												{formatCompactPrice(buyNowPrice)}
											</p>
										</div>
									)}
								</div>

								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<div className="flex items-center gap-1">
										<User className="h-3 w-3" />
										<span className="truncate max-w-[80px]">
											{highestBidder}
										</span>
									</div>
									<div className="flex items-center gap-1">
										<TrendingUp className="h-3 w-3" />
										<span>{bidCount} lượt</span>
									</div>
								</div>

								<div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
									<Clock className="h-3 w-3" />
									<span>{timeLeft}</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>
			</HoverCardTrigger>

			{/* POPUP CONTENT */}
			<HoverCardContent
				className="w-80 p-4 shadow-xl border-primary/20"
				sideOffset={5}
				align="start"
			>
				<ProductHoverDetails id={id} initialData={props} />
			</HoverCardContent>
		</HoverCard>
	)
}