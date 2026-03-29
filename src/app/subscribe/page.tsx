import Link from 'next/link';
import { SUBSCRIPTION_PRICE, ANNUAL_SUBSCRIPTION_PRICE, TRIAL_DAYS } from '@/lib/payment';

export const metadata = {
  title: '구독하기 — 아침 브리핑',
  description: '매일 아침, AI가 정리하는 깊이 있는 뉴스 브리핑을 구독하세요. 월 3,900원.',
};

const DONATION_URL = 'https://qr.kakaopay.com/Fa0mKvPtZ';

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const benefits = [
  { title: '영향분석', desc: '뉴스가 내 삶에 미치는 영향을 구체적으로 분석' },
  { title: '실전 인사이트', desc: '바로 쓸 수 있는 전략과 액션 아이템' },
  { title: '전체 카테고리', desc: '경제, 투자, 생활, 테크 모든 분야' },
  { title: '마켓 스냅샷', desc: '주요 지표와 시장 흐름 한눈에 파악' },
  { title: '매일 아침 업데이트', desc: '출근 전 5분이면 충분한 브리핑' },
];

export default function SubscribePage() {
  const monthlyPrice = SUBSCRIPTION_PRICE.toLocaleString();
  const annualPrice = ANNUAL_SUBSCRIPTION_PRICE.toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] px-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-block transition-colors"
        >
          ← 홈으로
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            프리미엄 브리핑 구독
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            매일 아침, 깊이 있는 분석으로 하루를 시작하세요.
          </p>
        </div>

        {/* Trial banner */}
        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-sky-700 dark:text-sky-300 text-sm font-medium">
            처음 {TRIAL_DAYS}일은 무료로 모든 카드를 열람할 수 있어요
          </p>
        </div>

        {/* Pricing cards */}
        <div className="space-y-4 mb-8">
          {/* Monthly plan */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border-2 border-gray-900 dark:border-gray-100 p-6 relative">
            <div className="absolute -top-3 left-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
              추천
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                월 {monthlyPrice}원
              </span>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              커피 한 잔 가격
            </p>
            <button
              disabled
              className="w-full rounded-xl bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-3.5 font-semibold text-base cursor-not-allowed"
            >
              준비 중
            </button>
          </div>

          {/* Annual plan */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                월 {annualPrice}원
              </span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                26% 할인
              </span>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              연간 결제 시 (연 {(ANNUAL_SUBSCRIPTION_PRICE * 12).toLocaleString()}원)
            </p>
            <button
              disabled
              className="w-full rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 py-3.5 font-semibold text-base cursor-not-allowed"
            >
              준비 중
            </button>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            구독하면 이런 것들을 받아요
          </h2>
          <div className="space-y-3">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <CheckIcon />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.title}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400"> — {b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KakaoPay donation — current alternative */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
            지금은 카카오페이로 후원할 수 있어요
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            정식 결제 시스템은 준비 중입니다. 커피 한 잔 가격으로 응원해주시면 오늘 하루 전체 브리핑이 열립니다.
          </p>
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-xl bg-amber-500 text-white py-3.5 font-semibold text-base hover:bg-amber-600 transition"
          >
            카카오페이로 후원하기
          </a>
        </div>

        {/* FAQ */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">자주 묻는 질문</h2>

          <details className="group bg-white dark:bg-[#1c1c1e] rounded-xl p-4">
            <summary className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer list-none flex items-center justify-between">
              무료 체험은 어떻게 시작하나요?
              <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9662;</span>
            </summary>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              처음 방문하면 자동으로 {TRIAL_DAYS}일 무료 체험이 시작됩니다. 별도 가입이나 결제 정보 입력 없이 모든 카드를 열람할 수 있어요.
            </p>
          </details>

          <details className="group bg-white dark:bg-[#1c1c1e] rounded-xl p-4">
            <summary className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer list-none flex items-center justify-between">
              결제는 언제부터 가능한가요?
              <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9662;</span>
            </summary>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              현재 사업자등록을 진행 중이며, 완료 후 토스페이먼츠를 통한 정식 결제가 가능해집니다. 그 전까지는 카카오페이 후원으로 전체 브리핑을 열어볼 수 있어요.
            </p>
          </details>

          <details className="group bg-white dark:bg-[#1c1c1e] rounded-xl p-4">
            <summary className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer list-none flex items-center justify-between">
              구독 취소는 어떻게 하나요?
              <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9662;</span>
            </summary>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              결제 시스템 오픈 후, 설정에서 언제든 원클릭으로 구독을 취소할 수 있습니다. 남은 기간은 끝까지 이용 가능합니다.
            </p>
          </details>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>문의: thbabu2@gmail.com</p>
          <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </div>
  );
}
