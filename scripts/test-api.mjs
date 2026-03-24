/**
 * Day 2 - AI/Prompt 품질 검증 스크립트 (ESM)
 * 경제 2회 + 투자 1회 = 3회 테스트
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function runTest(category, testName) {
  const start = Date.now();
  const issues = [];
  const systemPrompt = category === 'economy' ? ECONOMY_SYSTEM_PROMPT : INVESTMENT_SYSTEM_PROMPT;
  const categoryKorean = category === 'economy' ? '경제/시사' : '투자';
  const date = '2026-03-24';

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: `오늘은 ${date}입니다. ${categoryKorean} 카테고리의 아침 브리핑을 작성해주세요.` }],
    });

    const elapsed = Date.now() - start;
    const content = message.content[0];
    if (content.type !== 'text') {
      return { testName, passed: false, issues: ['Response is not text'], responseTime: elapsed };
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      issues.push('NO_JSON: JSON not found');
      console.log('  Raw:', content.text.substring(0, 300));
      return { testName, passed: false, issues, responseTime: elapsed };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      issues.push('JSON_PARSE_ERROR');
      return { testName, passed: false, issues, responseTime: elapsed };
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      issues.push('NO_CARDS');
      return { testName, passed: false, issues, responseTime: elapsed };
    }

    if (parsed.cards.length !== 3) {
      issues.push(`CARD_COUNT: Expected 3, got ${parsed.cards.length}`);
    }

    const expectedTypes = ['오늘의핵심', '영향분석', '실전인사이트'];
    for (let i = 0; i < Math.min(parsed.cards.length, 3); i++) {
      const card = parsed.cards[i];
      const p = `Card${i + 1}`;
      if (!card.title) issues.push(`${p}_NO_TITLE`);
      else if (card.title.length > 20) issues.push(`${p}_TITLE_LONG: "${card.title}" (${card.title.length}자)`);
      if (!card.summary) issues.push(`${p}_NO_SUMMARY`);
      else if (card.summary.length > 60) issues.push(`${p}_SUMMARY_LONG: ${card.summary.length}자`);
      if (!card.content) issues.push(`${p}_NO_CONTENT`);
      else if (card.content.length < 50) issues.push(`${p}_CONTENT_SHORT: ${card.content.length}자`);
      if (!card.source) issues.push(`${p}_NO_SOURCE`);
      if (card.type !== expectedTypes[i]) issues.push(`${p}_WRONG_TYPE: "${card.type}" (expected "${expectedTypes[i]}")`);
    }

    return { testName, passed: issues.length === 0, issues, responseTime: elapsed, cards: parsed.cards };
  } catch (error) {
    return { testName, passed: false, issues: [`API_ERROR: ${error.message}`], responseTime: Date.now() - start };
  }
}

async function main() {
  console.log('=== Day 2 AI/Prompt Quality Test ===\n');

  const tests = [
    { category: 'economy', name: 'Economy Test 1' },
    { category: 'economy', name: 'Economy Test 2' },
    { category: 'investment', name: 'Investment Test 1' },
  ];

  let totalPassed = 0;
  const allIssues = [];

  for (const test of tests) {
    console.log(`▶ ${test.name} (${test.category})...`);
    const result = await runTest(test.category, test.name);

    if (result.passed) {
      console.log(`  ✅ PASSED (${result.responseTime}ms)`);
      totalPassed++;
    } else {
      console.log(`  ❌ ISSUES (${result.responseTime}ms)`);
      for (const issue of result.issues) {
        console.log(`    - ${issue}`);
        allIssues.push(`[${test.name}] ${issue}`);
      }
    }
    if (result.cards) {
      for (const card of result.cards) {
        console.log(`    Card${card.number}: "${card.title}" (${card.title?.length}자) | summary: ${card.summary?.length}자 | content: ${card.content?.length}자`);
      }
    }
    console.log();
  }

  console.log(`\n=== RESULTS: ${totalPassed}/${tests.length} passed ===`);
  if (allIssues.length > 0) {
    console.log('\nIssues to address:');
    allIssues.forEach(i => console.log(`  - ${i}`));
  }
}

main().catch(console.error);
