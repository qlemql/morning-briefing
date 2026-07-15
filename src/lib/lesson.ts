import Anthropic from '@anthropic-ai/sdk';
import { BriefingCategory } from './types';
import { canAffordCall, recordCall } from './budget';
import { evalFormula } from './formula';
import { kvSet } from './kv';

const LESSON_TTL = 86400 * 400; // 400일 (아카이브와 함께 장기 보관)
export const lessonKey = (date: string) => `mb:lesson:economy:${date}`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type LessonFormat = 'slider' | 'predict' | 'scenario';

/** 변수 하나. key는 formula에서 참조하는 영문 식별자. slider=조절가능, predict=주어진 조건(고정). */
export interface LessonVariable {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

/** predict: 정답 추측 입력 범위 */
export interface LessonGuess {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

/** scenario: 선택지 하나 (고정 결과값 — formula 없음) */
export interface LessonChoice {
  key: string;
  label: string;
  resultLabel: string;
  resultValue: number;
  resultUnit: string;
  explain: string;
  best?: boolean;
}

/** 하루치 "만져보는" 인터랙티브 미니 학습. format에 따라 쓰이는 필드가 다르다. */
export interface InteractiveLesson {
  date: string;
  format: LessonFormat;
  title: string;
  intro: string;
  newsHook: string;
  takeaway: string;
  generatedAt: string;

  // slider · predict 공통 (predict는 variables를 '주어진 조건'으로 고정 표시)
  variables?: LessonVariable[];
  formula?: string;
  resultLabel?: string;
  resultUnit?: string;
  resultExplain?: string;

  // predict 전용 (정답 맞히기 입력)
  guess?: LessonGuess;

  // scenario 전용
  prompt?: string;
  choices?: LessonChoice[];
}

const KEY_RE = /^[a-z][a-z0-9]*$/;

export type LessonValidation =
  | { ok: true; lesson: InteractiveLesson }
  | { ok: false; reason: string };

function asStr(v: unknown, max = 200): string | null {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null;
}

/** variables 배열 파싱/검증. 실패 시 reason 문자열, 성공 시 배열. */
function parseVariables(raw: unknown): LessonVariable[] | string {
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length < 1 || arr.length > 3) return `variables count=${arr.length} (need 1-3)`;
  const seen = new Set<string>();
  const out: LessonVariable[] = [];
  for (const rv of arr) {
    if (!rv || typeof rv !== 'object') return 'a variable is not an object';
    const v = rv as Record<string, unknown>;
    const key = typeof v.key === 'string' ? v.key : '';
    const label = asStr(v.label, 30);
    const unit = typeof v.unit === 'string' ? v.unit.slice(0, 8) : '';
    const min = Number(v.min), max = Number(v.max), step = Number(v.step), def = Number(v.default);
    if (!KEY_RE.test(key)) return `bad key "${key}"`;
    if (seen.has(key)) return `duplicate key "${key}"`;
    if (!label) return `variable "${key}" label empty`;
    if (![min, max, step, def].every(Number.isFinite)) return `variable "${key}" not all finite`;
    if (!(min < max)) return `variable "${key}" min<max violated`;
    if (!(step > 0)) return `variable "${key}" step<=0`;
    if (def < min || def > max) return `variable "${key}" default out of range`;
    seen.add(key);
    out.push({ key, label, unit, min, max, step, default: def });
  }
  return out;
}

/**
 * AI 출력 검증 — format별로 필요한 필드를 검사, 하나라도 어긋나면 reason과 함께 폐기.
 * formula(slider/predict)는 evalFormula(안전 평가기)로 기본값 계산 성공을 확인 → 임의코드/미선언변수 차단.
 */
export function validateLesson(raw: unknown, date: string): LessonValidation {
  const fail = (reason: string): LessonValidation => ({ ok: false, reason });
  if (!raw || typeof raw !== 'object') return fail('not an object');
  const o = raw as Record<string, unknown>;

  const format = o.format;
  if (format !== 'slider' && format !== 'predict' && format !== 'scenario') {
    return fail(`bad format "${String(format)}"`);
  }

  const title = asStr(o.title, 60);
  const intro = asStr(o.intro, 300);
  const takeaway = asStr(o.takeaway, 200);
  if (!title) return fail('title empty/too long');
  if (!intro) return fail('intro empty/too long');
  if (!takeaway) return fail('takeaway empty/too long');

  const base = {
    date,
    format: format as LessonFormat,
    title,
    intro,
    newsHook: asStr(o.newsHook, 80) ?? '',
    takeaway,
    generatedAt: new Date().toISOString(),
  };

  if (format === 'slider' || format === 'predict') {
    const vars = parseVariables(o.variables);
    if (typeof vars === 'string') return fail(vars);
    const formula = typeof o.formula === 'string' ? o.formula : '';
    const defaults = Object.fromEntries(vars.map((v) => [v.key, v.default]));
    if (evalFormula(formula, defaults) === null) return fail(`formula fails at defaults: "${formula}"`);
    const resultLabel = asStr(o.resultLabel, 40);
    const resultExplain = asStr(o.resultExplain, 300);
    if (!resultLabel) return fail('resultLabel empty');
    if (!resultExplain) return fail('resultExplain empty');
    const resultUnit = typeof o.resultUnit === 'string' ? o.resultUnit.slice(0, 8) : '';

    if (format === 'predict') {
      const g = (o.guess ?? {}) as Record<string, unknown>;
      const gLabel = asStr(g.label, 40);
      const gUnit = typeof g.unit === 'string' ? g.unit.slice(0, 8) : resultUnit;
      const gMin = Number(g.min), gMax = Number(g.max), gStep = Number(g.step);
      if (!gLabel) return fail('guess.label empty');
      if (![gMin, gMax, gStep].every(Number.isFinite)) return fail('guess min/max/step not finite');
      if (!(gMin < gMax)) return fail('guess min<max violated');
      if (!(gStep > 0)) return fail('guess step<=0');
      return { ok: true, lesson: { ...base, variables: vars, formula, resultLabel, resultUnit, resultExplain, guess: { label: gLabel, unit: gUnit, min: gMin, max: gMax, step: gStep } } };
    }
    return { ok: true, lesson: { ...base, variables: vars, formula, resultLabel, resultUnit, resultExplain } };
  }

  // scenario
  const prompt = asStr(o.prompt, 200);
  if (!prompt) return fail('prompt empty');
  const rawChoices = Array.isArray(o.choices) ? o.choices : [];
  if (rawChoices.length < 2 || rawChoices.length > 4) return fail(`choices count=${rawChoices.length} (need 2-4)`);
  const seen = new Set<string>();
  const choices: LessonChoice[] = [];
  for (const rc of rawChoices) {
    if (!rc || typeof rc !== 'object') return fail('a choice is not an object');
    const c = rc as Record<string, unknown>;
    const key = typeof c.key === 'string' ? c.key : '';
    const label = asStr(c.label, 30);
    const resultLabel = asStr(c.resultLabel, 40);
    const explain = asStr(c.explain, 200);
    const resultValue = Number(c.resultValue);
    if (!KEY_RE.test(key)) return fail(`choice bad key "${key}"`);
    if (seen.has(key)) return fail(`choice duplicate key "${key}"`);
    if (!label) return fail('choice label empty');
    if (!resultLabel) return fail('choice resultLabel empty');
    if (!explain) return fail('choice explain empty');
    if (!Number.isFinite(resultValue)) return fail(`choice "${key}" resultValue not finite`);
    seen.add(key);
    choices.push({
      key, label, resultLabel, resultValue,
      resultUnit: typeof c.resultUnit === 'string' ? c.resultUnit.slice(0, 8) : '',
      explain,
      best: c.best === true,
    });
  }
  return { ok: true, lesson: { ...base, prompt, choices } };
}

const SUBMIT_LESSON_TOOL: Anthropic.Messages.Tool = {
  name: 'submit_lesson',
  description: '오늘 뉴스로 만드는 인터랙티브 학습을 제출한다. 개념에 가장 맞는 format을 하나 골라 해당 필드만 채운다.',
  input_schema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['slider', 'predict', 'scenario'],
        description:
          'slider=값을 바꾸면 결과가 실시간 변하는 연속 인과(금리→이자). ' +
          'predict=먼저 정답을 맞혀보고 공개(직관 깨기, 놀라움). ' +
          'scenario=갈림길에서 선택하면 결과 비교(의사결정·기회비용). 개념에 가장 맞는 하나.',
      },
      title: { type: 'string', description: '오늘 뉴스와 연결된 제목' },
      intro: { type: 'string', description: '1~2문장 맥락' },
      newsHook: { type: 'string', description: '어느 카드/헤드라인에서 나왔는지' },
      takeaway: { type: 'string', description: '한 줄 교훈' },

      // slider · predict
      variables: {
        type: 'array',
        description: '[slider/predict] 변수 1~3개. key는 영문 소문자(formula에서 참조). slider는 조절가능, predict는 주어진 조건(고정).',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' }, label: { type: 'string' }, unit: { type: 'string' },
            min: { type: 'number' }, max: { type: 'number' }, step: { type: 'number' }, default: { type: 'number' },
          },
          required: ['key', 'label', 'unit', 'min', 'max', 'step', 'default'],
        },
      },
      formula: { type: 'string', description: '[slider/predict] 변수 key로만 이루어진 산술식. + - * / % 와 괄호만. 함수·거듭제곱(**) 금지.' },
      resultLabel: { type: 'string', description: '[slider/predict] 결과 라벨' },
      resultUnit: { type: 'string', description: '[slider/predict] 결과 단위' },
      resultExplain: { type: 'string', description: '[slider/predict] 결과가 뭘 의미하는지' },
      guess: {
        type: 'object',
        description: '[predict 전용] 사용자가 정답을 추측할 슬라이더 범위(정답이 이 범위 안에 오게).',
        properties: {
          label: { type: 'string' }, unit: { type: 'string' },
          min: { type: 'number' }, max: { type: 'number' }, step: { type: 'number' },
        },
        required: ['label', 'unit', 'min', 'max', 'step'],
      },

      // scenario
      prompt: { type: 'string', description: '[scenario 전용] "당신이라면?" 갈림길 질문' },
      choices: {
        type: 'array',
        description: '[scenario 전용] 선택지 2~4개. 각 결과는 고정 숫자(resultValue).',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', description: '영문 소문자 식별자' },
            label: { type: 'string', description: '선택지 이름 (예: 예금)' },
            resultLabel: { type: 'string', description: '결과 라벨 (예: 5년 뒤)' },
            resultValue: { type: 'number' },
            resultUnit: { type: 'string' },
            explain: { type: 'string', description: '왜 이런 결과인지' },
            best: { type: 'boolean', description: '가장 유리한 선택이면 true' },
          },
          required: ['key', 'label', 'resultLabel', 'resultValue', 'explain'],
        },
      },
    },
    required: ['format', 'title', 'intro', 'takeaway'],
  },
};

export interface LessonGenResult {
  lesson: InteractiveLesson | null;
  reason?: string;
  raw?: unknown;
}

/**
 * 특정 날짜의 브리핑을 입력으로 인터랙티브 학습을 생성(web_search 없음). 예산가드 통과 시에만.
 * 실패 시 lesson=null + reason(+raw)로 원인을 함께 반환.
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
    '너는 경제 교육 디자이너다. 오늘 브리핑에서 "숫자로 체감되는" 개념 하나를 골라, 초보자가 능동적으로 ' +
    '이해할 인터랙티브 학습을 설계한다. 세 가지 format 중 개념에 가장 맞는 하나를 고른다: ' +
    'slider(값→결과 연속 인과), predict(먼저 맞혀보고 공개, 놀라움), scenario(선택→결과 비교, 의사결정). ' +
    '규칙: (1) slider/predict의 formula는 변수 key로만 이루어진 산술식(+ - * / % 와 괄호만, 함수·**금지). ' +
    '(2) predict는 정답이 guess 범위 안에 오게. (3) scenario의 각 선택 결과는 고정 숫자(resultValue). ' +
    '(4) 오늘 뉴스와 직접 연결, 초보자도 "오 그렇구나" 하게 쉽게. 반드시 submit_lesson 도구로 제출.';

  const userPrompt =
    `오늘(${date}) 브리핑입니다:\n\n${cardsText}\n\n` +
    '이 중 하나를 골라 인터랙티브 학습을 submit_lesson으로 제출하세요.';

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      tools: [SUBMIT_LESSON_TOOL],
      tool_choice: { type: 'tool', name: 'submit_lesson' },
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
    console.log(`[Lesson] ${date} generated (${v.lesson.format}): "${v.lesson.title}"`);
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
