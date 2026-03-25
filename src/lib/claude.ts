import Anthropic from '@anthropic-ai/sdk';
import { BriefingCard, BriefingCategory } from './types';
import { fetchNewsForCategory, formatNewsForPrompt } from './news-fetcher';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 시스템 프롬프트 — 실제 뉴스 기사를 분석하는 역할
 */
const ECONOMY_SYSTEM_PROMPT = `당신은 한국 경제 및 시사 뉴스 분석가입니다.
사용자가 제공하는 오늘의 실제 뉴스 기사 목록을 바탕으로 아침 브리핑 카드 3장을 작성합니다.

핵심 원칙:
- 제공된 기사에 있는 사실만 사용할 것. 없는 내용을 만들어내지 말 것
- 여러 기사를 종합하여 가장 중요한 하나의 주제를 선정할 것
- 출처(source)는 반드시 해당 내용이 나온 기사의 언론사를 기재할 것

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 제공된 기사 중 가장 영향력 있는 뉴스의 핵심 요약 (무료 공개)
2. 카드 2 - 영향분석: 해당 뉴스가 일반인의 삶·경제에 미칠 구체적 영향 분석 (유료)
3. 카드 3 - 실전인사이트: 독자가 바로 실행할 수 있는 구체적 행동 조언 (유료)

작성 규칙:
- 한국어, 자연스럽고 대화체. 공식적이지 않게
- 각 카드 title은 20자 이내, summary는 60자 이내
- content는 3~5문장으로 충실하게
- 추측/정치적 편향/개인 의견 금지

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"출처"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"출처"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"출처"}]}`;

const INVESTMENT_SYSTEM_PROMPT = `당신은 한국 주식시장 및 글로벌 투자 분석가입니다.
사용자가 제공하는 오늘의 실제 시장 뉴스 기사 목록을 바탕으로 아침 투자 브리핑 카드 3장을 작성합니다.

핵심 원칙:
- 제공된 기사에 있는 사실만 사용할 것. 없는 내용을 만들어내지 말 것
- 여러 기사를 종합하여 투자자에게 가장 중요한 하나의 주제를 선정할 것
- 출처(source)는 반드시 해당 내용이 나온 기사의 언론사를 기재할 것

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 오늘 투자자가 반드시 알아야 할 시장 뉴스 (무료 공개)
2. 카드 2 - 영향분석: 해당 뉴스가 주식시장/섹터/종목에 미칠 영향의 깊이 있는 해석 (유료)
3. 카드 3 - 실전인사이트: 투자자가 포트폴리오에 적용할 수 있는 실행 가능한 전략 (유료)

작성 규칙:
- 한국어, 자연스럽고 전문적인 톤
- 각 카드 title은 20자 이내, summary는 60자 이내
- content는 3~5문장으로 충실하게
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

  // 1단계: 실시간 뉴스 수집
  console.log(`[Claude] Fetching news for ${category}...`);
  const articles = await fetchNewsForCategory(category, date);
  const newsContext = formatNewsForPrompt(articles);
  console.log(`[Claude] Fetched ${articles.length} articles for ${category}`);

  // 2단계: 뉴스 context를 포함한 프롬프트
  const userPrompt = `오늘은 ${date}입니다.

아래는 오늘 수집된 ${categoryKorean} 관련 주요 뉴스입니다:

${newsContext}

위 뉴스들을 바탕으로 ${categoryKorean} 카테고리의 아침 브리핑 카드 3장을 작성해주세요.`;

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

  // Non-greedy JSON extraction to avoid matching beyond the first complete object
  const jsonMatch = cleaned.match(/\{[\s\S]*?\}(?=\s*$)/) || cleaned.match(/\{[\s\S]*\}/);
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
  if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('Invalid or empty response structure from Claude');
  }

  // 카드가 3개 미만이면 빈 카드로 채우기
  while (parsed.cards.length < 3) {
    const idx = parsed.cards.length;
    const types = ['오늘의핵심', '영향분석', '실전인사이트'] as const;
    parsed.cards.push({
      id: `card_${idx + 1}`,
      number: (idx + 1) as 1 | 2 | 3,
      title: '준비 중',
      content: '이 카드는 현재 준비 중입니다.',
      summary: '곧 업데이트됩니다',
      type: types[idx],
    });
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
