'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { BriefingCard as BriefingCardType } from '@/lib/types';
import { CARD_TYPE_LABELS, getCategoryById } from '@/constants';
import { track } from '@/lib/track';
import { hapticLight } from '@/lib/haptic';
import { showToast } from '@/components/Toast';
import * as tts from '@/lib/tts';

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

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

type TtsState = 'idle' | 'playing' | 'paused';

function useTts(text: string, cardId: string) {
  const [state, setState] = useState<TtsState>('idle');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(tts.isSupported());
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (tts.isSpeaking()) tts.stop();
    };
  }, []);

  const handleTts = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();

    if (state === 'playing') {
      tts.pause();
      setState('paused');
      track('tts_pause', { card: cardId });
    } else if (state === 'paused') {
      tts.resume();
      setState('playing');
      track('tts_resume', { card: cardId });
    } else {
      tts.speak(text, () => setState('idle'));
      setState('playing');
      track('tts_play', { card: cardId });
    }
  }, [state, text, cardId]);

  const handleStop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    tts.stop();
    setState('idle');
    track('tts_stop', { card: cardId });
  }, [cardId]);

  return { state, supported, handleTts, handleStop };
}

async function shareCard(card: BriefingCardType, categoryName?: string): Promise<boolean> {
  const categoryTag = categoryName ? ` #${categoryName}` : '';
  const text = `[아침 브리핑${categoryTag}] ${card.title}\n\n${card.summary}\n\n매일 아침 AI가 정리하는 뉴스 👉 https://morning-briefing-mocha.vercel.app`;
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
    showToast('링크가 복사되었어요!', '✅');
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
  const [hasRead, setHasRead] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const ttsText = `${card.title}. ${card.content}`;
  const { state: ttsState, supported: ttsSupported, handleTts, handleStop } = useTts(ttsText, card.id);

  const shouldBlur = isPaywalled && !isPremiumUnlocked;
  const category = getCategoryById(categoryId);
  const typeInfo = CARD_TYPE_LABELS[card.type] || { label: card.type, icon: '📌' };
  const isHeroCard = card.number === 1;
  const cardContentId = `card-content-${categoryId}-${card.id}`;

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shared = await shareCard(card, category.name);
    if (shared) {
      hapticLight();
      track('share', { card: card.id, category: categoryId });
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [card, category.name, categoryId]);

  const toggleExpand = useCallback(() => {
    hapticLight();
    const willExpand = !expanded;
    setExpanded((prev) => {
      if (!prev) setHasRead(true);  // Mark as read when first expanded
      return !prev;
    });
    // 확장 시 카드가 viewport에 보이도록 스크롤
    if (willExpand && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 320); // transition 완료 후 스크롤
    }
    track('card_toggle', { card: card.id, expanded: String(willExpand) });
  }, [card.id, expanded]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand();
    }
  }, [toggleExpand]);

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

  // Hero card (Card 1) — dark gradient background, white text
  if (isHeroCard) {
    return (
      <article
        ref={cardRef}
        className={`relative rounded-2xl overflow-hidden shadow-lg transition-all duration-400 ease-out ${
          entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        aria-label={`${typeInfo.label}: ${card.title}`}
      >
        <div className="card-gradient-hero">
          <div
            className="p-6 cursor-pointer active:scale-[0.98] transition-transform"
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
            <h3 className="text-[22px] font-bold text-white leading-snug mb-2.5">
              {card.title}
            </h3>

            {/* Summary */}
            <p className="text-sm text-white/80 leading-relaxed">
              {card.summary}
            </p>

            {/* Expand hint */}
            <div className="mt-4 flex items-center gap-1.5">
              <ChevronIcon className={`text-white/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              <span className="text-white/40 text-xs">
                {expanded ? '접기' : hasRead ? '다시 보기' : '자세히 보기'}
              </span>
              {hasRead && !expanded && (
                <span className="text-emerald-400/60 text-xs ml-auto">✓ 읽음</span>
              )}
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
                <div className="text-base text-white/90 leading-7 whitespace-pre-line">
                  {card.content}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {card.source && (
                    <p className="text-xs text-white/40">
                      출처:{' '}
                      {card.sourceUrl ? (
                        <a
                          href={card.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); track('source_click', { card: card.id }); }}
                          className="underline hover:text-white/60 transition-colors"
                        >
                          {card.source} ↗
                        </a>
                      ) : card.source}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    {ttsSupported && (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={handleTts}
                          className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 py-2 px-1"
                          aria-label={ttsState === 'playing' ? '일시정지' : ttsState === 'paused' ? '계속 듣기' : `${card.title} 듣기`}
                        >
                          {ttsState === 'playing' ? <PauseIcon /> : <PlayIcon />}
                          {ttsState === 'idle' ? '듣기' : ttsState === 'playing' ? '일시정지' : '계속'}
                        </button>
                        {ttsState !== 'idle' && (
                          <button
                            onClick={handleStop}
                            className="text-xs text-white/40 hover:text-white/70 transition-colors py-2 px-1"
                            aria-label="정지"
                          >
                            <StopIcon />
                          </button>
                        )}
                      </span>
                    )}
                    <button
                      onClick={handleShare}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 py-2 px-1"
                      aria-label={`${card.title} 공유하기`}
                    >
                      {showCopied ? (
                        <span className="text-emerald-400">복사됨!</span>
                      ) : (
                        <>
                          <ShareIcon />
                          공유
                        </>
                      )}
                    </button>
                  </div>
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
      ref={cardRef}
      className={`relative rounded-2xl bg-white dark:bg-[#1c1c1e] overflow-hidden shadow-sm transition-all duration-400 ease-out ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${shouldBlur ? '' : 'border border-gray-100 dark:border-gray-800'}`}
      aria-label={`${typeInfo.label}: ${card.title}`}
    >
      <div
        className={`p-5 ${!shouldBlur ? 'cursor-pointer active:bg-gray-50/50 dark:active:bg-gray-800/50 active:scale-[0.99] transition-all' : ''}`}
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
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">{card.title}</h3>

            {/* Summary */}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.summary}</p>
          </div>

          {/* Expand indicator */}
          {!shouldBlur && (
            <div className="flex flex-col items-center gap-1 mt-2">
              <ChevronIcon className={`text-gray-300 dark:text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              {hasRead && !expanded && (
                <span className="text-emerald-500/60 dark:text-emerald-400/50 text-[10px]">✓</span>
              )}
            </div>
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
            <div className="border-t border-gray-50 dark:border-gray-800 pt-4">
              <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-7 whitespace-pre-line">
                {card.content}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {card.source && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    출처:{' '}
                    {card.sourceUrl ? (
                      <a
                        href={card.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); track('source_click', { card: card.id }); }}
                        className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {card.source} ↗
                      </a>
                    ) : card.source}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {ttsSupported && (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={handleTts}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 py-2 px-1"
                        aria-label={ttsState === 'playing' ? '일시정지' : ttsState === 'paused' ? '계속 듣기' : `${card.title} 듣기`}
                      >
                        {ttsState === 'playing' ? <PauseIcon /> : <PlayIcon />}
                        {ttsState === 'idle' ? '듣기' : ttsState === 'playing' ? '일시정지' : '계속'}
                      </button>
                      {ttsState !== 'idle' && (
                        <button
                          onClick={handleStop}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2 px-1"
                          aria-label="정지"
                        >
                          <StopIcon />
                        </button>
                      )}
                    </span>
                  )}
                  <button
                    onClick={handleShare}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 py-2 px-1"
                    aria-label={`${card.title} 공유하기`}
                  >
                    {showCopied ? (
                      <span className="text-emerald-500">복사됨!</span>
                    ) : (
                      <>
                        <ShareIcon />
                        공유
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paywall overlay with blur teaser */}
      {shouldBlur && (
        <div className="px-5 pb-5">
          {/* Blurred content teaser */}
          <div className="relative overflow-hidden mb-3">
            <div className="blur-[6px] select-none pointer-events-none" aria-hidden="true">
              <div className="h-3 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-5/6 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-4/6 bg-gray-200 rounded" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white dark:from-[#1c1c1e]/0 dark:to-[#1c1c1e]" />
          </div>
          <div className="relative rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50 p-5 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
              {card.number === 2 ? '이 뉴스가 나에게 미치는 영향은?' : '지금 당장 할 수 있는 행동은?'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mb-3">
              커피 한 잔으로 전체 브리핑을 열어보세요
            </p>
            <button
              onClick={onPaywallClick}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 transition-all"
            >
              ☕ 전체 브리핑 보기
            </button>
          </div>
        </div>
      )}
    </article>
  );
});
