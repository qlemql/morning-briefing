import { BriefingCard, BriefingCategory } from './types';

/**
 * Content Filter — 위험 표현 자동 감지 및 치환
 *
 * Claude가 생성한 브리핑 카드에서 투자 권유, 확정적 예측,
 * 정치적 편향, 민감 표현을 정규식/키워드 매칭으로 필터링합니다.
 * AI 호출 없이 동작하므로 비용 0원.
 */

// ---------------------------------------------------------------------------
// 1. 키워드 사전 및 치환 매핑
// ---------------------------------------------------------------------------

/** 투자 권유 표현 — 직접적인 매수/매도 권유만 탐지 */
const INVESTMENT_RECOMMENDATIONS: [RegExp, string][] = [
  [/지금\s*(바로\s*)?사세요/g, '주목할 만합니다'],
  [/매수\s*추천/g, '관심 종목'],
  [/매도\s*추천/g, '리스크 점검 필요'],
  [/추천\s*종목/g, '주목할 종목'],
  [/수익률\s*보장/g, '수익 가능성'],
  [/지금이\s*기회/g, '주목할 시점'],
  [/반드시\s*사야/g, '관심을 가져볼 만한'],
  [/꼭\s*사야\s*(할|하는)/g, '검토해볼 만한'],
  [/올인\s*하세요/g, '비중 확대를 고려해볼 수 있습니다'],
  [/몰빵/g, '집중 투자'],
  [/대박\s*종목/g, '주목할 종목'],
];

/** 확정적 예측 표현 — 근거 없는 단정만 탐지 */
const DEFINITIVE_PREDICTIONS: [RegExp, string][] = [
  [/반드시\s*오를/g, '상승 가능성이 있는'],
  [/반드시\s*떨어질/g, '하락 가능성이 있는'],
  [/무조건\s*(오를|상승|올라)/g, '상승 가능성이 있는'],
  [/무조건\s*(떨어질|하락|내려)/g, '하락 가능성이 있는'],
  [/100%\s*확실/g, '높은 가능성'],
  [/틀림없이/g, '가능성이 높게'],
  [/확실히\s*(오를|상승)/g, '상승 전망이 우세한'],
  [/확실히\s*(떨어질|하락)/g, '하락 전망이 우세한'],
  [/무조건\s*수익/g, '수익 가능성'],
  [/절대\s*(안\s*)?떨어지/g, '하방 리스크가 제한적인'],
  [/보장된\s*수익/g, '기대 수익'],
];

/** 정치적 편향 표현 — 노골적 편향만 탐지 (최소 범위) */
const POLITICAL_BIAS: [RegExp, string][] = [
  [/정부를\s*비판/g, '정부 정책에 대한 의견'],
  [/무능한\s*정부/g, '정부 정책 과제'],
  [/정권\s*퇴진/g, '정치적 변화 논의'],
  [/(여당|야당)을?\s*(비판|옹호|지지|찬양)/g, '정치권 동향'],
  [/(좌파|우파|빨갱이|수꼴)/g, '정치적 입장'],
];

/** 민감 표현 — 혐오, 차별, 선정적 표현 */
const SENSITIVE_EXPRESSIONS: [RegExp, string][] = [
  [/혐오\s*표현/g, '부적절한 표현'],
  [/(장애인|여성|남성|노인|외국인).*?(비하|차별|혐오)/g, '사회적 이슈'],
  [/인종\s*차별/g, '인종 관련 이슈'],
];

/** 모든 필터 규칙을 카테고리별로 묶어 관리 */
const FILTER_RULES: { category: string; rules: [RegExp, string][] }[] = [
  { category: '투자권유', rules: INVESTMENT_RECOMMENDATIONS },
  { category: '확정예측', rules: DEFINITIVE_PREDICTIONS },
  { category: '정치편향', rules: POLITICAL_BIAS },
  { category: '민감표현', rules: SENSITIVE_EXPRESSIONS },
];

// ---------------------------------------------------------------------------
// 2. 필터 결과 타입
// ---------------------------------------------------------------------------

export interface FilterWarning {
  /** 감지된 카테고리 */
  category: string;
  /** 원본 텍스트 */
  original: string;
  /** 치환된 텍스트 */
  replaced: string;
  /** 발견된 카드 ID */
  cardId: string;
  /** 발견된 필드 */
  field: 'title' | 'summary' | 'content';
}

export interface FilterResult {
  /** 필터링된 브리핑 데이터 */
  filtered: BriefingCategory;
  /** 감지된 위험 표현 목록 (빈 배열이면 정상) */
  warnings: FilterWarning[];
}

// ---------------------------------------------------------------------------
// 3. 필터 로직
// ---------------------------------------------------------------------------

/**
 * 단일 문자열에 대해 모든 필터 규칙을 적용합니다.
 * 정규식 lastIndex 문제를 방지하기 위해 매번 새 RegExp를 생성합니다.
 */
function filterText(
  text: string,
  cardId: string,
  field: FilterWarning['field'],
  warnings: FilterWarning[],
): string {
  let result = text;

  for (const { category, rules } of FILTER_RULES) {
    for (const [pattern, replacement] of rules) {
      // 새 RegExp 인스턴스를 만들어 global flag의 lastIndex 오염 방지
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = result.match(regex);

      if (matches) {
        for (const match of matches) {
          warnings.push({
            category,
            original: match,
            replaced: replacement,
            cardId,
            field,
          });
        }
        result = result.replace(regex, replacement);
      }
    }
  }

  return result;
}

/**
 * 단일 카드의 title, summary, content를 필터링합니다.
 */
function filterCard(card: BriefingCard, warnings: FilterWarning[]): BriefingCard {
  return {
    ...card,
    title: filterText(card.title, card.id, 'title', warnings),
    summary: filterText(card.summary, card.id, 'summary', warnings),
    content: filterText(card.content, card.id, 'content', warnings),
  };
}

/**
 * 브리핑 카테고리 전체를 필터링합니다.
 *
 * - 정규식 + 키워드 매칭 기반 (AI 호출 없음, 비용 0)
 * - 위험 표현 발견 시 완화된 표현으로 자동 치환
 * - 경고 목록을 함께 반환하여 로그/모니터링에 활용
 *
 * @example
 * const { filtered, warnings } = filterBriefing(briefing);
 * if (warnings.length > 0) {
 *   console.warn(`[ContentFilter] ${warnings.length} expressions filtered`);
 * }
 */
export function filterBriefing(briefing: BriefingCategory): FilterResult {
  const warnings: FilterWarning[] = [];

  const filteredCards = briefing.cards.map((card) => filterCard(card, warnings));

  return {
    filtered: {
      ...briefing,
      cards: filteredCards,
    },
    warnings,
  };
}
