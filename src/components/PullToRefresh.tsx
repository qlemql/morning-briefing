'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Diminishing pull effect
      const distance = Math.min(MAX_PULL, delta * 0.5);
      setPullDistance(distance);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
      >
        <div
          className={`w-8 h-8 flex items-center justify-center transition-transform duration-200 ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}
