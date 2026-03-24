'use client';

import { CATEGORIES } from '@/constants';

interface CategoryTabProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryTab({
  activeCategory,
  onCategoryChange,
}: CategoryTabProps) {
  return (
    <div className="flex gap-1">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? `${cat.badgeClass} text-white shadow-sm`
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
