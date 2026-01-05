# AuctionHub - Online Auction Platform

Web Application Programming - Final Project

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Hướng dẫn triển khai](#hướng-dẫn-triển-khai)
    - [1. Database (MongoDB)](#1-database-mongodb)
    - [2. Backend (Express.js)](#2-backend-expressjs)
    - [3. Frontend (React + Webpack)](#3-frontend-react--webpack)
- [Tài khoản mặc định](#tài-khoản-mặc-định)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

## Giới thiệu

AuctionHub là nền tảng đấu giá trực tuyến với các tính năng:

- Đăng ký/Đăng nhập với xác thực OTP qua email
- Đấu giá sản phẩm với hệ thống auto-bid
- Tự động gia hạn thời gian đấu giá
- Mua ngay (Buy Now)
- Quản lý đơn hàng sau đấu giá
- Hệ thống đánh giá người dùng
- Thông báo qua email

## Yêu cầu hệ thống

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **MongoDB**: >= 6.x (local hoặc MongoDB Atlas)
- **Git**: >= 2.x

## Cấu trúc dự án

```
Bidify/
├── src/
│   ├── client/          # Frontend (React + Webpack + TypeScript)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── contexts/
│   │   │   └── hooks/
│   │   ├── package.json
│   │
│   └── server/          # Backend (Express.js + TypeScript)
│       ├── src/
│       │   ├── Routes/
│       │   ├── Models/
│       │   ├── Services/
│       │   └── Config/
│       ├── scripts/     # Database scripts
│       ├── package.json
│       └── .env.example
│
└── package.json         # Root package.json (chạy cả client và server)
```

## Hướng dẫn triển khai

### 1. Database (MongoDB)

#### MongoDB Atlas

1. Truy cập [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo tài khoản và cluster miễn phí
3. Tạo database user với password
4. Whitelist IP address (hoặc cho phép tất cả: `0.0.0.0/0`)
5. Lấy connection string:
    ```
    mongodb+srv://<username>:<password>@<cluster>.mongodb.net/auctionhub?retryWrites=true&w=majority
    ```

#### Khởi tạo dữ liệu mẫu

```bash
cd src/server

# Cài đặt dependencies
npm install

# Cấu hình .env (xem phần Backend)
cp .env.example .env
# Chỉnh sửa MONGO_URL trong .env

# Khởi tạo database với dữ liệu mẫu
npm run db:seed

# Hoặc reset hoàn toàn database (XÓA TẤT CẢ DỮ LIỆU)
npm run db:reset
```

---

### 2. Backend (Express.js)

#### Bước 1: Cài đặt dependencies

```bash
cd src/server
npm install
```

#### Bước 2: Cấu hình Environment

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Application
APP_NAME=AuctionHub
PORT=3000
BASE_API_URL=api
CLIENT_URL=http://localhost:8080

# MongoDB
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/auctionhub?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_LIFE=7d

# reCAPTCHA secret key
RECAPTCHA_SECRET_KEY=

# SMTP Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=AuctionHub <noreply@auctionhub.com>
```

**Lưu ý về Gmail App Password:**

1. Bật 2-Factor Authentication cho tài khoản Google
2. Truy cập: https://myaccount.google.com/apppasswords
3. Tạo App Password mới cho "Mail"
4. Sử dụng password 16 ký tự được tạo

**Lưu ý về Google reCAPTCHA v3:**

1. Truy cập
   [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Đăng nhập bằng tài khoản Google
3. Nhấn **"+ Create"** để tạo site mới
4. Điền thông tin:
    - **Label**: Tên dự án (VD: "AuctionHub")
    - **reCAPTCHA type**: Chọn **reCAPTCHA v3** (xác thực ẩn, không cần checkbox)
    - **Domains**: Thêm domain của bạn:
        - `localhost` (cho development)
        - Domain production (VD: `auctionhub.com`)
5. Nhấn **Submit**
6. Sau khi tạo xong, bạn sẽ nhận được 2 key:
    - **Site Key**: Dùng cho Frontend (`REACT_APP_RECAPTCHA_SITE_KEY`)
    - **Secret Key**: Dùng cho Backend (`RECAPTCHA_SECRET_KEY`)

> **Lưu ý**: reCAPTCHA v3 hoạt động ẩn, không hiển thị checkbox. Nó tự động đánh giá hành vi người dùng và trả về điểm số (0.0 - 1.0). Điểm càng cao = càng có khả năng là người thật.

#### Bước 3: Khởi tạo Database

```bash
npm run db:seed
```

#### Bước 4: Chạy Backend

```bash
npm run start
```

Backend sẽ chạy tại: `http://localhost:3000`

---

### 3. Frontend (React + Webpack)

#### Bước 1: Cài đặt dependencies

```bash
cd src/client
npm install
```

#### Bước 2: Cấu hình Environment

Tạo file `.env`:

```env
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_RECAPTCHA_SITE_KEY=
```

#### Bước 3: Chạy Frontend

```bash
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:8080`

---

## Tài khoản mặc định

Sau khi chạy `npm run db:seed`:

| Role   | Email                 | Password   |
| ------ | --------------------- | ---------- |
| Admin  | admin@auctionhub.com  | Admin@123  |
| Seller | seller@auctionhub.com | Seller@123 |
| Bidder | bidder@auctionhub.com | Bidder@123 |

---

## API Endpoints

### Authentication

| Method | Endpoint                  | Mô tả              |
| ------ | ------------------------- | ------------------ |
| POST   | /api/auth/register        | Đăng ký tài khoản  |
| POST   | /api/auth/verify-otp      | Xác thực OTP       |
| POST   | /api/auth/login           | Đăng nhập          |
| POST   | /api/auth/forgot-password | Quên mật khẩu      |
| POST   | /api/auth/reset-password  | Đặt lại mật khẩu   |
| GET    | /api/auth/me              | Lấy thông tin user |

### Products

| Method | Endpoint             | Mô tả                  |
| ------ | -------------------- | ---------------------- |
| GET    | /api/products        | Lấy danh sách sản phẩm |
| GET    | /api/products/:id    | Lấy chi tiết sản phẩm  |
| POST   | /api/products        | Tạo sản phẩm (Seller)  |
| PUT    | /api/products/:id    | Cập nhật sản phẩm      |
| DELETE | /api/products/:id    | Xóa sản phẩm           |
| GET    | /api/products/search | Tìm kiếm sản phẩm      |

### Bids

| Method | Endpoint              | Mô tả           |
| ------ | --------------------- | --------------- |
| POST   | /api/bids             | Đặt giá         |
| GET    | /api/bids/product/:id | Lịch sử đấu giá |
| POST   | /api/bids/buy-now     | Mua ngay        |

### Categories

| Method | Endpoint        | Mô tả               |
| ------ | --------------- | ------------------- |
| GET    | /api/categories | Lấy tất cả danh mục |

### Orders

| Method | Endpoint        | Mô tả                  |
| ------ | --------------- | ---------------------- |
| GET    | /api/orders     | Lấy danh sách đơn hàng |
| GET    | /api/orders/:id | Chi tiết đơn hàng      |
| PUT    | /api/orders/:id | Cập nhật trạng thái    |

---

## Troubleshooting

### Lỗi kết nối MongoDB

```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Giải pháp:** Đảm bảo MongoDB đang chạy hoặc kiểm tra lại `MONGO_URL` trong
`.env`

### Lỗi CORS

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Giải pháp:** Kiểm tra `CLIENT_URL` trong `.env` của backend phải khớp với URL
của frontend

### Lỗi gửi email

```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Giải pháp:** Sử dụng App Password thay vì password thường. Xem hướng dẫn ở
phần Backend.

### Port đã được sử dụng

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Giải pháp:**

```bash
# Tìm process đang sử dụng port
lsof -i :3000

# Kill process
kill -9 <PID>

# Hoặc đổi port trong .env
PORT=3001
```

### Lỗi TypeScript

```
Cannot find module '@/...'
```

**Giải pháp:** Đảm bảo đã chạy `npm install` và kiểm tra `tsconfig.json`

---

## Scripts có sẵn

### Backend (src/server/)

```bash
npm run start
npm run db:seed
npm run db:reset
```

### Frontend (src/client/)

```bash
npm run dev
```

---

## License

MIT License
