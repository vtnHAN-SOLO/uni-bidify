# Online Auction System - Context Documentation

## Project Overview

Full-stack online auction platform built with MERN stack (MongoDB, Express.js,
React.js, Node.js). The system supports three user roles: Guest, Bidder, Seller,
and Administrator with comprehensive auction management features.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt/scrypt password hashing
- **Email**: Nodemailer for transaction notifications
- **Validation**: Email OTP verification, reCAPTCHA

## Key Features by User Role

### Guest (Unauthenticated)

- Browse products by category (2-level hierarchy)
- View homepage: Top 5 ending soon, Top 5 most bids, Top 5 highest price
- Full-text search with pagination and sorting
- View product details with bid history (masked usernames: \*\*\*\*Khoa)
- Register with email OTP verification + reCAPTCHA

### Bidder

- Add products to watch list
- Place bids (requires 80%+ rating or no rating with seller permission)
- View bid history (own + product)
- Ask questions to seller
- Manage profile: update info, change password, view ratings
- View participating/won auctions
- Rate seller after winning (+1/-1 with comment)

### Seller

- Post products with full details (min 3 images, WYSIWYG description)
- Append descriptions (no replacement, with timestamp annotations)
- Reject bidder bids (bidder blocked from product)
- Answer bidder questions
- Manage posted products & completed auctions
- Rate winning bidder
- Cancel transactions (-1 rating to buyer with "Không thanh toán" comment)
- Request seller upgrade (7-day upgrade process)

### Administrator

- Manage categories (CRUD, cannot delete if has products)
- Remove products
- Manage users
- Review and approve bidder→seller upgrade requests

## API Routes Structure

### Authentication Routes (`/api/auth`)

- `POST /register` - Register new user with OTP
- `POST /verify-otp` - Verify email OTP
- `POST /login` - Login (returns JWT)
- `POST /forgot-password` - Send reset OTP
- `POST /reset-password` - Reset password with OTP

### Product Routes (`/api/products`)

- `GET /` - List products with filters/pagination
- `GET /search` - Full-text search
- `GET /:id` - Product details
- `POST /` - Create product (seller only)
- `PUT /:id/description` - Append description
- `DELETE /:id` - Remove product (admin/seller)
- `GET /ending-soon` - Top 5 ending soon
- `GET /most-bids` - Top 5 most bids
- `GET /highest-price` - Top 5 highest price

### Bid Routes (`/api/bids`)

- `POST /` - Place bid (manual or auto-bid)
- `GET /product/:productId` - Product bid history
- `GET /user/participating` - User's active bids
- `GET /user/won` - User's won auctions
- `DELETE /:bidId` - Reject bid (seller only)

### Category Routes (`/api/categories`)

- `GET /` - List all categories (with hierarchy)
- `POST /` - Create category (admin)
- `PUT /:id` - Update category (admin)
- `DELETE /:id` - Delete category (admin, if no products)

### User Routes (`/api/users`)

- `GET /profile` - Get current user profile
- `PUT /profile` - Update profile
- `PUT /password` - Change password
- `POST /request-seller` - Request seller upgrade
- `GET /ratings` - Get user ratings

### Question Routes (`/api/questions`)

- `POST /` - Ask seller question
- `PUT /:id/answer` - Answer question (seller)

### Order Routes (`/api/orders`)

- `GET /:productId` - Get order details
- `PUT /:orderId/payment` - Upload payment proof
- `PUT /:orderId/shipping` - Confirm shipping (seller)
- `PUT /:orderId/received` - Confirm receipt (buyer)
- `PUT /:orderId/cancel` - Cancel order
- `POST /:orderId/rate` - Rate transaction

### Admin Routes (`/api/admin`)

- `GET /upgrade-requests` - List seller upgrade requests
- `PUT /upgrade-requests/:id` - Approve/reject request
- `GET /users` - List all users
- `DELETE /products/:id` - Remove product

## Business Logic Rules

### Bidding System

- Choose ONE implementation: Manual bidding OR Auto-bidding (not both)
- **Manual Bidding**: User must manually enter each bid
- **Auto-Bidding**: User sets max price, system auto-increments to beat others
- Bid must be: currentPrice + stepPrice
- If two bidders have same max auto-bid, first bidder wins
- System validates bidder rating: (positive / total) >= 80%
- Sellers can allow unrated bidders to participate

### Auto-Extension Logic

- If bid placed within 5 minutes before end, extend by 10 minutes
- Parameters (5min, 10min) are configurable by admin globally
- Check this on every new bid placement

### Product Freshness

- Products posted within N minutes show distinct UI indicator
- N is configurable (e.g., 60 minutes)

### Seller Rejection

- Seller can reject any bidder from their product
- If rejected bidder is current highest, product goes to 2nd highest bidder
- Rejected bidder cannot bid on this product anymore

### Rating System

- Rating = positive / (positive + negative) \* 100%
- Example: 8 positive, 2 negative = 8/10 = 80%
- Bidders need 80%+ rating to bid (or 0 ratings with seller permission)
- Users can update their ratings (+/- changes)

### Post-Auction Workflow (4 Steps)

1. **Buyer**: Provide payment proof + shipping address
2. **Seller**: Confirm payment received + shipping invoice
3. **Buyer**: Confirm item received
4. **Both**: Rate each other (+1/-1 with comment)

- Seller can cancel anytime → auto -1 rating to buyer
- Chat interface available between buyer/seller during process

## Email Notifications

System sends emails for:

- Successful bid (to seller, new bidder, previous highest bidder)
- Bidder rejected (to bidder)
- Auction ended without winner (to seller)
- Auction ended with winner (to seller + winner)
- New question posted (to seller with product link)
- Question answered (to all bidders + questioners)

Email config in `server/config/email.js` using Nodemailer

## Important Implementation Notes

### Security

- **Password hashing**: Use bcrypt or scrypt (min 10 rounds for bcrypt)
- **JWT tokens**: Store in httpOnly cookies, expire in 24h
- **Email verification**: Must verify OTP before account activation
- **reCAPTCHA**: Validate on registration endpoint
- **Input validation**: Sanitize all user inputs to prevent injection

### Search Implementation

- Use MongoDB text indexes for full-text search
- Create text index on: `name`, `description` fields
- Support search by name AND/OR category
- Sort options: endDate ASC, currentPrice ASC

### Image Upload

- Store images in `/public/uploads/products/`
- Use multer middleware for file uploads
- Validate: min 3 images, max 10MB per image
- Accepted formats: JPG, PNG, WebP

### WYSIWYG Editor

- Use Quill.js or TinyMCE on frontend
- Sanitize HTML content on backend (use DOMPurify or sanitize-html)
- When appending description, add timestamp marker:

## Key Features by User Role

### Guest (Unauthenticated)

- Browse products by category (2-level hierarchy)
- View homepage: Top 5 ending soon, Top 5 most bids, Top 5 highest price
- Full-text search with pagination and sorting
- View product details with bid history (masked usernames: \*\*\*\*Khoa)
- Register with email OTP verification + reCAPTCHA

### Bidder

- Add products to watch list
- Place bids (requires 80%+ rating or no rating with seller permission)
- View bid history (own + product)
- Ask questions to seller
- Manage profile: update info, change password, view ratings
- View participating/won auctions
- Rate seller after winning (+1/-1 with comment)

### Seller

- Post products with full details (min 3 images, WYSIWYG description)
- Append descriptions (no replacement, with timestamp annotations)
- Reject bidder bids (bidder blocked from product)
- Answer bidder questions
- Manage posted products & completed auctions
- Rate winning bidder
- Cancel transactions (-1 rating to buyer with "Không thanh toán" comment)
- Request seller upgrade (7-day upgrade process)

### Administrator

- Manage categories (CRUD, cannot delete if has products)
- Remove products
- Manage users
- Review and approve bidder→seller upgrade requests

## API Routes Structure

### Authentication Routes (`/api/auth`)

- `POST /register` - Register new user with OTP
- `POST /verify-otp` - Verify email OTP
- `POST /login` - Login (returns JWT)
- `POST /forgot-password` - Send reset OTP
- `POST /reset-password` - Reset password with OTP

### Product Routes (`/api/products`)

- `GET /` - List products with filters/pagination
- `GET /search` - Full-text search
- `GET /:id` - Product details
- `POST /` - Create product (seller only)
- `PUT /:id/description` - Append description
- `DELETE /:id` - Remove product (admin/seller)
- `GET /ending-soon` - Top 5 ending soon
- `GET /most-bids` - Top 5 most bids
- `GET /highest-price` - Top 5 highest price

### Bid Routes (`/api/bids`)

- `POST /` - Place bid (manual or auto-bid)
- `GET /product/:productId` - Product bid history
- `GET /user/participating` - User's active bids
- `GET /user/won` - User's won auctions
- `DELETE /:bidId` - Reject bid (seller only)

### Category Routes (`/api/categories`)

- `GET /` - List all categories (with hierarchy)
- `POST /` - Create category (admin)
- `PUT /:id` - Update category (admin)
- `DELETE /:id` - Delete category (admin, if no products)

### User Routes (`/api/users`)

- `GET /profile` - Get current user profile
- `PUT /profile` - Update profile
- `PUT /password` - Change password
- `POST /request-seller` - Request seller upgrade
- `GET /ratings` - Get user ratings

### Question Routes (`/api/questions`)

- `POST /` - Ask seller question
- `PUT /:id/answer` - Answer question (seller)

### Order Routes (`/api/orders`)

- `GET /:productId` - Get order details
- `PUT /:orderId/payment` - Upload payment proof
- `PUT /:orderId/shipping` - Confirm shipping (seller)
- `PUT /:orderId/received` - Confirm receipt (buyer)
- `PUT /:orderId/cancel` - Cancel order
- `POST /:orderId/rate` - Rate transaction

### Admin Routes (`/api/admin`)

- `GET /upgrade-requests` - List seller upgrade requests
- `PUT /upgrade-requests/:id` - Approve/reject request
- `GET /users` - List all users
- `DELETE /products/:id` - Remove product

## Business Logic Rules

### Bidding System

- Implementation: Auto-bidding (not both)

- **Auto-Bidding**: User sets max price, system auto-increments to beat others
- Bid must be: currentPrice + stepPrice
- If two bidders have same max auto-bid, first bidder wins
- System validates bidder rating: (positive / total) >= 80%
- Sellers can allow unrated bidders to participate

### Auto-Extension Logic

- If bid placed within 5 minutes before end, extend by 10 minutes
- Parameters (5min, 10min) are configurable by admin globally
- Check this on every new bid placement

### Product Freshness

- Products posted within N minutes show distinct UI indicator
- N is configurable (e.g., 60 minutes)

### Seller Rejection

- Seller can reject any bidder from their product
- If rejected bidder is current highest, product goes to 2nd highest bidder
- Rejected bidder cannot bid on this product anymore

### Rating System

- Rating = positive / (positive + negative) \* 100%
- Example: 8 positive, 2 negative = 8/10 = 80%
- Bidders need 80%+ rating to bid (or 0 ratings with seller permission)
- Users can update their ratings (+/- changes)

### Post-Auction Workflow (4 Steps)

1. **Buyer**: Provide payment proof + shipping address
2. **Seller**: Confirm payment received + shipping invoice
3. **Buyer**: Confirm item received
4. **Both**: Rate each other (+1/-1 with comment)

- Seller can cancel anytime → auto -1 rating to buyer
- Chat interface available between buyer/seller during process

## Email Notifications

System sends emails for:

- Successful bid (to seller, new bidder, previous highest bidder)
- Bidder rejected (to bidder)
- Auction ended without winner (to seller)
- Auction ended with winner (to seller + winner)
- New question posted (to seller with product link)
- Question answered (to all bidders + questioners)

Email config in `server/config/email.js` using Nodemailer

## Important Implementation Notes

### Security

- **Password hashing**: Use bcrypt or scrypt (min 10 rounds for bcrypt)
- **JWT tokens**: Store in httpOnly cookies, expire in 24h
- **Email verification**: Must verify OTP before account activation
- **reCAPTCHA**: Validate on registration endpoint
- **Input validation**: Sanitize all user inputs to prevent injection

### Search Implementation

- Use MongoDB text indexes for full-text search
- Create text index on: `name`, `description` fields
- Support search by name AND/OR category
- Sort options: endDate ASC, currentPrice ASC

### Image Upload

- Store images in `/public/uploads/products/`
- Use multer middleware for file uploads
- Validate: min 3 images, max 10MB per image
- Accepted formats: JPG, PNG, WebP

### WYSIWYG Editor

- Use Quill.js or TinyMCE on frontend
- Sanitize HTML content on backend (use DOMPurify or sanitize-html)
- When appending description, add timestamp marker:

✏️ 31/10/2025

New content here

### Username Masking

- In public bid history, mask username: "NguyenVanA" → "\*\*\*\*VanA"
- Keep last 3-4 characters visible
- Full name visible only to: seller, bidder themselves, admin

### Relative Time Display

- If endDate < 3 days: show "3 ngày nữa", "10 phút nữa"
- Use libraries like `moment.js` or `date-fns`

### Pagination

- Default page size: 20 items
- Support query params: `?page=1&limit=20`
- Return metadata: `{ total, page, limit, totalPages }`
