# Audit BE Fields vs FE Usage

Ngày audit: 2026-05-13

Phạm vi: các endpoint mà `frontend/src/lib/api/*` đang gọi. Source of truth là static contract từ Go routes, response helpers, domain structs/DTO và các `gin.H` response trong handler. Không gọi live API.

## Tổng Quan Mismatch Quan Trọng

| Mức | Vấn đề | Nguồn | Tác động |
| --- | --- | --- | --- |
| P0 | `GET /api/v1/admin/users` trả `UserInfo` không có `is_active`, nhưng admin users UI đọc `user.is_active`. | `backend/internal/server/admin_user.go`, `frontend/src/app/admin/users/page.tsx` | Trạng thái hoạt động có thể hiển thị sai và nút khóa/mở khóa xử lý dựa trên `undefined`. |
| P1 | Nhiều FE API client dùng `any` cho response có contract rõ: books search/admin, recommendations, orders, admin analytics/users. | `frontend/src/lib/api/*` | FE khó bắt mismatch như `price`, `stock_quantity`, `created_at`, `status` bằng TypeScript. |
| P1 | Admin book form/list chưa dùng hoặc chưa gửi nhiều field BE có hỗ trợ: `publisher`, `publish_year`, `series`, `tags`, `images`, `created_at`. | `BookDetail`, `frontend/src/app/admin/books/page.tsx` | Khi admin sửa sách có thể làm rơi dữ liệu hoặc không quản trị được đủ trường. |
| P1 | `categoriesApi` khai báo local `Category` thiếu `created_at`, `updated_at`, trong khi `frontend/src/lib/types/index.ts` có type đầy đủ hơn. | `frontend/src/lib/api/categories.ts` | Category data trả đủ nhưng type local làm mất field. |
| P1 | Các type response dạng `BookListResponse`, `CategoryListResponse`, `OrderListResponse`, `UserListResponse`, `RecommendationResponse` đang mô tả envelope cũ/nested (`books`, `categories`, `orders`, `users`), trong khi BE dùng `{ data, total, page, page_size }`. | `frontend/src/lib/types/index.ts`, `backend/internal/server/response.go` | Dễ dùng nhầm type stale khi mở rộng. |
| P2 | `CartItem.image_url`, `Address.id`, `Address.user_id`, `Order.id` tồn tại trong TS nhưng BE không expose. | `frontend/src/lib/types/index.ts`, `backend/internal/domain/model.go` | Type FE rộng hơn contract thật; không lỗi hiện tại vì UI ít dùng các field này. |
| P2 | Endpoint series/recommendations có field xếp hạng như `score`, `total_sold`, `view_count`, `volume_order`, nhưng không phải chỗ nào UI cũng hiển thị. | `recommendations.ts`, book detail/home/category pages | Chấp nhận được nếu chỉ dùng để sort, nhưng nên quyết định rõ field nào là user-facing. |

## Shared BE Response Contract

| Helper | Envelope JSON |
| --- | --- |
| `respondOK`, `respondCreated` | `{ "data": <payload> }` |
| `respondPaginated` | `{ "data": <items>, "total": <number>, "page": <number>, "page_size": <number> }` |
| `respondError` | `{ "error": "<message>" }` |

## BE Field Contracts

### Auth / User

| Type | JSON fields BE trả |
| --- | --- |
| `UserInfo` | `alias_id`, `full_name`, `email`, `phone`, `role` |
| `User` | `alias_id`, `full_name`, `email`, `phone`, `role`, `is_active`, `created_at` |

### Catalog

| Type | JSON fields BE trả |
| --- | --- |
| `BookImage` | `is_primary`, `alt`, `url` |
| `BookSeries` | `series_id`, `series_name`, `sequence_no` |
| `BookAuthor` | `author_id`, `slug`, `author_name` |
| `BookTag` | `tag_id`, `tag_name` |
| `BookPricing` | `price` |
| `BookCategory` | `category_id` |
| `Book` | `id`, `name`, `short_description`, `detail_description`, `product_status`, `publisher`, `publish_year`, `pricing`, `category`, `images`, `series`, `authors`, `tags`, `created_at` |
| `BookDetail` | toàn bộ `Book` fields + `stock_quantity`, `price` |
| `Category` | `id`, `category_name`, `slug`, `parent_category`, `created_at`, `updated_at` |

### Commerce

| Type | JSON fields BE trả |
| --- | --- |
| `Address` | `alias_id`, `receiver_name`, `phone`, `address_line`, `ward`, `district`, `city`, `is_default`, `created_at` |
| `CartItem` | `book_id`, `name`, `price`, `quantity` |
| `CartResponse` | `items`, `total_price` |
| `OrderItem` | `book_id`, `name`, `quantity`, `unit_price` |
| `Order` | `alias_id`, `status`, `total_amount`, `note`, `created_at`, `items` |
| `OrderStatusHistory` | `alias_id`, `old_status`, `new_status`, `changed_by_admin_alias_id`, `note`, `changed_at` |
| `Shipment` | `alias_id`, `status`, `carrier`, `tracking_number`, `shipped_at`, `delivered_at`, `created_at` |

### Recommendations / Analytics

| Type | JSON fields BE trả |
| --- | --- |
| `SimilarBook` | `book_id`, `title`, `score`, `price`, `publisher`, `category`, `authors`, `images`, `cover_url` |
| `SeriesBook` | `book_id`, `title`, `volume_order`, `already_bought` |
| `BestSellerBook` | `book_id`, `title`, `total_sold`, `price`, `publisher`, `category`, `authors`, `images`, `cover_url` |
| `MostViewedBook` | `book_id`, `title`, `view_count`, `price`, `publisher`, `category`, `authors`, `images`, `cover_url` |
| `SalesSummary` | `total_orders`, `total_revenue`, `date_from`, `date_to` |

## Endpoint Inventory

### Auth API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `authApi.register` | `POST /api/v1/auth/register` | `{ data: UserInfo }`: `alias_id`, `full_name`, `email`, `phone`, `role` | typed `UserInfo` | Register form mostly uses success path, then login/navigation. | `unused but acceptable`: response fields not displayed after register. |
| `authApi.login` | `POST /api/v1/auth/login` | `{ data: { access_token, refresh_token, user: UserInfo } }` | typed `LoginResponse` | Auth store/header/profile use token + `user.full_name`, `email`, `phone`, `role`. | OK. |
| `authApi.logout` | `POST /api/v1/auth/logout` | `{ data: { message } }` | `any` | Auth store clears local state. | `missing type`; message unused acceptable. |
| `authApi.me` | `GET /api/v1/users/me` | `{ data: UserInfo }` | typed `UserInfo` | Auth store/profile/header. | OK. |
| `authApi.updateProfile` | `PUT /api/v1/users/me` | `{ data: UserInfo }` | typed `UserInfo` | Profile form updates store. | OK. |

### Books API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `booksApi.search` | `GET /api/v1/books` | paginated `BookDetail[]`: all `BookDetail` fields | returns `{ data: any[], total, page, page_size }` | Header suggestions, `/books`, category/author browse through mapping. Uses `id`, `name/title`, `authors`, `category`, `pricing.price/price`, `stock_quantity`, `images`. | `missing type`; `publisher`, `publish_year`, `series`, `tags`, `created_at`, `detail_description` generally missing UI usage in list cards. |
| `booksApi.getNewBooks` | `GET /api/v1/books/new` | `{ data: BookDetail[] }` | typed `BookDetail[]` | Home/new sections via `BookCard` mapper. | Type OK; list UI intentionally omits long description, publisher/year/series/tags. |
| `booksApi.getDetail` | `GET /api/v1/books/:id` | `{ data: BookDetail }` | typed `BookDetail` | Book detail uses title, descriptions, status, stock, price, category, authors, tags, images, series. | `missing UI usage`: `publisher`, `publish_year` are available but not surfaced clearly on detail. |
| `booksApi.getSimilar` | `GET /api/v1/books/:id/similar` | `{ data: SimilarBook[] }` | returns `any` | Mostly superseded by `recommendationsApi.similarBooks`. | `missing type`; duplicated client method. |
| `booksApi.getSeries` | `GET /api/v1/books/:id/series` | `{ data: SeriesBook[] }` | returns `any` | No strong current UI usage found. | `missing type` + `missing UI usage`. |
| `booksApi.trackView` | `POST /api/v1/books/:id/view` | `{ data: { message } }` | no response type | Book detail fire-and-forget view tracking. | Message unused acceptable. |
| `booksApi.adminList` | `GET /api/v1/admin/books` | paginated `BookDetail[]` | returns `any[]` | Admin books table/form. Uses `name`, `authors`, `pricing.price`, `stock_quantity`, `product_status`. | `missing type`; `publisher`, `publish_year`, `category`, `images`, `series`, `tags`, `created_at` not shown in admin list. |
| `booksApi.adminCreate` | `POST /api/v1/admin/books` | `{ data: BookDetail }` | `any` | Admin form sends subset. | `missing type`; admin UI does not collect `publisher`, `publish_year`, `series`, `tags`, `images`. |
| `booksApi.adminUpdate` | `PUT /api/v1/admin/books/:id` | `{ data: BookDetail }` | `any` | Admin form sends subset. | `missing type`; risk of dropping unsupported-in-form fields. |
| `booksApi.adminDelete` | `DELETE /api/v1/admin/books/:id` | `{ data: { message } }` | `any` | Admin table refreshes. | `missing type`; message unused acceptable. |
| `booksApi.adminUpdateStock` | `PATCH /api/v1/admin/books/:id/stock` | `{ data: { stock_quantity } }` | `any` | Admin form/table refresh. | `missing type`. |

### Categories API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `categoriesApi.list` | `GET /api/v1/categories` | paginated `Category[]`: `id`, `category_name`, `slug`, `parent_category`, `created_at`, `updated_at` | local `Category` only has `id`, `category_name`, `slug`, `parent_category` | Header/category pills/category pages use `id`, `category_name`, `slug`. | `missing type`: `created_at`, `updated_at`; public UI omission acceptable. |
| `categoriesApi.adminList` | `GET /api/v1/admin/categories` | paginated `Category[]` | `any[]` | Admin categories table uses `category_name`, `slug`, `parent_category`. | `missing type`; admin UI does not show `created_at`, `updated_at`. |
| `categoriesApi.adminCreate` | `POST /api/v1/admin/categories` | `{ data: Category }` | `any` | Admin category form. | `missing type`; returned timestamps unused. |
| `categoriesApi.adminUpdate` | `PUT /api/v1/admin/categories/:id` | `{ data: Category }` | `any` | Admin category form/table refresh. | `missing type`; returned timestamps unused. |
| `categoriesApi.adminDelete` | `DELETE /api/v1/admin/categories/:id` | `{ data: { message } }` | `any` | Admin table refreshes. | `missing type`; message unused acceptable. |

### Recommendations API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `recommendationsApi.similarBooks` | `GET /api/v1/books/:id/similar` | `{ data: SimilarBook[] }` with `book_id`, `title`, `score`, `price`, `publisher`, `category`, `authors`, `images`, `cover_url` | normalized by `asArray`, no Axios generic | Book detail related books use title/id, price, authors, category, images/cover. | `missing type`; `score`, `publisher` unused. `score` can be internal ranking. |
| `recommendationsApi.seriesBooks` | `GET /api/v1/books/:id/series` | `{ data: SeriesBook[] }`: `book_id`, `title`, `volume_order`, `already_bought` | normalized by `asArray`, no Axios generic | No active detail UI usage found. | `missing type` + `missing UI usage`. |
| `recommendationsApi.bestSellers` | `GET /api/v1/best-sellers` | `{ data: BestSellerBook[] }` | normalized by `asArray`, no Axios generic | Home/ranking pages use `title`, `total_sold`, card mapper uses price/authors/images. | `missing type`; `publisher` often unused. |
| `recommendationsApi.topDailyViewed` | `GET /api/v1/most-viewed/daily` | `{ data: MostViewedBook[] }` | normalized by `asArray`, no Axios generic | Ranking pages use `title`, `view_count`, card mapper fields. | `missing type`; `publisher` often unused. |
| `recommendationsApi.topMostViewed30Days` | `GET /api/v1/most-viewed/30days` | `{ data: MostViewedBook[] }` | normalized by `asArray`, no Axios generic | Ranking pages use `title`, `view_count`, card mapper fields. | `missing type`; `publisher` often unused. |

### Cart API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `cartApi.get` | `GET /api/v1/cart` | `{ data: CartResponse }`: `items`, `total_price`; item fields `book_id`, `name`, `price`, `quantity` | typed `CartResponse` | Cart store/page use items and totals. | OK. TS `CartItem.image_url` is extra and not returned by BE. |
| `cartApi.add` | `POST /api/v1/cart` | `{ data: { message } }` | `any` | Store refreshes cart after mutation. | `missing type`; message unused acceptable. |
| `cartApi.update` | `PUT /api/v1/cart/:bookId` | `{ data: { message } }` | `any` | Store refreshes cart after mutation. | `missing type`; message unused acceptable. |
| `cartApi.remove` | `DELETE /api/v1/cart/:bookId` | `{ data: { message } }` | `any` | Store refreshes cart after mutation. | `missing type`; message unused acceptable. |

### Addresses API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `addressesApi.list` | `GET /api/v1/users/addresses` | `{ data: Address[] }`: `alias_id`, `receiver_name`, `phone`, `address_line`, `ward`, `district`, `city`, `is_default`, `created_at` | typed `Address[]` | Checkout/profile address selection uses receiver/contact/address/default fields. | OK. TS has extra `id`, `user_id` not exposed by BE. |
| `addressesApi.create` | `POST /api/v1/users/addresses` | `{ data: Address }` | typed `Address` | Checkout/profile address form. | OK. Returned `created_at` likely not displayed. |

### Orders API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `ordersApi.checkout` | `POST /api/v1/orders/checkout` | `{ data: Order }`: `alias_id`, `status`, `total_amount`, `note`, `created_at`, `items` | `any` | Checkout uses `alias_id` for success redirect. | `missing type`. |
| `ordersApi.buyNow` | `POST /api/v1/orders/buy-now` | `{ data: { session_id } }` | typed `{ session_id: string }` | Buy-now flow/session. | OK. |
| `ordersApi.history` | `GET /api/v1/orders` | `{ data: Order[] }` | `any[]` | User orders list uses `alias_id`, `status`, `created_at`, `total_amount`. | `missing type`; item details not used in list. |
| `ordersApi.detail` | `GET /api/v1/orders/:id` | `{ data: Order }` | `any` | User order detail uses order fields + items. | `missing type`. |
| `ordersApi.shipment` | `GET /api/v1/orders/:id/shipment` | `{ data: Shipment }` | typed `Shipment` | User order detail uses `status`, `carrier`, `tracking_number`. | Type OK; `created_at`, `shipped_at`, `delivered_at` partly unused in customer UI. |
| `ordersApi.adminList` | `GET /api/v1/admin/orders` | paginated `Order[]` | `any[]` | Admin order list uses `alias_id`, `status`, `items.length`, `total_amount`, `created_at`. | `missing type`. |
| `ordersApi.adminGet` | `GET /api/v1/admin/orders/:id` | `{ data: Order }` | `any` | Admin order detail uses order fields and items. | `missing type`. |
| `ordersApi.adminUpdateStatus` | `PATCH /api/v1/admin/orders/:id/status` | `{ data: { status } }` | `any` | Admin status update. | `missing type`. |
| `ordersApi.adminHistory` | `GET /api/v1/admin/orders/:id/history` | `{ data: OrderStatusHistory[] }` | `any` | Admin order detail shows old/new status, note, changed time. | `missing type`; `changed_by_admin_alias_id` not displayed. |
| `ordersApi.adminShipmentByOrder` | `GET /api/v1/admin/orders/:id/shipment` | `{ data: Shipment }` | typed `Shipment` | Admin order detail shipment panel. | OK. |
| `ordersApi.adminShipment` | `GET /api/v1/admin/shipments/:id` | `{ data: Shipment }` | typed `Shipment` | Admin shipment detail usage if routed. | OK. |
| `ordersApi.adminUpdateShipmentStatus` | `PATCH /api/v1/admin/shipments/:id/status` | `{ data: { status } }` | `any` | Admin shipment status update. | `missing type`. |
| `ordersApi.adminUpdateShipment` | `PUT /api/v1/admin/shipments/:id` | `{ data: Shipment }` | `any` | Admin shipment edit. | `missing type`. |

### Admin API

| FE client | Method/path | BE payload | FE type/client fields | UI/store usage | Audit |
| --- | --- | --- | --- | --- | --- |
| `adminApi.listUsers` | `GET /api/v1/admin/users` | paginated `UserInfo[]`: `alias_id`, `full_name`, `email`, `phone`, `role` | `any[]` | Admin users table uses `full_name`, `email`, `role`, `is_active`. | `contract mismatch`: BE payload lacks `is_active`; also `missing type`. |
| `adminApi.getUser` | `GET /api/v1/admin/users/:id` | `{ data: UserInfo }` | `any` | Not heavily surfaced. | `missing type`; if UI needs active state, BE must return richer user DTO. |
| `adminApi.deactivateUser` | `PATCH /api/v1/admin/users/:id/deactivate` | `{ data: { is_active } }` | `any` | Admin users action refresh/update. | `missing type`. |
| `adminApi.bestSellers` | `GET /api/v1/admin/analytics/best-sellers` | `{ data: BestSellerBook[] }` | `any` | Admin analytics uses ranking fields like `title`, `total_sold`. | `missing type`; enriched catalog fields mostly unused. |
| `adminApi.sales` | `GET /api/v1/admin/analytics/sales` | `{ data: SalesSummary }`: `total_orders`, `total_revenue`, `date_from`, `date_to` | typed `SalesSummary` | Admin analytics summary cards. | OK. |

## Cross-Check Theo Nhóm Vừa Thay Đổi

### `BookDetail`

BE trả đầy đủ: `id`, `name`, `short_description`, `detail_description`, `product_status`, `publisher`, `publish_year`, `pricing.price`, `category.category_id`, `images[]`, `series`, `authors[]`, `tags[]`, `created_at`, `stock_quantity`, `price`.

FE type `BookDetail` có đầy đủ hầu hết field chính. UI detail và card dùng tốt các field bán hàng quan trọng: title/name, description, status, price, stock, category, authors, tags, images. Thiếu hiển thị đáng chú ý: `publisher`, `publish_year`. Admin form thiếu nhập/sửa `publisher`, `publish_year`, `series`, `tags`, `images`.

### `SimilarBook`

BE trả: `book_id`, `title`, `score`, `price`, `publisher`, `category`, `authors`, `images`, `cover_url`.

FE card sách liên quan đã có thể nhận `price`, `authors`, `images`, `cover_url` qua mapper nên lỗi "hiện Liên hệ" thường xảy ra khi payload cũ chưa có `price` hoặc FE gọi path/client chưa nhận enriched payload. Type/client vẫn cần chặt hơn vì hiện response đang normalize từ `any`. `score` chưa hiển thị, chấp nhận được nếu chỉ là ranking.

### `Category`

BE trả đủ: `id`, `category_name`, `slug`, `parent_category`, `created_at`, `updated_at`.

FE đang dùng tốt các field điều hướng (`id`, `category_name`, `slug`, `parent_category`) nhưng local type trong `categories.ts` thiếu `created_at`, `updated_at`. Admin list không hiển thị timestamps.

### Search / List Books

BE search trả paginated `BookDetail[]`. FE `booksApi.search` đang dùng `any[]`, trong khi UI search/header suggestions đã consume đủ field cho card: title, author, price, image. Các field chưa hiển thị trong search result/suggestion: `publisher`, `publish_year`, `series`, `tags`, `created_at`, `detail_description`.

### Ranked / Recommendation Cards

BE best-seller/most-viewed trả metric riêng (`total_sold`, `view_count`) cộng enriched catalog fields (`price`, `publisher`, `category`, `authors`, `images`, `cover_url`). FE có dùng metric ở ranking pages và dùng card mapper cho catalog fields. `publisher` thường chưa hiển thị.

## Khuyến Nghị Fix Theo Ưu Tiên

### P0

1. Sửa contract admin users: tạo DTO admin user có `alias_id`, `full_name`, `email`, `phone`, `role`, `is_active`, `created_at`, và dùng cho `GET /api/v1/admin/users` + `GET /api/v1/admin/users/:id`; hoặc bỏ phụ thuộc `is_active` khỏi UI. Nên chọn DTO vì endpoint deactivate đã expose active state.

### P1

1. Xóa các `any` ở API client bằng các type đã có hoặc thêm type nhỏ cho message/status responses:
   - `booksApi.search`, `adminList`, `adminCreate`, `adminUpdate`, `adminUpdateStock`
   - `categoriesApi.admin*`
   - `recommendationsApi.*`
   - `ordersApi.checkout`, `history`, `detail`, `admin*`
   - `adminApi.listUsers`, `getUser`, `deactivateUser`, `bestSellers`
2. Đồng bộ category type: bỏ local `Category` trong `categories.ts` hoặc import từ `frontend/src/lib/types/index.ts`.
3. Cập nhật/xóa các response type stale trong `frontend/src/lib/types/index.ts` để dùng envelope thật: `{ data, total, page, page_size }`.
4. Mở rộng admin book form nếu nghiệp vụ cần quản trị đủ data: `publisher`, `publish_year`, `series`, `tags`, `images`.

### P2

1. Quyết định UI có nên hiển thị `publisher`/`publish_year` trên book detail và card/search suggestion không.
2. Nếu cart cần thumbnail, BE nên trả `image_url` trong `CartItem`; nếu không, bỏ `image_url` khỏi TS type.
3. Nếu order/admin audit cần rõ người đổi trạng thái, hiển thị `changed_by_admin_alias_id` trong admin order history.
4. Nếu series là tính năng sản phẩm, thêm section series vào book detail hoặc bỏ client method chưa dùng.

## Static Test Plan Result

| Check | Kết quả |
| --- | --- |
| Mỗi endpoint FE client gọi có dòng audit | Đã liệt kê theo `auth`, `books`, `categories`, `recommendations`, `cart`, `addresses`, `orders`, `admin`. |
| Spot-check snake_case/camelCase | Các field BE đều snake_case qua JSON tag: `category_id`, `author_name`, `stock_quantity`, `total_price`, `page_size`, `cover_url`. FE type hiện chủ yếu dùng đúng snake_case. |
| Spot-check giá sách liên quan | `SimilarBook.price` đã có trong BE contract; FE mapper có fallback đọc `price` và `pricing.price`. Cần type hóa để tránh regress. |
| Build/lint | Không chạy vì lượt này chỉ tạo audit report Markdown, không sửa code app. |
