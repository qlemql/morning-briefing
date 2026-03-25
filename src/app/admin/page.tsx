'use client';

import { useState, useEffect } from 'react';

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
}

interface SubscriberData {
  count: number;
  emails: string[];
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (secretKey: string) => {
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
  };

  useEffect(() => {
    // Auto-refresh every 30 seconds if authenticated
    if (!authenticated || !secret) return;
    const interval = setInterval(() => fetchData(secret), 30000);
    return () => clearInterval(interval);
  }, [authenticated, secret]);

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
            <KPICard
              label="카테고리"
              value={Object.entries(analytics.today.categoryViews || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ') || '-'}
              icon="📊"
            />
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
