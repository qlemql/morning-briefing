'use client';

import { useState, useEffect, useCallback } from 'react';

interface BudgetData {
  today: {
    spentCents: number;
    budgetCents: number;
  };
  month?: {
    spentCents: number;
    budgetCents: number;
  };
}

interface AnalyticsData {
  today: {
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    shares: number;
    paywallClicks: number;
    unlocks: number;
    conversionRate: string;
    categoryViews: Record<string, number>;
  };
  history: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    shares: number;
  }>;
  budget?: BudgetData;
}

interface SubscriberData {
  count: number;
  emails: string[];
}

interface SNSQueueData {
  available: boolean;
  counts: Record<string, number>;
}

interface HealthData {
  status: string;
  responseMs: number;
  checks: Record<string, { ok: boolean; detail?: string }>;
}

interface ReviewCardPreview {
  number: number;
  title: string;
  summary: string;
  content: string;
}

interface ReviewCategoryData {
  status: 'approved' | 'pending';
  cards: ReviewCardPreview[];
}

interface ReviewData {
  date: string;
  autoPublish: boolean;
  autoPublishTime: string;
  categories: Record<string, ReviewCategoryData>;
}

const CATEGORY_LABELS: Record<string, string> = {
  economy: '경제',
  investment: '투자',
  lifestyle: '생활/테크',
};

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [snsQueue, setSnsQueue] = useState<SNSQueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});

  const fetchReviewData = useCallback(async (secretKey: string) => {
    try {
      const res = await fetch('/api/admin/review', {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReviewData(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchData = useCallback(async (secretKey: string) => {
    setLoading(true);
    setError('');

    try {
      const authHeaders = { Authorization: `Bearer ${secretKey}` };
      const [analyticsRes, subscribersRes, healthRes, snsQueueRes] = await Promise.all([
        fetch('/api/analytics', { headers: authHeaders }),
        fetch('/api/subscribe', { headers: authHeaders }),
        fetch('/api/health').catch(() => null),
        fetch('/api/sns-queue', { headers: authHeaders }).catch(() => null),
      ]);

      if (!analyticsRes.ok || !subscribersRes.ok) {
        setError('인증 실패. CRON_SECRET을 확인해주세요.');
        return;
      }

      const analyticsData = await analyticsRes.json();
      const subscribersData = await subscribersRes.json();
      if (healthRes?.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
      if (snsQueueRes?.ok) {
        const snsData = await snsQueueRes.json();
        setSnsQueue(snsData);
      }

      setAnalytics(analyticsData.data);
      setSubscribers(subscribersData.data ?? subscribersData);
      setAuthenticated(true);
      setLastRefresh(new Date().toLocaleTimeString('ko-KR'));

      // 검수 데이터도 함께 로드
      fetchReviewData(secretKey);
    } catch {
      setError('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchReviewData]);

  const toggleReview = useCallback(async (category: string, action: 'approve' | 'pending') => {
    setReviewLoading((prev) => ({ ...prev, [category]: true }));
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ category, action }),
      });
      if (res.ok) {
        await fetchReviewData(secret);
      }
    } catch {
      // silently fail
    } finally {
      setReviewLoading((prev) => ({ ...prev, [category]: false }));
    }
  }, [secret, fetchReviewData]);

  const triggerCron = useCallback(async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (res.ok) {
        const results = Object.entries(data.results || {})
          .map(([k, v]) => `${CATEGORY_LABELS[k] || k}: ${v}`)
          .join(', ');
        setCronResult(`성공 (${(data.elapsedMs / 1000).toFixed(1)}s) — ${results}`);
        // Refresh dashboard data after cron
        setTimeout(() => fetchData(secret), 2000);
      } else {
        setCronResult(`실패: ${data.error || res.statusText}`);
      }
    } catch {
      setCronResult('네트워크 오류');
    } finally {
      setCronRunning(false);
    }
  }, [secret, fetchData]);

  useEffect(() => {
    if (!authenticated || !secret) return;
    const interval = setInterval(() => fetchData(secret), 30000);
    return () => clearInterval(interval);
  }, [authenticated, secret, fetchData]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#111111] p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-6">관리자 대시보드</h1>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CRON_SECRET
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData(secret)}
              placeholder="시크릿 키 입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-gray-100/20 mb-3"
            />
            <button
              onClick={() => fetchData(secret)}
              disabled={loading || !secret}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '로딩...' : '로그인'}
            </button>
            {error && <p className="text-xs text-red-500 mt-3 text-center">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  const budget = analytics?.budget?.today;
  const budgetPct = budget && budget.budgetCents > 0
    ? Math.min(100, Math.round((budget.spentCents / budget.budgetCents) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">아침 브리핑 대시보드</h1>
            {lastRefresh && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">마지막 업데이트: {lastRefresh} · 30초마다 자동 갱신</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {health && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                health.status === 'healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {health.status === 'healthy' ? '● 정상' : '● 점검'}
              </span>
            )}
            <button
              onClick={() => fetchData(secret)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* Manual Cron Trigger */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">브리핑 수동 생성</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">오늘자 브리핑을 즉시 생성합니다 (3 카테고리)</p>
            </div>
            <button
              onClick={triggerCron}
              disabled={cronRunning}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
            >
              {cronRunning ? '생성 중...' : '지금 생성'}
            </button>
          </div>
          {cronResult && (
            <p className={`text-xs mt-3 ${cronResult.startsWith('성공') ? 'text-emerald-600' : 'text-red-500'}`}>
              {cronResult}
            </p>
          )}
        </div>

        {/* Briefing Review Section */}
        {reviewData && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">오늘의 브리핑 검수</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {reviewData.date} | 자동 게시: {reviewData.autoPublishTime}
                  {reviewData.autoPublish && (
                    <span className="ml-2 text-emerald-600 font-semibold">[자동 게시됨]</span>
                  )}
                </p>
              </div>
              {!reviewData.autoPublish && <AutoPublishTimer />}
            </div>

            <div className="space-y-4">
              {(['economy', 'investment', 'lifestyle'] as const).map((cat) => {
                const catData = reviewData.categories[cat];
                if (!catData) return null;
                const isApproved = catData.status === 'approved';
                const isLoading = reviewLoading[cat] || false;

                return (
                  <div
                    key={cat}
                    className={`rounded-xl border p-4 ${
                      isApproved
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }`}
                        >
                          {isApproved ? '승인됨' : '보류'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleReview(cat, 'approve')}
                          disabled={isLoading || isApproved}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                        >
                          {isLoading ? '...' : '승인'}
                        </button>
                        <button
                          onClick={() => toggleReview(cat, 'pending')}
                          disabled={isLoading || !isApproved}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 bg-amber-500 text-white hover:bg-amber-600 active:scale-95"
                        >
                          {isLoading ? '...' : '보류'}
                        </button>
                      </div>
                    </div>

                    {/* Card Previews */}
                    {catData.cards.length > 0 ? (
                      <div className="space-y-2">
                        {catData.cards.map((card) => (
                          <div
                            key={`${cat}-${card.number}`}
                            className="bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {card.number}
                              </span>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {card.title}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{card.summary}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                              {card.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        아직 브리핑이 생성되지 않았습니다.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Budget Warning */}
        {budget && budgetPct > 80 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-700">API 예산 경고</p>
              <p className="text-xs text-red-600 mt-0.5">
                오늘 예산의 {budgetPct}%를 사용했습니다. 남은 호출이 부족할 수 있어요.
              </p>
            </div>
          </div>
        )}

        {/* Budget Section */}
        {budget && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">API 예산</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                오늘 ~${(budget.spentCents / 100).toFixed(2)} / ${(budget.budgetCents / 100).toFixed(2)}
                {analytics?.budget?.month && (
                  <span className="ml-2 text-gray-400 dark:text-gray-500">
                    · 월 ${(analytics.budget.month.spentCents / 100).toFixed(2)}/${(analytics.budget.month.budgetCents / 100).toFixed(2)}
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPct > 80 ? 'bg-red-500' : budgetPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {budgetPct}% 사용 · 남은 ~${Math.max(0, (budget.budgetCents - budget.spentCents) / 100).toFixed(2)}
            </p>
          </div>
        )}

        {/* KPI Cards */}
        {analytics?.today && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KPICard label="오늘 방문" value={analytics.today.pageViews} icon="👀" />
            <KPICard label="순 방문자" value={analytics.today.uniqueVisitors} icon="👤" />
            <KPICard label="공유" value={analytics.today.shares} icon="🔗" />
            <KPICard label="전환율" value={analytics.today.conversionRate} icon="💰" />
            <KPICard label="페이월 클릭" value={analytics.today.paywallClicks} icon="🔒" />
            <KPICard label="언락" value={analytics.today.unlocks} icon="🔓" />
            <KPICard label="구독자" value={subscribers?.count || 0} icon="📧" />
          </div>
        )}

        {/* Category Views */}
        {analytics?.today?.categoryViews && Object.keys(analytics.today.categoryViews).length > 0 && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">카테고리별 조회</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(analytics.today.categoryViews).map(([cat, count]) => (
                <div key={cat} className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{CATEGORY_LABELS[cat] || cat}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {analytics?.history && analytics.history.length > 0 && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">최근 7일</h2>
            {/* Mini bar chart */}
            {(() => {
              const maxPV = Math.max(...analytics.history.map(d => d.pageViews), 1);
              return (
                <div className="flex items-end gap-1.5 h-20 mb-4">
                  {analytics.history.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{day.pageViews || ''}</span>
                      <div
                        className="w-full bg-gray-900 dark:bg-gray-300 rounded-t transition-all"
                        style={{ height: `${Math.max(2, (day.pageViews / maxPV) * 48)}px` }}
                      />
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{day.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b">
                    <th className="pb-2 pr-4">날짜</th>
                    <th className="pb-2 pr-4">PV</th>
                    <th className="pb-2 pr-4">UV</th>
                    <th className="pb-2">공유</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.history.map((day) => (
                    <tr key={day.date} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{day.date}</td>
                      <td className="py-2 pr-4">{day.pageViews}</td>
                      <td className="py-2 pr-4">{day.uniqueVisitors}</td>
                      <td className="py-2">{day.shares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscribers */}
        {subscribers && subscribers.emails.length > 0 && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
              구독자 ({subscribers.count}명)
            </h2>
            <div className="space-y-1">
              {subscribers.emails.map((email) => (
                <div key={email} className="text-sm text-gray-600 py-1">
                  {email}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SNS Queue */}
        {snsQueue && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">SNS 포스팅 큐</h2>
              {!snsQueue.available && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Redis 미연결
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(snsQueue.counts).map(([platform, count]) => {
                const labels: Record<string, string> = {
                  twitter: 'Twitter/X',
                  threads: 'Threads',
                  instagram: 'Instagram',
                };
                return (
                  <div key={platform} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{labels[platform] || platform}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">대기중</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* System Status */}
        {health && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">시스템 상태 ({health.responseMs}ms)</h2>
            <div className="space-y-2">
              {Object.entries(health.checks).map(([key, check]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${check.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{check.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">바로가기</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="text-sm px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              🌐 사이트 보기
            </a>
            <a href="https://github.com/qlemql/morning-briefing" target="_blank" rel="noreferrer" className="text-sm px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              📦 GitHub
            </a>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-sm px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              ▲ Vercel
            </a>
            <a href="https://console.upstash.com" target="_blank" rel="noreferrer" className="text-sm px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              🗄️ Upstash
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

/**
 * 06:50 KST까지 남은 시간 카운트다운 타이머
 */
function AutoPublishTimer() {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date(Date.now() + 9 * 3600 * 1000);
      const target = new Date(now);
      target.setUTCHours(6, 50, 0, 0);

      if (now >= target) {
        setRemaining('자동 게시됨');
        return;
      }

      const diff = target.getTime() - now.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}분 ${secs.toString().padStart(2, '0')}초`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-right">
      <div className="text-xs text-gray-500 dark:text-gray-400">자동 게시까지</div>
      <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
        {remaining}
      </div>
    </div>
  );
}
