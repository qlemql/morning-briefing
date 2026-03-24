'use client';

import { useState } from 'react';
import { BriefingCard as BriefingCardType } from '@/lib/types';
import { CARD_TYPE_LABELS, getCategoryById } from '@/constants';

interface BriefingCardProps {
  card: BriefingCardType;
  categoryId: string;
  isPaywalled: boolean;
  isPremiumUnlocked: boolean;
  onPaywallClick: () => void;
}

export default function BriefingCard({
  card,
  categoryId,
  isPaywalled,
  isPremiumUnlocked,
  onPaywallClick,
}: BriefingCardProps) {
  const [expanded, setExpanded] = useState(card.number === 1);
  const shouldBlur = isPaywalled && !isPremiumUnlocked;
  const category = getCategoryById(categoryId);
  const typeInfo = CARD_TYPE_LABELS[card.type] || { label: card.type, icon: '📌' };

  return (
    <div className="relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Card header - always visible */}
      <div
        className={`p-5 ${!shouldBlur ? 'cursor-pointer' : ''}`}
        onClick={() => !shouldBlur && setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          {/* Number badge */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full ${category.badgeClass} text-white flex items-center justify-center font-bold text-lg`}
          >
            {card.number}
          </div>

          <div className="flex-1 min-w-0">
            {/* Type label */}
            <span className={`inline-block text-xs font-medium ${category.textClass} mb-1`}>
              {typeInfo.icon} {typeInfo.label}
              {card.number === 1 && (
                <span className="ml-2 text-green-600 font-semibold">FREE</span>
              )}
            </span>

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-900 leading-snug">{card.title}</h3>

            {/* Summary - always visible even behind paywall */}
            <p className="mt-1 text-sm text-gray-500">{card.summary}</p>
          </div>

          {/* Expand indicator */}
          {!shouldBlur && (
            <span className="text-gray-400 text-sm mt-1">
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && !shouldBlur && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="pt-4 text-base text-gray-700 leading-relaxed whitespace-pre-line">
            {card.content}
          </div>
          {card.source && (
            <p className="mt-3 text-xs text-gray-400">출처: {card.source}</p>
          )}
        </div>
      )}

      {/* Paywall overlay */}
      {shouldBlur && (
        <div className="px-5 pb-5">
          <div className="relative rounded-xl bg-gray-50 p-6 text-center">
            <div className="text-gray-400 text-sm mb-3">
              이 카드의 전체 내용은 프리미엄 전용입니다
            </div>
            <button
              onClick={onPaywallClick}
              className={`${category.badgeClass} text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition`}
            >
              전체 브리핑 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
