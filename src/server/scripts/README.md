# Database Scripts

Scripts để khởi tạo database MongoDB cho Bidify.

> **Lưu ý:** Xem hướng dẫn triển khai đầy đủ tại [README.md](../../../README.md) ở thư mục gốc.

## Scripts

### Seed Database

Khởi tạo database với đầy đủ dữ liệu demo. Script này sẽ **xóa toàn bộ dữ liệu cũ** và tạo mới từ đầu.

```bash
# Từ thư mục server
npm run db:seed

# Hoặc chạy trực tiếp
npx tsx scripts/seed-database.ts
```

## Dữ liệu được tạo

### Users (10 tài khoản)

| Role   | Email                | Password    |
| ------ | -------------------- | ----------- |
| Admin  | admin@bidify.com     | password123 |
| Seller | seller1@bidify.com   | password123 |
| Seller | seller2@bidify.com   | password123 |
| Bidder | bidder1@bidify.com   | password123 |
| Bidder | bidder2@bidify.com   | password123 |
| Bidder | bidder3@bidify.com   | password123 |
| Bidder | bidder4@bidify.com   | password123 |
| Bidder | newuser@bidify.com   | password123 |
| Bidder | inactive@bidify.com  | password123 |
| Bidder | google.user@gmail.com | (Google OAuth) |

### Categories (28 danh mục)

| Parent                | Children                                            |
| --------------------- | --------------------------------------------------- |
| Dien tu               | Dien thoai, Laptop, May tinh bang, Phu kien dien tu |
| Thoi trang            | Quan ao nam, Quan ao nu, Giay dep, Dong ho, Tui xach |
| Do gia dung           | Noi that, Thiet bi nha bep, Do trang tri            |
| Xe co                 | O to, Xe may, Xe dap, Phu tung                      |
| Suu tam               | Do co, Tem, Tien xu, Tranh nghe thuat               |
| The thao              | -                                                   |
| Sach & Van phong pham | -                                                   |
| Khac                  | -                                                   |

### Products (10 sản phẩm)

- 5 sản phẩm đang đấu giá (active)
- 2 sản phẩm đã kết thúc (ended, có orders)
- 1 sản phẩm sắp diễn ra (upcoming)
- 2 sản phẩm khác

### Các dữ liệu khác

| Loại      | Số lượng |
| --------- | -------- |
| Bids      | 11       |
| Orders    | 2        |
| Questions | 10       |
| Reviews   | 10       |
| Settings  | 1        |

### Settings

| Setting          | Value | Mô tả                                        |
| ---------------- | ----- | -------------------------------------------- |
| triggerMinutes   | 5     | Tự động gia hạn khi có bid trong 5 phút cuối |
| extensionMinutes | 10    | Gia hạn thêm 10 phút                         |

## Tùy chỉnh dữ liệu

Bạn có thể chỉnh sửa dữ liệu mẫu trong file `seed-database.ts`.

### Thêm user mới

```typescript
const usersData = [
  // ... existing users
  {
    email: 'newuser@example.com',
    password: hashedPassword,
    provider: EMAIL_PROVIDER.Email,
    firstName: 'New',
    lastName: 'User',
    address: 'Address, Vietnam',
    role: ROLES.Bidder, // hoặc ROLES.Seller, ROLES.Admin
    isActive: true,
    isVerified: true,
  },
]
```

### Thêm category mới

```typescript
const parentCategoriesData = [
  // ... existing categories
  { name: 'Category moi' },
]

const childCategoriesData = [
  // ... existing child categories
  { name: 'Child category', parent: parentCategories[index]._id },
]
```

### Thêm product mới

```typescript
const productsData = [
  // ... existing products
  {
    name: 'Ten san pham',
    description: 'Mo ta san pham',
    category: childCategories[0]._id,
    seller: seller1._id,
    images: ['https://example.com/image.jpg'],
    startPrice: 1000000,
    priceStep: 100000,
    currentPrice: 1000000,
    buyNowPrice: 2000000,
    startTime: new Date(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    bidCount: 0,
  },
]
```
