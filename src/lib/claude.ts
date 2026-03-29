import Anthropic from '@anthropic-ai/sdk';
import { BriefingCard, BriefingCategory } from './types';
import { canAffordCall, recordCall } from './budget';

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
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"언론사명","sourceUrl":"https://원문URL"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"언론사명","sourceUrl":"https://원문URL"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"언론사명","sourceUrl":"https://원문URL"}]}`;

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
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"언론사명","sourceUrl":"https://원문URL"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"언론사명","sourceUrl":"https://원문URL"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"언론사명","sourceUrl":"https://원문URL"}]}`;

const LIFESTYLE_SYSTEM_PROMPT = `당신은 생활 트렌드 및 테크 전문 에디터입니다. 매일 아침 사람들의 일상에 영향을 미치는 IT/테크, 소비, 건강, 문화 트렌드를 분석합니다.

역할:
- IT/테크 분야의 주요 변화 (AI, 스마트폰, 서비스 업데이트 등)
- 소비 트렌드 변화 (물가, 유통, 새로운 서비스)
- 건강/라이프스타일 관련 실용 정보
- MZ세대와 직장인에게 실질적으로 유용한 생활 정보

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 오늘 가장 흥미로운 생활/테크 뉴스. "이거 몰랐으면 손해" 느낌. 구체적 서비스명이나 제품명 포함 (무료 공개)
2. 카드 2 - 영향분석: "이게 내 일상에 어떤 변화를 가져올까?" — 구체적으로 어떤 앱, 서비스, 습관이 바뀔 수 있는지 (유료)
3. 카드 3 - 실전인사이트: "지금 당장 해볼 수 있는 것" — 앱 다운로드, 설정 변경, 구독 취소 등 5분 안에 실행 가능한 팁 (유료)

작성 규칙:
- 한국어, 친근하고 캐주얼한 톤. "~거든요", "~인데요", "~해보세요" 같은 자연스러운 말투
- 각 카드 title은 20자 이내, summary는 60자 이내 (카드 2-3의 summary는 궁금증 유발)
- content는 4~6문장으로 충실하게. 빈약한 내용 금지
- 웹 검색으로 수집한 실시간 뉴스 기반
- 출처(source)는 해당 내용이 나온 미디어/서비스를 기재
- 광고성 내용 금지, 중립적 시각 유지

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"언론사명","sourceUrl":"https://원문URL"},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"언론사명","sourceUrl":"https://원문URL"},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"언론사명","sourceUrl":"https://원문URL"}]}`;

const SYSTEM_PROMPTS: Record<string, string> = {
  economy: ECONOMY_SYSTEM_PROMPT,
  investment: INVESTMENT_SYSTEM_PROMPT,
  lifestyle: LIFESTYLE_SYSTEM_PROMPT,
};

/**
 * Category-specific allowed domains for web search
 * 차단된 도메인 (Anthropic 크롤러 접근 불가):
 *   mk.co.kr, reuters.com, donga.com, chosun.com, yna.co.kr
 */
function getAllowedDomains(category: string): string[] {
  const common = [
    'news.google.com',
    'n.news.naver.com',
    'news.naver.com',
  ];
  const categoryDomains: Record<string, string[]> = {
    economy: [
      ...common,
      'www.hankyung.com',
      'www.sedaily.com',
      'biz.heraldcorp.com',
      'www.newsis.com',
    ],
    investment: [
      ...common,
      'www.hankyung.com',
      'www.sedaily.com',
      'finance.naver.com',
      'biz.heraldcorp.com',
      'www.newsis.com',
    ],
    lifestyle: [
      ...common,
      'www.bloter.net',
      'zdnet.co.kr',
      'www.itworld.co.kr',
      'www.theverge.com',
      'techcrunch.com',
    ],
  };
  return categoryDomains[category] || categoryDomains.economy;
}

interface ClaudeResponse {
  cards: BriefingCard[];
}

/**
 * 3회 재시도 로직 (5초 간격)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 5000): Promise<T> {
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
  const categoryMap: Record<string, string> = {
    economy: '경제/시사',
    investment: '투자',
    lifestyle: '생활/테크',
  };
  const categoryKorean = categoryMap[category] || '경제/시사';
  const systemPrompt = SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.economy;

  // KST time info for context
  const kstNow = new Date(Date.now() + 9 * 3600 * 1000);
  const kstHour = kstNow.getUTCHours();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][kstNow.getUTCDay()];
  const timeContext = kstHour < 12
    ? '오전 출근 전에 읽는 브리핑입니다. 오늘 하루에 필요한 정보에 집중하세요.'
    : '오후에 읽는 브리핑입니다. 오늘 발생한 주요 뉴스를 정리해주세요.';

  // Weekend/weekday format branching
  const kstDayNum = kstNow.getUTCDay(); // 0=Sun, 6=Sat
  const isWeekend = kstDayNum === 0 || kstDayNum === 6;
  const weekendContext = isWeekend
    ? `\n\n주말 특별 포맷: "이번 주 마켓 리캡 + 다음 주 주요 일정"으로 구성하세요. 다음 주 FOMC, 실적 발표, 고용지표 등 예정된 이벤트를 반드시 포함하세요.`
    : '';

  const userPrompt = `오늘은 ${date} (${dayOfWeek}요일, KST 기준)입니다. ${timeContext}${weekendContext}

오늘의 ${categoryKorean} 카테고리 아침 브리핑 카드 3장을 작성해주세요.

뉴스 선정 기준 (우선순위):
1. 가장 많은 언론사가 다루고 있는 뉴스
2. 시장에 직접 영향을 주는 뉴스
3. 독자의 돈과 일상에 영향을 주는 뉴스

카드별 톤 차별화:
- 카드 1 (무료): 대중적이고 임팩트 있는 톤. "오늘 이거 하나만 알면 됩니다" 느낌
- 카드 2-3 (유료): 프리미엄답게 분석적인 톤. 데이터와 맥락 중심

핵심 규칙:
- 반드시 웹 검색으로 오늘자(${date}) 또는 전날 저녁 최신 뉴스를 찾아주세요
- title은 반드시 20자 이내 — 핵심 키워드 + 임팩트 (예: "반도체 훈풍, 삼성 주가 급등")
- summary는 반드시 60자 이내 (카드 2-3은 "이거 알면 돈 아끼는데..." 같은 궁금증 유발 톤)
- content는 4~6문장, 각 문장에 구체적 수치/사실 포함. 모호한 표현("많은", "크게" 등) 대신 수치 사용
- source에는 실제 언론사명 기재 (예: "한국경제", "Bloomberg")
- sourceUrl에는 반드시 웹 검색에서 찾은 실제 뉴스 기사 URL을 기재 (예: "https://www.hankyung.com/article/...")
- 카드 3개의 주제가 서로 겹치지 않도록 다양하게 선택 (같은 기업/이슈 반복 금지)
- 카드 1의 title은 독자가 멈추고 읽고 싶게 만들어야 함 — 첫인상이 곧 서비스 평가
- content에서 "~에 따르면", "~라고 밝혔다" 등 인용문을 넣어 신뢰감을 높여주세요
- 절대로 특정 종목/자산의 매수나 매도를 권유하지 마세요. "주목할 만하다", "모니터링이 필요하다" 수준의 표현만 가능
- JSON만 출력하세요`;

  // Budget guard — prevent overspending
  const budget = await canAffordCall();
  if (!budget.allowed) {
    console.warn(
      `[Claude] Budget exceeded! Day: ${budget.spentToday.toFixed(2)}¢/${budget.dailyBudget}¢ | Month: ${budget.spentMonth.toFixed(2)}¢/${budget.monthlyBudget}¢`,
    );
    throw new Error('Daily API budget exceeded');
  }

  console.log(`[Claude] Generating ${category} briefing with web_search for ${date}...`);

  const message = await withRetry(() =>
    client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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
          allowed_domains: getAllowedDomains(category),
        },
      ],
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  );

  const usage = message.usage;
  console.log(
    `[Claude] Response received. Stop: ${message.stop_reason}` +
    ` | Input: ${usage.input_tokens} (cache_read: ${(usage as unknown as Record<string, number>).cache_read_input_tokens || 0})` +
    ` | Output: ${usage.output_tokens}`,
  );

  // Truncation guard: if max_tokens was hit, the JSON is likely incomplete
  if (message.stop_reason === 'max_tokens') {
    console.warn(`[Claude] Response truncated (max_tokens). Output: ${usage.output_tokens} tokens. Category: ${category}`);
  }

  // Extract text content from potentially multi-block response
  const rawText = extractTextFromResponse(message.content);

  if (!rawText) {
    console.error('[Claude] No text content in response. Content types:', message.content.map(b => b.type));
    throw new Error('No text content in Claude response');
  }

  // Clean markdown code blocks if present
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Extract JSON — try multiple strategies
  let parsed: ClaudeResponse | null = null;

  // Strategy 1: Parse the entire cleaned text
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Strategy 2: Find the outermost { ... } containing "cards"
    const start = cleaned.indexOf('{"cards"');
    if (start >= 0) {
      // Find matching closing brace
      let depth = 0;
      let end = start;
      for (let i = start; i < cleaned.length; i++) {
        if (cleaned[i] === '{') depth++;
        else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      try {
        parsed = JSON.parse(cleaned.substring(start, end));
      } catch {
        // Strategy 3: Greedy regex
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
        }
      }
    }
  }

  // Strategy 4: Attempt to repair truncated JSON (max_tokens cutoff)
  if (!parsed && message.stop_reason === 'max_tokens') {
    console.warn('[Claude] Attempting truncated JSON repair...');
    const cardsMatch = cleaned.match(/"cards"\s*:\s*\[/);
    if (cardsMatch) {
      // Find all complete card objects {...}
      const arrayStart = cleaned.indexOf('[', cardsMatch.index!);
      const cardRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      const cardSection = cleaned.substring(arrayStart);
      const cards: unknown[] = [];
      let m: RegExpExecArray | null;
      while ((m = cardRegex.exec(cardSection)) !== null) {
        try {
          cards.push(JSON.parse(m[0]));
        } catch { /* skip malformed card */ }
      }
      if (cards.length > 0) {
        parsed = { cards: cards as BriefingCard[] };
        console.log(`[Claude] Recovered ${cards.length} card(s) from truncated response`);
      }
    }
  }

  if (!parsed) {
    console.error('[Claude] No valid JSON found. Raw:', rawText.substring(0, 500));
    throw new Error('No JSON found in Claude response');
  }
  if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('Invalid or empty response structure from Claude');
  }

  const types = ['오늘의핵심', '영향분석', '실전인사이트'] as const;

  // 카드가 3개 미만이면 빈 카드로 채우기
  while (parsed.cards.length < 3) {
    const idx = parsed.cards.length;
    parsed.cards.push({
      id: `card_${idx + 1}`,
      number: (idx + 1) as 1 | 2 | 3,
      title: '준비 중',
      content: '이 카드는 현재 준비 중입니다.',
      summary: '곧 업데이트됩니다',
      type: types[idx],
    });
  }

  const validatedCards = parsed.cards.slice(0, 3).map((card, index) => {
    const title = (card.title || '').trim();
    const content = (card.content || '').trim();
    const summary = (card.summary || '').trim();

    // title이 비거나 너무 긴 경우 자르기
    const clampedTitle = title.length > 25 ? title.substring(0, 23) + '…' : title;
    const clampedSummary = summary.length > 70 ? summary.substring(0, 68) + '…' : summary;

    if (!content || content.length < 20) {
      console.warn(`[Claude] Card ${index + 1} has insufficient content (${content.length} chars)`);
    }

    return {
      id: card.id || `card_${index + 1}`,
      number: (index + 1) as 1 | 2 | 3,
      title: clampedTitle || `카드 ${index + 1}`,
      content: content || '콘텐츠를 불러오는 중 문제가 발생했습니다.',
      summary: clampedSummary || '요약을 불러오지 못했습니다',
      type: card.type || (types[index] as BriefingCard['type']),
      source: card.source,
      sourceUrl: card.sourceUrl && card.sourceUrl.startsWith('http') ? card.sourceUrl : undefined,
    };
  });

  // Record API call for budget tracking
  await recordCall({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });

  return {
    category,
    categoryName: categoryKorean,
    generatedAt: new Date().toISOString(),
    cards: validatedCards,
  };
}
