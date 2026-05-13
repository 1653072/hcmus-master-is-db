import './globals.css';
import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Paper Haven - Nhà sách trực tuyến',
  description: 'Mua sách chính hãng, ưu đãi rõ ràng, giao nhanh và dễ dàng tìm thấy tủ sách phù hợp.',
};

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={beVietnamPro.variable}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
