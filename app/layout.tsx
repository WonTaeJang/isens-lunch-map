import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import LocalUserInitializer from '@/features/local-user/local-user-initializer';
import SiteHeader from '@/components/site-header';
import { version } from '@/package.json';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Lunch Map | 오늘의 점심 지도',
  description: '우리의 점심 리스트를 지도에서 한눈에 확인하세요.',
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
      </body>
    </html>
  );
}
