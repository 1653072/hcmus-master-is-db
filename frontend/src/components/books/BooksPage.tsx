import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { BooksToolbar } from '@/components/books/BooksToolbar';
import { Button } from '@/components/ui/button';

interface BooksPageProps {
  books: FeaturedBook[];
  loading?: boolean;
  error?: string | null;
  currentCategory?: string | null;
  currentQuery?: string | null;
}

const filters = {
  category: ['Business', 'Fiction', 'Self help', 'Children', 'Science', 'Psychology', 'Communication', 'Creativity', 'Finance'],
  format: ['Hardcover', 'Paperback', 'E-book'],
};

function LoadingState() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
          <div className="h-[220px] rounded-[18px] bg-stone-200/80" />
          <div className="mt-4 h-4 w-3/4 rounded-full bg-stone-200/80" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-stone-200/80" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50/80 p-6 text-rose-900 shadow-[0_10px_28px_rgba(127,29,29,0.08)]">
      <p className="font-semibold">Unable to load books</p>
      <p className="mt-2 text-sm leading-6 text-rose-800/80">{message}</p>
      <Link href="/books" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40">
        Retry
      </Link>
    </div>
  );
}

export function BooksPage({ books, loading = false, error = null, currentCategory, currentQuery }: BooksPageProps) {
  const router = useRouter();

  const handleCategoryClick = (cat: string) => {
    if (currentCategory === cat) {
      router.push('/books');
    } else {
      router.push(`/books?category=${encodeURIComponent(cat)}`);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-10 lg:px-10 xl:px-24">
      <BooksToolbar count={books.length} />

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] lg:sticky lg:top-24">
          <div className="space-y-2">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Filters</p>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Category</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {filters.category.map((item) => {
                  const isActive = currentCategory?.toLowerCase() === item.toLowerCase();
                  return (
                    <Button 
                      key={item} 
                      onClick={() => handleCategoryClick(item)}
                      variant={isActive ? 'primary' : 'outline'}
                      size="sm"
                    >
                      {item}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Format</h3>
              <div className="mt-3 space-y-2 text-sm text-zinc-600">
                {filters.format.map((item) => (
                  <label key={item} className="flex items-center gap-2.5">
                    <input type="checkbox" className="accent-orange-500" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Price range</h3>
              <div className="mt-3 h-2 rounded-full bg-stone-200">
                <div className="h-2 w-2/3 rounded-full bg-orange-400" />
              </div>
              <p className="mt-2 text-xs text-zinc-500">$10 - $40</p>
            </div>
          </div>
        </aside>

        <div>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : books.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-stone-300 bg-stone-50/70 p-12 text-center text-sm text-zinc-600">
              No books found for this selection.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {books.map((book) => (
                <Link key={`${book.title}-${book.author}`} href={`/books/${encodeURIComponent(book.title.toLowerCase().replace(/\s+/g, '-'))}`} className="block rounded-[28px] transition duration-200 ease-out-quart hover:-translate-y-0.5">
                  <BookCard book={book} compact />
                </Link>
              ))}
            </div>
          )}

          {!loading && !error && books.length > 0 ? (
            <div className="mt-10 flex items-center justify-center gap-2">
              {['1'].map((item, index) => (
                <Button
                  key={item}
                  variant={index === 0 ? 'primary' : 'outline'}
                  size="icon"
                >
                  {item}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
