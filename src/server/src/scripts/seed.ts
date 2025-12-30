// @ts-nocheck
/* eslint-disable */
/**
 * Database Seed Script
 * Run with: npm run seed
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from server root
// When running with `npm run seed` from server directory, process.cwd() is the server root
dotenv.config()

// If MONGO_URL is still not set, try loading from explicit path
if (!process.env.MONGO_URL) {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	dotenv.config({ path: path.join(__dirname, '../../.env') })
}

// Import models
import User from '../Models/User.js'
import Category from '../Models/Category.js'
import Product from '../Models/Product.js'
import Bid from '../Models/Bid.js'
import Order from '../Models/Order.js'
import Question from '../Models/Question.js'
import Review from '../Models/Review.js'

// Import constants
import {
	ROLES,
	UPGRADE_REQUEST_STATUS,
	EMAIL_PROVIDER,
	TRANSACTION_STEP,
	RATING,
} from '../Data/Constants/index.js'

// ==================== SEED DATA ====================

const seedDatabase = async () => {
	try {
		// Connect to MongoDB
		const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/bidify'
		console.log('🔗 Connecting to MongoDB...')
		console.log('📍 URI:', mongoUri.substring(0, 30) + '...')
		await mongoose.connect(mongoUri)
		console.log('✅ Connected to MongoDB')

		// Clear existing data
		console.log('🗑️  Clearing existing data...')
		await Promise.all([
			User.deleteMany({}),
			Category.deleteMany({}),
			Product.deleteMany({}),
			Bid.deleteMany({}),
			Order.deleteMany({}),
			Question.deleteMany({}),
			Review.deleteMany({}),
		])
		console.log('✅ Cleared existing data')

		// Hash password for all users
		const hashedPassword = await bcrypt.hash('password123', 10)

		// ==================== 1. CREATE USERS (10) ====================
		console.log('👤 Creating users...')
		const usersData = [
			{
				email: 'admin@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Admin',
				lastName: 'System',
				address: '123 Admin Street, HCM',
				role: ROLES.Admin,
				isActive: true,
				isVerified: true,
				positiveReviews: 50,
				negativeReviews: 0,
			},
			{
				email: 'seller1@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Nguyen',
				lastName: 'Van Ban',
				address: '456 Seller Street, Quan 1, HCM',
				role: ROLES.Seller,
				isActive: true,
				isVerified: true,
				positiveReviews: 25,
				negativeReviews: 2,
			},
			{
				email: 'seller2@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Tran',
				lastName: 'Thi Ban',
				address: '789 Market Street, Quan 3, HCM',
				role: ROLES.Seller,
				isActive: true,
				isVerified: true,
				positiveReviews: 30,
				negativeReviews: 1,
			},
			{
				email: 'bidder1@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Le',
				lastName: 'Van Dau',
				address: '111 Bidder Lane, Quan 7, HCM',
				role: ROLES.Bidder,
				isActive: true,
				isVerified: true,
				positiveReviews: 15,
				negativeReviews: 0,
			},
			{
				email: 'bidder2@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Pham',
				lastName: 'Thi Gia',
				address: '222 Auction Ave, Quan 2, HCM',
				role: ROLES.Bidder,
				isActive: true,
				isVerified: true,
				positiveReviews: 10,
				negativeReviews: 1,
			},
			{
				email: 'bidder3@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Hoang',
				lastName: 'Van Mua',
				address: '333 Shopping Blvd, Quan 4, HCM',
				role: ROLES.Bidder,
				isActive: true,
				isVerified: true,
				positiveReviews: 8,
				negativeReviews: 0,
			},
			{
				email: 'bidder4@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Vu',
				lastName: 'Thi Dau',
				address: '444 Trade St, Quan 5, HCM',
				role: ROLES.Bidder,
				isActive: true,
				isVerified: true,
				positiveReviews: 5,
				negativeReviews: 0,
			},
			{
				email: 'newuser@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Do',
				lastName: 'Van Moi',
				address: '555 New User Rd, Quan 6, HCM',
				role: ROLES.Bidder,
				isActive: true,
				isVerified: true,
				positiveReviews: 0,
				negativeReviews: 0,
				upgradeRequestStatus: UPGRADE_REQUEST_STATUS.Pending,
			},
			{
				email: 'inactive@bidify.com',
				password: hashedPassword,
				provider: EMAIL_PROVIDER.Email,
				firstName: 'Ngo',
				lastName: 'Van Nghi',
				address: '666 Inactive Ln, Quan 8, HCM',
				role: ROLES.Bidder,
				isActive: false,
				isVerified: true,
				positiveReviews: 3,
				negativeReviews: 5,
			},
			{
				email: 'google.user@gmail.com',
				provider: EMAIL_PROVIDER.Google,
				firstName: 'Google',
				lastName: 'User',
				address: '777 Google St, Quan 9, HCM',
				role: ROLES.Bidder,
				isActive: true,
				isVerified: true,
				positiveReviews: 12,
				negativeReviews: 0,
			},
		]
		const users = await User.insertMany(usersData)
		console.log(`✅ Created ${users.length} users`)

		// Get user references
		const seller1 = users[1]
		const seller2 = users[2]
		const bidder1 = users[3]
		const bidder2 = users[4]
		const bidder3 = users[5]
		const bidder4 = users[6]

		// ==================== 2. CREATE CATEGORIES (10) ====================
		console.log('📁 Creating categories...')

		// Parent categories
		const parentCategoriesData = [
			{ name: 'Dien tu' },
			{ name: 'Thoi trang' },
			{ name: 'Do gia dung' },
			{ name: 'Xe co' },
			{ name: 'Suu tam' },
		]
		const parentCategories = await Category.insertMany(parentCategoriesData)

		// Child categories
		const childCategoriesData = [
			{ name: 'Dien thoai', parent: parentCategories[0]._id },
			{ name: 'Laptop', parent: parentCategories[0]._id },
			{ name: 'Quan ao nam', parent: parentCategories[1]._id },
			{ name: 'Dong ho', parent: parentCategories[1]._id },
			{ name: 'Do co', parent: parentCategories[4]._id },
		]
		const childCategories = await Category.insertMany(childCategoriesData)

		const allCategories = [...parentCategories, ...childCategories]
		console.log(`✅ Created ${allCategories.length} categories`)

		// ==================== 3. CREATE PRODUCTS (10) ====================
		console.log('📦 Creating products...')

		const now = new Date()
		const oneDay = 24 * 60 * 60 * 1000
		const oneWeek = 7 * oneDay

		const productsData = [
			{
				name: 'iPhone 15 Pro Max 256GB',
				description: 'iPhone 15 Pro Max moi 100%, chua kich hoat, fullbox. Mau Titan tu nhien, bao hanh Apple 12 thang.',
				category: childCategories[0]._id,
				seller: seller1._id,
				images: ['https://cdn.tgdd.vn/Products/Images/42/305658/iphone-15-pro-max-blue-thumbnew-600x600.jpg'],
				startPrice: 25000000,
				priceStep: 500000,
				currentPrice: 28500000,
				buyNowPrice: 35000000,
				highestBidder: bidder1._id,
				highestBidderMaxPrice: 30000000,
				startTime: new Date(now.getTime() - 2 * oneDay),
				endTime: new Date(now.getTime() + 5 * oneDay),
				bidCount: 7,
			},
			{
				name: 'MacBook Pro 14 inch M3 Pro',
				description: 'MacBook Pro 14 inch chip M3 Pro, RAM 18GB, SSD 512GB. May moi 99%, con bao hanh den thang 6/2025.',
				category: childCategories[1]._id,
				seller: seller1._id,
				images: ['https://cdn.tgdd.vn/Products/Images/44/318223/apple-macbook-pro-14-inch-m3-pro-18g-512g-2023-xam-1.jpg'],
				startPrice: 40000000,
				priceStep: 1000000,
				currentPrice: 45000000,
				buyNowPrice: 55000000,
				highestBidder: bidder2._id,
				highestBidderMaxPrice: 48000000,
				startTime: new Date(now.getTime() - 3 * oneDay),
				endTime: new Date(now.getTime() + 4 * oneDay),
				bidCount: 5,
			},
			{
				name: 'Ao khoac da nam cao cap',
				description: 'Ao khoac da bo that 100%, size L, mau nau dam. Moi su dung 2 lan, con nhu moi.',
				category: childCategories[2]._id,
				seller: seller2._id,
				images: ['https://product.hstatic.net/200000182297/product/ao-khoac-da-nam_5d36e3c13cfe47c38f97f33d3a4e1f0f_master.jpg'],
				startPrice: 2000000,
				priceStep: 100000,
				currentPrice: 2500000,
				highestBidder: bidder3._id,
				highestBidderMaxPrice: 2800000,
				startTime: new Date(now.getTime() - oneDay),
				endTime: new Date(now.getTime() + 6 * oneDay),
				bidCount: 5,
			},
			{
				name: 'Dong ho Rolex Submariner',
				description: 'Rolex Submariner Date 126610LN, fullbox, giay to day du, mua tai Rolex Viet Nam.',
				category: childCategories[3]._id,
				seller: seller2._id,
				images: ['https://bossluxurywatch.vn/uploads/san-pham/rolex/submariner/rolex-submariner-date-126610ln-0001.png'],
				startPrice: 250000000,
				priceStep: 5000000,
				currentPrice: 280000000,
				buyNowPrice: 350000000,
				highestBidder: bidder1._id,
				highestBidderMaxPrice: 300000000,
				startTime: new Date(now.getTime() - 5 * oneDay),
				endTime: new Date(now.getTime() + 2 * oneDay),
				bidCount: 6,
			},
			{
				name: 'Binh gom su thoi Le',
				description: 'Binh gom men trang thoi Le, cao 35cm, co chung nhan tham dinh tu chuyen gia.',
				category: childCategories[4]._id,
				seller: seller1._id,
				images: ['https://antique.vn/wp-content/uploads/2018/04/binh-gom-thoi-le.jpg'],
				startPrice: 50000000,
				priceStep: 2000000,
				currentPrice: 58000000,
				highestBidder: bidder4._id,
				highestBidderMaxPrice: 60000000,
				startTime: new Date(now.getTime() - 4 * oneDay),
				endTime: new Date(now.getTime() + 3 * oneDay),
				bidCount: 4,
				allowUnratedBidders: false,
			},
			// Ended auctions (for orders)
			{
				name: 'Samsung Galaxy S24 Ultra',
				description: 'Samsung Galaxy S24 Ultra 512GB, mau Titan Black, moi 100% fullbox.',
				category: childCategories[0]._id,
				seller: seller1._id,
				images: ['https://cdn.tgdd.vn/Products/Images/42/307174/samsung-galaxy-s24-ultra-grey-thumbnew-600x600.jpg'],
				startPrice: 28000000,
				priceStep: 500000,
				currentPrice: 32000000,
				highestBidder: bidder2._id,
				highestBidderMaxPrice: 32000000,
				startTime: new Date(now.getTime() - oneWeek),
				endTime: new Date(now.getTime() - 2 * oneDay),
				bidCount: 8,
				isSold: true,
				winner: bidder2._id,
			},
			{
				name: 'Dell XPS 15 2024',
				description: 'Dell XPS 15 Intel Core Ultra 7, RAM 32GB, SSD 1TB, man OLED 3.5K.',
				category: childCategories[1]._id,
				seller: seller2._id,
				images: ['https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/black/notebook-xps-15-9530-black-gallery-1.psd'],
				startPrice: 35000000,
				priceStep: 1000000,
				currentPrice: 42000000,
				highestBidder: bidder1._id,
				highestBidderMaxPrice: 42000000,
				startTime: new Date(now.getTime() - oneWeek - 2 * oneDay),
				endTime: new Date(now.getTime() - 3 * oneDay),
				bidCount: 7,
				isSold: true,
				winner: bidder1._id,
			},
			// Future auction
			{
				name: 'PlayStation 5 Pro',
				description: 'PS5 Pro moi 100%, kem 2 tay cam DualSense va 3 dia game.',
				category: parentCategories[0]._id,
				seller: seller1._id,
				images: ['https://cdn.tgdd.vn/Products/Images/2941/315719/ps5-pro-digital-edition-1tb-xam-thumb-600x600.jpg'],
				startPrice: 15000000,
				priceStep: 500000,
				currentPrice: 15000000,
				buyNowPrice: 20000000,
				startTime: new Date(now.getTime() + 2 * oneDay),
				endTime: new Date(now.getTime() + oneWeek + 2 * oneDay),
				bidCount: 0,
			},
			{
				name: 'Xe may Honda SH 150i ABS',
				description: 'Honda SH 150i ABS 2023, mau den nham, di duoc 5000km, con bao hanh.',
				category: parentCategories[3]._id,
				seller: seller2._id,
				images: ['https://cdn.honda.com.vn/motorbikes/December2022/X0gVoMpF3sejSfBNzHnj.png'],
				startPrice: 80000000,
				priceStep: 2000000,
				currentPrice: 88000000,
				highestBidder: bidder3._id,
				highestBidderMaxPrice: 90000000,
				startTime: new Date(now.getTime() - 2 * oneDay),
				endTime: new Date(now.getTime() + 5 * oneDay),
				bidCount: 4,
			},
			{
				name: 'Tu lanh Samsung Inverter 380L',
				description: 'Tu lanh Samsung RT38K5982SL/SV, Inverter tiet kiem dien, con bao hanh 2 nam.',
				category: parentCategories[2]._id,
				seller: seller1._id,
				images: ['https://cdn.tgdd.vn/Products/Images/1943/220324/samsung-rt38k5982sl-sv-1.jpg'],
				startPrice: 12000000,
				priceStep: 500000,
				currentPrice: 14500000,
				highestBidder: bidder4._id,
				highestBidderMaxPrice: 15000000,
				startTime: new Date(now.getTime() - 3 * oneDay),
				endTime: new Date(now.getTime() + 4 * oneDay),
				bidCount: 5,
			},
		]
		const products = await Product.insertMany(productsData)
		console.log(`✅ Created ${products.length} products`)

		// ==================== 4. CREATE BIDS (11) ====================
		console.log('💰 Creating bids...')

		const bidsData = [
			{ product: products[0]._id, bidder: bidder2._id, price: 25500000, maxPrice: 26000000, createdAt: new Date(now.getTime() - 2 * oneDay + 3600000) },
			{ product: products[0]._id, bidder: bidder3._id, price: 26000000, maxPrice: 27000000, createdAt: new Date(now.getTime() - 2 * oneDay + 7200000) },
			{ product: products[0]._id, bidder: bidder1._id, price: 27000000, maxPrice: 30000000, createdAt: new Date(now.getTime() - oneDay) },
			{ product: products[0]._id, bidder: bidder2._id, price: 27500000, maxPrice: 28000000, createdAt: new Date(now.getTime() - oneDay + 3600000) },
			{ product: products[0]._id, bidder: bidder1._id, price: 28000000, createdAt: new Date(now.getTime() - oneDay + 7200000) },
			{ product: products[0]._id, bidder: bidder3._id, price: 28500000, maxPrice: 29000000, createdAt: new Date(now.getTime() - 12 * 3600000) },
			{ product: products[0]._id, bidder: bidder1._id, price: 28500000, createdAt: new Date(now.getTime() - 6 * 3600000) },
			{ product: products[1]._id, bidder: bidder1._id, price: 41000000, maxPrice: 43000000, createdAt: new Date(now.getTime() - 3 * oneDay + 3600000) },
			{ product: products[1]._id, bidder: bidder2._id, price: 43000000, maxPrice: 48000000, createdAt: new Date(now.getTime() - 2 * oneDay) },
			{ product: products[1]._id, bidder: bidder1._id, price: 44000000, createdAt: new Date(now.getTime() - oneDay) },
			{ product: products[1]._id, bidder: bidder2._id, price: 45000000, createdAt: new Date(now.getTime() - 12 * 3600000) },
		]
		const bids = await Bid.insertMany(bidsData)
		console.log(`✅ Created ${bids.length} bids`)

		// ==================== 5. CREATE ORDERS (2) ====================
		console.log('📋 Creating orders...')

		const ordersData = [
			{
				product: products[5]._id,
				buyer: bidder2._id,
				seller: seller1._id,
				finalPrice: 32000000,
				status: TRANSACTION_STEP.Completed,
				shippingAddress: '222 Auction Ave, Quan 2, HCM',
				paymentProof: 'https://example.com/payment-proof-1.jpg',
				paymentSubmittedAt: new Date(now.getTime() - 6 * oneDay),
				shippingInvoice: 'VNP123456789',
				sellerConfirmedAt: new Date(now.getTime() - 5 * oneDay),
				buyerConfirmedAt: new Date(now.getTime() - 3 * oneDay),
				buyerRated: true,
				sellerRated: true,
				messages: [
					{ sender: bidder2._id, content: 'Chao anh/chi, em da chuyen khoan xong a.', createdAt: new Date(now.getTime() - 6 * oneDay) },
					{ sender: seller1._id, content: 'Em da nhan duoc. Anh gui hang ngay hom nay nhe.', createdAt: new Date(now.getTime() - 6 * oneDay + 3600000) },
				],
			},
			{
				product: products[6]._id,
				buyer: bidder1._id,
				seller: seller2._id,
				finalPrice: 42000000,
				status: TRANSACTION_STEP.AwaitingPayment,
			},
		]

		const orders = await Order.insertMany(ordersData)
		console.log(`✅ Created ${orders.length} orders`)

		// ==================== 6. CREATE QUESTIONS (10) ====================
		console.log('❓ Creating questions...')

		const questionsData = [
			{ product: products[0]._id, asker: bidder2._id, question: 'May co bi tray xuoc gi khong a? Con bao hanh chinh hang khong?', answer: 'May moi 100% chua kich hoat em nhe. Con bao hanh Apple 12 thang tu ngay kich.', answeredAt: new Date(now.getTime() - oneDay) },
			{ product: products[0]._id, asker: bidder3._id, question: 'Anh co ship COD khong a?', answer: 'Anh ship COD noi thanh HCM nhe. Tinh thi chuyen khoan truoc em.', answeredAt: new Date(now.getTime() - 12 * 3600000) },
			{ product: products[1]._id, asker: bidder1._id, question: 'MacBook con bao hanh den khi nao a?', answer: 'Con bao hanh Apple Care den thang 6/2025 em nhe.', answeredAt: new Date(now.getTime() - 2 * oneDay) },
			{ product: products[1]._id, asker: bidder3._id, question: 'May co kem sac va cap khong anh?', answer: 'Day du hop, sac, cap nhu moi em.', answeredAt: new Date(now.getTime() - oneDay) },
			{ product: products[2]._id, asker: bidder1._id, question: 'Ao nay size L fit nguoi bao nhieu kg a?', answer: 'Size L fit nguoi 65-75kg, cao 1m68-1m75 em nhe.', answeredAt: new Date(now.getTime() - 18 * 3600000) },
			{ product: products[3]._id, asker: bidder2._id, question: 'Dong ho co day du giay to warranty card khong a?', answer: 'Day du fullset: hop, so, the bao hanh, hoa don Rolex VN em nhe.', answeredAt: new Date(now.getTime() - 3 * oneDay) },
			{ product: products[4]._id, asker: bidder1._id, question: 'Binh gom co chung nhan tham dinh tu dau a?', answer: 'Co giay chung nhan tu Vien Bao ton Di tich em nhe.', answeredAt: new Date(now.getTime() - 2 * oneDay) },
			{ product: products[8]._id, asker: bidder2._id, question: 'Xe con bao hanh chinh hang khong anh?', answer: 'Con bao hanh Honda 3 nam hoac 30,000km em nhe.', answeredAt: new Date(now.getTime() - oneDay) },
			{ product: products[9]._id, asker: bidder3._id, question: 'Tu lanh co giao va lap dat tan noi khong a?' },
			{ product: products[7]._id, asker: bidder4._id, question: 'PS5 Pro co the thanh toan tra gop khong a?' },
		]
		const questions = await Question.insertMany(questionsData)
		console.log(`✅ Created ${questions.length} questions`)

		// ==================== 7. CREATE REVIEWS (10) ====================
		console.log('⭐ Creating reviews...')

		// Use numeric values directly (1 = Positive, -1 = Negative) to avoid enum validation issues
		const reviewsData = [
			{ product: products[5]._id, reviewer: bidder2._id, reviewedUser: seller1._id, rating: 1, comment: 'Nguoi ban giao hang nhanh, dong goi can than. May dep nhu mo ta. Rat hai long!' },
			{ product: products[5]._id, reviewer: seller1._id, reviewedUser: bidder2._id, rating: 1, comment: 'Nguoi mua thanh toan nhanh, giao tiep vui ve. Recommend!' },
			{ product: products[6]._id, reviewer: bidder1._id, reviewedUser: seller2._id, rating: 1, comment: 'Laptop chat luong tot, dung mo ta. Seller nhiet tinh!' },
			{ product: products[6]._id, reviewer: seller2._id, reviewedUser: bidder1._id, rating: 1, comment: 'Buyer tot, thanh toan dung hen.' },
			{ product: products[0]._id, reviewer: bidder3._id, reviewedUser: seller1._id, rating: 1, comment: 'Lan thu 2 mua hang cua shop. Van rat ung y!' },
			{ product: products[1]._id, reviewer: bidder2._id, reviewedUser: seller1._id, rating: 1, comment: 'San pham chinh hang, gia tot. Se ung ho tiep!' },
			{ product: products[2]._id, reviewer: bidder3._id, reviewedUser: seller2._id, rating: 1, comment: 'Ao dep, chat luong tot. Dong goi can than.' },
			{ product: products[3]._id, reviewer: bidder1._id, reviewedUser: seller2._id, rating: 1, comment: 'Dong ho authentic, fullbox nhu mo ta. Very happy!' },
			{ product: products[4]._id, reviewer: bidder4._id, reviewedUser: seller1._id, rating: -1, comment: 'Giao hang hoi cham so voi cam ket. San pham thi OK.' },
			{ product: products[8]._id, reviewer: bidder3._id, reviewedUser: seller2._id, rating: 1, comment: 'Xe dep, giay to day du. Seller ho tro nhiet tinh.' },
		]
		const reviews = await Review.insertMany(reviewsData)
		console.log(`✅ Created ${reviews.length} reviews`)

		// ==================== UPDATE WATCHLISTS ====================
		console.log('👁️  Updating watchlists...')
		await User.findByIdAndUpdate(bidder1._id, { watchlist: [products[0]._id, products[1]._id, products[3]._id] })
		await User.findByIdAndUpdate(bidder2._id, { watchlist: [products[0]._id, products[4]._id, products[8]._id] })
		await User.findByIdAndUpdate(bidder3._id, { watchlist: [products[2]._id, products[7]._id] })
		console.log('✅ Updated watchlists')

		// ==================== SUMMARY ====================
		console.log('\n========================================')
		console.log('🎉 SEED DATA COMPLETED SUCCESSFULLY!')
		console.log('========================================')
		console.log(`👤 Users: ${users.length}`)
		console.log(`📁 Categories: ${allCategories.length}`)
		console.log(`📦 Products: ${products.length}`)
		console.log(`💰 Bids: ${bids.length}`)
		console.log(`📋 Orders: ${orders.length}`)
		console.log(`❓ Questions: ${questions.length}`)
		console.log(`⭐ Reviews: ${reviews.length}`)
		console.log('\n📝 Test accounts:')
		console.log('   Admin: admin@bidify.com / password123')
		console.log('   Seller: seller1@bidify.com / password123')
		console.log('   Bidder: bidder1@bidify.com / password123')
		console.log('========================================\n')

		await mongoose.disconnect()
		console.log('🔌 Disconnected from MongoDB')
		process.exit(0)
	} catch (error) {
		console.error('❌ Error seeding database:', error)
		await mongoose.disconnect()
		process.exit(1)
	}
}

// Run seed
seedDatabase()
