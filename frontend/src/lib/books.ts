import type { FeaturedBook } from '@/components/books/book-card';
import { formatCurrency } from '@/lib/utils';

type ApiBookLike = {
  id?: string | number;
  title?: string;
  name?: string;
  author?: any;
  authors?: any[];
  category?: any;
  categories?: any[];
  price?: string | number;
  pricing?: { price: number; list_price?: number };
  list_price?: string | number;
  discount_percent?: string | number;
  stock_quantity?: string | number;
  review_count?: string | number;
  rating?: string | number;
  coverImage?: string;
  image?: string;
  thumbnail?: string;
  images?: { url: string }[];
};

function getText(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function getAuthor(author: ApiBookLike['author'], authors: ApiBookLike['authors']) {
  if (Array.isArray(authors) && authors.length > 0) {
    return authors.map(a => a?.author_name || a?.name || '').filter(Boolean).join(', ') || 'Chưa rõ tác giả';
  }
  if (typeof author === 'string' && author.trim()) return author;
  if (author && typeof author === 'object' && typeof author.name === 'string') return author.name;
  return 'Chưa rõ tác giả';
}

function getCategory(category: ApiBookLike['category'], categories: ApiBookLike['categories']) {
  if (Array.isArray(categories) && categories.length > 0) {
    return categories.map(c => c?.category_name || c?.name || '').filter(Boolean)[0] || 'Sách';
  }
  if (typeof category === 'string' && category.trim()) return category;
  if (category && typeof category === 'object' && typeof category.name === 'string') return category.name;
  return 'Sách';
}

function getImage(index: number, book: ApiBookLike) {
  if (book.images && book.images.length > 0 && book.images[0].url) return book.images[0].url;
  const image = book.coverImage ?? book.image ?? book.thumbnail;
  if (image) return image;
  const palette = [
    'linear-gradient(135deg, oklch(95.4% 0.021 80) 0%, oklch(57.5% 0.145 38) 100%)',
    'linear-gradient(135deg, oklch(96.2% 0.014 82) 0%, oklch(58.2% 0.043 74) 100%)',
    'linear-gradient(135deg, oklch(95.8% 0.02 84) 0%, oklch(73.6% 0.116 83) 100%)',
    'linear-gradient(135deg, oklch(95.1% 0.019 78) 0%, oklch(62% 0.065 142) 100%)',
    'linear-gradient(135deg, oklch(95% 0.02 58) 0%, oklch(64.2% 0.116 20) 100%)',
    'linear-gradient(135deg, oklch(94.2% 0.019 74) 0%, oklch(43.2% 0.036 60) 100%)',
  ];
  return palette[index % palette.length];
}

function getNumber(value: unknown) {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) ? amount : undefined;
}

export function toFeaturedBook(book: ApiBookLike, index = 0): FeaturedBook {
  const title = getText(book.title ?? book.name, 'Chưa có tên');
  const author = getAuthor(book.author, book.authors);
  const category = getCategory(book.category, book.categories);
  const bookPrice = book.pricing?.price ?? book.price;
  const listPriceValue = book.pricing?.list_price ?? book.list_price;
  const priceValue = getNumber(bookPrice);
  const listPriceNumber = getNumber(listPriceValue);
  const price = formatCurrency(bookPrice);
  const listPrice = listPriceNumber && priceValue && listPriceNumber > priceValue ? formatCurrency(listPriceNumber) : undefined;
  const computedDiscount = listPriceNumber && priceValue && listPriceNumber > priceValue
    ? Math.round(((listPriceNumber - priceValue) / listPriceNumber) * 100)
    : undefined;
  const explicitDiscount = getNumber(book.discount_percent);
  const rating = book.rating === undefined || book.rating === null ? undefined : getText(book.rating, '');
  const image = getImage(index, book);

  return {
    id: book.id !== undefined ? String(book.id) : undefined,
    title,
    author,
    category,
    price,
    listPrice,
    discountPercent: explicitDiscount ?? computedDiscount,
    stockQuantity: getNumber(book.stock_quantity),
    reviewCount: getNumber(book.review_count),
    rating: rating || undefined,
    image,
    rawTitle: title,
  };
}
