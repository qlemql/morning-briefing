/**
 * Morning Briefing API Schema
 * TypeScript types for the Korean-language AI morning briefing web app
 */

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

  /** Optional source URL or publication name */
  source?: string;
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
  /** Category to generate ("economy" | "investment") */
  category: "economy" | "investment";

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
