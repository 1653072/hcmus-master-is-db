import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="site-footer" className="relative z-30 bg-midnight pt-14 pb-6 text-white">
      <div className="mx-auto max-w-page px-6 lg:px-10 xl:px-24">
        <div className="border-b border-white/10 pb-10">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.05fr_0.72fr_0.72fr_0.72fr_0.85fr]">
            <div>
              <Link href="/" className="font-display text-2xl font-semibold text-white transition-opacity hover:opacity-80">
                Paper Haven
              </Link>
              <p className="mt-3 max-w-sm text-[15px] leading-6 text-white/70">
                Nhà sách trực tuyến với sách chính hãng, ưu đãi minh bạch và trải nghiệm mua nhanh cho độc giả Việt Nam.
              </p>
            </div>

            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-white">Khám phá</p>
              <ul className="mt-4 space-y-3 text-[15px] text-white/70">
                {[
                  ['Tất cả sách', '/books'],
                  ['Tìm kiếm', '/search'],
                  ['Danh mục', '/categories'],
                  ['Tác giả', '/authors'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-sunburst">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-white">Xếp hạng</p>
              <ul className="mt-4 space-y-3 text-[15px] text-white/70">
                {[
                  ['Sách bán chạy', '/best-sellers'],
                  ['Xem nhiều hôm nay', '/most-viewed/daily'],
                  ['Top 30 ngày', '/most-viewed/30days'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-sunburst">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-white">Tài khoản</p>
              <ul className="mt-4 space-y-3 text-[15px] text-white/70">
                {[
                  ['Hồ sơ', '/profile'],
                  ['Đơn hàng', '/orders'],
                  ['Giỏ hàng', '/cart'],
                  ['Đăng nhập', '/login'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-sunburst">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-white">Cam kết</p>
              <ul className="mt-4 space-y-3 text-[15px] text-white/70">
                <li>Freeship từ 149K</li>
                <li>Đổi trả trong 30 ngày</li>
                <li>Đóng gói cẩn thận</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="pt-6 text-center text-[12px] text-white/45">
          Copyright © {year} Paper Haven. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
