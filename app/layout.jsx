import './globals.css';
import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

export const metadata = {
  title: 'Typing Speed Test',
  description: 'A responsive typing speed test with timed and passage modes, results, and persistence.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sora.className}>{children}</body>
    </html>
  );
}
