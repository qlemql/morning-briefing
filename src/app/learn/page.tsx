'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { evalFormula } from '@/lib/formula';
import type { InteractiveLesson } from '@/lib/lesson';
import { LearnShell, Card, Slider, Result, fmtNum } from './_shared';

/** 기초 개념 계산기(/learn/basics)로 가는 링크 카드 */
function BasicsLink() {
  return (
    <Link
      href="/learn/basics"
      className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] px-5 py-4 shadow-sm active:scale-[0.99] transition-transform"
    >
      <span className="flex items-center gap-2">
        <span className="text-xl">🧮</span>
        <span>
          <span className="block font-semibold text-gray-900 dark:text-gray-100">기초 개념 계산기</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">금리·복리·인플레이션·환율 — 늘 유용한 4가지</span>
        </span>
      </span>
      <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">›</span>
    </Link>
  );
}

function DynamicLesson() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
  const [lesson, setLesson] = useState<InteractiveLesson | null>(null);
  const [vals, setVals] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    // 테스트/백필 열람용: /learn?date=YYYY-MM-DD 로 과거 날짜 레슨도 볼 수 있음(없으면 오늘).
    const qsDate = new URLSearchParams(window.location.search).get('date');
    const url = qsDate ? `/api/lesson?date=${encodeURIComponent(qsDate)}` : '/api/lesson';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d?.lesson) { setStatus('empty'); return; }
        const L = d.lesson as InteractiveLesson;
        setLesson(L);
        setVals(Object.fromEntries(L.variables.map((v) => [v.key, v.default])));
        setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('empty'); });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') {
    return <div className="h-40 rounded-2xl bg-white/60 dark:bg-[#1c1c1e]/60 border border-gray-100 dark:border-gray-800 animate-pulse" />;
  }

  if (status === 'empty' || !lesson) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] p-6 text-center shadow-sm">
        <div className="text-2xl mb-2">🧑‍🍳</div>
        <p className="text-sm text-gray-600 dark:text-gray-300">오늘의 학습은 준비 중이에요.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">아래 기초 개념 계산기로 먼저 감을 잡아보세요.</p>
      </div>
    );
  }

  const out = evalFormula(lesson.formula, vals);
  return (
    <Card
      emoji="📰"
      title={lesson.title}
      hook={lesson.intro}
      takeaway={lesson.takeaway}
      detail={
        <>
          <p>{lesson.resultExplain}</p>
          {lesson.newsHook && (
            <p className="text-gray-400 dark:text-gray-500">오늘 브리핑: {lesson.newsHook}</p>
          )}
          <p className="text-gray-400 dark:text-gray-500">오늘 뉴스로 AI가 만든 학습이에요.</p>
        </>
      }
    >
      <div className="space-y-3 mb-4">
        {lesson.variables.map((v) => (
          <Slider
            key={v.key}
            label={v.label}
            value={vals[v.key] ?? v.default}
            min={v.min}
            max={v.max}
            step={v.step}
            onChange={(nv) => setVals((s) => ({ ...s, [v.key]: nv }))}
            fmt={(x) => fmtNum(x, v.unit)}
          />
        ))}
      </div>
      <Result
        value={out === null ? '—' : fmtNum(Math.round(out * 100) / 100, lesson.resultUnit)}
        label={lesson.resultLabel}
        tone="teal"
      />
    </Card>
  );
}

export default function LearnPage() {
  return (
    <LearnShell
      title="오늘의 경제, 만져보기"
      subtitle={
        <>
          오늘 뉴스에서 뽑은 개념을 슬라이더로 직접 움직여봐.
          <span className="text-gray-400 dark:text-gray-600"> (AI 학습 · 실험)</span>
        </>
      }
    >
      <DynamicLesson />
      <BasicsLink />
    </LearnShell>
  );
}
