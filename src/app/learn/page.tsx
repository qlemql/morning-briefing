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

/** 카드 하단 '더 알아보기'에 들어갈 공통 설명 */
function LessonDetail({ lesson }: { lesson: InteractiveLesson }) {
  return (
    <>
      {lesson.resultExplain && <p>{lesson.resultExplain}</p>}
      {lesson.newsHook && (
        <p className="text-gray-400 dark:text-gray-500">오늘 브리핑: {lesson.newsHook}</p>
      )}
      <p className="text-gray-400 dark:text-gray-500">오늘 뉴스로 AI가 만든 학습이에요.</p>
    </>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── format 1: slider — 값을 바꾸면 결과가 실시간으로 ── */
function SliderLesson({ lesson }: { lesson: InteractiveLesson }) {
  const vars = lesson.variables ?? [];
  const [vals, setVals] = useState<Record<string, number>>(
    () => Object.fromEntries(vars.map((v) => [v.key, v.default])),
  );
  const out = evalFormula(lesson.formula ?? '', vals);
  return (
    <Card emoji="🎚️" title={lesson.title} hook={lesson.intro} takeaway={lesson.takeaway} detail={<LessonDetail lesson={lesson} />}>
      <div className="space-y-3 mb-4">
        {vars.map((v) => (
          <Slider
            key={v.key} label={v.label} value={vals[v.key] ?? v.default}
            min={v.min} max={v.max} step={v.step}
            onChange={(nv) => setVals((s) => ({ ...s, [v.key]: nv }))}
            fmt={(x) => fmtNum(x, v.unit)}
          />
        ))}
      </div>
      <Result value={out === null ? '—' : fmtNum(round2(out), lesson.resultUnit ?? '')} label={lesson.resultLabel ?? ''} tone="teal" />
    </Card>
  );
}

/* ── format 2: predict — 먼저 맞혀보고 공개 ── */
function PredictLesson({ lesson }: { lesson: InteractiveLesson }) {
  const vars = lesson.variables ?? [];
  const g = lesson.guess;
  const answer = evalFormula(lesson.formula ?? '', Object.fromEntries(vars.map((v) => [v.key, v.default])));
  const [guess, setGuess] = useState(() => (g ? round2(Math.round((g.min + g.max) / 2 / g.step) * g.step) : 0));
  const [revealed, setRevealed] = useState(false);
  if (!g) return null;

  return (
    <Card emoji="🎯" title={lesson.title} hook={lesson.intro} takeaway={lesson.takeaway} detail={<LessonDetail lesson={lesson} />}>
      {vars.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {vars.map((v) => (
            <span key={v.key} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full px-2.5 py-1">
              {v.label} <b className="text-gray-900 dark:text-gray-100">{fmtNum(v.default, v.unit)}</b>
            </span>
          ))}
        </div>
      )}
      <div className="mb-4">
        <Slider label={g.label} value={guess} min={g.min} max={g.max} step={g.step} onChange={setGuess} fmt={(x) => fmtNum(x, g.unit)} />
      </div>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-xl bg-teal-500 text-white font-semibold py-3 active:scale-[0.99] transition-transform"
        >
          정답 확인
        </button>
      ) : (
        <div className="space-y-2">
          <Result value={answer === null ? '—' : fmtNum(round2(answer), lesson.resultUnit ?? g.unit)} label={`정답 · ${lesson.resultLabel ?? ''}`} tone="teal" />
          {answer !== null && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              너의 추측 {fmtNum(guess, g.unit)} · 차이 {fmtNum(round2(Math.abs(answer - guess)), g.unit)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── format 3: scenario — 선택하면 결과 비교 ── */
function ScenarioLesson({ lesson }: { lesson: InteractiveLesson }) {
  const choices = lesson.choices ?? [];
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  if (choices.length === 0) return null;
  const toggle = (k: string) =>
    setRevealed((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <Card emoji="🔀" title={lesson.title} hook={lesson.intro} takeaway={lesson.takeaway} detail={<LessonDetail lesson={lesson} />}>
      {lesson.prompt && <p className="font-medium text-gray-800 dark:text-gray-100 mb-3">{lesson.prompt}</p>}
      <div className="space-y-2">
        {choices.map((c) => {
          const open = revealed.has(c.key);
          return (
            <div key={c.key} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => toggle(c.key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-800/50"
                aria-expanded={open}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {c.label}
                  {c.best && open && (
                    <span className="ml-2 text-[10px] align-middle bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full px-2 py-0.5">유리</span>
                  )}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">{open ? '▲' : '결과 보기'}</span>
              </button>
              {open && (
                <div className="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-400">{fmtNum(round2(c.resultValue), c.resultUnit)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.resultLabel}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{c.explain}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DynamicLesson() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
  const [lesson, setLesson] = useState<InteractiveLesson | null>(null);

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
        setLesson(d.lesson as InteractiveLesson);
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

  // format에 따라 렌더러 분기 (옛 캐시엔 format이 없으므로 slider로 취급 = 하위호환)
  const format = lesson.format ?? 'slider';
  if (format === 'predict') return <PredictLesson lesson={lesson} />;
  if (format === 'scenario') return <ScenarioLesson lesson={lesson} />;
  return <SliderLesson lesson={lesson} />;
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
