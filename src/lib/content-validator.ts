import { BriefingCard, BriefingCategory } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_TYPES: BriefingCard['type'][] = ['오늘의핵심', '영향분석', '실전인사이트'];
const VALID_NUMBERS: BriefingCard['number'][] = [1, 2, 3];
const REQUIRED_FIELDS: (keyof BriefingCard)[] = ['id', 'number', 'title', 'content', 'summary', 'type'];

/**
 * 문장 수 카운트 (한국어 특성 고려)
 * - 마침표(.), 느낌표(!), 물음표(?) 기준
 * - "..." (말줄임표)는 문장 구분자가 아님
 * - 빈 문장은 제외
 */
function countSentences(text: string): number {
  // Replace ellipsis patterns so they don't count as sentence terminators
  const cleaned = text
    .replace(/\.{2,}/g, '\u2026')   // ".." or "..." -> single ellipsis char
    .replace(/\u2026/g, '');          // remove ellipsis entirely

  // Split on sentence-ending punctuation followed by optional whitespace
  const sentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length;
}

function validateCard(card: BriefingCard, index: number, errors: string[], warnings: string[]): void {
  const label = `Card ${index + 1}`;

  // Required fields check
  for (const field of REQUIRED_FIELDS) {
    if (card[field] === undefined || card[field] === null || card[field] === '') {
      errors.push(`${label}: 필수 필드 '${field}' 누락`);
    }
  }

  // number validity
  if (!VALID_NUMBERS.includes(card.number)) {
    errors.push(`${label}: number는 1|2|3 이어야 함 (현재: ${card.number})`);
  }

  // type validity
  if (!VALID_TYPES.includes(card.type)) {
    errors.push(`${label}: type이 유효하지 않음 (현재: "${card.type}")`);
  }

  // Title length
  if (card.title && card.title.length > 20) {
    warnings.push(`${label}: title ${card.title.length}자 (권장 20자 이내) — "${card.title}"`);
  }

  // Summary length
  if (card.summary && card.summary.length > 60) {
    warnings.push(`${label}: summary ${card.summary.length}자 (권장 60자 이내)`);
  }

  // Content sentence count
  if (card.content) {
    const sentenceCount = countSentences(card.content);
    if (sentenceCount < 4) {
      warnings.push(`${label}: content ${sentenceCount}문장 (권장 4~6문장)`);
    } else if (sentenceCount > 6) {
      warnings.push(`${label}: content ${sentenceCount}문장 (권장 4~6문장)`);
    }
  }

  // Source check
  if (!card.source || card.source.trim() === '') {
    warnings.push(`${label}: source(출처) 누락`);
  }

  // sourceUrl validity
  if (card.sourceUrl !== undefined) {
    if (!card.sourceUrl.startsWith('http')) {
      warnings.push(`${label}: sourceUrl이 http로 시작하지 않음 — "${card.sourceUrl}"`);
    }
  } else {
    warnings.push(`${label}: sourceUrl 누락`);
  }

  // 초심자 해설 검증 (있을 때만 — 구버전 호환)
  if (card.beginnerExplanation) {
    const be = card.beginnerExplanation;
    if (!be.tldr || be.tldr.trim() === '') {
      warnings.push(`${label}: beginnerExplanation.tldr 누락`);
    } else if (be.tldr.length > 50) {
      warnings.push(`${label}: tldr ${be.tldr.length}자 (권장 30자, 최대 50자)`);
    }
    if (!Array.isArray(be.glossary)) {
      warnings.push(`${label}: glossary가 배열이 아님`);
    } else if (be.glossary.length > 5) {
      warnings.push(`${label}: glossary ${be.glossary.length}개 (최대 5개)`);
    }
    if (!be.whyItMatters || be.whyItMatters.trim() === '') {
      warnings.push(`${label}: whyItMatters 누락`);
    }
  } else {
    warnings.push(`${label}: beginnerExplanation 누락 (초심자 해설 없음)`);
  }
}

/**
 * 브리핑 카테고리의 카드들을 검증
 * errors: 반드시 수정 필요 (필수 필드 누락, 카드 수 불일치 등)
 * warnings: 권장 수정 (글자수 초과, 출처 누락 등)
 */
export function validateBriefing(briefing: BriefingCategory): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Card count check
  if (!briefing.cards || !Array.isArray(briefing.cards)) {
    errors.push('cards 배열이 존재하지 않음');
    return { valid: false, errors, warnings };
  }

  if (briefing.cards.length !== 3) {
    errors.push(`카드 수 불일치: ${briefing.cards.length}장 (정확히 3장 필요)`);
  }

  // Validate each card
  briefing.cards.forEach((card, index) => {
    validateCard(card, index, errors, warnings);
  });

  // Duplicate title check
  const titles = briefing.cards.map((c) => c.title).filter(Boolean);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size < titles.length) {
    errors.push(`중복 title 발견: ${titles.length}장 중 ${uniqueTitles.size}개만 고유`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
