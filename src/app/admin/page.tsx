'use client';

import { useState, useEffect, useCallback } from 'react';

interface BudgetData {
  today: {
    calls: number;
    estimatedCostCents: number;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  const fetchData = useCallback(async (secretKey: string) => {
    setLoading(true);
    setError('');

    try {
      const [analyticsRes, subscribersRes] = await Promise.all([
        fetch(`/api/analytics?secret=${encodeURIComponent(secretKey)}`),
        fetch(`/api/subscribe?secret=${encodeURIComponent(secretKey)}`),
      ]);

      if (!analyticsRes.ok || !subscribersRes.ok) {
        setError('인증 실패. CRON_SECRET을 확인해주세요.');
        return;
      }

      const analyticsData = await analyticsRes.json();
      const subscribersData = await subscribersRes.json();

      setAnalytics(analyticsData.data);
      setSubscribers(subscribersData);
      setAuthenticated(true);
    } catch {
      setError('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 text-center mb-6">관리자 대시보드</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CRON_SECRET
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData(secret)}
              placeholder="시크릿 키 입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 mb-3"
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
  const budgetPct = budget
    ? Math.min(100, Math.round((budget.estimatedCostCents / budget.budgetCents) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">아침 브리핑 대시보드</h1>
          <button
            onClick={() => fetchData(secret)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            새로고침
          </button>
        </div>

        {/* Manual Cron Trigger */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">브리핑 수동 생성</h2>
              <p className="text-xs text-gray-500 mt-1">오늘자 브리핑을 즉시 생성합니다 (3 카테고리)</p>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">API 예산</h2>
              <span className="text-xs text-gray-500">
                오늘 {budget.calls}회 호출 · ~${(budget.estimatedCostCents / 100).toFixed(2)} / ${(budget.budgetCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPct > 80 ? 'bg-red-500' : budgetPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {budgetPct}% 사용 · 남은 호출 ~{Math.max(0, Math.floor((budget.budgetCents - budget.estimatedCostCents) / 3))}회
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">카테고리별 조회</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(analytics.today.categoryViews).map(([cat, count]) => (
                <div key={cat} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500 mt-1">{CATEGORY_LABELS[cat] || cat}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {analytics?.history && analytics.history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">최근 7일</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">날짜</th>
                    <th className="pb-2 pr-4">PV</th>
                    <th className="pb-2 pr-4">UV</th>
                    <th className="pb-2">공유</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.history.map((day) => (
                    <tr key={day.date} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-gray-700">{day.date}</td>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">
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
      </div>
    </div>
  );
}

function KPICard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
