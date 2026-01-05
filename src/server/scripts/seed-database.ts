/**
 * Database Seed Script for AuctionHub
 *
 * This script initializes the MongoDB database with:
 * - Default admin user
 * - Sample categories
 * - Default auction settings
 *
 * Usage:
 *   npx ts-node scripts/seed-database.ts
 *
 * Or with environment variables:
 *   MONGO_URL=mongodb://localhost:27017/auctionhub npx ts-node scripts/seed-database.ts
 */

import mongoose from 'mongoose'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// ============================================
// ENUMS (matching src/Data/Constants/index.ts)
// ============================================

enum ROLES {
	Admin = 'ROLE ADMIN',
	Bidder = 'ROLE BIDDER',
	Seller = 'ROLE SELLER',
	Guest = 'ROLE GUEST',
}

enum UPGRADE_REQUEST_STATUS {
	None = 'NONE',
	Pending = 'PENDING',
	Approved = 'APPROVED',
	Rejected = 'REJECTED',
}

enum EMAIL_PROVIDER {
	Email = 'Email',
	Google = 'Google',
}

// ============================================
// SCHEMAS
// ============================================

const UserSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, unique: true, trim: true },
		password: { type: String },
		provider: {
			type: String,
			required: true,
			default: EMAIL_PROVIDER.Email,
		},
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		address: { type: String },
		role: {
			type: String,
			default: ROLES.Bidder,
			enum: Object.values(ROLES),
		},
		isActive: { type: Boolean, default: true },
		isVerified: { type: Boolean, default: false },
		otp: { type: String },
		otpExpires: { type: Date },
		resetPasswordToken: { type: String },
		resetPasswordExpires: { type: Date },
		positiveReviews: { type: Number, default: 0 },
		negativeReviews: { type: Number, default: 0 },
		watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
		upgradeRequestStatus: {
			type: String,
			default: UPGRADE_REQUEST_STATUS.None,
			enum: Object.values(UPGRADE_REQUEST_STATUS),
		},
		sellerExpiryDate: { type: Date },
	},
	{ timestamps: true }
)

const CategorySchema = new mongoose.Schema({
	name: { type: String, required: true, unique: true },
	parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
})

const SettingsSchema = new mongoose.Schema(
	{
		triggerMinutes: { type: Number, default: 5, min: 1, max: 60 },
		extensionMinutes: { type: Number, default: 10, min: 1, max: 120 },
	},
	{ timestamps: true }
)

// ============================================
// MODELS
// ============================================

const User = mongoose.model('User', UserSchema)
const Category = mongoose.model('Category', CategorySchema)
const Settings = mongoose.model('Settings', SettingsSchema)

// ============================================
// SEED DATA
// ============================================

const DEFAULT_ADMIN = {
	email: 'admin@auctionhub.com',
	password: 'Admin@123', // Will be hashed
	firstName: 'Admin',
	lastName: 'System',
	address: 'Ho Chi Minh City, Vietnam',
	role: ROLES.Admin,
	isActive: true,
	isVerified: true,
	provider: EMAIL_PROVIDER.Email,
}

const SAMPLE_USERS = [
	{
		email: 'seller@auctionhub.com',
		password: 'Seller@123',
		firstName: 'Nguyen',
		lastName: 'Van Seller',
		address: 'Ha Noi, Vietnam',
		role: ROLES.Seller,
		isActive: true,
		isVerified: true,
		provider: EMAIL_PROVIDER.Email,
	},
	{
		email: 'bidder@auctionhub.com',
		password: 'Bidder@123',
		firstName: 'Tran',
		lastName: 'Van Bidder',
		address: 'Da Nang, Vietnam',
		role: ROLES.Bidder,
		isActive: true,
		isVerified: true,
		provider: EMAIL_PROVIDER.Email,
	},
]

// Categories with parent-child relationships
const CATEGORIES = [
	{
		name: 'Điện tử',
		children: ['Điện thoại', 'Laptop', 'Máy tính bảng', 'Phụ kiện điện tử'],
	},
	{
		name: 'Thời trang',
		children: ['Quần áo nam', 'Quần áo nữ', 'Giày dép', 'Túi xách'],
	},
	{
		name: 'Đồ gia dụng',
		children: ['Nội thất', 'Thiết bị nhà bếp', 'Đồ trang trí'],
	},
	{
		name: 'Xe cộ',
		children: ['Ô tô', 'Xe máy', 'Xe đạp', 'Phụ tùng'],
	},
	{
		name: 'Sưu tầm',
		children: ['Đồ cổ', 'Tem', 'Tiền xu', 'Tranh nghệ thuật'],
	},
	{
		name: 'Thể thao',
		children: ['Dụng cụ thể thao', 'Đồ outdoor', 'Quần áo thể thao'],
	},
	{
		name: 'Sách & Văn phòng phẩm',
		children: ['Sách', 'Văn phòng phẩm', 'Đồ dùng học tập'],
	},
	{
		name: 'Khác',
		children: [],
	},
]

const DEFAULT_SETTINGS = {
	triggerMinutes: 5, // Auto-extend triggered 5 mins before end
	extensionMinutes: 10, // Extend by 10 mins
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedUsers() {
	console.log('\n📝 Seeding users...')

	// Create admin
	const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN.email })
	if (!existingAdmin) {
		const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10)
		await User.create({ ...DEFAULT_ADMIN, password: hashedPassword })
		console.log(`  ✅ Created admin: ${DEFAULT_ADMIN.email}`)
	} else {
		console.log(`  ⏭️  Admin already exists: ${DEFAULT_ADMIN.email}`)
	}

	// Create sample users
	for (const userData of SAMPLE_USERS) {
		const existing = await User.findOne({ email: userData.email })
		if (!existing) {
			const hashedPassword = await bcrypt.hash(userData.password, 10)
			await User.create({ ...userData, password: hashedPassword })
			console.log(`  ✅ Created user: ${userData.email}`)
		} else {
			console.log(`  ⏭️  User already exists: ${userData.email}`)
		}
	}
}

async function seedCategories() {
	console.log('\n📁 Seeding categories...')

	for (const category of CATEGORIES) {
		// Create or find parent category
		let parentCategory = await Category.findOne({ name: category.name })
		if (!parentCategory) {
			parentCategory = await Category.create({ name: category.name, parent: null })
			console.log(`  ✅ Created parent category: ${category.name}`)
		} else {
			console.log(`  ⏭️  Parent category exists: ${category.name}`)
		}

		// Create child categories
		for (const childName of category.children) {
			const existingChild = await Category.findOne({ name: childName })
			if (!existingChild && parentCategory) {
				await Category.create({ name: childName, parent: parentCategory._id })
				console.log(`    ✅ Created child category: ${childName}`)
			} else {
				console.log(`    ⏭️  Child category exists: ${childName}`)
			}
		}
	}
}

async function seedSettings() {
	console.log('\n⚙️  Seeding settings...')

	const existingSettings = await Settings.findOne()
	if (!existingSettings) {
		await Settings.create(DEFAULT_SETTINGS)
		console.log('  ✅ Created default auction settings')
	} else {
		console.log('  ⏭️  Settings already exist')
	}
}

// ============================================
// MAIN
// ============================================

async function main() {
	const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/auctionhub'

	console.log('🚀 AuctionHub Database Seed Script')
	console.log('===================================')
	console.log(`📍 MongoDB URL: ${mongoUrl}`)

	try {
		// Connect to MongoDB
		console.log('\n🔌 Connecting to MongoDB...')
		await mongoose.connect(mongoUrl)
		console.log('  ✅ Connected successfully!')

		// Run seed functions
		await seedUsers()
		await seedCategories()
		await seedSettings()

		console.log('\n===================================')
		console.log('🎉 Database seeding completed!')
		console.log('\n📋 Default Credentials:')
		console.log('  Admin:')
		console.log(`    Email: ${DEFAULT_ADMIN.email}`)
		console.log(`    Password: ${DEFAULT_ADMIN.password}`)
		console.log('  Seller:')
		console.log(`    Email: ${SAMPLE_USERS[0].email}`)
		console.log(`    Password: ${SAMPLE_USERS[0].password}`)
		console.log('  Bidder:')
		console.log(`    Email: ${SAMPLE_USERS[1].email}`)
		console.log(`    Password: ${SAMPLE_USERS[1].password}`)
	} catch (error) {
		console.error('\n❌ Error:', error)
		process.exit(1)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Disconnected from MongoDB')
	}
}

main()
