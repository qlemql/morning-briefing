/**
 * SNS Post Formatter
 *
 * Converts briefing Card 1 (free card) into platform-specific post text.
 * Each platform has different character limits and formatting conventions.
 */

import { BriefingCategory } from './types';

/* ---------- Hashtag mapping ---------- */

const HASHTAGS: Record<string, string[]> = {
  economy: ['#경제브리핑', '#오늘의경제', '#모닝브리핑'],
  investment: ['#주식', '#투자브리핑', '#모닝브리핑'],
  lifestyle: ['#테크', '#생활팁', '#모닝브리핑'],
};

const CATEGORY_EMOJI: Record<string, string> = {
  economy: '📊',
  investment: '📈',
  lifestyle: '💡',
};

function getHashtags(category: string): string[] {
  return HASHTAGS[category] || ['#모닝브리핑'];
}

function getEmoji(category: string): string {
  return CATEGORY_EMOJI[category] || '📌';
}

/* ---------- Site URL ---------- */

const SITE_URL = 'https://morning-briefing.vercel.app';

/* ---------- Formatters ---------- */

/**
 * Twitter/X format: ~140 Korean characters (280 bytes).
 * Structure: emoji + title + summary (truncated) + link + hashtags
 */
export function formatForTwitter(briefing: BriefingCategory): string {
  const card = briefing.cards[0];
  if (!card) return '';

  const emoji = getEmoji(briefing.category);
  const hashtags = getHashtags(briefing.category).slice(0, 2).join(' ');
  const link = SITE_URL;

  // Build core text: emoji + title + newline + summary
  const header = `${emoji} ${card.title}`;
  const footer = `\n\n${link}\n${hashtags}`;

  // Footer length in characters
  const footerLen = footer.length;
  // Max summary length: 140 total - header - footer - newline
  const maxSummary = 140 - header.length - footerLen - 1;

  let summary = card.summary;
  if (summary.length > maxSummary) {
    summary = summary.slice(0, maxSummary - 1) + '…';
  }

  return `${header}\n${summary}${footer}`;
}

/**
 * Threads format: longer text allowed, more conversational with emoji.
 * Structure: emoji + title + full summary + context + link + hashtags
 */
export function formatForThreads(briefing: BriefingCategory): string {
  const card = briefing.cards[0];
  if (!card) return '';

  const emoji = getEmoji(briefing.category);
  const hashtags = getHashtags(briefing.category).join(' ');
  const link = SITE_URL;

  const lines = [
    `${emoji} ${card.title}`,
    '',
    card.summary,
    '',
    `자세한 브리핑은 여기서 확인하세요:`,
    link,
    '',
    hashtags,
  ];

  return lines.join('\n');
}

/**
 * Instagram format: caption style, hashtags at the end, no link in text
 * (link goes in bio). More hashtags for discoverability.
 */
export function formatForInstagram(briefing: BriefingCategory): string {
  const card = briefing.cards[0];
  if (!card) return '';

  const emoji = getEmoji(briefing.category);
  const hashtags = [
    ...getHashtags(briefing.category),
    '#아침브리핑',
    '#오늘의뉴스',
    '#뉴스요약',
  ].join(' ');

  const lines = [
    `${emoji} ${card.title}`,
    '',
    card.summary,
    '',
    '매일 아침, 3분이면 충분한 브리핑',
    '링크는 프로필에서 확인하세요',
    '',
    hashtags,
  ];

  return lines.join('\n');
}

/**
 * Format for all platforms at once
 */
export function formatForAllPlatforms(
  briefing: BriefingCategory,
): Record<string, string> {
  return {
    twitter: formatForTwitter(briefing),
    threads: formatForThreads(briefing),
    instagram: formatForInstagram(briefing),
  };
}
