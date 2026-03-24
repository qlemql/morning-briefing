import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-gray-900 text-white px-6 py-3 font-semibold text-sm hover:bg-gray-800 transition"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
