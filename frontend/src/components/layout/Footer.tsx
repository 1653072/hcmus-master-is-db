export function Footer() {
  return (
    <footer className="bg-stone-100 pt-16 pb-6">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 xl:px-24">
        <div className="border-b border-stone-300/50 pb-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.6fr_0.6fr_0.9fr]">
            <div>
              <p className="font-display text-2xl font-normal leading-8 text-orange-400">Paper Haven</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                A publications company that specializes to make famous books, and deliver it to customers with reasonable price.
              </p>
              <div className="mt-5 flex items-center gap-4">
                <span className="h-4 w-2 bg-zinc-800" />
                <span className="h-3.5 w-3.5 bg-zinc-800" />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-800">Menu</p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-500">
                {['Online support', 'Our services', 'Order return'].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-800">Security</p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-500">
                {['Privacy policy', 'Terms & conditions', 'Delivery information'].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-800">Get in touch</p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-500">
                <li>Address: Celina, Delaware 10299</li>
                <li>Email: paper.haven@gmail.com</li>
                <li>Phone: (671) 555-0110</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="pt-6 text-center text-xs text-zinc-500">Copyright @ 2025 Paper Haven All rights reserved.</p>
      </div>
    </footer>
  );
}
