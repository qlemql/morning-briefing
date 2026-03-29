'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayQuiz, getQuizDateKey } from '@/data/daily-quiz';
import type { Quiz, Poll } from '@/data/daily-quiz';
import { track } from '@/lib/track';
import { hapticLight, hapticMedium } from '@/lib/haptic';

const LS_PREFIX = 'mb_quiz_';

interface StoredAnswer {
  questionId: string;
  optionIndex: number;
  date: string;
}

function getStoredAnswer(date: string, questionId: string): StoredAnswer | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${date}_${questionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeAnswer(date: string, questionId: string, optionIndex: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${LS_PREFIX}${date}_${questionId}`,
      JSON.stringify({ questionId, optionIndex, date }),
    );
  } catch {
    // localStorage full — ignore
  }
}

/** Parse Redis hash results { opt0: "5", opt1: "3" } into number array */
function parseResults(results: Record<string, string> | undefined, optionCount: number): number[] {
  const counts = new Array(optionCount).fill(0);
  if (!results) return counts;
  for (let i = 0; i < optionCount; i++) {
    counts[i] = parseInt(results[`opt${i}`] || '0', 10);
  }
  return counts;
}

function totalVotes(counts: number[]): number {
  return counts.reduce((a, b) => a + b, 0);
}

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/* ─── Quiz Card ─── */

function QuizCard({ quiz, date }: { quiz: Quiz; date: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const answered = selected !== null;
  const isCorrect = selected === quiz.answer;

  // Restore previous answer
  useEffect(() => {
    const stored = getStoredAnswer(date, quiz.id);
    if (stored) {
      setSelected(stored.optionIndex);
      // Fetch results
      fetch(`/api/quiz?date=${date}&questionId=${quiz.id}`)
        .then((r) => r.json())
        .then((d) => setResults(parseResults(d.results, quiz.options.length)))
        .catch(() => {});
    }
  }, [date, quiz.id, quiz.options.length]);

  const handleSelect = useCallback(
    async (idx: number) => {
      if (answered || submitting) return;
      hapticMedium();
      setSelected(idx);
      setSubmitting(true);

      try {
        const res = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, questionId: quiz.id, optionIndex: idx }),
        });
        const data = await res.json();
        setResults(parseResults(data.results, quiz.options.length));
        storeAnswer(date, quiz.id, idx);
        track('quiz_answer', { questionId: quiz.id, correct: String(idx === quiz.answer) });
      } catch {
        // Offline — still show selection locally
        storeAnswer(date, quiz.id, idx);
      } finally {
        setSubmitting(false);
      }
    },
    [answered, submitting, date, quiz],
  );

  const counts = results || new Array(quiz.options.length).fill(0);
  const total = totalVotes(counts);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
          Quiz
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">오늘의 경제 퀴즈</span>
      </div>

      {/* Question */}
      <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
        {quiz.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {quiz.options.map((opt, idx) => {
          const isThis = selected === idx;
          const isAnswer = idx === quiz.answer;
          const percentage = pct(counts[idx], total);

          if (!answered) {
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={submitting}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {opt}
              </button>
            );
          }

          // Answered state
          let borderColor = 'border-gray-200 dark:border-gray-700';
          let bgColor = '';
          if (isAnswer) {
            borderColor = 'border-green-400 dark:border-green-600';
            bgColor = 'bg-green-50 dark:bg-green-900/20';
          } else if (isThis && !isCorrect) {
            borderColor = 'border-red-400 dark:border-red-600';
            bgColor = 'bg-red-50 dark:bg-red-900/20';
          }

          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl border ${borderColor} ${bgColor} px-4 py-3 text-sm transition-all`}
            >
              {/* Background bar */}
              <div
                className="absolute inset-y-0 left-0 bg-gray-100 dark:bg-gray-800/50 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className={`${isAnswer ? 'text-green-700 dark:text-green-400 font-medium' : isThis && !isCorrect ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {isAnswer && <span className="mr-1">O</span>}
                  {isThis && !isCorrect && <span className="mr-1">X</span>}
                  {opt}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 leading-relaxed animate-fade-slide-up">
          {isCorrect ? (
            <span className="text-green-600 dark:text-green-400 font-medium">정답!</span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-medium">오답</span>
          )}
          {' '}{quiz.explanation}
          {total > 0 && (
            <span className="block mt-1 text-gray-400 dark:text-gray-500">
              {total}명 참여 · 정답률 {pct(counts[quiz.answer], total)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Poll Card ─── */

function PollCard({ poll, date }: { poll: Poll; date: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const answered = selected !== null;

  // Restore previous answer
  useEffect(() => {
    const stored = getStoredAnswer(date, poll.id);
    if (stored) {
      setSelected(stored.optionIndex);
      fetch(`/api/quiz?date=${date}&questionId=${poll.id}`)
        .then((r) => r.json())
        .then((d) => setResults(parseResults(d.results, 2)))
        .catch(() => {});
    }
  }, [date, poll.id]);

  const handleVote = useCallback(
    async (idx: number) => {
      if (answered || submitting) return;
      hapticLight();
      setSelected(idx);
      setSubmitting(true);

      try {
        const res = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, questionId: poll.id, optionIndex: idx }),
        });
        const data = await res.json();
        setResults(parseResults(data.results, 2));
        storeAnswer(date, poll.id, idx);
        track('poll_vote', { questionId: poll.id, option: String(idx) });
      } catch {
        storeAnswer(date, poll.id, idx);
      } finally {
        setSubmitting(false);
      }
    },
    [answered, submitting, date, poll],
  );

  const counts = results || [0, 0];
  const total = totalVotes(counts);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
          Vote
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">오늘의 투표</span>
      </div>

      {/* Question */}
      <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
        {poll.question}
      </p>

      {/* Options */}
      {!answered ? (
        <div className="grid grid-cols-2 gap-2">
          {poll.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={submitting}
              className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 animate-fade-slide-up">
          {poll.options.map((opt, idx) => {
            const percentage = pct(counts[idx], total);
            const isWinning = counts[idx] >= counts[1 - idx];
            const isSelected = selected === idx;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={`${isSelected ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                    {opt}
                    {isSelected && (
                      <span className="ml-1.5 text-xs text-indigo-500 dark:text-indigo-400">내 선택</span>
                    )}
                  </span>
                  <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400 font-medium">
                    {percentage}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isWinning
                        ? 'bg-indigo-500 dark:bg-indigo-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {total > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
              {total}명 참여
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export default function DailyQuiz() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const date = getQuizDateKey();
  const { quiz, poll } = getTodayQuiz();

  return (
    <section className="space-y-3 pt-2" aria-label="오늘의 퀴즈와 투표">
      <QuizCard quiz={quiz} date={date} />
      <PollCard poll={poll} date={date} />
    </section>
  );
}
