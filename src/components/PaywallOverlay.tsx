'use client';

interface PaywallOverlayProps {
  onUnlock: () => void;
  onClose: () => void;
  isVisible: boolean;
  donationUrl?: string;
}

export default function PaywallOverlay({
  onUnlock,
  onClose,
  isVisible,
  donationUrl,
}: PaywallOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 sm:mx-4 shadow-2xl">
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5 sm:hidden" />

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          전체 브리핑 보기
        </h2>

        <p className="text-gray-500 text-sm mb-5">
          깊이 있는 영향 분석과 실전 인사이트를 확인하세요.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-green-500">✓</span>
            <span><strong>영향분석</strong> — 뉴스가 내 삶에 미치는 영향</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-green-500">✓</span>
            <span><strong>실전인사이트</strong> — 바로 쓸 수 있는 전략</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-green-500">✓</span>
            <span>경제/시사 + 투자 <strong>2개 카테고리</strong> 전체</span>
          </div>
        </div>

        {/* Unlock button */}
        <button
          onClick={onUnlock}
          className="w-full rounded-xl bg-gray-900 text-white py-3.5 font-semibold text-base hover:bg-gray-800 transition mb-3"
        >
          오늘의 전체 브리핑 보기
        </button>

        {/* Donation link */}
        {donationUrl && (
          <a
            href={donationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-xl border border-gray-200 text-gray-600 py-3 text-sm font-medium hover:bg-gray-50 transition mb-3"
          >
            ☕ 커피 한 잔으로 응원하기
          </a>
        )}

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-gray-400 py-2 hover:text-gray-600 transition"
        >
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
