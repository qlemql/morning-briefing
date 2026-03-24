'use client';

export default function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
