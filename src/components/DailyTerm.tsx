'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayTerm } from '@/data/daily-term';
import type { DailyTermData } from '@/data/daily-term';
import { track } from '@/lib/track';
import { hapticLight } from '@/lib/haptic';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '경제': {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  '투자': {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  '생활금융': {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
  },
};

function TermCard({ term }: { term: DailyTermData }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    hapticLight();
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        track('term_expand', { termId: term.id, term: term.term });
      }
      return next;
    });
  }, [term.id, term.term]);

  const colors = CATEGORY_COLORS[term.category] || CATEGORY_COLORS['경제'];

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={toggle}
        className="w-full text-left p-5 flex items-center gap-3 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
        aria-expanded={expanded}
        aria-controls="term-detail"
      >
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {term.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
              {term.term}
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
            >
              {term.category}
            </span>
          </div>
          {!expanded && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              탭해서 알아보기
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* Expanded detail */}
      <div
        id="term-detail"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 space-y-3">
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {term.definition}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            {term.example}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              hapticLight();
              setExpanded(false);
              track('term_close', { termId: term.id });
            }}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            이해됐어요 ^
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DailyTerm() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const term = getTodayTerm();

  return (
    <section className="space-y-3 pt-2" aria-label="오늘의 경제 용어">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 rounded-full">
          용어
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          오늘의 경제 용어
        </span>
      </div>
      <TermCard term={term} />
    </section>
  );
}
