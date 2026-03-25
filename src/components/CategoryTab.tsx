'use client';

import { useRef, useEffect, useState } from 'react';
import { CATEGORIES } from '@/constants';

interface CategoryTabProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryTab({
  activeCategory,
  onCategoryChange,
}: CategoryTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector(`[data-category="${activeCategory}"]`) as HTMLElement;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeCategory]);

  return (
    <nav aria-label="브리핑 카테고리">
      <div ref={containerRef} className="relative flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist">
        {/* Sliding indicator */}
        <div
          className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm tab-indicator"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          aria-hidden="true"
        />

        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              role="tab"
              data-category={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              aria-selected={isActive}
              aria-controls={`panel-${cat.id}`}
              className={`relative z-10 flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
