interface BooksToolbarProps {
  count: number;
  total?: number;
}

export function BooksToolbar({ count, total = count }: BooksToolbarProps) {
  return (
    <div className="mb-8 rounded-cards-lg border border-stone-surface bg-white px-5 py-5 backdrop-blur-sm md:px-6 md:py-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="h-1.5 w-14 rounded-full bg-ember" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Kho sách</p>
            <h1 className="mt-2 font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-none text-charcoal">Tất cả sách</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite">
              Đang hiển thị {count} trong tổng số {total} đầu sách. Lọc nhanh để tìm đúng sách và vào trang mua hàng chi tiết.
            </p>
          </div>
        </div>

        <p className="max-w-sm text-right text-sm leading-6 text-graphite lg:ml-auto">
          Giá hiển thị theo VND khi backend trả về dữ liệu giá hợp lệ.
        </p>
      </div>
    </div>
  );
}
