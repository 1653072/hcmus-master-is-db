export type UUID = string;

export type UserRole = 'user' | 'admin';
export type OrderStatus = 'pending' | 'confirmed' | 'packing' | 'shipping' | 'completed' | 'cancelled';

export interface User {
  id?: number;
  alias_id: UUID;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  default_addr?: string;
  created_at: string;
}

export interface Address {
  id?: number;
  alias_id: UUID;
  user_id?: number;
  receiver_name: string;
  phone: string;
  address_line: string;
  ward?: string;
  district?: string;
  city: string;
  is_default: boolean;
  created_at: string;
}

export interface BookImage {
  is_primary: boolean;
  alt: string;
  url: string;
}

export interface BookSeries {
  series_id: string;
  series_name: string;
  sequence_no: number;
}

export interface BookAuthor {
  author_id: string;
  slug: string;
  author_name: string;
}

export interface BookTag {
  tag_id: string;
  tag_name: string;
}

export interface BookPricing {
  price: number;
}

export interface BookCategoryRef {
  category_id: string;
}

export interface Book {
  id: string;
  name: string;
  short_description: string;
  detail_description: string;
  product_status: string;
  pricing: BookPricing;
  category: BookCategoryRef;
  images: BookImage[];
  series?: BookSeries;
  authors: BookAuthor[];
  tags: BookTag[];
  imported_at: string;
  created_at: string;
}

export interface BookDetail extends Book {
  stock_quantity: number;
  price: number;
}

export interface Category {
  id: string;
  category_name: string;
  slug: string;
  parent_category?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  book_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id?: number;
  book_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id?: number;
  alias_id: UUID;
  status: OrderStatus;
  total_amount: number;
  note?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderStatusHistory {
  id?: number;
  alias_id: UUID;
  old_status?: string | null;
  new_status: string;
  changed_by_admin_alias_id?: UUID;
  note?: string;
  changed_at: string;
}

export interface Payment {
  id?: number;
  alias_id: UUID;
  method: string;
  status: string;
  amount: number;
  provider_ref?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface Shipment {
  id?: number;
  alias_id: UUID;
  status: string;
  carrier?: string;
  tracking_number?: string;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface SimilarBook {
  book_id: string;
  title: string;
  score: number;
  cover_url?: string;
}

export interface SeriesBook {
  book_id: string;
  title: string;
  volume_order: number;
  already_bought: boolean;
}

export interface BestSellerBook {
  book_id: string;
  title: string;
  total_sold: number;
}

export interface MostViewedBook {
  book_id: string;
  title: string;
  view_count: number;
}

export interface EventLog {
  id: string;
  user_id?: string;
  book_id: string;
  event_type: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserInfo;
}

export interface UserInfo {
  alias_id: UUID;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface BookListResponse {
  books: BookDetail[];
  total: number;
  page: number;
  page_size: number;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  page: number;
  page_size: number;
}

export interface CartResponse {
  items: CartItem[];
  total_price: number;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserListResponse {
  users: UserInfo[];
  total: number;
  page: number;
  page_size: number;
}

export interface RecommendationResponse {
  similar_books: SimilarBook[];
  series_books?: SeriesBook[];
}

export interface SalesSummary {
  total_orders: number;
  total_revenue: number;
  date_from: string;
  date_to: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  default_addr?: string;
}

export interface CreateAddressRequest {
  receiver_name: string;
  phone: string;
  address_line: string;
  ward?: string;
  district?: string;
  city: string;
  is_default: boolean;
}

export interface CreateBookRequest {
  name: string;
  short_description?: string;
  detail_description?: string;
  product_status?: string;
  pricing: BookPricing;
  category: BookCategoryRef;
  images: BookImage[];
  series: BookSeries;
  authors: BookAuthor[];
  tags: BookTag[];
  stock_quantity: number;
}

export interface UpdateBookRequest {
  name?: string;
  short_description?: string;
  detail_description?: string;
  product_status?: string;
  pricing?: BookPricing;
  category?: BookCategoryRef;
  images?: BookImage[];
  series?: BookSeries;
  authors?: BookAuthor[];
  tags?: BookTag[];
}

export interface UpdateStockRequest {
  stock_quantity: number;
}

export interface CreateCategoryRequest {
  category_name: string;
  slug: string;
  parent_category?: string;
}

export interface UpdateCategoryRequest {
  category_name?: string;
  slug?: string;
  parent_category?: string;
}

export interface AddToCartRequest {
  book_id: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CheckoutRequest {
  address_id?: UUID;
  note?: string;
  session_id: string;
}

export interface BuyNowRequest {
  book_id: string;
  quantity: number;
}

export interface BuyNowResponse {
  session_id: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  note?: string;
}

export interface DeactivateUserRequest {
  is_active: boolean;
}

export interface ApiListParams {
  page?: number;
  page_size?: number;
  query?: string;
}
