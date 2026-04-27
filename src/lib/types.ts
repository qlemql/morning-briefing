/**
 * Morning Briefing API Schema
 * TypeScript types for the Korean-language AI morning briefing web app
 */

/**
 * 초심자용 카드 해설 (카드 뒷면에 표시)
 */
export interface BeginnerExplanation {
  /** 한 마디로 요약, 30자 이내, 중학생도 이해 가능한 톤 */
  tldr: string;

  /** 본문에 등장한 어려운 용어 풀이 (0~5개) */
  glossary: Array<{
    /** 용어 (예: "FOMC", "코스피") */
    term: string;
    /** 1줄 설명 (예: "미국 중앙은행 금리 결정 회의") */
    explain: string;
  }>;

  /** "이게 나/우리에게 왜 중요한가?" 2~3문장 */
  whyItMatters: string;
}

/**
 * Individual briefing card
 * Cards are ordered by number (1: hook/free, 2-3: premium/paywall)
 */
export interface BriefingCard {
  /** Unique card identifier (e.g., "card_1", "card_2") */
  id: string;

  /** Card display number (1, 2, or 3) for ordering and UI badge */
  number: 1 | 2 | 3;

  /** Card title in Korean - max 20 characters */
  title: string;

  /** Main card content/body in Korean */
  content: string;

  /** One-line summary in Korean - max 60 characters */
  summary: string;

  /** Card category/type for styling (e.g., "hook", "impact", "insight") */
  type: "오늘의핵심" | "영향분석" | "실전인사이트";

  /** Source publication name (e.g., "한국경제", "Bloomberg") */
  source?: string;

  /** Direct URL to the original news article */
  sourceUrl?: string;

  /** 카드 뒷면에 표시되는 초심자용 해설 (없으면 뒤집기 버튼 비활성) */
  beginnerExplanation?: BeginnerExplanation;
}

/**
 * Complete briefing response for a single category
 */
export interface BriefingCategory {
  /** Category identifier (e.g., "economy", "investment") */
  category: string;

  /** Category name in Korean (e.g., "경제/시사", "투자") */
  categoryName: string;

  /** ISO timestamp when this briefing was generated (KST) */
  generatedAt: string;

  /** Array of 3 cards: Card 1 (free), Cards 2-3 (paywall) */
  cards: BriefingCard[];
}

/**
 * Complete Morning Briefing response
 * Contains all categories generated for the current day
 */
export interface MorningBriefingResponse {
  /** ISO date (YYYY-MM-DD) for the briefing day */
  date: string;

  /** ISO timestamp when the briefing was generated */
  generatedAt: string;

  /** Array of all category briefings */
  categories: BriefingCategory[];
}

/**
 * Request payload for generating a single category briefing
 */
export interface GenerateBriefingRequest {
  /** Category to generate */
  category: "economy" | "investment" | "lifestyle";

  /** Optional override for generation date (defaults to today) */
  date?: string;
}

/**
 * Response metadata for API responses
 */
export interface ApiMeta {
  /** API version */
  version: "1.0";

  /** Request status ("success" | "error") */
  status: "success" | "error";

  /** Optional error message */
  message?: string;

  /** Processing time in milliseconds */
  processingTimeMs?: number;
}

/**
 * Full API response envelope
 */
export interface ApiResponse<T> {
  /** Response metadata */
  meta: ApiMeta;

  /** Response data payload */
  data?: T;

  /** Error details if status is "error" */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
