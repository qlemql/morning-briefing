/**
 * Payment utilities — Toss Payments integration placeholder
 *
 * 사업자등록 완료 전까지 실제 결제는 불가.
 * 환경변수와 함수 시그니처만 준비해두고,
 * 사업자등록 후 Toss Payments SDK를 연동한다.
 */

// ── 가격 설정 ──────────────────────────────────────
export const SUBSCRIPTION_PRICE = 3_900;
export const ANNUAL_SUBSCRIPTION_PRICE = 2_900; // 월 환산 (연간 결제)
export const TRIAL_DAYS = 7;

// ── 환경변수 (사업자등록 후 .env에 설정) ─────────────
// NEXT_PUBLIC_TOSS_CLIENT_KEY — Toss Payments 클라이언트 키
// TOSS_SECRET_KEY — Toss Payments 시크릿 키 (서버 전용)

export function getTossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null;
}

export function getTossSecretKey(): string | null {
  return process.env.TOSS_SECRET_KEY ?? null;
}

// ── 결제 상태 타입 ─────────────────────────────────
export type PaymentStatus = 'idle' | 'pending' | 'success' | 'failed' | 'cancelled';

export interface PaymentResult {
  status: PaymentStatus;
  orderId?: string;
  message?: string;
}

// ── Placeholder 함수들 ─────────────────────────────

/**
 * 결제 시작 — Toss Payments SDK 연동 위치
 *
 * TODO: 사업자등록 후 구현
 * 1. @tosspayments/payment-widget-sdk 설치
 * 2. PaymentWidget 초기화 (clientKey)
 * 3. widget.requestPayment() 호출
 * 4. successUrl / failUrl 콜백 처리
 */
export async function initiatePayment(_plan: 'monthly' | 'annual'): Promise<PaymentResult> {
  console.warn('[payment] initiatePayment: not implemented — 사업자등록 후 Toss Payments 연동 필요');
  return { status: 'idle', message: '결제 시스템 준비 중입니다.' };
}

/**
 * 결제 승인 검증 — 서버사이드
 *
 * TODO: 사업자등록 후 구현
 * 1. Toss Payments confirmPayment API 호출
 * 2. orderId, amount, paymentKey 검증
 * 3. 구독 상태 Redis에 저장
 */
export async function verifyPayment(_paymentKey: string, _orderId: string, _amount: number): Promise<PaymentResult> {
  console.warn('[payment] verifyPayment: not implemented');
  return { status: 'idle', message: '결제 검증 시스템 준비 중입니다.' };
}

/**
 * 구독 취소
 *
 * TODO: 사업자등록 후 구현
 * 1. Toss Payments 빌링키 해지
 * 2. Redis 구독 상태 업데이트
 * 3. 취소 확인 이메일 발송
 */
export async function cancelSubscription(_userId: string): Promise<PaymentResult> {
  console.warn('[payment] cancelSubscription: not implemented');
  return { status: 'idle', message: '구독 취소 시스템 준비 중입니다.' };
}

/**
 * Toss Payments SDK 사용 가능 여부
 */
export function isPaymentReady(): boolean {
  return !!(getTossClientKey() && getTossSecretKey());
}
