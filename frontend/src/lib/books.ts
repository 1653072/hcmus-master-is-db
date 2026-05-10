import type { FeaturedBook } from '@/components/books/book-card';

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
    return authors.map(a => a?.author_name || a?.name || '').filter(Boolean).join(', ') || 'Unknown author';
  }
  if (typeof author === 'string' && author.trim()) return author;
  if (author && typeof author === 'object' && typeof author.name === 'string') return author.name;
  return 'Unknown author';
}

function getCategory(category: ApiBookLike['category'], categories: ApiBookLike['categories']) {
  if (Array.isArray(categories) && categories.length > 0) {
    return categories.map(c => c?.category_name || c?.name || '').filter(Boolean)[0] || 'General';
  }
  if (typeof category === 'string' && category.trim()) return category;
  if (category && typeof category === 'object' && typeof category.name === 'string') return category.name;
  return 'General';
}

function getImage(index: number, book: ApiBookLike) {
  if (book.images && book.images.length > 0 && book.images[0].url) return book.images[0].url;
  const image = book.coverImage ?? book.image ?? book.thumbnail;
  if (image) return image;
  const palette = [
    'linear-gradient(135deg, #091824 0%, #101f2e 100%)',
    'linear-gradient(135deg, #191814 0%, #2a2720 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #2d2d2d 100%)',
    'linear-gradient(135deg, #0d0d0d 0%, #1f1c17 100%)',
    'linear-gradient(135deg, #21333d 0%, #090f14 100%)',
    'linear-gradient(135deg, #32281f 0%, #7a5a43 100%)',
  ];
  return palette[index % palette.length];
}

export function toFeaturedBook(book: ApiBookLike, index = 0): FeaturedBook {
  const title = getText(book.title ?? book.name, 'Untitled');
  const author = getAuthor(book.author, book.authors);
  const category = getCategory(book.category, book.categories);
  const bookPrice = book.pricing?.price ?? book.price;
  const price = typeof bookPrice === 'number' ? `$${bookPrice.toFixed(2)}` : getText(bookPrice, '$32');
  const rating = typeof book.rating === 'number' ? String(book.rating) : getText(book.rating, '4.9');
  const image = getImage(index, book);

  return {
    id: book.id !== undefined ? String(book.id) : undefined,
    title,
    author,
    category,
    price,
    rating,
    image,
    rawTitle: title,
  };
}
