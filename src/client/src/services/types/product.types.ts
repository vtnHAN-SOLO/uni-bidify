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
	// ✅ Highest bidder ID for redirect
	highestBidderId?: string
}

export type ProductDetailResponse = {
	success: boolean
	product: ProductDetailDTO
}

// Note: BidHistoryItem and BidHistoryResponse are now defined in bids.api.ts
// Note: Q&A types are now defined in questions.api.ts

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
