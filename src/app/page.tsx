'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CategoryTab from '@/components/CategoryTab';
import BriefingCard from '@/components/BriefingCard';
import CardSkeleton from '@/components/CardSkeleton';
import PaywallOverlay from '@/components/PaywallOverlay';
import NotificationPrompt from '@/components/NotificationPrompt';
import EmailCollector from '@/components/EmailCollector';
import { BriefingCategory } from '@/lib/types';
import { CacheUtils } from '@/lib/cache';
import { getTodayLabel, CATEGORIES } from '@/constants';
import { track } from '@/lib/track';

const DONATION_URL = 'https://qr.kakaopay.com/Fa0mKvPtZ';
const SWIPE_THRESHOLD = 60;

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('economy');
  const [briefings, setBriefings] = useState<Record<string, BriefingCategory>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // 페이지 로드 시 localStorage + 서버에서 unlock 상태 복원
  useEffect(() => {
    // 1) 클라이언트 캐시 먼저 (빠른 UI 반영)
    setIsPremiumUnlocked(CacheUtils.isPremiumUnlocked());
    // 2) 서버 상태 동기화
    fetch('/api/unlock')
      .then((r) => r.json())
      .then((d) => { if (d.unlocked) setIsPremiumUnlocked(true); })
      .catch(() => {});
    track('page_view', { category: 'economy' });
  }, []);

  // Swipe gesture tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const delta = touchStartX.current - touchEndX.current;
    const categoryIds = CATEGORIES.map((c) => c.id as string);
    const currentIndex = categoryIds.indexOf(activeCategory);

    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta > 0 && currentIndex < categoryIds.length - 1) {
        // Swipe left → next category
        setActiveCategory(categoryIds[currentIndex + 1]);
      } else if (delta < 0 && currentIndex > 0) {
        // Swipe right → previous category
        setActiveCategory(categoryIds[currentIndex - 1]);
      }
    }
  }, [activeCategory]);

  const briefing = briefings[activeCategory] || null;

  const loadBriefing = useCallback(async (category: string) => {
    if (briefings[category]) return; // 이미 로드됨

    setLoading(true);
    setError(null);

    try {
      const today = CacheUtils.getTodayDate();

      // 캐시 확인
      const cached = CacheUtils.getBriefing(category, today);
      if (cached) {
        setBriefings((prev) => ({ ...prev, [category]: cached }));
        setLoading(false);
        return;
      }

      // API 호출 (unlock 토큰 포함)
      const unlockToken = CacheUtils.getUnlockToken(category);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (unlockToken) {
        headers['x-unlock-token'] = unlockToken;
      }
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers,
        body: JSON.stringify({ category, date: today }),
      });

      const data = await response.json();

      if (!response.ok || data.meta.status === 'error') {
        const code = data.error?.code || 'UNKNOWN';
        if (code === 'INVALID_API_KEY') {
          setError({ message: 'API 키를 확인해주세요.', type: 'auth' });
        } else if (code === 'RATE_LIMITED') {
          setError({ message: '잠시 후 다시 시도해주세요.', type: 'rate' });
        } else if (data.error?.message?.includes('budget')) {
          setError({ message: '오늘의 브리핑 생성 한도에 도달했어요. 내일 다시 확인해주세요!', type: 'budget' });
        } else {
          setError({ message: '브리핑을 불러올 수 없습니다.', type: 'general' });
        }
        return;
      }

      if (data.data) {
        setBriefings((prev) => ({ ...prev, [category]: data.data }));
        CacheUtils.setBriefing(category, today, data.data);
      }
    } catch {
      // 네트워크 에러 — 캐시 폴백
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const fallback = CacheUtils.getBriefing(category, yesterday);
      if (fallback) {
        setBriefings((prev) => ({ ...prev, [category]: fallback }));
        setError({ message: '어제의 브리핑을 보여드립니다.', type: 'stale' });
      } else {
        setError({ message: '네트워크 연결을 확인해주세요.', type: 'offline' });
      }
    } finally {
      setLoading(false);
    }
  }, [briefings]);

  useEffect(() => {
    loadBriefing(activeCategory);
    track('page_view', { category: activeCategory });
  }, [activeCategory, loadBriefing]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="mx-auto max-w-lg px-4 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">아침 브리핑</h1>
              <p className="text-sm text-gray-400 mt-0.5">{getTodayLabel()}</p>
            </div>
            {isPremiumUnlocked && (
              <span className="rounded-full bg-gray-900 text-white px-3 py-1 text-xs font-medium">
                PRO
              </span>
            )}
          </div>
          <CategoryTab
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className={`mx-auto max-w-lg px-4 pt-4`}>
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
            error.type === 'stale' || error.type === 'budget'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-700'
          }`}>
            <span>{error.type === 'stale' ? '📅' : error.type === 'budget' ? '📊' : '⚠️'}</span>
            <span>{error.message}</span>
            {error.type !== 'stale' && error.type !== 'budget' && (
              <button
                onClick={() => {
                  setBriefings((prev) => {
                    const next = { ...prev };
                    delete next[activeCategory];
                    return next;
                  });
                  loadBriefing(activeCategory);
                }}
                className="ml-auto text-xs font-medium underline"
              >
                재시도
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cards — swipe to switch categories */}
      <main
        className="mx-auto max-w-lg px-4 py-6 space-y-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading && !briefing ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : briefing ? (
          briefing.cards.map((card, index) => (
            <BriefingCard
              key={`${activeCategory}-${card.id}`}
              card={card}
              categoryId={activeCategory}
              isPaywalled={card.number > 1}
              isPremiumUnlocked={isPremiumUnlocked}
              onPaywallClick={() => { track('paywall_click'); setShowPaywallModal(true); }}
              delay={index * 80}
            />
          ))
        ) : !error ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">브리핑을 불러오는 중...</p>
          </div>
        ) : null}
      </main>

      {/* Footer with donation */}
      <footer className="mx-auto max-w-lg px-4 pb-8 pt-4">
        {DONATION_URL && (
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-xl border border-gray-200 bg-white text-gray-600 py-3 text-sm font-medium hover:bg-gray-50 transition"
          >
            ☕ 마음에 드셨다면 커피 한 잔 사주세요
          </a>
        )}
        <p className="text-center text-xs text-gray-300 mt-4">
          © 2026 아침 브리핑 · AI가 매일 아침 정리하는 뉴스
        </p>
      </footer>

      {/* Paywall modal */}
      <PaywallOverlay
        isVisible={showPaywallModal}
        onUnlock={async () => {
          // 서버에서 HMAC 서명된 unlock 토큰 발급
          try {
            const res = await fetch('/api/briefing?action=unlock');
            const json = await res.json();
            const tokens = json.data?.tokens as Record<string, string> | undefined;

            // localStorage에 날짜 + 서버 토큰 저장
            CacheUtils.setPremiumUnlocked(tokens);
          } catch {
            // 토큰 발급 실패 시에도 UI는 unlock (서버 게이팅은 유지됨)
            CacheUtils.setPremiumUnlocked();
          }

          // 서버에 unlock 상태 기록 (Redis 저장)
          fetch('/api/unlock', { method: 'POST' }).catch(() => {});
          track('unlock');
          setIsPremiumUnlocked(true);
          setShowPaywallModal(false);

          // 기존 캐시 클리어 후 unlock 토큰으로 재요청
          setBriefings({});
          const todayDate = CacheUtils.getTodayDate();
          CacheUtils.clearBriefing('economy', todayDate);
          CacheUtils.clearBriefing('investment', todayDate);
          CacheUtils.clearBriefing('lifestyle', todayDate);
        }}
        onClose={() => setShowPaywallModal(false)}
        donationUrl={DONATION_URL || undefined}
      />

      {/* Notification subscription prompt */}
      <NotificationPrompt />

      {/* Email newsletter collection */}
      <EmailCollector />
    </div>
  );
}
