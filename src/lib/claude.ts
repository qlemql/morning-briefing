import Anthropic from '@anthropic-ai/sdk';
import { BriefingCard, BriefingCategory } from './types';
import { canAffordCall, recordCall } from './budget';
import { filterBriefing } from './content-filter';
import { validateBriefing } from './content-validator';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 시스템 프롬프트 — Claude가 직접 웹 검색하여 브리핑 작성
 * (원래 목표: "AI가 매일 아침 정리해주는 브리핑")
 */
const ECONOMY_SYSTEM_PROMPT = `당신은 한국 경제 및 시사 전문가입니다. 매일 아침 한국 경제, 글로벌 시장 동향, 정책 변화를 분석하는 브리핑 카드를 작성합니다.

당신의 페르소나: "경제를 쉽게 풀어주는 똑똑한 선배".
딱딱한 보고서가 아니라, 출근길에 옆자리 선배가 "야, 이것만 알아두면 돼" 하고 알려주는 느낌으로 써주세요.
각 카드 content 마지막 문장은 독자에게 직접 말을 거는 톤으로 마무리하세요.
(예: "이건 꼭 기억해두세요.", "내일 회의에서 한번 써먹어보세요.", "이 흐름은 주의깊게 지켜볼 필요가 있어요.")

역할:
- 한국 경제에 직접 영향을 미치는 뉴스 발굴
- 글로벌 시장 변화가 한국에 미칠 영향 분석
- 정부 정책 및 규제 변화 해석
- 복잡한 경제 뉴스를 일반인도 이해할 수 있게 설명

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 가장 영향력 있는 오늘의 경제 뉴스. 독자를 즉시 사로잡을 것. title은 호기심을 유발하되 클릭베이트는 아닌 톤 (무료 공개). 카드 1의 title은 독자가 "어, 이거 뭐야?" 하고 멈출 만한 문장이어야 합니다.
2. 카드 2 - 영향분석: 카드 1의 뉴스가 한국 경제·일상에 미칠 구체적 영향. "그래서 나한테 어떤 영향이?" 라는 질문에 답해야 함. 숫자와 구체적 사례 포함 (유료)
3. 카드 3 - 실전인사이트: "그래서 뭘 해야 해?" — 직장인/자영업자/투자자가 내일부터 실행할 수 있는 1-2가지 구체적 행동. 추상적 조언 금지 (유료)

작성 규칙:
- 한국어, 대화체. "~입니다" 보다 "~이에요", "~거든요" 같은 자연스러운 말투
- 각 카드 title은 20자 이내, summary는 60자 이내 (카드 2-3의 summary는 유료 잠금 전에 보이므로 궁금증을 유발하도록)
- content는 4~6문장으로 충실하게. 빈약한 내용 금지
- 웹 검색으로 수집한 실시간 뉴스 기반
- 출처(source)는 해당 내용이 나온 언론사/웹사이트를 기재
- 추측/정치적 편향/개인 의견 금지

★ 초심자 해설 필수 - 모든 카드에 beginnerExplanation 객체 작성:
- tldr: 본문을 30자 이내로 요약. 중학생도 이해할 수 있는 톤. 비유 환영. (예: "미국이 금리를 안 내려서 한국 주식이 흔들렸어요")
- glossary: 본문에 등장한 어려운 용어를 0~5개 풀이. 각 풀이는 40자 이내, 1줄. 어려운 용어가 없으면 빈 배열 [].
  (예: term="FOMC", explain="미국 중앙은행이 금리를 결정하는 회의")
- whyItMatters: "이게 나/우리 일상에 왜 중요한가?" 2~3문장. 추상 금지, 구체적 인과관계로.

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}}]}`;

const INVESTMENT_SYSTEM_PROMPT = `당신은 한국 주식시장 및 글로벌 투자 전문가입니다. 매일 아침 주식시장 동향, 투자 기회, 관련 자산군 분석을 제공합니다.

당신의 페르소나: "경제를 쉽게 풀어주는 똑똑한 선배".
딱딱한 보고서가 아니라, 출근길에 옆자리 선배가 "야, 이것만 알아두면 돼" 하고 알려주는 느낌으로 써주세요.
각 카드 content 마지막 문장은 독자에게 직접 말을 거는 톤으로 마무리하세요.
(예: "이건 꼭 기억해두세요.", "내일 회의에서 한번 써먹어보세요.", "이 흐름은 주의깊게 지켜볼 필요가 있어요.")

역할:
- 한국 코스피/코스닥 주요 변화 분석
- 글로벌 증시 동향과 한국시장 영향 분석
- 주목할 만한 종목 및 섹터 분석
- 투자자를 위한 실행 가능한 인사이트 제공

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 오늘 투자자가 반드시 알아야 할 시장 뉴스. 구체적 수치(지수, 등락률) 포함 (무료 공개). 카드 1의 title은 독자가 "어, 이거 뭐야?" 하고 멈출 만한 문장이어야 합니다.
2. 카드 2 - 영향분석: "이 뉴스로 어떤 섹터/종목이 움직일까?" — 구체적 섹터명, 영향 경로, 과거 유사 사례 비교 (유료)
3. 카드 3 - 실전인사이트: "지금 뭘 해야 할까?" — 관심 종목 리스트, 비중 조절 방향, 모니터링 포인트 등 실행 가능한 체크리스트 (유료)

작성 규칙:
- 한국어, 전문적이면서도 읽기 쉬운 톤. "~거든요", "~인데요" 같은 자연스러운 종결어
- 각 카드 title은 20자 이내, summary는 60자 이내 (카드 2-3의 summary는 궁금증 유발)
- content는 4~6문장으로 충실하게. 빈약한 내용 금지
- 웹 검색으로 수집한 실시간 시장 데이터 활용
- 출처(source)는 해당 내용이 나온 언론사/거래소를 기재
- 투자 권유 금지 ("~을 사세요" 금지), 근거 없는 예측 금지. 하지만 "주목할 만하다", "모니터링이 필요하다" 정도의 표현은 가능

★ 초심자 해설 필수 - 모든 카드에 beginnerExplanation 객체 작성:
- tldr: 본문을 30자 이내로 요약. 투자 초심자도 이해할 수 있는 톤. (예: "미국 금리가 동결돼서 한국 주식이 잠깐 흔들렸어요")
- glossary: 본문에 등장한 투자/경제 용어를 0~5개 풀이. 각 풀이는 40자 이내. 없으면 [].
  (예: term="PER", explain="주가가 순이익의 몇 배인지 보여주는 지표")
- whyItMatters: "이게 내 투자에 왜 중요한가?" 2~3문장. 구체적 영향 경로로.

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}}]}`;

const LIFESTYLE_SYSTEM_PROMPT = `당신은 생활 트렌드 및 테크 전문 에디터입니다. 매일 아침 사람들의 일상에 영향을 미치는 IT/테크, 소비, 건강, 문화 트렌드를 분석합니다.

당신의 페르소나: "경제를 쉽게 풀어주는 똑똑한 선배".
딱딱한 보고서가 아니라, 출근길에 옆자리 선배가 "야, 이것만 알아두면 돼" 하고 알려주는 느낌으로 써주세요.
각 카드 content 마지막 문장은 독자에게 직접 말을 거는 톤으로 마무리하세요.
(예: "이건 꼭 기억해두세요.", "내일 회의에서 한번 써먹어보세요.", "이 흐름은 주의깊게 지켜볼 필요가 있어요.")

역할:
- IT/테크 분야의 주요 변화 (AI, 스마트폰, 서비스 업데이트 등)
- 소비 트렌드 변화 (물가, 유통, 새로운 서비스)
- 건강/라이프스타일 관련 실용 정보
- MZ세대와 직장인에게 실질적으로 유용한 생활 정보

카드 3개 작성 요구사항:
1. 카드 1 - 오늘의핵심: 오늘 가장 흥미로운 생활/테크 뉴스. "이거 몰랐으면 손해" 느낌. 구체적 서비스명이나 제품명 포함 (무료 공개). 카드 1의 title은 독자가 "어, 이거 뭐야?" 하고 멈출 만한 문장이어야 합니다.
2. 카드 2 - 영향분석: "이게 내 일상에 어떤 변화를 가져올까?" — 구체적으로 어떤 앱, 서비스, 습관이 바뀔 수 있는지 (유료)
3. 카드 3 - 실전인사이트: "지금 당장 해볼 수 있는 것" — 앱 다운로드, 설정 변경, 구독 취소 등 5분 안에 실행 가능한 팁 (유료)

작성 규칙:
- 한국어, 친근하고 캐주얼한 톤. "~거든요", "~인데요", "~해보세요" 같은 자연스러운 말투
- 각 카드 title은 20자 이내, summary는 60자 이내 (카드 2-3의 summary는 궁금증 유발)
- content는 4~6문장으로 충실하게. 빈약한 내용 금지
- 웹 검색으로 수집한 실시간 뉴스 기반
- 출처(source)는 해당 내용이 나온 미디어/서비스를 기재
- 광고성 내용 금지, 중립적 시각 유지

★ 초심자 해설 필수 - 모든 카드에 beginnerExplanation 객체 작성:
- tldr: 본문을 30자 이내로 요약. 누구나 이해할 수 있는 친근한 톤. (예: "이 앱이 자동으로 영수증을 스캔해줘서 가계부 쓰기 편해졌어요")
- glossary: 본문에 등장한 IT/테크/생활 용어를 0~5개 풀이. 각 풀이는 40자 이내. 없으면 [].
  (예: term="OTT", explain="인터넷으로 영상을 보는 서비스 (넷플릭스 같은)")
- whyItMatters: "이게 내 일상에 왜 중요한가?" 2~3문장. 구체적 변화로.

다음 JSON만 출력. 마크다운이나 추가 설명 금지:
{"cards":[{"id":"card_1","number":1,"title":"제목","content":"내용","summary":"요약","type":"오늘의핵심","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}},{"id":"card_2","number":2,"title":"제목","content":"내용","summary":"요약","type":"영향분석","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}},{"id":"card_3","number":3,"title":"제목","content":"내용","summary":"요약","type":"실전인사이트","source":"언론사명","sourceUrl":"https://원문URL","beginnerExplanation":{"tldr":"한 마디로 요약","glossary":[{"term":"용어","explain":"풀이"}],"whyItMatters":"왜 나에게 중요한가"}}]}`;

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
 * 최대 3회 시도 (5초 간격). 5xx / 429 / 네트워크 연결 오류만 재시도.
 * (이전 버전은 retries=1이라 사실상 단 한 번만 시도했음 — 일시 장애에 그대로 실패)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 5000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      // status === undefined → 네트워크/연결 오류 (APIConnectionError 등)
      const isRetryable =
        error instanceof Anthropic.APIError &&
        (error.status === undefined || error.status >= 500 || error.status === 429);
      if (!isRetryable || i === retries - 1) throw error;
      console.warn(`[Claude] Retryable error (attempt ${i + 1}/${retries}) — retrying in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Retry exhausted');
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

/**
 * startIdx의 '{'부터 균형 잡힌 '}'까지의 끝 인덱스(exclusive). 문자열/이스케이프를 인식해
 * 값 안의 중괄호를 오해하지 않는다(예: content에 "{" 포함). 미완결(잘림)이면 -1.
 */
function balancedObjectEnd(text: string, startIdx: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

/**
 * "cards": [ ... ] 배열에서 완결된 카드 객체만 중괄호 균형으로 추출.
 * 정규식은 2단계 중첩(beginnerExplanation→glossary)을 못 다뤄 실패했으므로 문자열-인식 스캐너로 대체.
 * 잘려서 마지막 카드가 미완결이면 그 앞까지의 완결 카드만 반환.
 */
function recoverCardsFromArray(text: string): unknown[] {
  const arrMatch = text.match(/"cards"\s*:\s*\[/);
  if (!arrMatch || arrMatch.index === undefined) return [];
  let i = text.indexOf('[', arrMatch.index);
  if (i < 0) return [];
  i++; // '[' 다음부터
  const cards: unknown[] = [];
  while (i < text.length) {
    while (i < text.length && text[i] !== '{' && text[i] !== ']') i++;
    if (i >= text.length || text[i] === ']') break;
    const end = balancedObjectEnd(text, i);
    if (end < 0) break; // 미완결 카드 → 중단
    try { cards.push(JSON.parse(text.substring(i, end))); } catch { /* 손상 카드 skip */ }
    i = end;
  }
  return cards;
}

/**
 * @param opts cron 재시도를 첫 시도와 "의미 있게 다르게" 만들기 위한 옵션.
 *   재시도가 첫 시도와 동일 파라미터면 같은 실패(잘림/형식이탈)를 결정론적으로 반복하므로,
 *   재시도에서만 maxTokens↑(잘림 대응) + temperature 변경(형식이탈 패턴 깸)을 준다.
 *   web_search는 항상 유지 — 끄면 모델이 "오늘자 뉴스"와 sourceUrl을 날조하기 때문(신선도/신뢰성 훼손).
 */
export async function generateBriefing(
  category: string,
  date: string,
  opts: { maxTokens?: number; temperature?: number; retry?: boolean } = {},
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

  // 재시도 전용 보강 지시 — 형식 이탈(산문/마크다운/불완전 JSON)로 인한 첫 실패를 정조준.
  const finalUserPrompt = opts.retry
    ? userPrompt +
      `\n\n[재시도] 직전 응답이 파싱 불가였습니다. 설명·머리말·마크다운 코드펜스 없이 ` +
      `'{'로 시작해 '}'로 끝나는 완결된 JSON 객체 하나만 출력하세요. 길이가 부담되면 ` +
      `각 카드의 glossary를 최대 2개로 줄여서라도 반드시 JSON을 끝까지 닫으세요.`
    : userPrompt;

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
      // claude-sonnet-4-20250514는 2026-06-15 API에서 은퇴됨(유예 없음) → 호출 즉시 실패.
      // 동일 티어 후속 모델로 교체. 모델 스냅샷 은퇴 시 여기를 갱신할 것.
      model: 'claude-sonnet-4-6',
      // 8192: 카드3장 + beginnerExplanation(glossary 포함) 한국어 JSON은 web_search
      // 텍스트까지 섞이면 4096을 자주 넘겨 잘림 → "No JSON found"로 생성 실패했음.
      // 실제-토큰 과금(budget.ts)이라 상한↑은 비용에 영향 없음(실제 생성분만 청구).
      // 상한은 가드레일일 뿐, 잘림 실패 시 재시도까지 2배 낭비되던 걸 없애 오히려 절감.
      max_tokens: opts.maxTokens ?? 8192,
      // temperature는 첫 시도에선 미지정(API 기본값) — 기존 동작 보존.
      // 재시도에서만 cron이 값을 넘겨 기본과 다른 샘플링 경로로 형식이탈 반복을 깬다.
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      // 프롬프트 캐싱 제거(2026-07-06): 일일 생성은 몇 시간 간격이라 5분 ephemeral 캐시가
      // 만료돼 거의 안 읽힘(읽기 $0.26 vs 쓰기 $8.86/mo) → 매 호출 1.25x 쓰기 프리미엄만
      // 내는 역효과였음. 일반 input(1x)으로 되돌려 절감.
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          allowed_domains: getAllowedDomains(category),
          max_uses: 2, // 3→2 (2026-07-06 비용절감). 검색비 + 되먹임 input 동시 감소.
        },
      ],
      messages: [
        { role: 'user', content: finalUserPrompt },
      ],
    }),
  );

  const usage = message.usage;
  console.log(
    `[Claude] Response received. Stop: ${message.stop_reason}` +
    ` | Input: ${usage.input_tokens} (cache_write: ${usage.cache_creation_input_tokens ?? 0}, cache_read: ${usage.cache_read_input_tokens ?? 0})` +
    ` | Output: ${usage.output_tokens}` +
    ` | web_search: ${usage.server_tool_use?.web_search_requests ?? 0}`,
  );

  // Truncation guard: if max_tokens was hit, the JSON is likely incomplete
  if (message.stop_reason === 'max_tokens') {
    console.warn(`[Claude] Response truncated (max_tokens). Output: ${usage.output_tokens} tokens. Category: ${category}`);
  }

  // 예산/크레딧 기록 — API가 응답한 순간 토큰은 이미 청구됨. 파싱 실패로 이후 throw되더라도
  // 반드시 여기서 기록해야 "실패한 생성비"가 누락되지 않는다(②). recordCall은 내부에서 실패해도
  // throw하지 않으므로(fail-safe) 생성 흐름을 깨지 않는다.
  await recordCall({
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    web_search_requests: usage.server_tool_use?.web_search_requests ?? 0,
  });

  // Extract text content from potentially multi-block response
  const rawText = extractTextFromResponse(message.content);

  if (!rawText) {
    console.error('[Claude] No text content in response. Content types:', message.content.map(b => b.type));
    throw new Error('No text content in Claude response');
  }

  // Clean markdown code blocks if present
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Extract JSON — 여러 전략(응답 형태 변동에 견디도록). 각 전략은 앞선 게 실패했을 때만 시도.
  let parsed: ClaudeResponse | null = null;

  // Strategy 1: 통째로 파싱
  try {
    parsed = JSON.parse(cleaned);
  } catch { /* fall through */ }

  // Strategy 2: 공백 허용으로 {"cards" ...} 블록을 찾아 중괄호 균형(문자열 인식)으로 잘라 파싱.
  // (과거엔 정확히 `{"cards"` 리터럴만 찾아, 들여쓰기/머리말이 붙으면 놓쳤음.)
  if (!parsed) {
    const m = cleaned.match(/\{\s*"cards"/);
    if (m && m.index !== undefined) {
      const end = balancedObjectEnd(cleaned, m.index);
      if (end > m.index) {
        try { parsed = JSON.parse(cleaned.substring(m.index, end)); } catch { /* fall through */ }
      }
    }
  }

  // Strategy 3: 그리디 폴백 — 첫 '{'부터 마지막 '}'까지. (과거엔 Strategy 2 블록 안에 중첩돼
  // `{"cards"`를 못 찾으면 아예 실행 안 되던 버그가 있었음 → 항상 실행되도록 분리.)
  if (!parsed) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
  }

  // Strategy 4: 잘림/미완결 복구 — cards 배열에서 완결된 카드만 추출. stop_reason 무관하게
  // 최후 수단으로 시도(형식 이탈로도 파싱이 실패할 수 있으므로).
  if (!parsed) {
    const recovered = recoverCardsFromArray(cleaned);
    if (recovered.length > 0) {
      parsed = { cards: recovered as BriefingCard[] };
      console.log(`[Claude] Recovered ${recovered.length} card(s) from partial response (stop=${message.stop_reason})`);
    }
  }

  if (!parsed) {
    // 진단용: stop_reason + 길이 + 앞부분 스니펫을 에러에 실어 cron 결과/알림/어드민까지 전파.
    const snippet = rawText.replace(/\s+/g, ' ').slice(0, 300);
    console.error(`[Claude] No valid JSON found. stop=${message.stop_reason} len=${rawText.length} raw:`, rawText.substring(0, 500));
    throw new Error(`No JSON found (stop=${message.stop_reason}, len=${rawText.length}): ${snippet}`);
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

  // Strip HTML tags from web_search citations (e.g. <cite index="...">...</cite>)
  const stripCiteTags = (text: string): string =>
    text.replace(/<\/?cite[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();

  const validatedCards = parsed.cards.slice(0, 3).map((card, index) => {
    const title = stripCiteTags((card.title || '')).trim();
    const content = stripCiteTags((card.content || '')).trim();
    const summary = stripCiteTags((card.summary || '')).trim();

    // title이 비거나 너무 긴 경우 자르기
    const clampedTitle = title.length > 25 ? title.substring(0, 23) + '…' : title;
    const clampedSummary = summary.length > 70 ? summary.substring(0, 68) + '…' : summary;

    if (!content || content.length < 20) {
      console.warn(`[Claude] Card ${index + 1} has insufficient content (${content.length} chars)`);
    }

    // 초심자 해설(카드 뒤집기) — Claude가 생성한 beginnerExplanation을 정리해 carry-through.
    // (이전엔 이 필드를 누락시켜 실시간 생성 카드에서 '쉬운 풀이 보기'가 안 떴음)
    const be = card.beginnerExplanation;
    const beginnerExplanation = be
      ? {
          tldr: stripCiteTags(be.tldr || ''),
          glossary: Array.isArray(be.glossary)
            ? be.glossary
                .filter((g) => g && g.term && g.explain)
                .slice(0, 5)
                .map((g) => ({ term: stripCiteTags(g.term), explain: stripCiteTags(g.explain) }))
            : [],
          whyItMatters: stripCiteTags(be.whyItMatters || ''),
        }
      : undefined;

    return {
      id: card.id || `card_${index + 1}`,
      number: (index + 1) as 1 | 2 | 3,
      title: clampedTitle || `카드 ${index + 1}`,
      content: content || '콘텐츠를 불러오는 중 문제가 발생했습니다.',
      summary: clampedSummary || '요약을 불러오지 못했습니다',
      type: card.type || (types[index] as BriefingCard['type']),
      source: card.source,
      sourceUrl: card.sourceUrl && card.sourceUrl.startsWith('http') ? card.sourceUrl : undefined,
      // tldr가 비면 해설 표시 안 함(빈 카드 방지)
      beginnerExplanation: beginnerExplanation && beginnerExplanation.tldr ? beginnerExplanation : undefined,
    };
  });

  const result: BriefingCategory = {
    category,
    categoryName: categoryKorean,
    generatedAt: new Date().toISOString(),
    cards: validatedCards,
  };

  // Content safety filter — 위험 표현 자동 치환 (비용 0)
  const { filtered, warnings } = filterBriefing(result);
  if (warnings.length > 0) {
    console.warn(
      `[ContentFilter] ${category}: ${warnings.length} expression(s) filtered —`,
      warnings.map((w) => `[${w.category}] "${w.original}" -> "${w.replaced}" (${w.cardId}.${w.field})`),
    );
  }

  // Content quality validation — 규격 검증 (서빙은 차단하지 않음)
  const validation = validateBriefing(filtered);
  if (!validation.valid) {
    console.warn(
      `[ContentValidator] ${category}: ${validation.errors.length} error(s) —`,
      validation.errors,
    );
  }
  if (validation.warnings.length > 0) {
    console.warn(
      `[ContentValidator] ${category}: ${validation.warnings.length} warning(s) —`,
      validation.warnings,
    );
  }

  return filtered;
}
