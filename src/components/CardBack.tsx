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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 00-4-4H4" />
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
  const closeBtn = isHero
    ? 'bg-white/10 hover:bg-white/20 text-white/85'
    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200';

  return (
    <div
      className="p-6 h-full flex flex-col"
      role="region"
      aria-label="초심자용 해설"
      id={`card-back-${cardId}`}
    >
      {/* TL;DR 큰 한 줄 */}
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
      <div className={`pt-5 border-t ${dividerColor} flex-1`}>
        <p className={`text-[10px] font-semibold tracking-wider uppercase mb-1.5 ${dimColor}`}>
          이게 왜 중요해?
        </p>
        <p className={`text-[14px] leading-7 ${subtleColor}`}>
          {explanation.whyItMatters}
        </p>
      </div>

      {/* 앞면 돌아가기 */}
      <div className="mt-5 flex justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${closeBtn}`}
          aria-label="앞면으로 돌아가기"
        >
          <FlipBackIcon />
          앞면 보기
        </button>
      </div>
    </div>
  );
}

export default memo(CardBackInner);
