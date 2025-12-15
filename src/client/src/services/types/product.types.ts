// product.types.ts

export type ProductDTO = {
	_id: string
	name: string
	description: string
	images: string[]
	currentPrice: number
	buyNowPrice?: number
	endTime: string
	bidCount?: number
	categoryName?: string
	highestBidderName?: string
	isNew?: boolean
}

// ✅ ADD: Type for Product Detail Page
export interface ProductDetailDTO extends ProductDTO {
	startPrice: number
	priceStep: number
	startTime: string
	autoExtend: boolean
	isSold: boolean
	createdAt: string
	updatedAt: string
	categoryId: string
	// ✅ Seller info from API
	sellerName: string
	sellerId: string
	sellerEmail?: string
	sellerRating: number
	sellerTotalRatings: number
}

export type ProductDetailResponse = {
	success: boolean
	product: ProductDetailDTO
}

// ✅ ADD: Type for Bid History
export type BidHistoryItem = {
	id: string
	bidder: string
	bidderName: string
	amount: number
	time: string
}

export type BidHistoryResponse = {
	success: boolean
	bidHistory: BidHistoryItem[]
	count: number
}

// ✅ ADD: Type for Q&A
export type QAItem = {
	id: string
	questioner: string
	questionerName: string
	question: string
	askedAt: string
	answer?: string
	answeredAt?: string
}

export type QAResponse = {
	success: boolean
	qaList: QAItem[]
	count: number
}

export type HomeProductsResponse = {
	endingSoon: ProductDTO[]
	mostBids: ProductDTO[]
	highestPrice: ProductDTO[]
}

export type ProductsByCategoryNameResponse = {
	products: ProductDTO[]
	categoryName: string
}

export type ProductsListResponse = {
	products: ProductDTO[]
	total: number
	page: number
	totalPages: number
}
