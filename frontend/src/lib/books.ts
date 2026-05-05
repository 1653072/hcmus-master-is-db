import type { FeaturedBook } from '@/components/books/book-card';

type ApiBookLike = {
  id?: string | number;
  title?: string;
  name?: string;
  author?: string | { name?: string };
  category?: string | { name?: string };
  price?: string | number;
  rating?: string | number;
  coverImage?: string;
  image?: string;
  thumbnail?: string;
};

function getText(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function getAuthor(value: ApiBookLike['author']) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && typeof value.name === 'string') return value.name;
  return 'Unknown author';
}

function getCategory(value: ApiBookLike['category']) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && typeof value.name === 'string') return value.name;
  return 'General';
}

function getImage(index: number, image?: string) {
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
  const author = getAuthor(book.author);
  const category = getCategory(book.category);
  const price = typeof book.price === 'number' ? `$${book.price}` : getText(book.price, '$32');
  const rating = typeof book.rating === 'number' ? String(book.rating) : getText(book.rating, '4.9');
  const image = getImage(index, book.coverImage ?? book.image ?? book.thumbnail);

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
