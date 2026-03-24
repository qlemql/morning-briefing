import Anthropic from '@anthropic-ai/sdk';
import { BriefingCard, BriefingCategory } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ECONOMY_SYSTEM_PROMPT = `당신은 한국 경제 및 시사 전문가입니다. 매일 아침 한국 경제, 글로벌 시장 동향, 정책 변화를 분석하는 브리핑 카드를 작성합니다.

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 가장 영향력 있는 오늘의 경제 뉴스. 독자를 즉시 사로잡을 것 (무료 공개)
2. 카드 2 - 영향분석: 카드 1의 뉴스가 한국 경제·일상에 미칠 구체적 영향. 심층 분석 (유료)
3. 카드 3 - 실전인사이트: 일반인이 실제로 활용할 수 있는 인사이트. 실질적 조언 (유료)

작성 규칙:
- 한국어, 자연스럽고 대화체. 로봇처럼 공식적이지 않게
- 각 카드 title은 20자 이내, summary는 60자 이내
- 웹 검색으로 수집한 실시간 뉴스 기반
- 출처 기록 (source 필드에 신문사명 또는 웹사이트)
- 추측/정치적 편향/개인 의견 금지

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"출처"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"출처"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"출처"}]}`;

const INVESTMENT_SYSTEM_PROMPT = `당신은 한국 주식시장 및 글로벌 투자 전문가입니다. 매일 아침 주식시장 동향, 투자 기회, 관련 자산군 분석을 제공합니다.

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 오늘의 가장 중요한 시장 뉴스. 투자자가 반드시 알아야 할 정보 (무료 공개)
2. 카드 2 - 영향분석: 해당 뉴스가 주식시장/섹터/종목에 미칠 영향. 전문가 관점의 깊이 있는 해석 (유료)
3. 카드 3 - 실전인사이트: 투자자가 실제 포트폴리오에 적용할 수 있는 조언. 실행 가능한 전략 (유료)

작성 규칙:
- 한국어, 자연스럽고 전문적인 톤
- 각 카드 title은 20자 이내, summary는 60자 이내
- 웹 검색으로 수집한 실시간 시장 데이터 활용
- 출처 기록 (증권사, 언론사, 거래소 등)
- 투자 권유 금지 ("~을 사세요" 금지), 근거 없는 예측 금지

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"출처"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"출처"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"출처"}]}`;

const SYSTEM_PROMPTS: Record<string, string> = {
  economy: ECONOMY_SYSTEM_PROMPT,
  investment: INVESTMENT_SYSTEM_PROMPT,
};

interface ClaudeResponse {
  cards: BriefingCard[];
}

/**
 * 3회 재시도 로직 (5초 간격)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 5000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRetryable =
        error instanceof Anthropic.APIError && error.status !== undefined && error.status >= 500;
      if (!isRetryable || i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Retry exhausted');
}

export async function generateBriefing(
  category: string,
  date: string,
): Promise<BriefingCategory> {
  const categoryKorean = category === 'economy' ? '경제/시사' : '투자';
  const systemPrompt = SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.economy;

  const userPrompt = `오늘은 ${date}입니다. ${categoryKorean} 카테고리의 아침 브리핑을 작성해주세요.`;

  const message = await withRetry(() =>
    client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: '{"cards":[' },
      ],
    }),
  );

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Prepend the prefill and strip markdown code blocks if present
  const rawText = '{"cards":[' + content.text;
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[Claude] No JSON found. Raw response:', content.text.substring(0, 500));
    throw new Error('No JSON found in Claude response');
  }

  let parsed: ClaudeResponse;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('[Claude] JSON parse failed. Extracted:', jsonMatch[0].substring(0, 500));
    throw new Error('Invalid JSON in Claude response');
  }
  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid response structure from Claude');
  }

  const validatedCards = parsed.cards.slice(0, 3).map((card, index) => ({
    id: card.id || `card_${index + 1}`,
    number: (index + 1) as 1 | 2 | 3,
    title: card.title || '',
    content: card.content || '',
    summary: card.summary || '',
    type: card.type || (['오늘의핵심', '영향분석', '실전인사이트'][index] as BriefingCard['type']),
    source: card.source,
  }));

  return {
    category,
    categoryName: categoryKorean,
    generatedAt: new Date().toISOString(),
    cards: validatedCards,
  };
}
