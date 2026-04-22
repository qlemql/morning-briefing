'use client';

import { useState, useEffect } from 'react';
import { isNativePlatform } from '@/lib/native-push';

const DONATION_URL = 'https://qr.kakaopay.com/Fa0mKvPtZ';

export default function KakaoPaySection() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  if (isNative) {
    return (
      <div className="text-center my-8">
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-gray-500 dark:text-gray-400 underline underline-offset-4 decoration-gray-300 dark:decoration-gray-600"
        >
          웹에서 개발자 응원하기 →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
        지금은 카카오페이로 후원할 수 있어요
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        정식 결제 시스템은 준비 중입니다. 커피 한 잔 가격으로 응원해주시면 오늘 하루 전체 브리핑이 열립니다.
      </p>
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center rounded-xl bg-amber-500 text-white py-3.5 font-semibold text-base hover:bg-amber-600 transition"
      >
        카카오페이로 후원하기
      </a>
    </div>
  );
}
