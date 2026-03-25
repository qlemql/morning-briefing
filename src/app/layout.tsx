import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ErrorBoundary from '@/components/ErrorBoundary';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1d1d1f',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://morning-briefing-mocha.vercel.app'),
  title: '아침 브리핑 — AI가 매일 아침 정리하는 뉴스',
  description: 'AI가 매일 아침 경제·투자·생활 뉴스를 3장의 카드로 정리해드립니다. 핵심 뉴스, 영향 분석, 실전 인사이트.',
  keywords: ['뉴스', '브리핑', '경제', '투자', '생활', '테크', 'AI', '아침뉴스', '뉴스요약'],
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/favicon.ico', sizes: '32x32' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
  alternates: {
    canonical: 'https://morning-briefing-mocha.vercel.app',
    languages: {
      'ko-KR': 'https://morning-briefing-mocha.vercel.app',
    },
  },
  openGraph: {
    title: '아침 브리핑 — AI 뉴스 브리핑',
    description: 'AI가 매일 아침 경제·투자·생활 뉴스를 3장의 카드로 정리해드립니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '아침 브리핑',
    url: 'https://morning-briefing-mocha.vercel.app',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: '아침 브리핑' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '아침 브리핑 — AI 뉴스 브리핑',
    description: 'AI가 매일 아침 경제·투자·생활 뉴스를 3장의 카드로 정리해드립니다.',
    images: ['/api/og'],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': '아침 브리핑',
    // Naver Search Advisor — CEO가 등록 후 인증 코드 입력
    // 'naver-site-verification': 'YOUR_CODE_HERE',
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
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link
          rel="preload"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '아침 브리핑',
              description: 'AI가 매일 아침 경제·투자·생활 뉴스를 3장의 카드로 정리해드립니다.',
              url: 'https://morning-briefing-mocha.vercel.app',
              applicationCategory: 'NewsApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'KRW',
              },
              author: {
                '@type': 'Organization',
                name: '아침 브리핑',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-gray-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
        >
          본문으로 건너뛰기
        </a>
        <noscript>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h1>아침 브리핑</h1>
            <p>이 서비스는 JavaScript가 필요합니다. 브라우저 설정에서 JavaScript를 활성화해주세요.</p>
          </div>
        </noscript>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Analytics />
        <SpeedInsights />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
              // Global error reporting
              window.addEventListener('unhandledrejection', function(e) {
                if (navigator.sendBeacon) {
                  var blob = new Blob([JSON.stringify({event:'unhandled_error',error:String(e.reason).substring(0,200)})], {type:'application/json'});
                  navigator.sendBeacon('/api/analytics', blob);
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
