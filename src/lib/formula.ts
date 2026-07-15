/**
 * Safe arithmetic evaluator — AI가 생성한 수식을 eval 없이 계산한다.
 *
 * 허용: 숫자, 선언된 변수 식별자, 연산자 + - * / % , 괄호 ( ), 단항 +/-.
 * 그 외(미선언 식별자, 함수 호출, 속성 접근, 기타 문자)는 전부 거부(null 반환).
 * → AI가 `process`, `constructor`, `x()` 등을 넣어도 토큰화/파싱에서 걸러진다. eval/Function 미사용.
 */

type Token =
  | { t: 'num'; v: number }
  | { t: 'var'; v: string }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '%' }
  | { t: 'lp' }
  | { t: 'rp' };

function tokenize(expr: string, allowed: Set<string>): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i;
      while (j < expr.length && ((expr[j] >= '0' && expr[j] <= '9') || expr[j] === '.')) j++;
      const num = parseFloat(expr.slice(i, j));
      if (!Number.isFinite(num)) return null;
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) j++;
      const name = expr.slice(i, j);
      if (!allowed.has(name)) return null; // 미선언 식별자 = 거부 (함수/전역 차단)
      tokens.push({ t: 'var', v: name });
      i = j;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%') {
      tokens.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    if (ch === '(') { tokens.push({ t: 'lp' }); i++; continue; }
    if (ch === ')') { tokens.push({ t: 'rp' }); i++; continue; }

    return null; // 허용되지 않은 문자
  }
  return tokens;
}

/**
 * 수식을 안전하게 평가. 파싱 불가/미선언 변수/0 나눗셈/비유한 결과면 null.
 * 재귀 하강 파서:  expr := term (('+'|'-') term)*  |  term := factor (('*'|'/'|'%') factor)*
 *                 factor := ('+'|'-') factor | '(' expr ')' | num | var
 */
export function evalFormula(formula: string, vars: Record<string, number>): number | null {
  if (typeof formula !== 'string' || formula.length > 300) return null;
  const tokens = tokenize(formula, new Set(Object.keys(vars)));
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];

  const parseExpr = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;
    for (let p = peek(); p && p.t === 'op' && (p.v === '+' || p.v === '-'); p = peek()) {
      pos++;
      const right = parseTerm();
      if (right === null) return null;
      left = p.v === '+' ? left + right : left - right;
    }
    return left;
  };
  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    for (let p = peek(); p && p.t === 'op' && (p.v === '*' || p.v === '/' || p.v === '%'); p = peek()) {
      pos++;
      const right = parseFactor();
      if (right === null) return null;
      if (p.v === '*') left = left * right;
      else { if (right === 0) return null; left = p.v === '/' ? left / right : left % right; }
    }
    return left;
  };
  const parseFactor = (): number | null => {
    const tk = peek();
    if (!tk) return null;
    if (tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
      pos++;
      const f = parseFactor();
      if (f === null) return null;
      return tk.v === '-' ? -f : f;
    }
    if (tk.t === 'num') { pos++; return tk.v; }
    if (tk.t === 'var') { pos++; return vars[tk.v]; }
    if (tk.t === 'lp') {
      pos++;
      const e = parseExpr();
      if (e === null) return null;
      if (peek()?.t !== 'rp') return null;
      pos++;
      return e;
    }
    return null;
  };

  const result = parseExpr();
  if (result === null) return null;
  if (pos !== tokens.length) return null; // 소비되지 않은 토큰 남으면 거부
  return Number.isFinite(result) ? result : null;
}
