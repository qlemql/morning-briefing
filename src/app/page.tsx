'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import CategoryTab from '@/components/CategoryTab';
import BriefingCard from '@/components/BriefingCard';
import CardSkeleton from '@/components/CardSkeleton';
import PullToRefresh from '@/components/PullToRefresh';
import ThemeToggle from '@/components/ThemeToggle';
import TrialBanner from '@/components/TrialBanner';
import ToastContainer, { showToast } from '@/components/Toast';

// Lazy-load non-critical overlays (not needed for initial render)
const PaywallOverlay = lazy(() => import('@/components/PaywallOverlay'));
const InstallPrompt = lazy(() => import('@/components/InstallPrompt'));
const WelcomeToast = lazy(() => import('@/components/WelcomeToast'));
const UpdateBanner = lazy(() => import('@/components/UpdateBanner'));
const MarketSnapshot = lazy(() => import('@/components/MarketSnapshot'));
// [HIDDEN] 아래 컴포넌트들은 유저 확보 후 활성화 예정
// NotificationPrompt, EmailCollector, WatchlistSection, ReferralCard, DailyQuiz

import { BriefingCategory } from '@/lib/types';
import { CacheUtils } from '@/lib/cache';
import { getTodayLabel, CATEGORIES } from '@/constants';
import { track } from '@/lib/track';
import { hapticLight, hapticMedium } from '@/lib/haptic';
import { reportWebVitals } from '@/lib/vitals';
import { VERSION_LABEL } from '@/lib/version';

const DONATION_URL = 'https://qr.kakaopay.com/Fa0mKvPtZ';
const SWIPE_THRESHOLD = 60;
const MAX_RETRIES = 2;

const REQUEST_TIMEOUT_MS = 30000;

/** Fetch with timeout, retry, and exponential backoff */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      // Don't retry client errors (4xx) — including 429 to avoid retry storm
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      if (i === retries) return res;
    } catch (err) {
      if (i === retries) throw err;
    }
    // Exponential backoff: 1s, 2s
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  // Unreachable, but TypeScript requires return
  return fetch(url, options);
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat && ['economy', 'investment', 'lifestyle'].includes(cat)) return cat;
    }
    return 'economy';
  });
  const [briefings, setBriefings] = useState<Record<string, BriefingCategory>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 페이지 로드 시 unlock 상태 복원 (7일 체험 + 후원 + 서버)
  useEffect(() => {
    // 0) 7일 무료체험 초기화 (첫 방문 시 시작일 기록)
    CacheUtils.initTrial();

    // 1) 체험 기간 또는 후원 unlock 확인
    const inTrial = CacheUtils.isInTrialPeriod();
    const dailyUnlock = CacheUtils.isPremiumUnlocked();
    const subscribed = CacheUtils.isSubscribed();
    if (inTrial || dailyUnlock || subscribed) {
      setIsPremiumUnlocked(true);

      // 체험/구독 중이면 서버에 unlock 등록 + HMAC 토큰 발급
      // (서버가 카드 2-3 content를 내려보내려면 토큰이 필요)
      fetch('/api/unlock', { method: 'POST' })
        .then(() => fetch('/api/briefing?action=unlock'))
        .then((r) => r.json())
        .then((d) => {
          const tokens = d.data?.tokens as Record<string, string> | undefined;
          if (tokens) CacheUtils.setPremiumUnlocked(tokens);
        })
        .catch(() => {});
    } else {
      // 체험 만료 후 — 서버 상태만 확인
      fetch('/api/unlock')
        .then((r) => r.json())
        .then((d) => { if (d.data?.unlocked) setIsPremiumUnlocked(true); })
        .catch(() => {});
    }

    // [HIDDEN] 레퍼럴 코드 처리 — 유저 0명 단계에서 비활성화
    // 레퍼럴 시스템 활성화 시 registerReferral, isSelfReferral import 복원 필요

    // 4) 오래된 캐시 정리
    CacheUtils.cleanupOldCache();
    track('page_view', { category: 'economy' });
    reportWebVitals();

    // Auto-refresh when tab becomes visible after midnight (new day)
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const cachedDate = CacheUtils.getTodayDate();
      const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
      if (cachedDate !== now) {
        // New day — clear all and reload
        setBriefings({});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Swipe gesture tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const switchCategory = useCallback((newCategory: string) => {
    if (newCategory === activeCategory) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveCategory(newCategory);
      setTransitioning(false);
      // Scroll to top on category switch
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 120);
  }, [activeCategory]);

  // Keyboard navigation: arrow keys to switch categories
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const categoryIds = CATEGORIES.map((c) => c.id as string);
      const idx = categoryIds.indexOf(activeCategory);
      if (e.key === 'ArrowRight' && idx < categoryIds.length - 1) {
        switchCategory(categoryIds[idx + 1]);
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        switchCategory(categoryIds[idx - 1]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeCategory, switchCategory]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const delta = touchStartX.current - touchEndX.current;
    const categoryIds = CATEGORIES.map((c) => c.id as string);
    const currentIndex = categoryIds.indexOf(activeCategory);

    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta > 0 && currentIndex < categoryIds.length - 1) {
        switchCategory(categoryIds[currentIndex + 1]);
      } else if (delta < 0 && currentIndex > 0) {
        switchCategory(categoryIds[currentIndex - 1]);
      }
    }
  }, [activeCategory, switchCategory]);

  const briefing = briefings[activeCategory] || null;

  const loadBriefing = useCallback(async (category: string) => {
    if (briefings[category]) return; // 이미 로드됨

    setLoading(true);
    setError(null);
    setSlowLoading(false);
    // Show "still loading" after 6 seconds
    slowTimerRef.current = setTimeout(() => setSlowLoading(true), 3000);

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
      const response = await fetchWithRetry('/api/briefing', {
        method: 'POST',
        headers,
        body: JSON.stringify({ category, date: today }),
      });

      const data = await response.json();

      if (!response.ok || data.meta.status === 'error') {
        const code = data.error?.code || 'UNKNOWN';
        if (code === 'INVALID_API_KEY') {
          setError({ message: '서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.', type: 'auth' });
        } else if (code === 'RATE_LIMITED') {
          setError({ message: '잠시 후 다시 시도해주세요.', type: 'rate' });
        } else if (code === 'BUDGET_EXCEEDED' || data.error?.message?.includes('budget')) {
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
      setSlowLoading(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    }
  }, [briefings]);

  const handleRefresh = useCallback(async () => {
    hapticMedium();
    const today = CacheUtils.getTodayDate();
    CacheUtils.clearBriefing(activeCategory, today);
    setBriefings((prev) => {
      const next = { ...prev };
      delete next[activeCategory];
      return next;
    });
    await new Promise((r) => setTimeout(r, 300));
    await loadBriefing(activeCategory);
  }, [activeCategory, loadBriefing]);

  // Dynamic page title + URL based on category
  useEffect(() => {
    const catName = CATEGORIES.find(c => c.id === activeCategory)?.name || '';
    document.title = `${catName} · 아침 브리핑`;
    // Update URL for deep linking without reload
    const url = activeCategory === 'economy'
      ? window.location.pathname
      : `${window.location.pathname}?category=${activeCategory}`;
    window.history.replaceState(null, '', url);
  }, [activeCategory]);

  useEffect(() => {
    loadBriefing(activeCategory);
    track('page_view', { category: activeCategory });
  }, [activeCategory, loadBriefing]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] transition-colors">
      {/* Global toast notifications */}
      <ToastContainer />
      {/* Lazy-loaded non-critical UI */}
      <Suspense fallback={null}>
        <WelcomeToast />
        <UpdateBanner />
      </Suspense>

      {/* Top loading bar — offset for iOS safe area */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
          <div className="h-full bg-gray-900 dark:bg-gray-100 loading-bar" />
        </div>
      )}

      {/* Status bar background cover — prevents scrolled content from showing through */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#1c1c1e]"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
        aria-hidden="true"
      />

      {/* Header — sticky with iOS notch safe area + GPU layer for flicker prevention */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#1c1c1e] border-b border-gray-200/80 dark:border-gray-800 ios-safe-top will-change-transform" style={{ transform: 'translateZ(0)' }}>
        <div className="mx-auto max-w-lg px-4 pb-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">아침 브리핑</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                <span>{getTodayLabel()} · {new Date().getHours() < 12 ? '좋은 아침이에요' : new Date().getHours() < 18 ? '좋은 오후에요' : '좋은 저녁이에요'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isPremiumUnlocked && (() => {
                const trialDays = CacheUtils.getTrialDaysRemaining();
                const inTrial = CacheUtils.isInTrialPeriod();
                if (inTrial && trialDays > 0) {
                  return (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-1 text-xs font-medium">
                      체험 D-{trialDays}
                    </span>
                  );
                }
                return (
                  <span className="rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-1 text-xs font-medium">
                    PRO
                  </span>
                );
              })()}
            </div>
          </div>
          <CategoryTab
            activeCategory={activeCategory}
            onCategoryChange={switchCategory}
          />
        </div>
      </header>

      {/* Trial period banner */}
      <TrialBanner />

      {/* Error banner */}
      {error && (
        <div className={`mx-auto max-w-lg px-4 pt-3`}>
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
            error.type === 'stale' || error.type === 'budget'
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            <span>{error.type === 'stale' ? '📅' : error.type === 'budget' ? '📊' : '⚠️'}</span>
            <span>{error.message}</span>
            {error.type !== 'stale' && error.type !== 'budget' && (
              <button
                onClick={() => {
                  hapticLight();
                  setError(null);
                  setBriefings((prev) => {
                    const next = { ...prev };
                    delete next[activeCategory];
                    return next;
                  });
                  loadBriefing(activeCategory);
                }}
                className="ml-auto text-xs font-medium underline active:scale-95 transition-transform"
              >
                재시도
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cards — swipe to switch categories */}
      <main
        id="main-content"
        className={`mx-auto max-w-lg px-4 pt-4 pb-6 space-y-3 transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="tabpanel"
        aria-roledescription={`panel-${activeCategory}`}
        aria-label={`${CATEGORIES.find(c => c.id === activeCategory)?.name || ''} 브리핑`}
      >
        {/* Market snapshot pills — investment tab only */}
        {activeCategory === 'investment' && (
          <Suspense fallback={null}>
            <MarketSnapshot />
          </Suspense>
        )}

        {loading && !briefing ? (
          <>
            <CardSkeleton isHero />
            <CardSkeleton delay={100} />
            <CardSkeleton delay={200} />
            {slowLoading && (
              <p className="text-center text-xs text-gray-400 pt-2 animate-fade-slide-up">
                AI가 오늘의 뉴스를 분석하고 있어요. 곧 완료됩니다!
              </p>
            )}
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
            <div className="text-3xl mb-3">☕</div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">오늘의 브리핑을 준비하고 있어요</p>
            {typeof navigator !== 'undefined' && 'connection' in navigator &&
              (navigator as unknown as { connection: { effectiveType: string } }).connection?.effectiveType === 'slow-2g' && (
              <p className="text-gray-300 text-xs mt-2">느린 네트워크가 감지되었어요. 잠시만 기다려주세요.</p>
            )}
          </div>
        ) : null}

        {/* [HIDDEN] Watchlist — 핵심 경험과 거리 먼 기능, 유저 확보 후 활성화 */}

        {/* [COMING SOON] Daily Quiz & Poll */}
        {briefing && !loading && (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-[#1c1c1e]/50 px-4 py-3 flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 dark:text-indigo-400" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                오늘의 경제 퀴즈
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                곧 만나요
              </p>
            </div>
            <span className="flex-shrink-0 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
              SOON
            </span>
          </div>
        )}

        {/* Copy entire briefing summary */}
        {briefing && !loading && (
          <button
            onClick={async () => {
              const catName = CATEGORIES.find(c => c.id === activeCategory)?.name || '';
              const lines = briefing.cards
                .filter((c) => c.number === 1 || isPremiumUnlocked)
                .map((c) => `${c.number}. ${c.title}\n   ${c.summary}`);
              const text = `[아침 브리핑 · ${catName}] ${getTodayLabel()}\n\n${lines.join('\n\n')}\n\n👉 https://morning-briefing-mocha.vercel.app`;
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                hapticLight();
                showToast('브리핑 요약이 복사되었어요!', '📋');
                track('copy_briefing', { category: activeCategory });
              }
            }}
            className="mx-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-3 px-4"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            브리핑 요약 복사
          </button>
        )}

        {/* Freshness indicator with relative time */}
        {briefing && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-2">
            {(() => {
              // 에버그린 콘텐츠: 카드 id가 eg_로 시작하면 시간 대신 라벨 표시
              const isEvergreen = briefing.cards.some((c) => c.id.startsWith('eg_'));
              if (isEvergreen) return '인사이트 브리핑';

              if (!briefing.generatedAt) return null;
              const gen = new Date(briefing.generatedAt);
              const now = new Date();
              const diffMs = now.getTime() - gen.getTime();
              const diffMin = Math.floor(diffMs / 60000);
              const h = gen.getHours();
              const m = gen.getMinutes();
              const timeStr = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;

              if (diffMin < 1) return `방금 업데이트됨`;
              if (diffMin < 60) return `${diffMin}분 전 업데이트 (${timeStr})`;
              if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전 업데이트 (${timeStr})`;
              return `${timeStr} 업데이트`;
            })()}
            {' · '}
            {(() => {
              const totalChars = briefing.cards.reduce((sum, c) => sum + (c.content?.length || 0), 0);
              const readMin = Math.max(1, Math.ceil(totalChars / 500));
              return `읽기 ${readMin}분`;
            })()}
          </p>
        )}
      </main>

      {/* Footer with donation — extra bottom padding for iOS home indicator */}
      <footer className="mx-auto max-w-lg px-4 pt-4 space-y-3" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {DONATION_URL && !CacheUtils.isInTrialPeriod() && (
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            ☕ 마음에 드셨다면 커피 한 잔 사주세요
          </a>
        )}
        {/* [HIDDEN] ReferralCard — 유저 0명 단계에서 레퍼럴 무의미 */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 space-y-1">
          <p>© 2026 아침 브리핑 · AI가 매일 아침 정리하는 뉴스</p>
          <p>
            <a href="mailto:thbabu2@gmail.com" className="hover:text-gray-500 transition-colors">
              문의
            </a>
            {' · '}
            <a href="/privacy" className="hover:text-gray-500 transition-colors">
              개인정보처리방침
            </a>
            {' · '}
            <span>{VERSION_LABEL}</span>
          </p>
        </div>
      </footer>

      {/* Paywall modal */}
      <Suspense fallback={null}>
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

      {/* [HIDDEN] NotificationPrompt — VAPID 미구현, 유저 0명 */}
      {/* [HIDDEN] EmailCollector — 뉴스레터 발송 미구현 */}

      {/* PWA install prompt — 리텐션에 유용하므로 유지 */}
      <InstallPrompt />
      </Suspense>
    </div>
    </PullToRefresh>
  );
}
