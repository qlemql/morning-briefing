'use client';

export default function CardSkeleton({ isHero = false, delay = 0 }: { isHero?: boolean; delay?: number }) {
  const style = delay > 0 ? { animationDelay: `${delay}ms`, opacity: 0, animation: `fadeSlideUp 0.4s ease-out ${delay}ms forwards` } : {};

  if (isHero) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-lg" style={style}>
        <div className="card-gradient-hero p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 w-24 rounded-full bg-white/10 skeleton-shimmer" />
          </div>
          <div className="h-7 w-3/4 rounded bg-white/10 skeleton-shimmer mb-3" />
          <div className="h-4 w-full rounded bg-white/5 skeleton-shimmer mb-2" />
          <div className="h-4 w-2/3 rounded bg-white/5 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5" style={style}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gray-100 skeleton-shimmer flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 w-20 rounded bg-gray-100 skeleton-shimmer mb-2" />
          <div className="h-5 w-3/4 rounded bg-gray-100 skeleton-shimmer mb-2" />
          <div className="h-3 w-full rounded bg-gray-50 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
