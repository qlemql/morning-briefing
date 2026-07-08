/**
 * 운영자(Telegram) 알림 메시지 빌더 — cron 실행부와 알림 테스트 엔드포인트가
 * 동일 문구를 쓰도록 한곳에서 관리한다. (미리보기와 실제 알림이 절대 갈리지 않게)
 */

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://morning-briefing-mocha.vercel.app';
}

/** Telegram HTML parse_mode 안전용 — 원본 응답 스니펫 등에 <,>,&가 있어도 깨지지 않게. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function adminUrl(): string {
  return `${siteUrl()}/admin`;
}

/** 🔴 Anthropic 크레딧 소진 — 결제 필요 (API가 "credit balance too low" 반환 시) */
export function creditExhaustedAlert(opts: { date: string; source: string }): string {
  return (
    `🔴 <b>Anthropic 크레딧 소진 — 결제 필요</b>\n` +
    `날짜: ${opts.date} · 트리거: ${opts.source}\n\n` +
    `API가 "credit balance too low"를 반환해 브리핑 생성이 <b>전면 중단</b>됐습니다. ` +
    `지금 사이트는 evergreen 폴백을 서빙 중이며, 충전 전까지 매 실행 실패합니다.\n\n` +
    `▶ 충전(auto-reload 권장):\nhttps://console.anthropic.com/settings/billing\n\n` +
    `▶ 충전 후 재생성:\n${adminUrl()}`
  );
}

/** 🚨 아침브리핑 생성 실패 (크레딧 외 일반 실패: JSON 파싱 실패 등) */
export function generationFailedAlert(opts: { date: string; source: string; result: string }): string {
  return (
    `🚨 <b>아침브리핑 생성 실패</b>\n날짜: ${opts.date}\n트리거: ${opts.source}\n` +
    `결과: ${escapeHtml(opts.result)}\n\n어드민에서 재생성하세요:\n${adminUrl()}`
  );
}

/** ✅ 아침브리핑 자동 복구 (1차 생성 누락을 워치독이 재생성) */
export function watchdogRecoveredAlert(opts: { date: string }): string {
  return `✅ <b>아침브리핑 자동 복구</b>\n날짜: ${opts.date}\n1차 생성이 빠졌지만 워치독이 재생성했어요.`;
}

/** 🟡/🔴 크레딧 잔액 저잔액 경보 (추정 잔액이 임계값 이하일 때, 선제) */
export function creditLowAlert(opts: { remainingCents: number; level: 'warn' | 'urgent' }): string {
  const usd = (opts.remainingCents / 100).toFixed(2);
  const icon = opts.level === 'urgent' ? '🔴' : '🟡';
  const head = opts.level === 'urgent' ? '크레딧 잔액 긴급 (곧 소진)' : '크레딧 잔액 낮음';
  return (
    `${icon} <b>${head}</b>\n` +
    `추정 잔액: ~$${usd}\n\n` +
    `방치 시 "credit balance too low"로 생성이 전면 중단됩니다. 충전을 권장해요.\n` +
    `▶ 충전: https://console.anthropic.com/settings/billing\n\n` +
    `충전 후엔 원장에 반영하세요 (Credit Ledger 워크플로: topup 또는 set).`
  );
}

/** 🟢 아침브리핑 생성 완료 (정상적으로 새로 생성됐을 때 — 멱등 재실행에는 발송 안 함) */
export function generationCompletedAlert(opts: {
  date: string;
  source: string;
  cardCount: number;
  firstTitle: string;
}): string {
  const headline = opts.firstTitle ? `\n📰 "${opts.firstTitle}"` : '';
  return (
    `🟢 <b>아침브리핑 생성 완료</b>\n` +
    `날짜: ${opts.date} · 트리거: ${opts.source} · 카드 ${opts.cardCount}장${headline}\n\n` +
    `${siteUrl()}`
  );
}
