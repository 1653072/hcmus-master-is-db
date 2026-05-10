import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-canvas pt-16 pb-6">
      <div className="mx-auto max-w-page px-6 lg:px-10 xl:px-24">
        <div className="border-b border-stone-surface pb-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.6fr_0.6fr_0.9fr]">
            <div>
              <Link href="/" className="font-display text-2xl font-medium tracking-[-0.44px] text-charcoal transition-opacity hover:opacity-80">
                Paper Haven
              </Link>
              <p className="mt-3 max-w-sm text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
                A publications company that specializes to make famous books, and deliver it to customers with reasonable price.
              </p>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-charcoal">Menu</p>
              <ul className="mt-4 space-y-3 text-[15px] tracking-[-0.2px] text-graphite">
                {[
                  ['Books', '/books'],
                  ['Categories', '/categories'],
                  ['Best Sellers', '/best-sellers'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-ember">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-charcoal">Security</p>
              <ul className="mt-4 space-y-3 text-[15px] tracking-[-0.2px] text-graphite">
                {['Privacy policy', 'Terms & conditions', 'Delivery information'].map((item) => (
                  <li key={item} className="cursor-default transition-colors hover:text-charcoal">{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-charcoal">Get in touch</p>
              <ul className="mt-4 space-y-3 text-[15px] tracking-[-0.2px] text-graphite">
                <li>Address: Celina, Delaware 10299</li>
                <li>Email: paper.haven@gmail.com</li>
                <li>Phone: (671) 555-0110</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="pt-6 text-center text-[12px] tracking-[-0.14px] text-fog">
          Copyright © 2025 Paper Haven. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
