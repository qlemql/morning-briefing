'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getReferralCode,
  getReferralLink,
  fetchReferralStats,
  applyReferralBonus,
  markSelfCode,
} from '@/lib/referral';
import { track } from '@/lib/track';
import { hapticLight } from '@/lib/haptic';
import { showToast } from '@/components/Toast';

const MAX_INVITES = 7;

export default function ReferralCard() {
  const [code, setCode] = useState('');
  const [invited, setInvited] = useState(0);
  const [bonusDays, setBonusDays] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const myCode = getReferralCode();
    setCode(myCode);
    // Mark own code to prevent self-referral
    markSelfCode(myCode);

    // Fetch stats from server
    if (myCode) {
      fetchReferralStats(myCode).then((stats) => {
        setInvited(stats.invited);
        setBonusDays(stats.bonusDays);
        // Sync bonus to localStorage for trial extension
        if (stats.bonusDays > 0) {
          applyReferralBonus(stats.bonusDays);
        }
      });
    }
  }, []);

  const handleCopy = useCallback(async () => {
    const link = getReferralLink();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        hapticLight();
        setCopied(true);
        showToast('레퍼럴 링크가 복사되었어요!', '🔗');
        track('referral_copy', { code });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // fallback: select text
    }
  }, [code]);

  const handleShare = useCallback(async () => {
    const link = getReferralLink();
    const text = `아침 브리핑 — AI가 매일 아침 뉴스를 3장 카드로 정리해줘요! 이 링크로 가입하면 프리미엄 혜택을 받을 수 있어요.\n${link}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: '아침 브리핑 초대', text });
        track('referral_share', { code, method: 'native' });
      } catch {
        // User cancelled
      }
    } else {
      await handleCopy();
    }
  }, [code, handleCopy]);

  if (!code) return null;

  const progress = Math.min(invited, MAX_INVITES);
  const progressPercent = (progress / MAX_INVITES) * 100;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1e] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎁</span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          친구 초대하고 프리미엄 받기
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        친구 1명 초대할 때마다 프리미엄 1일이 추가돼요. 최대 7일까지!
      </p>

      {/* Referral code display */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block mb-0.5">내 초대 코드</span>
          <span className="text-base font-mono font-bold text-gray-900 dark:text-gray-100 tracking-widest">
            {code}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2.5 text-xs font-medium active:scale-95 transition-transform"
        >
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            초대 현황
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {progress}/{MAX_INVITES}명
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bonus info */}
      {bonusDays > 0 ? (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-4">
          {invited}명 초대 완료 → 프리미엄 {bonusDays}일 추가됨!
        </p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          아직 초대한 친구가 없어요. 링크를 공유해보세요!
        </p>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-3 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        초대 링크 공유하기
      </button>
    </div>
  );
}
