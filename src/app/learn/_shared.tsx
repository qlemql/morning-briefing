'use client';

import { useState, useRef, type ReactNode } from 'react';
import Link from 'next/link';

/** 원 단위 숫자를 억/만원으로 읽기 좋게 */
export function won(n: number): string {
  const v = Math.round(n);
  const eok = Math.floor(v / 1e8);
  const man = Math.round((v % 1e8) / 1e4);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  if (man > 0) return `${man.toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
}

/** 동적 레슨 값 포맷 (단위 붙이기) */
export function fmtNum(v: number, unit: string): string {
  const n = Number.isInteger(v)
    ? v.toLocaleString()
    : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit === '$' ? `$${n}` : `${n}${unit || ''}`;
}

/**
 * 모바일 WebView에서도 잘 잡히는 커스텀 슬라이더.
 * 네이티브 input[range]는 터치 영역이 얇고 스크롤이 드래그를 가로채서,
 * Pointer 이벤트 + 포인터 캡처 + touch-action:none + 44px 히트 영역으로 직접 구현.
 */
export function Slider({
  label, value, min, max, step, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = (String(step).split('.')[1] || '').length;

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const stepped = Math.round((min + ratio * (max - min)) / step) * step;
    const clamped = Math.min(max, Math.max(min, stepped));
    onChange(parseFloat(clamped.toFixed(decimals)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromClientX(e.clientX);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      onChange(parseFloat(Math.min(max, value + step).toFixed(decimals)));
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      onChange(parseFloat(Math.max(min, value - step).toFixed(decimals)));
      e.preventDefault();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{fmt(value)}</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={fmt(value)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative flex items-center h-11 cursor-pointer select-none touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 rounded-full"
      >
        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="absolute top-1/2 w-7 h-7 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white dark:bg-gray-100 border-2 border-teal-500 shadow-md"
          style={{ left: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/** 더 알아보기 안의 용어 한 줄 */
export function Term({ k, children }: { k: string; children: ReactNode }) {
  return (
    <p>
      <b className="text-gray-800 dark:text-gray-100">{k}</b> — {children}
    </p>
  );
}

export function Card({
  emoji, title, hook, children, takeaway, detail,
}: {
  emoji: string; title: string; hook: string; children: ReactNode; takeaway: string; detail?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <h2 className="font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{hook}</p>
      {children}
      <p className="mt-4 text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 rounded-lg px-3 py-2 leading-relaxed">
        🧠 {takeaway}
      </p>
      {detail && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
            aria-expanded={open}
          >
            <span aria-hidden="true">{open ? '▲' : 'ⓘ'}</span>
            {open ? '접기' : '더 알아보기'}
          </button>
          {open && (
            <div className="mt-2 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {detail}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function Result({ value, label, tone = 'neutral' }: { value: string; label: ReactNode; tone?: 'neutral' | 'teal' | 'rose' }) {
  const color =
    tone === 'teal' ? 'text-teal-700 dark:text-teal-400'
      : tone === 'rose' ? 'text-rose-600 dark:text-rose-400'
        : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="text-center rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
      <div className={`text-3xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

/** /learn·/learn/basics 공통 페이지 셸 (상단 뒤로가기 바 + 헤더 + 세이프에어리어). */
export function LearnShell({
  title, subtitle, backHref = '/', backLabel = '홈으로', children,
}: {
  title: string; subtitle: ReactNode; backHref?: string; backLabel?: string; children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <div
        className="sticky top-0 z-10 bg-gray-50/90 dark:bg-[#111111]/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-lg px-4 h-12 flex items-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 -ml-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95 transition-transform"
            aria-label={`${backLabel}(으)로 돌아가기`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {backLabel}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-5" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
