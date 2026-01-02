export const API_ENDPOINTS = {
	// Auth
	AUTH: {
		LOGIN: '/auth/login',
		REGISTER: '/auth/register',
		LOGOUT: '/auth/logout',
		VERIFY_OTP: '/auth/verify-otp',
		RESEND_OTP: '/auth/resend-otp',
		FORGOT_PASSWORD: '/auth/forgot-password',
		VERIFY_RESET_OTP: '/auth/verify-reset-otp',
		RESET_PASSWORD: '/auth/reset-password',
		GET_CURRENT_USER: '/auth/me',
		GOOGLE: '/auth/google',
	},

	// Products
	PRODUCTS: {
		BASE: '/products',
		DETAIL: (id: string) => `/products/${id}`,
		HOME: '/products/home',
		BY_CATEGORY_NAME: (categoryName: string) =>
			`/products/by-category/${encodeURIComponent(categoryName)}`,
		BY_CATEGORY_ID: (categoryId: string) =>
			`/products/by-category-id/${categoryId}`,
		SEARCH: '/products/search',
		ENDING_SOON: '/products/ending-soon',
		MOST_BIDS: '/products/most-bids',
		HIGHEST_PRICE: '/products/highest-price',
		RELATED: (id: string) => `/products/${id}/related`,
		APPEND_DESCRIPTION: (id: string) => `/products/${id}/description`,
		DELETE: (id: string) => `/products/${id}`,
		SELLER_PRODUCTS: '/products/seller/my-products',
		AUCTION_SETTINGS: '/products/auction-settings',
	},

	// Categories
	CATEGORIES: {
		BASE: '/categories',
		DETAIL: (id: string) => `/categories/${id}`,
		CHILDREN: (parentId: string) => `/categories/${parentId}/children`,
	},

	// Watchlist
	WATCHLIST: {
		GET_ALL: '/watchlist',
		ADD: (productId: string) => `/watchlist/${productId}`,
		REMOVE: (productId: string) => `/watchlist/${productId}`,
		CHECK: (productId: string) => `/watchlist/check/${productId}`,
	},

	// Bids (Auto-bidding system)
	BIDS: {
		BASE: '/bids',
		PLACE_BID: '/bids',
		BUY_NOW: '/bids/buy-now',
		PRODUCT_HISTORY: (productId: string) => `/bids/product/${productId}`,
		MY_BID: (productId: string) => `/bids/product/${productId}/my-bid`,
		USER_PARTICIPATING: '/bids/user/participating',
		USER_WON: '/bids/user/won',
		REJECT: (bidId: string) => `/bids/${bidId}`,
	},

	// Questions (Q&A for products)
	QUESTIONS: {
		BASE: '/questions',
		ASK: '/questions',
		ANSWER: (questionId: string) => `/questions/${questionId}/answer`,
		PRODUCT_QUESTIONS: (productId: string) =>
			`/questions/product/${productId}`,
		SELLER_QUESTIONS: '/questions/seller',
	},

	// Orders (Post-auction workflow)
	ORDERS: {
		BASE: '/orders',
		PRODUCT_ORDER: (productId: string) => `/orders/product/${productId}`,
		SUBMIT_PAYMENT: (orderId: string) => `/orders/${orderId}/payment`,
		CONFIRM_SHIPPING: (orderId: string) => `/orders/${orderId}/shipping`,
		CONFIRM_RECEIVED: (orderId: string) => `/orders/${orderId}/received`,
		CANCEL: (orderId: string) => `/orders/${orderId}/cancel`,
		RATE: (orderId: string) => `/orders/${orderId}/rate`,
		SEND_MESSAGE: (orderId: string) => `/orders/${orderId}/message`,
		GET_MESSAGES: (orderId: string) => `/orders/${orderId}/messages`,
		MY_ORDERS: '/orders/my-orders',
	},

	// Users
	USERS: {
		PROFILE: '/users/profile',
		RATINGS: '/users/ratings',
		REVIEWS: '/users/reviews',
		WATCHLIST: '/users/watchlist',
		BIDDING_HISTORY: '/users/bidding-history',
		CHANGE_PASSWORD: '/users/change-password',
		UPGRADE_REQUEST: '/users/upgrade-request',
	},

	// Admin
	ADMIN: {
		CATEGORIES: '/admin/categories',
		UPDATE_CATEGORY: (id: string) => `/admin/categories/${id}`,
		DELETE_CATEGORY: (id: string) => `/admin/categories/${id}`,
		USERS: '/admin/users',
		GET_USER_DETAIL: (id: string) => `/admin/users/${id}`,
		CREATE_USER: '/admin/users',
		DELETE_USER: (id: string) => `/admin/users/${id}`,
		UPDATE_USER_STATUS: (id: string) => `/admin/users/${id}/status`,
		UPDATE_UPGRADE: (id: string) => `/admin/users/${id}/upgrade`,
		UPGRADE_REQUESTS: '/admin/users/upgrade-requests',
		PRODUCTS: '/admin/products',
		DELETE_PRODUCT: (id: string) => `/admin/products/${id}`,
		PRODUCT_DETAIL: (id: string) => `/admin/products/${id}`,
		SETTINGS: '/admin/settings',
	},
} as const
