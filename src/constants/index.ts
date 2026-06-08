export const CATEGORIES = [
  {
    id: 'economy',
    enabled: true,
    name: '경제/시사',
    color: 'sky',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-600',
    badgeClass: 'bg-sky-500',
    borderClass: 'border-sky-500',
    gradientClass: 'card-gradient-economy',
    lightBg: 'bg-sky-500/10',
  },
  {
    id: 'investment',
    enabled: false,
    name: '투자',
    color: 'amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
    badgeClass: 'bg-amber-500',
    borderClass: 'border-amber-500',
    gradientClass: 'card-gradient-investment',
    lightBg: 'bg-amber-500/10',
  },
  {
    id: 'lifestyle',
    enabled: false,
    name: '생활/테크',
    color: 'violet',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-600',
    badgeClass: 'bg-violet-500',
    borderClass: 'border-violet-500',
    gradientClass: 'card-gradient-lifestyle',
    lightBg: 'bg-violet-500/10',
  },
] as const;

/**
 * 현재 노출 중인(활성) 카테고리만 필터링.
 * 탭 UI·스와이프·딥링크는 이 목록을 기준으로 동작한다.
 * 다른 카테고리를 다시 켜려면 CATEGORIES의 해당 항목 enabled를 true로.
 */
export const ACTIVE_CATEGORIES = CATEGORIES.filter((c) => c.enabled);

export const CARD_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  '오늘의핵심': { label: '오늘의 핵심', icon: '🔥' },
  '영향분석': { label: '영향 분석', icon: '📊' },
  '실전인사이트': { label: '실전 인사이트', icon: '💡' },
};

export const CACHE_CONFIG = {
  DURATION_MINUTES: 24 * 60,
};

export const API_CONFIG = {
  BRIEFING_ENDPOINT: '/api/briefing',
  REQUEST_TIMEOUT_MS: 30000,
};

export function getTodayLabel(): string {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const day = days[now.getDay()];
  return `${month}월 ${date}일 ${day}요일`;
}

export function getCategoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}
