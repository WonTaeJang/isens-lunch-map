import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import LocalUserInitializer from '@/features/local-user/local-user-initializer';
import SiteHeader from '@/components/site-header';
import SnackbarHost from '@/components/ui/snackbar';
import { version } from '@/package.json';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const title = 'Lunch Map | 오늘의 점심 지도';
const description = '가까운 맛집부터 솔직한 리뷰까지, 우리의 점심 리스트를 지도에서 만나보세요.';
const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ||
      (deploymentHost ? `https://${deploymentHost}` : 'http://localhost:3000'),
  ),
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Lunch Map',
    title,
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lunch Map — 오늘 점심, 어디로 갈까요?',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LocalUserInitializer />
        <SiteHeader />
        {children}
        <footer className="app-version" aria-label={`앱 버전 ${version}`}>
          v{version}
        </footer>
        <SnackbarHost />
      </body>
    </html>
  );
}
