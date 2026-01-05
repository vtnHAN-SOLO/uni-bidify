/**
 * Database Reset Script for AuctionHub
 *
 * ⚠️ WARNING: This script will DELETE ALL DATA in the database!
 * Use with caution.
 *
 * This script:
 * - Drops all collections
 * - Re-seeds the database with initial data
 *
 * Usage:
 *   npx ts-node scripts/reset-database.ts
 *
 * Or with environment variables:
 *   MONGO_URL=mongodb://localhost:27017/auctionhub npx ts-node scripts/reset-database.ts
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
// Load environment variables
dotenv.config();
// ============================================
// ENUMS
// ============================================
var ROLES;
(function (ROLES) {
    ROLES["Admin"] = "ROLE ADMIN";
    ROLES["Bidder"] = "ROLE BIDDER";
    ROLES["Seller"] = "ROLE SELLER";
    ROLES["Guest"] = "ROLE GUEST";
})(ROLES || (ROLES = {}));
var UPGRADE_REQUEST_STATUS;
(function (UPGRADE_REQUEST_STATUS) {
    UPGRADE_REQUEST_STATUS["None"] = "NONE";
    UPGRADE_REQUEST_STATUS["Pending"] = "PENDING";
    UPGRADE_REQUEST_STATUS["Approved"] = "APPROVED";
    UPGRADE_REQUEST_STATUS["Rejected"] = "REJECTED";
})(UPGRADE_REQUEST_STATUS || (UPGRADE_REQUEST_STATUS = {}));
var EMAIL_PROVIDER;
(function (EMAIL_PROVIDER) {
    EMAIL_PROVIDER["Email"] = "Email";
    EMAIL_PROVIDER["Google"] = "Google";
})(EMAIL_PROVIDER || (EMAIL_PROVIDER = {}));
// ============================================
// SCHEMAS
// ============================================
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    provider: { type: String, required: true, default: EMAIL_PROVIDER.Email },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    address: { type: String },
    role: { type: String, default: ROLES.Bidder, enum: Object.values(ROLES) },
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
}, { timestamps: true });
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
});
const SettingsSchema = new mongoose.Schema({
    triggerMinutes: { type: Number, default: 5, min: 1, max: 60 },
    extensionMinutes: { type: Number, default: 10, min: 1, max: 120 },
}, { timestamps: true });
// ============================================
// MODELS
// ============================================
const User = mongoose.model('User', UserSchema);
const Category = mongoose.model('Category', CategorySchema);
const Settings = mongoose.model('Settings', SettingsSchema);
// ============================================
// SEED DATA
// ============================================
const DEFAULT_ADMIN = {
    email: 'admin@auctionhub.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'System',
    address: 'Ho Chi Minh City, Vietnam',
    role: ROLES.Admin,
    isActive: true,
    isVerified: true,
    provider: EMAIL_PROVIDER.Email,
};
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
];
const CATEGORIES = [
    { name: 'Điện tử', children: ['Điện thoại', 'Laptop', 'Máy tính bảng', 'Phụ kiện điện tử'] },
    { name: 'Thời trang', children: ['Quần áo nam', 'Quần áo nữ', 'Giày dép', 'Túi xách'] },
    { name: 'Đồ gia dụng', children: ['Nội thất', 'Thiết bị nhà bếp', 'Đồ trang trí'] },
    { name: 'Xe cộ', children: ['Ô tô', 'Xe máy', 'Xe đạp', 'Phụ tùng'] },
    { name: 'Sưu tầm', children: ['Đồ cổ', 'Tem', 'Tiền xu', 'Tranh nghệ thuật'] },
    { name: 'Thể thao', children: ['Dụng cụ thể thao', 'Đồ outdoor', 'Quần áo thể thao'] },
    { name: 'Sách & Văn phòng phẩm', children: ['Sách', 'Văn phòng phẩm', 'Đồ dùng học tập'] },
    { name: 'Khác', children: [] },
];
const DEFAULT_SETTINGS = {
    triggerMinutes: 5,
    extensionMinutes: 10,
};
// ============================================
// HELPER FUNCTIONS
// ============================================
function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}
async function dropAllCollections() {
    console.log('\n🗑️  Dropping all collections...');
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
        await db.dropCollection(collection.name);
        console.log(`  ✅ Dropped: ${collection.name}`);
    }
}
async function seedUsers() {
    console.log('\n📝 Seeding users...');
    const hashedAdminPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    await User.create({ ...DEFAULT_ADMIN, password: hashedAdminPassword });
    console.log(`  ✅ Created admin: ${DEFAULT_ADMIN.email}`);
    for (const userData of SAMPLE_USERS) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.create({ ...userData, password: hashedPassword });
        console.log(`  ✅ Created user: ${userData.email}`);
    }
}
async function seedCategories() {
    console.log('\n📁 Seeding categories...');
    for (const category of CATEGORIES) {
        const parentCategory = await Category.create({ name: category.name, parent: null });
        console.log(`  ✅ Created parent: ${category.name}`);
        for (const childName of category.children) {
            await Category.create({ name: childName, parent: parentCategory._id });
            console.log(`    ✅ Created child: ${childName}`);
        }
    }
}
async function seedSettings() {
    console.log('\n⚙️  Seeding settings...');
    await Settings.create(DEFAULT_SETTINGS);
    console.log('  ✅ Created default settings');
}
// ============================================
// MAIN
// ============================================
async function main() {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/auctionhub';
    console.log('⚠️  AuctionHub Database RESET Script');
    console.log('=====================================');
    console.log(`📍 MongoDB URL: ${mongoUrl}`);
    console.log('\n🚨 WARNING: This will DELETE ALL DATA in the database!');
    // Skip confirmation if --force flag is passed
    const forceMode = process.argv.includes('--force');
    if (!forceMode) {
        const confirmed = await askConfirmation('\nAre you sure you want to continue? (y/N): ');
        if (!confirmed) {
            console.log('\n❌ Operation cancelled.');
            process.exit(0);
        }
    }
    try {
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUrl);
        console.log('  ✅ Connected successfully!');
        await dropAllCollections();
        await seedUsers();
        await seedCategories();
        await seedSettings();
        console.log('\n=====================================');
        console.log('🎉 Database reset completed!');
        console.log('\n📋 Default Credentials:');
        console.log('  Admin:');
        console.log(`    Email: ${DEFAULT_ADMIN.email}`);
        console.log(`    Password: ${DEFAULT_ADMIN.password}`);
        console.log('  Seller:');
        console.log(`    Email: ${SAMPLE_USERS[0].email}`);
        console.log(`    Password: ${SAMPLE_USERS[0].password}`);
        console.log('  Bidder:');
        console.log(`    Email: ${SAMPLE_USERS[1].email}`);
        console.log(`    Password: ${SAMPLE_USERS[1].password}`);
    }
    catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
    finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}
main();
//# sourceMappingURL=reset-database.js.map