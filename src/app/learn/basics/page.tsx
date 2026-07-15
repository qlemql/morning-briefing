'use client';

import { useState } from 'react';
import { LearnShell, Slider, Term, Card, Result, won } from '../_shared';

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

export default function BasicsPage() {
  return (
    <LearnShell
      title="기초 개념"
      subtitle="늘 유용한 계산기 — 슬라이더를 움직여 감을 잡아보세요."
      backHref="/learn"
      backLabel="오늘의 학습"
    >
      <div className="space-y-4">
        <BaseRate />
        <Compound />
        <Inflation />
        <Fx />
      </div>
      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
        숫자는 개념 체감용 근사치예요.
      </p>
    </LearnShell>
  );
}
