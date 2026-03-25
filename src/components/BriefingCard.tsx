'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { BriefingCard as BriefingCardType } from '@/lib/types';
import { CARD_TYPE_LABELS, getCategoryById } from '@/constants';
import { track } from '@/lib/track';

interface BriefingCardProps {
  card: BriefingCardType;
  categoryId: string;
  isPaywalled: boolean;
  isPremiumUnlocked: boolean;
  onPaywallClick: () => void;
  delay?: number;
}

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="2 4 6 8 10 4" />
  </svg>
);

async function shareCard(card: BriefingCardType): Promise<boolean> {
  const text = `[아침 브리핑] ${card.title}\n\n${card.summary}\n\n매일 아침 AI가 정리하는 뉴스 👉 https://morning-briefing-mocha.vercel.app`;
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: '아침 브리핑', text, url: 'https://morning-briefing-mocha.vercel.app' });
      return true;
    } catch {
      // user cancelled or not supported — fall back to clipboard
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export default memo(function BriefingCard({
  card,
  categoryId,
  isPaywalled,
  isPremiumUnlocked,
  onPaywallClick,
  delay = 0,
}: BriefingCardProps) {
  const [expanded, setExpanded] = useState(card.number === 1);
  const [entered, setEntered] = useState(delay === 0);
  const [showCopied, setShowCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shared = await shareCard(card);
    if (shared) {
      track('share');
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [card]);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
    track('card_toggle', { card: card.id, expanded: String(!expanded) });
  }, [card.id, expanded]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand();
    }
  }, [toggleExpand]);

  const shouldBlur = isPaywalled && !isPremiumUnlocked;
  const category = getCategoryById(categoryId);
  const typeInfo = CARD_TYPE_LABELS[card.type] || { label: card.type, icon: '📌' };
  const isHeroCard = card.number === 1;
  const cardContentId = `card-content-${categoryId}-${card.id}`;

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setEntered(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, []);

  useEffect(() => {
    measureHeight();
  }, [expanded, card.content, measureHeight]);

  // Shared share button component
  const ShareButton = ({ dark }: { dark?: boolean }) => (
    <button
      onClick={handleShare}
      className={`text-xs ${
        dark
          ? 'text-white/40 hover:text-white/70'
          : 'text-gray-400 hover:text-gray-600'
      } transition-colors flex items-center gap-1`}
      aria-label={`${card.title} 공유하기`}
    >
      {showCopied ? (
        <span className={dark ? 'text-emerald-400' : 'text-emerald-500'}>복사됨!</span>
      ) : (
        <>
          <ShareIcon />
          공유
        </>
      )}
    </button>
  );

  // Hero card (Card 1) — dark gradient background, white text
  if (isHeroCard) {
    return (
      <article
        className={`relative rounded-2xl overflow-hidden shadow-lg transition-all duration-400 ease-out ${
          entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        aria-label={`${typeInfo.label}: ${card.title}`}
      >
        <div className="card-gradient-hero">
          <div
            className="p-6 cursor-pointer active:opacity-90 transition-opacity"
            onClick={toggleExpand}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-controls={cardContentId}
          >
            {/* Top row: badge + type */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`${category.badgeClass} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              <span className="text-emerald-400 text-xs font-semibold tracking-wide">FREE</span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-extrabold text-white leading-tight mb-2">
              {card.title}
            </h3>

            {/* Summary */}
            <p className="text-sm text-white/70 leading-relaxed">
              {card.summary}
            </p>

            {/* Expand hint */}
            <div className="mt-4 flex items-center gap-1.5">
              <ChevronIcon className={`text-white/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              <span className="text-white/40 text-xs">
                {expanded ? '접기' : '자세히 보기'}
              </span>
            </div>
          </div>

          {/* Expanded content */}
          <div
            id={cardContentId}
            style={{ maxHeight: expanded ? (contentHeight ?? 1000) : 0 }}
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            role="region"
            aria-hidden={!expanded}
          >
            <div ref={contentRef} className="px-6 pb-6">
              <div className="border-t border-white/10 pt-4">
                <div className="text-base text-white/90 leading-relaxed whitespace-pre-line">
                  {card.content}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {card.source && (
                    <p className="text-xs text-white/40">출처: {card.source}</p>
                  )}
                  <ShareButton dark />
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Cards 2-3 — clean white with accent border
  return (
    <article
      className={`relative rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-400 ease-out ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${shouldBlur ? '' : 'border border-gray-100'}`}
      aria-label={`${typeInfo.label}: ${card.title}`}
    >
      <div
        className={`p-5 ${!shouldBlur ? 'cursor-pointer active:bg-gray-50/50 transition-colors' : ''}`}
        onClick={() => !shouldBlur && toggleExpand()}
        onKeyDown={!shouldBlur ? handleKeyDown : undefined}
        role={!shouldBlur ? 'button' : undefined}
        tabIndex={!shouldBlur ? 0 : undefined}
        aria-expanded={!shouldBlur ? expanded : undefined}
        aria-controls={!shouldBlur ? cardContentId : undefined}
      >
        <div className="flex items-start gap-4">
          {/* Number badge */}
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${category.lightBg} flex items-center justify-center`}>
            <span className={`${category.textClass} font-bold text-lg`} aria-hidden="true">{card.number}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Type label */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-semibold ${category.textClass}`}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              {shouldBlur && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">PRO</span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-gray-900 leading-snug">{card.title}</h3>

            {/* Summary */}
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">{card.summary}</p>
          </div>

          {/* Expand indicator */}
          {!shouldBlur && (
            <ChevronIcon className={`text-gray-300 mt-2 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {/* Animated content area */}
      {!shouldBlur && (
        <div
          id={cardContentId}
          style={{ maxHeight: expanded ? (contentHeight ?? 1000) : 0 }}
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          role="region"
          aria-hidden={!expanded}
        >
          <div ref={contentRef} className="px-5 pb-5">
            <div className="border-t border-gray-50 pt-4">
              <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line">
                {card.content}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {card.source && (
                  <p className="text-xs text-gray-400">출처: {card.source}</p>
                )}
                <ShareButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paywall overlay */}
      {shouldBlur && (
        <div className="px-5 pb-5">
          <div className="relative rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 text-center">
            <p className="text-gray-400 text-sm mb-3">
              프리미엄 전용 콘텐츠
            </p>
            <button
              onClick={onPaywallClick}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-800 active:scale-95 transition-all"
            >
              전체 브리핑 보기
            </button>
          </div>
        </div>
      )}
    </article>
  );
});
