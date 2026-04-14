import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 — 아침 브리핑',
  description: '아침 브리핑 서비스의 개인정보처리방침입니다.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-block transition-colors"
        >
          ← 홈으로
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">개인정보처리방침</h1>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">1. 수집하는 개인정보</h2>
            <p>
              아침 브리핑은 서비스 제공을 위해 최소한의 정보만 수집합니다.
              이메일 뉴스레터 구독 시 이메일 주소를 수집하며, 서비스 이용 시
              IP 주소 기반의 익명화된 방문 통계를 수집합니다.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">2. 수집 목적</h2>
            <p>
              수집된 정보는 뉴스레터 발송, 서비스 개선을 위한 통계 분석,
              부정 이용 방지 목적으로만 사용됩니다.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">3. 보유 및 이용 기간</h2>
            <p>
              이메일 주소는 구독 취소 시까지 보관되며, 방문 통계는 30일간
              보관 후 자동 삭제됩니다.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">4. 제3자 제공</h2>
            <p>
              수집된 개인정보는 제3자에게 제공되지 않습니다. 다만, 서비스
              운영에 필요한 인프라 제공업체(Vercel, Upstash)에 데이터가
              저장될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">5. AI 기술 사용 안내</h2>
            <p className="mb-2">
              본 서비스는 Anthropic의 Claude AI를 활용하여 뉴스 콘텐츠를 분석하고 요약합니다.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>AI 처리 대상: 공개된 뉴스 기사 URL 및 본문 (사용자 개인정보가 아닌 공개 정보)</li>
              <li>사용자의 개인정보(이메일, IP 등)는 AI 모델 학습에 사용되지 않습니다</li>
              <li>AI 생성 콘텐츠는 자동화된 분석이며, 투자 조언이 아닙니다</li>
              <li>
                Anthropic 개인정보 처리방침:{' '}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:underline"
                >
                  https://www.anthropic.com/privacy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">6. 이용자의 권리</h2>
            <p>
              이용자는 언제든지 이메일 구독을 취소하거나, 수집된 개인정보의
              열람, 정정, 삭제를 요청할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">7. 문의</h2>
            <p>
              개인정보 관련 문의는{' '}
              <a href="mailto:thbabu2@gmail.com" className="text-sky-600 hover:underline">
                thbabu2@gmail.com
              </a>
              으로 연락해주세요.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4">
            시행일: 2026년 3월 27일
          </p>
        </div>
      </div>
    </div>
  );
}
