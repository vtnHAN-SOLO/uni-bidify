import authRoutes from './Auth.js'
import productRoutes from './Product.js'
import categoryRoutes from './Category.js'
import watchlistRoutes from './Watchlist.js'
import userRoutes from './User.js'
import adminRoutes from './Admin.js'
import bidRoutes from './Bid.js'
import questionRoutes from './Question.js'
import orderRoutes from './Order.js'
/** Main API router that aggregates all API route modules */
import express from 'express'
const router = express.Router()

// API Routes
router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/watchlist', watchlistRoutes)
router.use('/users', userRoutes)
router.use('/admin', adminRoutes)
router.use('/bids', bidRoutes)
router.use('/questions', questionRoutes)
router.use('/orders', orderRoutes)

export default router
