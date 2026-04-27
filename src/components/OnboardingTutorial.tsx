'use client';

import { useState, useEffect, useCallback } from 'react';
import { track } from '@/lib/track';
import { hapticLight, hapticMedium } from '@/lib/haptic';

const ONBOARDING_KEY = 'mb_onboarded_v1';
const TOTAL_STEPS = 3;

interface OnboardingTutorialProps {
  /** 강제로 다시 보여줄 때 (설정 등에서 호출) */
  forceShow?: boolean;
  /** 닫혔을 때 호출 — forceShow 사용 시 부모가 상태 리셋 */
  onClose?: () => void;
}

export default function OnboardingTutorial({ forceShow = false, onClose }: OnboardingTutorialProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [demoFlipped, setDemoFlipped] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setStep(0);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (!seen) {
        // 0.8초 후 부드럽게 노출 (스플래시 끝난 뒤)
        const t = setTimeout(() => {
          setVisible(true);
          track('onboarding_show');
        }, 800);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage 접근 실패 시 그냥 안 보여줌
    }
  }, [forceShow]);

  // Step 2 자동 flip 데모 (3초마다 토글)
  useEffect(() => {
    if (!visible || step !== 1) {
      setDemoFlipped(false);
      return;
    }
    const initial = setTimeout(() => setDemoFlipped(true), 1500);
    const interval = setInterval(() => {
      setDemoFlipped((prev) => !prev);
    }, 2800);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [visible, step]);

  const close = useCallback((completed: boolean) => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
    track(completed ? 'onboarding_complete' : 'onboarding_skip', { step: String(step) });
    if (onClose) onClose();
  }, [step, onClose]);

  const handleNext = useCallback(() => {
    hapticLight();
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      hapticMedium();
      close(true);
    }
  }, [step, close]);

  const handleSkip = useCallback(() => {
    hapticLight();
    close(false);
  }, [close]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-5 py-8 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1c1c1e] shadow-2xl overflow-hidden">
        {/* Skip button (top right) */}
        <div className="flex justify-end p-3">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 dark:text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            건너뛰기
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 pb-2 min-h-[340px]">
          {step === 0 && (
            <div className="text-center pt-2">
              <div className="text-[56px] mb-3" aria-hidden="true">📰</div>
              <h2 id="onboarding-title" className="text-[22px] font-bold text-gray-900 dark:text-gray-100 mb-3">
                매일 아침 3분, 3장으로 끝
              </h2>
              <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-7">
                AI가 어제부터 오늘까지 핵심 뉴스를<br />
                <span className="font-semibold">경제 · 투자 · 생활/테크</span> 카테고리별로<br />
                3장의 카드에 정리해드려요.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="text-center pt-2">
              <h2 id="onboarding-title" className="text-[20px] font-bold text-gray-900 dark:text-gray-100 mb-2">
                <span className="text-amber-500">쉽게</span> 버튼을 눌러보세요
              </h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">
                어려운 용어는 카드를 뒤집어 풀어드려요
              </p>

              {/* 미니 카드 데모 (자동 flip) */}
              <div
                className="mx-auto mb-3 flip-perspective"
                style={{ width: 240, height: 160 }}
              >
                <div
                  className={`flip-inner ${demoFlipped ? 'is-flipped' : ''}`}
                  style={{ width: '100%', height: '100%' }}
                >
                  {/* Front */}
                  <div className="flip-face rounded-xl card-gradient-hero p-4 text-left h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                        📌 오늘의핵심
                      </span>
                      <span className="ml-auto text-[9px] bg-amber-400/80 text-amber-900 font-bold px-1.5 py-0.5 rounded-full">
                        🔁 쉽게
                      </span>
                    </div>
                    <p className="text-white text-[13px] font-bold leading-snug mb-1">
                      FOMC 동결, 코스피 흔들
                    </p>
                    <p className="text-white/70 text-[10px] leading-relaxed">
                      미국 금리 동결 결정으로 한국 증시가 1.2% 하락했어요
                    </p>
                  </div>

                  {/* Back */}
                  <div className="flip-face flip-face-back rounded-xl card-gradient-hero p-4 text-left h-full flex flex-col">
                    <p className="text-[8px] uppercase tracking-wider text-white/50 mb-1 font-semibold">
                      한 마디로
                    </p>
                    <p className="text-white text-[13px] font-bold leading-snug mb-2">
                      미국이 금리를 안 내려서<br />한국 주식이 흔들렸어요
                    </p>
                    <div className="rounded-md bg-white/12 px-2 py-1 mt-auto">
                      <span className="text-[10px] font-bold text-white">FOMC</span>
                      <span className="text-[10px] text-white/75 ml-1">미국 금리 결정 회의</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                {demoFlipped ? '↑ 뒷면: 한 줄 요약 + 용어 풀이' : '↑ 앞면: 뉴스 본문'}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="text-center pt-2">
              <div className="text-[56px] mb-3" aria-hidden="true">👈👉</div>
              <h2 id="onboarding-title" className="text-[22px] font-bold text-gray-900 dark:text-gray-100 mb-3">
                좌우로 쓸어 카테고리 전환
              </h2>
              <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-7 mb-3">
                또는 상단 탭을 직접 누르셔도 돼요
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">경제/시사</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">투자</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[12px] font-semibold text-purple-600 dark:text-purple-400">생활/테크</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: dots + next button */}
        <div className="px-6 pb-6 pt-3 flex items-center gap-4">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-gray-900 dark:bg-gray-100'
                    : 'w-1.5 bg-gray-200 dark:bg-gray-700'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="ml-auto px-6 py-3 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm active:scale-95 transition-transform"
          >
            {step < TOTAL_STEPS - 1 ? '다음' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 외부에서 다시 보기 트리거 (footer 등) */
export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}
