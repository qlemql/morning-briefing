'use client';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _error; // suppress unused warning
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          문제가 발생했습니다
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          잠시 후 다시 시도해주세요. 문제가 계속되면 페이지를 새로고침해보세요.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-gray-900 text-white px-6 py-3 font-semibold text-sm hover:bg-gray-800 transition"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
