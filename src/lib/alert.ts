/**
 * Owner-only alerting via Telegram Bot API.
 *
 * 운영자(본인)에게만 가는 알림 채널. 전체 유저 push와 분리되어 있어
 * "생성 실패" 같은 운영 메시지가 일반 구독자에게 새지 않는다.
 *
 * 설정: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 환경변수.
 * 미설정 시 graceful no-op (false 반환). 절대 throw 하지 않는다 —
 * 알림 실패가 호출부(cron 등)를 깨뜨리면 안 되기 때문.
 */
export async function sendOwnerAlert(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Alert] Telegram not configured (TELEGRAM_BOT_TOKEN/CHAT_ID) — skipping owner alert');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[Alert] Telegram send failed: ${res.status} ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Alert] Telegram send error:', err);
    return false;
  }
}
