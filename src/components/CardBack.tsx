'use client';

import { memo } from 'react';
import type { BeginnerExplanation } from '@/lib/types';

interface CardBackProps {
  /** 카드 뒷면에 표시할 초심자 해설 */
  explanation: BeginnerExplanation;
  /** Hero 카드(어두운 배경) 여부 */
  isHero: boolean;
  /** 앞면으로 돌아가기 콜백 */
  onClose: () => void;
  /** 접근성을 위한 카드 식별자 */
  cardId: string;
}

const FlipBackIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 103-6.7" />
    <polyline points="3 4 3 9 8 9" />
  </svg>
);

function CardBackInner({ explanation, isHero, onClose, cardId }: CardBackProps) {
  const titleColor = isHero ? 'text-white' : 'text-gray-900 dark:text-gray-100';
  const subtleColor = isHero ? 'text-white/70' : 'text-gray-600 dark:text-gray-300';
  const dimColor = isHero ? 'text-white/50' : 'text-gray-500 dark:text-gray-400';
  const dividerColor = isHero ? 'border-white/15' : 'border-gray-200/60 dark:border-gray-700/60';
  const termBg = isHero ? 'bg-white/10' : 'bg-amber-50 dark:bg-amber-900/20';
  const termText = isHero ? 'text-white' : 'text-amber-900 dark:text-amber-200';
  const termExplainText = isHero ? 'text-white/75' : 'text-amber-800/80 dark:text-amber-200/70';
  const flipBtnClass = isHero
    ? 'bg-white/12 hover:bg-white/20 text-white/85'
    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300';
  const badgeClass = isHero
    ? 'bg-white/15 text-white/90'
    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';

  return (
    <div
      className="p-6 h-full flex flex-col"
      role="region"
      aria-label="초심자용 해설"
      id={`card-back-${cardId}`}
    >
      {/* Top row: badge + flip back button (mirrors front layout) */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}>
          💡 쉬운 풀이
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors active:scale-95 ${flipBtnClass}`}
          aria-label="앞면으로 돌아가기"
        >
          <FlipBackIcon />
          앞면
        </button>
      </div>

      {/* TL;DR */}
      <div className="mb-5">
        <p className={`text-[10px] font-semibold tracking-wider uppercase mb-1.5 ${dimColor}`}>
          한 마디로
        </p>
        <p className={`text-[17px] font-bold leading-snug ${titleColor}`}>
          {explanation.tldr}
        </p>
      </div>

      {/* 용어 풀이 */}
      {explanation.glossary && explanation.glossary.length > 0 && (
        <div className={`mb-5 pt-5 border-t ${dividerColor}`}>
          <p className={`text-[10px] font-semibold tracking-wider uppercase mb-2.5 ${dimColor}`}>
            용어 풀이
          </p>
          <ul className="space-y-2">
            {explanation.glossary.map((g, idx) => (
              <li
                key={`${cardId}-gloss-${idx}`}
                className={`rounded-lg px-3 py-2 ${termBg}`}
              >
                <span className={`text-[13px] font-bold ${termText}`}>
                  {g.term}
                </span>
                <span className={`text-[13px] ml-1.5 ${termExplainText}`}>
                  {g.explain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 왜 중요한가 */}
      <div className={`pt-5 border-t ${dividerColor}`}>
        <p className={`text-[10px] font-semibold tracking-wider uppercase mb-1.5 ${dimColor}`}>
          이게 왜 중요해?
        </p>
        <p className={`text-[14px] leading-7 ${subtleColor}`}>
          {explanation.whyItMatters}
        </p>
      </div>
    </div>
  );
}

export default memo(CardBackInner);
