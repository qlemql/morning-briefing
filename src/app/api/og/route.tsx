import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  // KST date
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[now.getDay()];
  const dateStr = `${month}월 ${day}일 ${weekday}요일`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '100px',
              fontSize: '20px',
              fontWeight: 600,
            }}
          >
            AI 뉴스 브리핑
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '16px',
            letterSpacing: '-1px',
          }}
        >
          아침 브리핑
        </div>

        {/* Date */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '40px',
          }}
        >
          {dateStr}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['경제/시사', '투자', '실전 인사이트'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                padding: '12px 28px',
                borderRadius: '16px',
                fontSize: '22px',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          매일 아침 AI가 정리하는 경제·투자 뉴스 3장 카드
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
