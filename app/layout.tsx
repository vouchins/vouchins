import { Footer } from '@/components/footer';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vouchins - Verified Marketplace for Professionals',
  description: 'Verified Professional Network',
  openGraph: {
    images: [
      {
        url: 'https://www.vouchins.com/images/logo.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://www.vouchins.com/images/logo.png',
      },
    ],
  },
  icons: {
    icon: '/favicon.png', // Points to public/favicon.png
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}
         <Footer />
      </body>
    </html>
  );
}
