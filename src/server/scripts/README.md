# Database Scripts

Scripts để khởi tạo và quản lý database MongoDB cho AuctionHub.

> **Lưu ý:** Xem hướng dẫn triển khai đầy đủ tại [README.md](../../../README.md) ở thư mục gốc.

## Scripts

### 1. Seed Database

Khởi tạo database với dữ liệu ban đầu. Script này **không xóa dữ liệu cũ**, chỉ thêm dữ liệu nếu chưa tồn tại.

```bash
# Từ thư mục server
npm run db:seed

# Hoặc chạy trực tiếp
npx tsx scripts/seed-database.ts
```

### 2. Reset Database

**⚠️ NGUY HIỂM**: Script này sẽ **XÓA TẤT CẢ DỮ LIỆU** và khởi tạo lại từ đầu.

```bash
# Chạy với xác nhận
npm run db:reset

# Chạy không cần xác nhận (cho CI/CD)
npm run db:reset:force
```

## Dữ liệu được tạo

### Users

| Role   | Email                 | Password   |
| ------ | --------------------- | ---------- |
| Admin  | admin@auctionhub.com  | Admin@123  |
| Seller | seller@auctionhub.com | Seller@123 |
| Bidder | bidder@auctionhub.com | Bidder@123 |

### Categories

| Parent                   | Children                                              |
| ------------------------ | ----------------------------------------------------- |
| Điện tử                  | Điện thoại, Laptop, Máy tính bảng, Phụ kiện điện tử   |
| Thời trang               | Quần áo nam, Quần áo nữ, Giày dép, Túi xách           |
| Đồ gia dụng              | Nội thất, Thiết bị nhà bếp, Đồ trang trí              |
| Xe cộ                    | Ô tô, Xe máy, Xe đạp, Phụ tùng                        |
| Sưu tầm                  | Đồ cổ, Tem, Tiền xu, Tranh nghệ thuật                 |
| Thể thao                 | Dụng cụ thể thao, Đồ outdoor, Quần áo thể thao        |
| Sách & Văn phòng phẩm    | Sách, Văn phòng phẩm, Đồ dùng học tập                 |
| Khác                     | -                                                     |

### Settings

| Setting          | Value | Mô tả                                    |
| ---------------- | ----- | ---------------------------------------- |
| triggerMinutes   | 5     | Tự động gia hạn khi có bid trong 5 phút cuối |
| extensionMinutes | 10    | Gia hạn thêm 10 phút                     |

## Tùy chỉnh dữ liệu

Bạn có thể chỉnh sửa dữ liệu mẫu trong các file:

- `seed-database.ts` - Thêm/sửa users, categories, settings
- `reset-database.ts` - Giống seed nhưng xóa hết trước khi tạo mới

### Thêm user mới

```typescript
const SAMPLE_USERS = [
  // ... existing users
  {
    email: 'newuser@example.com',
    password: 'Password@123',
    firstName: 'New',
    lastName: 'User',
    address: 'Address, Vietnam',
    role: ROLES.Bidder, // hoặc ROLES.Seller, ROLES.Admin
    isActive: true,
    isVerified: true,
    provider: EMAIL_PROVIDER.Email,
  },
]
```

### Thêm category mới

```typescript
const CATEGORIES = [
  // ... existing categories
  {
    name: 'Category mới',
    children: ['Child 1', 'Child 2', 'Child 3'],
  },
]
```
