import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d9488',
};

export const metadata: Metadata = {
  title: '아침 브리핑 — AI가 매일 아침 정리하는 뉴스',
  description: 'AI가 매일 아침 경제·투자 뉴스를 3장의 카드로 정리해드립니다. 핵심 뉴스, 영향 분석, 실전 인사이트.',
  keywords: ['뉴스', '브리핑', '경제', '투자', 'AI', '아침뉴스', '뉴스요약'],
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/favicon.ico', sizes: '32x32' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
  openGraph: {
    title: '아침 브리핑 — AI 뉴스 브리핑',
    description: 'AI가 매일 아침 경제·투자 뉴스를 3장의 카드로 정리해드립니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '아침 브리핑',
  },
  twitter: {
    card: 'summary_large_image',
    title: '아침 브리핑 — AI 뉴스 브리핑',
    description: 'AI가 매일 아침 경제·투자 뉴스를 3장의 카드로 정리해드립니다.',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': '아침 브리핑',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        {children}
      </body>
    </html>
  );
}
