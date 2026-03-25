'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { hapticMedium } from '@/lib/haptic';

interface PaywallOverlayProps {
  onUnlock: () => void;
  onClose: () => void;
  isVisible: boolean;
  donationUrl?: string;
}

const COUNTDOWN_SECONDS = 10;

function PaywallContent({
  onUnlock,
  onClose,
  donationUrl,
}: Omit<PaywallOverlayProps, 'isVisible'>) {
  const [step, setStep] = useState<'intro' | 'waiting' | 'unlocked'>('intro');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [donationOpened, setDonationOpened] = useState(false);

  // 카운트다운 타이머 — 후원 페이지를 실제로 열어야만 시작
  useEffect(() => {
    if (step !== 'waiting' || !donationOpened || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, donationOpened]);

  // countdown이 0이 되면 unlocked로 전환
  useEffect(() => {
    if (step === 'waiting' && countdown <= 0) {
      const t = setTimeout(() => setStep('unlocked'), 100);
      return () => clearTimeout(t);
    }
  }, [step, countdown]);

  const handleDonationClick = () => {
    if (donationUrl) {
      // 모바일: window.open보다 a 태그 클릭이 더 안정적
      // 팝업 차단 우회를 위해 직접 navigate
      const link = document.createElement('a');
      link.href = donationUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setDonationOpened(true);
    setStep('waiting');
    setCountdown(COUNTDOWN_SECONDS);
  };

  // 탭 복귀 감지 — 도네이션 후 돌아오면 카운트다운 가속
  useEffect(() => {
    if (step !== 'waiting' || !donationOpened) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && countdown > 3) {
        // 사용자가 돌아왔으면 3초로 줄임 (이미 후원 완료 가능성 높음)
        setCountdown(3);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step, donationOpened, countdown]);

  return (
    <>
      {/* Handle bar (mobile) */}
      <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-5 sm:hidden" />

      {step === 'intro' && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            전체 브리핑이 궁금하신가요?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            커피 한 잔 가격으로 깊이 있는 분석을 받아보세요.
            응원해주시면 더 좋은 콘텐츠를 만들 수 있습니다.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-5 space-y-2.5">
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500">✓</span>
              <span><strong>영향분석</strong> — 뉴스가 내 삶에 미치는 영향</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500">✓</span>
              <span><strong>실전인사이트</strong> — 바로 쓸 수 있는 전략</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500">✓</span>
              <span>경제·투자·생활 <strong>전체 카테고리</strong></span>
            </div>
          </div>

          <button
            onClick={handleDonationClick}
            className="w-full rounded-xl bg-amber-500 text-white py-3.5 font-semibold text-base hover:bg-amber-600 transition mb-2"
          >
            ☕ 커피 한 잔으로 응원하고 전체 보기
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mb-3">
            3초만 투자하면 오늘 하루 모든 브리핑을 볼 수 있어요
          </p>

          <button
            onClick={onClose}
            className="w-full text-center text-sm text-gray-400 dark:text-gray-500 py-2 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            다음에 할게요
          </button>
        </>
      )}

      {step === 'waiting' && (
        <div className="text-center py-4">
          <div className="text-4xl mb-4">☕</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">감사합니다!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            응원해주셔서 감사합니다.<br />
            잠시 후 전체 브리핑이 열립니다.
          </p>
          <div className="relative w-16 h-16 mx-auto mb-4">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28" fill="none" stroke="#f59e0b" strokeWidth="4"
                strokeDasharray={`${(1 - countdown / COUNTDOWN_SECONDS) * 175.9} 175.9`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-700 dark:text-gray-300">
              {countdown}
            </span>
          </div>
        </div>
      )}

      {step === 'unlocked' && (
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            전체 브리핑이 열렸습니다!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            오늘 하루 모든 카드를 자유롭게 읽으세요.
          </p>
          <button
            onClick={onUnlock}
            className="w-full rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-3.5 font-semibold text-base hover:bg-gray-800 dark:hover:bg-gray-200 transition"
          >
            브리핑 보러가기
          </button>
        </div>
      )}
    </>
  );
}

export default function PaywallOverlay({
  isVisible,
  ...rest
}: PaywallOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      startTransition(() => setMounted(true));
      hapticMedium();
      // Trigger entrance animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => startTransition(() => setAnimateIn(true)));
      });
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      startTransition(() => setAnimateIn(false));
      const t = setTimeout(() => startTransition(() => setMounted(false)), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isVisible]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) rest.onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') rest.onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isVisible, rest]);

  if (!mounted) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ease-out ${
        animateIn ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="프리미엄 콘텐츠 잠금 해제"
    >
      <div className={`w-full sm:max-w-md bg-white dark:bg-[#1c1c1e] rounded-t-3xl sm:rounded-2xl p-6 sm:mx-4 shadow-2xl transition-all duration-300 ease-out ${
        animateIn
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-8 opacity-0 scale-[0.97]'
      }`}>
        <PaywallContent key={String(isVisible)} {...rest} />
      </div>
    </div>
  );
}
