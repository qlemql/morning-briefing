'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BriefingCard as BriefingCardType } from '@/lib/types';
import { CARD_TYPE_LABELS, getCategoryById } from '@/constants';

interface BriefingCardProps {
  card: BriefingCardType;
  categoryId: string;
  isPaywalled: boolean;
  isPremiumUnlocked: boolean;
  onPaywallClick: () => void;
  /** Stagger delay for entrance animation (ms) */
  delay?: number;
}

/** Copy card summary + title for sharing */
function shareCard(card: BriefingCardType) {
  const text = `[아침 브리핑] ${card.title}\n${card.summary}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title: '아침 브리핑', text }).catch(() => {
      // user cancelled or not supported — fall back to clipboard
      navigator.clipboard?.writeText(text);
    });
  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

export default function BriefingCard({
  card,
  categoryId,
  isPaywalled,
  isPremiumUnlocked,
  onPaywallClick,
  delay = 0,
}: BriefingCardProps) {
  const [expanded, setExpanded] = useState(card.number === 1);
  const [entered, setEntered] = useState(delay === 0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const shouldBlur = isPaywalled && !isPremiumUnlocked;
  const category = getCategoryById(categoryId);
  const typeInfo = CARD_TYPE_LABELS[card.type] || { label: card.type, icon: '📌' };

  // Entrance animation stagger
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setEntered(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  // Measure content height for smooth accordion
  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, []);

  useEffect(() => {
    measureHeight();
  }, [expanded, card.content, measureHeight]);

  return (
    <div
      className={`relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all duration-300 ease-out ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      {/* Card header — always visible */}
      <div
        className={`p-5 ${!shouldBlur ? 'cursor-pointer active:bg-gray-50 transition-colors' : ''}`}
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

            {/* Summary */}
            <p className="mt-1 text-sm text-gray-500">{card.summary}</p>
          </div>

          {/* Expand indicator with rotation animation */}
          {!shouldBlur && (
            <span
              className={`text-gray-400 text-sm mt-1 transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              ▼
            </span>
          )}
        </div>
      </div>

      {/* Animated content area */}
      {!shouldBlur && (
        <div
          style={{ maxHeight: expanded ? (contentHeight ?? 1000) : 0 }}
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        >
          <div ref={contentRef} className="px-5 pb-5 border-t border-gray-50">
            <div className="pt-4 text-base text-gray-700 leading-relaxed whitespace-pre-line">
              {card.content}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {card.source && (
                <p className="text-xs text-gray-400">출처: {card.source}</p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  shareCard(card);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                aria-label="공유"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                공유
              </button>
            </div>
          </div>
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
              className={`${category.badgeClass} text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 active:scale-95 transition`}
            >
              전체 브리핑 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
