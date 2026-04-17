'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isNativePlatform } from '@/lib/native-push';
import { track } from '@/lib/track';

const DONATION_URL_WEB = 'https://qr.kakaopay.com/Fa0mKvPtZ';

/**
 * 후원 안내 페이지
 * 구독 모델에서 후원 모델로 전환되었으므로 가격/결제 UI 없음.
 * iOS 네이티브에서는 결제 관련 정보가 일절 없는 단순 안내만 표시 (App Store compliance).
 */
export default function SubscribeClient() {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  if (isNative === null) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#111111]" aria-hidden="true" />;
  }

  // iOS 네이티브: 결제/후원 링크 없는 단순 감사 안내 (App Store 정책 준수)
  if (isNative) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111111] px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            아침 브리핑은 모두 무료입니다
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
            매일 아침 3분, 경제·투자·생활의 핵심을 카드 3장으로 받아보세요.
            모든 콘텐츠를 누구나 무료로 이용하실 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition"
          >
            오늘 브리핑 보러가기
          </Link>
        </div>
      </div>
    );
  }

  // 웹: 후원 버튼 노출
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            개발자에게 커피 한 잔
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            아침 브리핑은 모두 무료예요.<br />
            매일 도움이 되셨다면, 커피 한 잔으로 응원해주세요.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            후원금이 쓰이는 곳
          </h2>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-3">
              <span className="text-amber-500 shrink-0 mt-0.5">·</span>
              <span><strong className="text-gray-900 dark:text-gray-100">AI API 비용</strong> — 매일 새로운 브리핑을 생성하는 데 사용돼요</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 shrink-0 mt-0.5">·</span>
              <span><strong className="text-gray-900 dark:text-gray-100">서버 운영비</strong> — 안정적인 서비스 유지를 위한 인프라 비용</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 shrink-0 mt-0.5">·</span>
              <span><strong className="text-gray-900 dark:text-gray-100">새 기능 개발</strong> — 더 좋은 브리핑 경험을 만들기 위한 시간</span>
            </li>
          </ul>
        </div>

        <a
          href={DONATION_URL_WEB}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('donate_click', { source: 'subscribe_page' })}
          className="block w-full text-center rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-4 font-semibold text-base shadow-sm transition active:scale-[0.99] mb-3"
        >
          ☕ 카카오페이로 응원하기
        </a>

        <Link
          href="/"
          className="block w-full text-center text-sm text-gray-500 dark:text-gray-400 py-3 hover:text-gray-700 dark:hover:text-gray-200 transition"
        >
          오늘 브리핑 보러가기 →
        </Link>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          후원은 자유 금액입니다. 응원해주셔서 감사합니다.
        </p>
      </div>
    </div>
  );
}
