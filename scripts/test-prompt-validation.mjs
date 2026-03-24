/**
 * Day 2 - Prompt/Parsing 구조 검증 (API 호출 없이)
 * 실제 API 응답의 예상 포맷으로 파싱 로직을 테스트
 */

// 경제 카테고리 예상 응답
const mockEconomyResponse = `{"cards":[{"id":"card_1","number":1,"title":"반도체 수출 역대 최고","content":"한국 반도체 수출이 3월 기준 역대 최고치를 기록했습니다. 삼성전자와 SK하이닉스의 HBM 수출이 급증하면서 전체 반도체 수출액이 전년 동기 대비 35% 증가한 것으로 나타났습니다. AI 서버 수요 폭발이 가장 큰 요인으로 분석됩니다.","summary":"3월 반도체 수출 35% 급증, HBM이 견인","type":"오늘의핵심","source":"한국경제"},{"id":"card_2","number":2,"title":"수출 호조의 명과 암","content":"반도체 수출 호조는 원화 강세를 유발해 다른 수출 기업들의 채산성을 악화시킬 수 있습니다. 특히 자동차·조선 등 비IT 수출 기업은 환율 하락 압력을 받을 전망입니다. 반면 수입 물가 안정으로 소비자 물가 상승률은 둔화될 가능성이 높습니다.","summary":"원화 강세로 비IT 수출 기업 부담, 소비자 물가는 안정 기대","type":"영향분석","source":"매일경제"},{"id":"card_3","number":3,"title":"환율 변동 대응법","content":"원화 강세 국면에서 해외 직구나 해외여행 계획이 있다면 지금이 유리한 타이밍입니다. 달러 예금을 보유하고 있다면 일부 환전을 고려해볼 만합니다. 반면 해외 주식 투자자는 환헤지 ETF 비중을 늘려 환차손 리스크를 관리하는 것이 좋습니다.","summary":"해외 직구·여행 적기, 달러 예금 일부 환전 고려","type":"실전인사이트","source":"조선비즈"}]}`;

// 투자 카테고리 예상 응답
const mockInvestmentResponse = `{"cards":[{"id":"card_1","number":1,"title":"나스닥 AI 랠리 지속","content":"미국 나스닥 지수가 AI 관련주 강세에 힘입어 사상 최고치를 다시 경신했습니다. 엔비디아는 신규 GPU 출시 소식에 4% 상승했으며, 마이크로소프트와 구글도 AI 투자 확대 발표로 동반 상승했습니다.","summary":"나스닥 사상 최고치 경신, AI 관련주가 시장 주도","type":"오늘의핵심","source":"블룸버그"},{"id":"card_2","number":2,"title":"AI 투자 확산의 수혜주","content":"글로벌 AI 투자 확대는 한국 반도체·전자 부품주에 직접적인 호재입니다. HBM 수요 증가로 SK하이닉스의 실적 개선이 예상되며, AI 서버용 냉각 장비를 공급하는 중소형주도 수혜가 기대됩니다. 다만 밸류에이션이 높아진 상태라 신규 진입 시 주의가 필요합니다.","summary":"HBM·AI 인프라 관련주 수혜, 높은 밸류에이션은 리스크","type":"영향분석","source":"NH투자증권"},{"id":"card_3","number":3,"title":"분산 투자로 리스크 관리","content":"AI 테마 집중 투자보다는 포트폴리오 분산이 중요합니다. AI 관련 ETF(예: KODEX AI반도체)를 포트폴리오의 20~30% 수준으로 편입하고, 나머지는 배당주나 채권형 ETF로 안정성을 확보하는 전략을 권합니다. 단기 급등 구간에서는 차익 실현도 고려해볼 시점입니다.","summary":"AI ETF 20~30% 편입, 배당주·채권으로 분산 권장","type":"실전인사이트","source":"삼성증권"}]}`;

// 잘못된 응답 케이스들
const badResponses = [
  { name: 'Empty response', text: '' },
  { name: 'No JSON', text: '오늘의 경제 뉴스를 전해드립니다.' },
  { name: 'Missing cards', text: '{"data": "hello"}' },
  { name: 'Empty cards', text: '{"cards": []}' },
  { name: 'Markdown wrapped', text: '```json\n{"cards":[{"id":"card_1","number":1,"title":"테스트","content":"내용입니다 충분히 긴 내용을 작성합니다 최소 50자를 넘겨야 합니다 그래서 더 씁니다","summary":"테스트 요약","type":"오늘의핵심","source":"출처"}]}\n```' },
];

function validateResponse(text) {
  const issues = [];

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { valid: false, issues: ['NO_JSON'], cards: null };

  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch { return { valid: false, issues: ['JSON_PARSE_ERROR'], cards: null }; }

  if (!parsed.cards || !Array.isArray(parsed.cards)) return { valid: false, issues: ['NO_CARDS'], cards: null };
  if (parsed.cards.length !== 3) issues.push(`CARD_COUNT: ${parsed.cards.length}`);

  const expectedTypes = ['오늘의핵심', '영향분석', '실전인사이트'];
  for (let i = 0; i < Math.min(parsed.cards.length, 3); i++) {
    const card = parsed.cards[i];
    const p = `Card${i + 1}`;
    if (!card.title) issues.push(`${p}_NO_TITLE`);
    else if (card.title.length > 20) issues.push(`${p}_TITLE_LONG: ${card.title.length}자`);
    if (!card.summary) issues.push(`${p}_NO_SUMMARY`);
    else if (card.summary.length > 60) issues.push(`${p}_SUMMARY_LONG: ${card.summary.length}자`);
    if (!card.content) issues.push(`${p}_NO_CONTENT`);
    else if (card.content.length < 50) issues.push(`${p}_CONTENT_SHORT: ${card.content.length}자`);
    if (!card.source) issues.push(`${p}_NO_SOURCE`);
    if (card.type !== expectedTypes[i]) issues.push(`${p}_WRONG_TYPE: "${card.type}"`);
  }

  return { valid: issues.length === 0, issues, cards: parsed.cards };
}

console.log('=== Prompt/Parsing Validation Test ===\n');

// Test 1: Economy mock
console.log('▶ Economy mock response...');
let result = validateResponse(mockEconomyResponse);
console.log(result.valid ? '  ✅ PASSED' : '  ❌ FAILED');
if (result.cards) result.cards.forEach(c => console.log(`    Card${c.number}: "${c.title}" (${c.title.length}자) | summary: ${c.summary.length}자 | content: ${c.content.length}자`));
if (result.issues.length) result.issues.forEach(i => console.log(`    - ${i}`));

// Test 2: Investment mock
console.log('\n▶ Investment mock response...');
result = validateResponse(mockInvestmentResponse);
console.log(result.valid ? '  ✅ PASSED' : '  ❌ FAILED');
if (result.cards) result.cards.forEach(c => console.log(`    Card${c.number}: "${c.title}" (${c.title.length}자) | summary: ${c.summary.length}자 | content: ${c.content.length}자`));
if (result.issues.length) result.issues.forEach(i => console.log(`    - ${i}`));

// Test 3: Bad response handling
console.log('\n▶ Error handling tests...');
let errorPassed = 0;
for (const bad of badResponses) {
  const r = validateResponse(bad.text);
  const shouldFail = bad.name !== 'Markdown wrapped'; // markdown wrapped should still parse
  const correct = shouldFail ? !r.valid : r.valid;
  console.log(`  ${correct ? '✅' : '❌'} ${bad.name}: ${r.valid ? 'valid' : r.issues[0]}`);
  if (correct) errorPassed++;
}

console.log(`\n=== Error handling: ${errorPassed}/${badResponses.length} correct ===`);

// Check title/summary constraints
console.log('\n▶ Constraint validation...');
const econ = validateResponse(mockEconomyResponse);
const inv = validateResponse(mockInvestmentResponse);
const allCards = [...(econ.cards || []), ...(inv.cards || [])];
let constraintsPassed = true;
for (const card of allCards) {
  if (card.title.length > 20) { console.log(`  ❌ Title too long: "${card.title}" (${card.title.length})`); constraintsPassed = false; }
  if (card.summary.length > 60) { console.log(`  ❌ Summary too long: ${card.summary.length}`); constraintsPassed = false; }
}
console.log(constraintsPassed ? '  ✅ All constraints within limits' : '  ⚠️ Some constraints violated');

console.log('\n=== ALL TESTS COMPLETE ===');
