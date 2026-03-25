import Anthropic from '@anthropic-ai/sdk';
import { BriefingCard, BriefingCategory } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 시스템 프롬프트 — Claude가 직접 웹 검색하여 브리핑 작성
 * (원래 목표: "AI가 매일 아침 정리해주는 브리핑")
 */
const ECONOMY_SYSTEM_PROMPT = `당신은 한국 경제 및 시사 전문가입니다. 매일 아침 한국 경제, 글로벌 시장 동향, 정책 변화를 분석하는 브리핑 카드를 작성합니다.

역할:
- 한국 경제에 직접 영향을 미치는 뉴스 발굴
- 글로벌 시장 변화가 한국에 미칠 영향 분석
- 정부 정책 및 규제 변화 해석
- 복잡한 경제 뉴스를 일반인도 이해할 수 있게 설명

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 가장 영향력 있는 오늘의 경제 뉴스. 독자를 즉시 사로잡을 것. title은 호기심을 유발하되 클릭베이트는 아닌 톤 (무료 공개)
2. 카드 2 - 영향분석: 카드 1의 뉴스가 한국 경제·일상에 미칠 구체적 영향. "그래서 나한테 어떤 영향이?" 라는 질문에 답해야 함. 숫자와 구체적 사례 포함 (유료)
3. 카드 3 - 실전인사이트: "그래서 뭘 해야 해?" — 직장인/자영업자/투자자가 내일부터 실행할 수 있는 1-2가지 구체적 행동. 추상적 조언 금지 (유료)

작성 규칙:
- 한국어, 대화체. "~입니다" 보다 "~이에요", "~거든요" 같은 자연스러운 말투
- 각 카드 title은 20자 이내, summary는 60자 이내 (카드 2-3의 summary는 유료 잠금 전에 보이므로 궁금증을 유발하도록)
- content는 4~6문장으로 충실하게. 빈약한 내용 금지
- 웹 검색으로 수집한 실시간 뉴스 기반
- 출처(source)는 해당 내용이 나온 언론사/웹사이트를 기재
- 추측/정치적 편향/개인 의견 금지

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"출처"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"출처"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"출처"}]}`;

const INVESTMENT_SYSTEM_PROMPT = `당신은 한국 주식시장 및 글로벌 투자 전문가입니다. 매일 아침 주식시장 동향, 투자 기회, 관련 자산군 분석을 제공합니다.

역할:
- 한국 코스피/코스닥 주요 변화 분석
- 글로벌 증시 동향과 한국시장 영향 분석
- 주목할 만한 종목 및 섹터 분석
- 투자자를 위한 실행 가능한 인사이트 제공

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 오늘 투자자가 반드시 알아야 할 시장 뉴스. 구체적 수치(지수, 등락률) 포함 (무료 공개)
2. 카드 2 - 영향분석: "이 뉴스로 어떤 섹터/종목이 움직일까?" — 구체적 섹터명, 영향 경로, 과거 유사 사례 비교 (유료)
3. 카드 3 - 실전인사이트: "지금 뭘 해야 할까?" — 관심 종목 리스트, 비중 조절 방향, 모니터링 포인트 등 실행 가능한 체크리스트 (유료)

작성 규칙:
- 한국어, 전문적이면서도 읽기 쉬운 톤. "~거든요", "~인데요" 같은 자연스러운 종결어
- 각 카드 title은 20자 이내, summary는 60자 이내 (카드 2-3의 summary는 궁금증 유발)
- content는 4~6문장으로 충실하게. 빈약한 내용 금지
- 웹 검색으로 수집한 실시간 시장 데이터 활용
- 출처(source)는 해당 내용이 나온 언론사/거래소를 기재
- 투자 권유 금지 ("~을 사세요" 금지), 근거 없는 예측 금지. 하지만 "주목할 만하다", "모니터링이 필요하다" 정도의 표현은 가능

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

/**
 * Claude 응답에서 텍스트 콘텐츠만 추출
 * (web_search 사용 시 server_tool_use, web_search_tool_result 등 다양한 블록이 포함됨)
 */
function extractTextFromResponse(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

export async function generateBriefing(
  category: string,
  date: string,
): Promise<BriefingCategory> {
  const categoryKorean = category === 'economy' ? '경제/시사' : '투자';
  const systemPrompt = SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.economy;

  const userPrompt = `오늘은 ${date}입니다. 오늘의 ${categoryKorean} 카테고리 아침 브리핑 카드 3장을 작성해주세요. 최신 뉴스를 웹에서 검색하여 반영해주세요.`;

  console.log(`[Claude] Generating ${category} briefing with web_search for ${date}...`);

  const message = await withRetry(() =>
    client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          allowed_domains: [
            'news.google.com',
            'n.news.naver.com',
            'news.naver.com',
            'www.hankyung.com',
            'www.mk.co.kr',
            'www.sedaily.com',
            'www.yna.co.kr',
            'www.chosun.com',
            'www.donga.com',
            'finance.naver.com',
            'www.bloomberg.com',
            'www.reuters.com',
          ],
        },
      ],
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  );

  console.log(`[Claude] Response received. Stop reason: ${message.stop_reason}`);

  // Extract text content from potentially multi-block response
  const rawText = extractTextFromResponse(message.content);

  if (!rawText) {
    console.error('[Claude] No text content in response. Content types:', message.content.map(b => b.type));
    throw new Error('No text content in Claude response');
  }

  // Clean markdown code blocks if present
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Extract JSON
  const jsonMatch = cleaned.match(/\{[\s\S]*?\}(?=\s*$)/) || cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[Claude] No JSON found. Raw response:', rawText.substring(0, 500));
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
