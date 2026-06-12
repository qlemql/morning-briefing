'use client';

import { useState, type ReactNode } from 'react';

/* ────────── helpers ────────── */

/** 원 단위 숫자를 억/만원으로 읽기 좋게 */
function won(n: number): string {
  const v = Math.round(n);
  const eok = Math.floor(v / 1e8);
  const man = Math.round((v % 1e8) / 1e4);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  if (man > 0) return `${man.toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
}

function Slider({
  label, value, min, max, step, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 accent-teal-600 cursor-pointer"
        aria-label={label}
      />
    </div>
  );
}

/** 더 알아보기 안의 용어 한 줄 */
function Term({ k, children }: { k: string; children: ReactNode }) {
  return (
    <p>
      <b className="text-gray-800 dark:text-gray-100">{k}</b> — {children}
    </p>
  );
}

function Card({
  emoji, title, hook, children, takeaway, detail,
}: {
  emoji: string; title: string; hook: string; children: ReactNode; takeaway: string; detail?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <h2 className="font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{hook}</p>
      {children}
      <p className="mt-4 text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 rounded-lg px-3 py-2 leading-relaxed">
        🧠 {takeaway}
      </p>
      {detail && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
            aria-expanded={open}
          >
            <span aria-hidden="true">{open ? '▲' : 'ⓘ'}</span>
            {open ? '접기' : '더 알아보기'}
          </button>
          {open && (
            <div className="mt-2 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {detail}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Result({ value, label, tone = 'neutral' }: { value: string; label: ReactNode; tone?: 'neutral' | 'teal' | 'rose' }) {
  const color =
    tone === 'teal' ? 'text-teal-700 dark:text-teal-400'
      : tone === 'rose' ? 'text-rose-600 dark:text-rose-400'
        : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="text-center rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
      <div className={`text-3xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

/* ────────── 1. 기준금리 ────────── */
function BaseRate() {
  const [loan, setLoan] = useState(300_000_000);
  const [rate, setRate] = useState(4.0);
  const months = 360; // 30년
  const r = rate / 100 / 12;
  const monthly = (loan * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  const totalInterest = monthly * months - loan;
  return (
    <Card
      emoji="🏦" title="기준금리 — 내 대출이자"
      hook="금리를 직접 올려봐. 매달 갚는 돈이 어떻게 움직이는지."
      takeaway="기준금리 = 돈의 임대료. 이게 오르면 내 빚이자도 따라 오른다."
      detail={(
        <>
          <Term k="변동금리">시장 금리(기준금리)에 따라 갚는 이자가 바뀌는 대출. 고정금리는 끝까지 그대로예요.</Term>
          <Term k="원리금균등">매달 같은 금액(원금+이자)을 갚는 방식. 그래서 금리가 오르면 그 &lsquo;같은 금액&rsquo;이 커져요.</Term>
          <p className="text-gray-500 dark:text-gray-400">📌 예시: 한국은행이 기준금리를 0.5%p 올리면, 몇 달 뒤 변동금리 대출자의 월 상환액이 실제로 그만큼 올라가요. 고정금리로 미리 받아둔 사람은 영향이 없고요.</p>
        </>
      )}
    >
      <div className="space-y-4">
        <Slider label="대출금 (30년 변동금리)" value={loan} min={50_000_000} max={700_000_000} step={10_000_000} onChange={setLoan} fmt={won} />
        <Slider label="금리" value={rate} min={2.5} max={7} step={0.05} onChange={setRate} fmt={(v) => `${v.toFixed(2)}%`} />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Result value={won(monthly)} label="매달 갚는 돈" />
          <Result value={won(totalInterest)} label="30년간 낸 이자 총합" tone="rose" />
        </div>
      </div>
    </Card>
  );
}

/* ────────── 2. 복리 ────────── */
function Compound() {
  const [monthly, setMonthly] = useState(300_000);
  const [years, setYears] = useState(20);
  const [ret, setRet] = useState(6);
  const i = ret / 100 / 12;
  const n = years * 12;
  const future = i === 0 ? monthly * n : monthly * (((1 + i) ** n - 1) / i);
  const principal = monthly * n;
  const gain = future - principal;
  const gainPct = future > 0 ? (gain / future) * 100 : 0;
  return (
    <Card
      emoji="❄️" title="복리 — 눈덩이 효과"
      hook="기간을 늘려봐. 원금은 천천히, 불어난 돈은 폭발적으로."
      takeaway="복리는 '시간'이 일한다. 일찍·오래가 수익률보다 셀 때가 많다."
      detail={(
        <>
          <Term k="연 수익률">1년 동안 돈이 불어나는 비율. 6%면 100만원이 1년 뒤 106만원. 참고로 주식시장(코스피·S&amp;P500)의 아주 장기 연평균이 대략 6~8%였어요 (미래를 보장하진 않아요).</Term>
          <Term k="복리">불어난 이자에 다시 이자가 붙는 것. 시간이 갈수록 가속이 붙어요.</Term>
          <p className="text-gray-500 dark:text-gray-400">📌 예시: 월 30만원을 연 6%로 30년 모으면 약 3억. 그런데 내가 실제로 넣은 원금은 1.08억뿐이고, 나머지 ~1.9억은 복리가 만든 돈이에요.</p>
        </>
      )}
    >
      <div className="space-y-4">
        <Slider label="매달 투자" value={monthly} min={100_000} max={1_000_000} step={50_000} onChange={setMonthly} fmt={won} />
        <Slider label="기간" value={years} min={1} max={40} step={1} onChange={setYears} fmt={(v) => `${v}년`} />
        <Slider label="연 수익률" value={ret} min={2} max={12} step={0.5} onChange={setRet} fmt={(v) => `${v}%`} />
        <Result
          value={won(future)} tone="teal"
          label={<>{years}년 뒤 — 원금 {won(principal)} + 불어난 돈 <b className="text-teal-700 dark:text-teal-400">{won(gain)}</b></>}
        />
        <div>
          <div className="h-3 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
            <div className="bg-gray-400 dark:bg-gray-500" style={{ width: `${100 - gainPct}%` }} />
            <div className="bg-teal-500" style={{ width: `${gainPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            <span>■ 원금</span>
            <span className="text-teal-600 dark:text-teal-400">■ 복리로 불어난 돈</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ────────── 3. 인플레이션 ────────── */
function Inflation() {
  const [amount, setAmount] = useState(100_000_000);
  const [rate, setRate] = useState(3);
  const [years, setYears] = useState(20);
  const real = amount / (1 + rate / 100) ** years;
  const lost = amount - real;
  return (
    <Card
      emoji="📉" title="인플레이션 — 내 현금의 구매력"
      hook="물가상승률과 시간을 올려봐. 가만히 둔 현금이 얼마나 녹는지."
      takeaway="현금을 '안전'하다 믿으면, 인플레이션이 조용히 갉아먹는다."
      detail={(
        <>
          <Term k="실질 가치(구매력)">돈의 &lsquo;액수&rsquo;가 아니라 그 돈으로 살 수 있는 &lsquo;양&rsquo;. 물가가 오르면 같은 돈으로 덜 사져요.</Term>
          <Term k="물가상승률">전체 물건값이 1년에 오르는 비율. 한국은 보통 2~3%대를 목표로 해요.</Term>
          <p className="text-gray-500 dark:text-gray-400">📌 예시: 물가상승률 3%면 작년 10,000원이던 짜장면이 올해 10,300원. 현금 1억을 그냥 두면 액수는 그대로여도 매년 ~3%씩 &lsquo;살 수 있는 게&rsquo; 줄어드는 셈이에요.</p>
        </>
      )}
    >
      <div className="space-y-4">
        <Slider label="지금 가진 현금" value={amount} min={10_000_000} max={500_000_000} step={10_000_000} onChange={setAmount} fmt={won} />
        <Slider label="물가상승률 (연)" value={rate} min={1} max={7} step={0.5} onChange={setRate} fmt={(v) => `${v}%`} />
        <Slider label="기간" value={years} min={5} max={30} step={1} onChange={setYears} fmt={(v) => `${v}년`} />
        <Result
          value={won(real)} tone="rose"
          label={<>{years}년 뒤 {won(amount)}의 실질 가치 — <b className="text-rose-600 dark:text-rose-400">{won(lost)} 증발</b></>}
        />
      </div>
    </Card>
  );
}

/* ────────── 4. 환율 ────────── */
function Fx() {
  const [rate, setRate] = useState(1350);
  const [usd, setUsd] = useState(2000);
  const cost = rate * usd;
  return (
    <Card
      emoji="✈️" title="환율 — 해외 지출"
      hook="원/달러를 움직여봐. 같은 $라도 내 카드값이 출렁."
      takeaway="환율은 '해외 물건에 붙는 한국 가격표'. 낮을 때 쓰면 이득."
      detail={(
        <>
          <Term k="원/달러 환율">1달러를 사는 데 드는 원화. 이 숫자가 오르면(=원화 약세) 해외 물건·여행이 비싸져요.</Term>
          <Term k="원화 약세/강세">환율이 오르면 약세(원화 값이 싸짐), 내리면 강세. 수출기업엔 약세가 유리, 해외소비·유학엔 강세가 유리해요.</Term>
          <p className="text-gray-500 dark:text-gray-400">📌 예시: 환율이 1,300 → 1,400원이 되면, 똑같은 $1,000짜리 직구가 130만원 → 140만원. 가만히 있어도 10만원 더 든 거예요.</p>
        </>
      )}
    >
      <div className="space-y-4">
        <Slider label="원/달러 환율" value={rate} min={1100} max={1500} step={5} onChange={setRate} fmt={(v) => `${v.toLocaleString()}원`} />
        <Slider label="해외 지출 (달러)" value={usd} min={100} max={30000} step={100} onChange={setUsd} fmt={(v) => `$${v.toLocaleString()}`} />
        <Result value={won(cost)} label={<>${usd.toLocaleString()} 쓰면 내 카드값</>} />
      </div>
    </Card>
  );
}

/* ────────── page ────────── */
export default function LearnPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#111111] px-4 py-6">
      <div className="mx-auto max-w-lg">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">오늘의 경제, 만져보기</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            읽지 말고 슬라이더를 직접 움직여봐. 그 숫자가 곧 네 돈이야.
            <span className="text-gray-400 dark:text-gray-600"> (학습 실험 · 데모)</span>
          </p>
        </header>
        <div className="space-y-4">
          <BaseRate />
          <Compound />
          <Inflation />
          <Fx />
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          숫자는 개념 체감용 근사치예요.
        </p>
      </div>
    </main>
  );
}
