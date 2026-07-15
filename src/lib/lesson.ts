import Anthropic from '@anthropic-ai/sdk';
import { BriefingCategory } from './types';
import { canAffordCall, recordCall } from './budget';
import { evalFormula } from './formula';
import { kvSet } from './kv';

const LESSON_TTL = 86400 * 400; // 400일 (아카이브와 함께 장기 보관)
export const lessonKey = (date: string) => `mb:lesson:economy:${date}`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** 슬라이더 하나 = 하나의 변수. key는 formula에서 참조하는 영문 식별자. */
export interface LessonVariable {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

/** 하루치 "만져보는" 인터랙티브 미니 학습 (오늘 브리핑 기반, AI 생성). */
export interface InteractiveLesson {
  date: string;
  title: string;
  intro: string;
  newsHook: string;
  variables: LessonVariable[];
  formula: string; // variables의 key로만 이루어진 산술식 (formula.ts로 안전 평가)
  resultLabel: string;
  resultUnit: string;
  resultExplain: string;
  takeaway: string;
  generatedAt: string;
}

const KEY_RE = /^[a-z][a-z0-9]*$/;

export type LessonValidation =
  | { ok: true; lesson: InteractiveLesson }
  | { ok: false; reason: string };

/**
 * AI 출력 검증 — 하나라도 어긋나면 폐기(reason 포함)해 깨진 위젯이 절대 서빙되지 않게 한다.
 * formula는 기본값에서 evalFormula(안전 평가기)로 실제 계산되는지 확인(임의 코드/미선언 변수 차단).
 * 슬라이더 극단(min/max)은 0나눗셈 등으로 null이 날 수 있으나, 그건 UI가 "—"로 처리하므로
 * 여기서 lesson 전체를 반려하지는 않는다(과반려 방지) — 대신 formulaEdgeWarn으로 기록만.
 */
export function validateLesson(raw: unknown, date: string): LessonValidation {
  const fail = (reason: string): LessonValidation => ({ ok: false, reason });
  if (!raw || typeof raw !== 'object') return fail('not an object');
  const o = raw as Record<string, unknown>;

  const str = (v: unknown, max = 200): string | null =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null;

  const title = str(o.title, 60);
  const intro = str(o.intro, 300);
  const resultLabel = str(o.resultLabel, 40);
  const resultExplain = str(o.resultExplain, 300);
  const takeaway = str(o.takeaway, 200);
  if (!title) return fail('title empty/too long');
  if (!intro) return fail('intro empty/too long');
  if (!resultLabel) return fail('resultLabel empty/too long');
  if (!resultExplain) return fail('resultExplain empty/too long');
  if (!takeaway) return fail('takeaway empty/too long');

  const rawVars = Array.isArray(o.variables) ? o.variables : [];
  if (rawVars.length < 1 || rawVars.length > 3) return fail(`variables count=${rawVars.length} (need 1-3)`);

  const seen = new Set<string>();
  const variables: LessonVariable[] = [];
  for (const rv of rawVars) {
    if (!rv || typeof rv !== 'object') return fail('a variable is not an object');
    const v = rv as Record<string, unknown>;
    const key = typeof v.key === 'string' ? v.key : '';
    const label = str(v.label, 30);
    const unit = typeof v.unit === 'string' ? v.unit.slice(0, 8) : '';
    const min = Number(v.min), max = Number(v.max), step = Number(v.step), def = Number(v.default);
    if (!KEY_RE.test(key)) return fail(`bad key "${key}" (need /^[a-z][a-z0-9]*$/)`);
    if (seen.has(key)) return fail(`duplicate key "${key}"`);
    if (!label) return fail(`variable "${key}" label empty`);
    if (![min, max, step, def].every(Number.isFinite)) return fail(`variable "${key}" min/max/step/default not all finite`);
    if (!(min < max)) return fail(`variable "${key}" min<max violated (${min},${max})`);
    if (!(step > 0)) return fail(`variable "${key}" step<=0 (${step})`);
    if (def < min || def > max) return fail(`variable "${key}" default ${def} out of [${min},${max}]`);
    seen.add(key);
    variables.push({ key, label, unit, min, max, step, default: def });
  }

  const formula = typeof o.formula === 'string' ? o.formula : '';
  const defaults = Object.fromEntries(variables.map((v) => [v.key, v.default]));
  // 하드 요건: 기본값에서 유한한 결과. (미선언 변수/문법오류/기본값 0나눗셈이면 여기서 걸림.)
  if (evalFormula(formula, defaults) === null) {
    return fail(`formula fails at defaults: "${formula}"`);
  }

  return {
    ok: true,
    lesson: {
      date,
      title,
      intro,
      newsHook: str(o.newsHook, 80) ?? '',
      variables,
      formula,
      resultLabel,
      resultUnit: typeof o.resultUnit === 'string' ? o.resultUnit.slice(0, 8) : '',
      resultExplain,
      takeaway,
      generatedAt: new Date().toISOString(),
    },
  };
}

const SUBMIT_LESSON_TOOL: Anthropic.Messages.Tool = {
  name: 'submit_lesson',
  description: '오늘 뉴스로 만드는 인터랙티브 학습(슬라이더를 움직이면 숫자가 실시간 변하는 미니 시나리오)을 제출한다.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '오늘 뉴스와 연결된 제목 (예: "관세 20%가 유가에 미치는 영향")' },
      intro: { type: 'string', description: '1~2문장 맥락' },
      newsHook: { type: 'string', description: '어느 카드/헤드라인에서 나왔는지' },
      variables: {
        type: 'array',
        description: '슬라이더 1~3개. 각 key는 영문 소문자 식별자(formula에서 참조).',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', description: '영문 소문자 식별자 (예: oil, tariff, rate)' },
            label: { type: 'string', description: '한글 라벨 (예: 유가)' },
            unit: { type: 'string', description: '단위 (예: $, %, 원, 만원)' },
            min: { type: 'number' },
            max: { type: 'number' },
            step: { type: 'number' },
            default: { type: 'number' },
          },
          required: ['key', 'label', 'unit', 'min', 'max', 'step', 'default'],
        },
      },
      formula: {
        type: 'string',
        description: '변수 key로만 이루어진 산술식. + - * / % 와 괄호만 사용. 예: "oil * (1 + tariff / 100)". 함수·거듭제곱(**)·다른 이름 금지.',
      },
      resultLabel: { type: 'string', description: '결과 라벨 (예: 예상 소비자가)' },
      resultUnit: { type: 'string', description: '결과 단위' },
      resultExplain: { type: 'string', description: '이 숫자가 뭘 의미하는지 쉬운 설명' },
      takeaway: { type: 'string', description: '한 줄 교훈' },
    },
    required: ['title', 'intro', 'variables', 'formula', 'resultLabel', 'resultExplain', 'takeaway'],
  },
};

export interface LessonGenResult {
  lesson: InteractiveLesson | null;
  reason?: string; // 실패 시 원인 (검증 반려/생성 오류/예산)
  raw?: unknown; // 검증 반려 시 모델 원본 출력(디버깅용)
}

/**
 * 특정 날짜의 브리핑을 입력으로 인터랙티브 학습을 생성한다(web_search 없음 — 컨텍스트는 브리핑에 다 있음).
 * 예산가드 통과 시에만 호출. 실패 시 lesson=null + reason(+raw)로 원인을 함께 반환(호출부가 폴백/노출).
 */
export async function generateInteractiveLesson(
  briefing: BriefingCategory,
  date: string,
): Promise<LessonGenResult> {
  const budget = await canAffordCall();
  if (!budget.allowed) {
    console.warn('[Lesson] budget exceeded — skip generation');
    return { lesson: null, reason: 'budget exceeded' };
  }

  const cardsText = briefing.cards
    .map((c, i) => {
      const gloss = (c.beginnerExplanation?.glossary ?? [])
        .map((g) => `${g.term}: ${g.explain}`)
        .join('; ');
      return `[카드${i + 1}] ${c.title}\n${c.content}\n용어: ${gloss}`;
    })
    .join('\n\n');

  const system =
    '너는 경제 교육 디자이너다. 오늘 브리핑에서 "숫자로 체감되는" 개념 하나를 골라, 독자가 슬라이더를 ' +
    '움직이면 결과가 실시간으로 바뀌는 아주 단순한 인터랙티브 학습을 설계한다. 규칙: ' +
    '(1) 슬라이더 1~3개, 각 변수 key는 영문 소문자. (2) formula는 그 key들로만 이루어진 산술식(+ - * / % 와 괄호만). ' +
    '(3) 거듭제곱(**), 함수, 다른 이름 절대 금지. (4) min/max/step/default는 현실적인 범위. ' +
    '(5) 초보자도 "오 그렇구나" 할 만큼 쉽고 오늘 뉴스와 직접 연결. 반드시 submit_lesson 도구로 제출.';

  const userPrompt =
    `오늘(${date}) 브리핑입니다:\n\n${cardsText}\n\n` +
    '이 중 하나를 골라 인터랙티브 학습을 submit_lesson으로 제출하세요.';

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      tools: [SUBMIT_LESSON_TOOL],
      tool_choice: { type: 'tool', name: 'submit_lesson' }, // web_search 없으니 도구 강제 = 구조화 보장
      messages: [{ role: 'user', content: userPrompt }],
    });

    await recordCall({
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_creation_tokens: message.usage.cache_creation_input_tokens ?? 0,
      cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
      web_search_requests: message.usage.server_tool_use?.web_search_requests ?? 0,
    });

    const toolUse = message.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_lesson',
    );
    const v = validateLesson(toolUse?.input, date);
    if (!v.ok) {
      console.warn(`[Lesson] ${date} rejected: ${v.reason}`);
      return { lesson: null, reason: v.reason, raw: toolUse?.input };
    }
    console.log(`[Lesson] ${date} generated: "${v.lesson.title}" (${v.lesson.variables.length} vars)`);
    return { lesson: v.lesson };
  } catch (err) {
    console.error(`[Lesson] ${date} generation failed:`, err);
    return { lesson: null, reason: err instanceof Error ? err.message : 'generation error' };
  }
}

/** 생성 + 성공 시 Redis 캐시까지. cron·API가 공용으로 사용. */
export async function generateAndCacheLesson(
  briefing: BriefingCategory,
  date: string,
): Promise<LessonGenResult> {
  const r = await generateInteractiveLesson(briefing, date);
  if (r.lesson) await kvSet(lessonKey(date), JSON.stringify(r.lesson), LESSON_TTL);
  return r;
}
