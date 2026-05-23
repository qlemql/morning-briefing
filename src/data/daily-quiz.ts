/**
 * 30-day rotating quiz & poll pool.
 * Selected by date index: dayOfYear % pool.length
 * No Claude API calls — all content is pre-authored.
 */

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  answer: number; // 0-based index of correct option
  explanation: string;
}

export interface Poll {
  id: string;
  question: string;
  options: [string, string];
}

export interface DailyQuizData {
  quiz: Quiz;
  poll: Poll;
}

const quizPool: DailyQuizData[] = [
  {
    quiz: {
      id: 'q01',
      question: '한국은행의 기준금리 결정은 연 몇 회 이루어질까요?',
      options: ['4회', '6회', '8회', '12회'],
      answer: 2,
      explanation: '한국은행 금융통화위원회는 연 8회 기준금리를 결정합니다.',
    },
    poll: {
      id: 'p01',
      question: '올해 코스피 3,000 돌파할 수 있을까요?',
      options: ['가능하다', '어렵다'],
    },
  },
  {
    quiz: {
      id: 'q02',
      question: 'GDP 대비 수출 비중이 가장 높은 나라는?',
      options: ['한국', '독일', '중국', '일본'],
      answer: 0,
      explanation: '한국의 GDP 대비 수출 비중은 약 40%로, 주요 경제대국 중 가장 높은 수준입니다.',
    },
    poll: {
      id: 'p02',
      question: '미국 연준이 올해 안에 금리를 인하할까요?',
      options: ['인하한다', '동결 또는 인상'],
    },
  },
  {
    quiz: {
      id: 'q03',
      question: '2024년 최초로 시가총액 3조 달러를 달성한 기업은?',
      options: ['Apple', 'Microsoft', 'NVIDIA', 'Saudi Aramco'],
      answer: 0,
      explanation: 'Apple은 2024년 6월 시가총액 3조 달러를 최초로 돌파한 기업입니다.',
    },
    poll: {
      id: 'p03',
      question: '비트코인이 올해 10만 달러를 돌파할까요?',
      options: ['돌파한다', '못한다'],
    },
  },
  {
    quiz: {
      id: 'q04',
      question: '다음 중 "경기 선행지수"에 해당하는 것은?',
      options: ['실업률', '소비자물가지수', '건축허가건수', 'GDP'],
      answer: 2,
      explanation: '건축허가건수는 경기에 앞서 움직이는 대표적인 선행지표입니다.',
    },
    poll: {
      id: 'p04',
      question: '올해 부동산 가격이 오를까요?',
      options: ['오른다', '내린다'],
    },
  },
  {
    quiz: {
      id: 'q05',
      question: '"CPI"는 무엇의 약자일까요?',
      options: ['Consumer Price Index', 'Capital Performance Indicator', 'Central Policy Interest', 'Corporate Profit Index'],
      answer: 0,
      explanation: 'CPI(Consumer Price Index)는 소비자물가지수로, 인플레이션을 측정하는 핵심 지표입니다.',
    },
    poll: {
      id: 'p05',
      question: 'AI가 5년 내 인간 일자리의 20% 이상을 대체할까요?',
      options: ['그렇다', '아니다'],
    },
  },
  {
    quiz: {
      id: 'q06',
      question: '한국 주식시장의 정규 거래 시간은?',
      options: ['09:00~15:00', '09:00~15:30', '09:30~16:00', '08:30~15:00'],
      answer: 1,
      explanation: '한국 주식시장(코스피/코스닥)은 오전 9시부터 오후 3시 30분까지 운영됩니다.',
    },
    poll: {
      id: 'p06',
      question: '은퇴 준비로 가장 중요한 것은?',
      options: ['연금/저축', '투자/재테크'],
    },
  },
  {
    quiz: {
      id: 'q07',
      question: '다음 중 안전자산으로 분류되는 것은?',
      options: ['주식', '금', '비트코인', '부동산'],
      answer: 1,
      explanation: '금은 전통적으로 경제 불확실성 시기에 가치를 보존하는 대표적인 안전자산입니다.',
    },
    poll: {
      id: 'p07',
      question: '현금 vs 주식, 지금 어디에 더 투자하겠습니까?',
      options: ['현금/예금', '주식/ETF'],
    },
  },
  {
    quiz: {
      id: 'q08',
      question: '"PER"이 높다는 것은 어떤 의미일까요?',
      options: ['저평가 상태', '고평가 상태', '배당이 높음', '부채가 많음'],
      answer: 1,
      explanation: 'PER(주가수익비율)이 높으면 이익 대비 주가가 높아 고평가 상태로 해석합니다.',
    },
    poll: {
      id: 'p08',
      question: '환율이 1,400원 이상이면 해외여행을 줄이시겠습니까?',
      options: ['줄인다', '상관없다'],
    },
  },
  {
    quiz: {
      id: 'q09',
      question: '세계 3대 신용평가사가 아닌 것은?',
      options: ["Moody's", "S&P", 'Fitch', 'Bloomberg'],
      answer: 3,
      explanation: "세계 3대 신용평가사는 Moody's, S&P, Fitch입니다. Bloomberg는 금융 정보 서비스 회사입니다.",
    },
    poll: {
      id: 'p09',
      question: '주 4일 근무제가 한국에서도 보편화될까요?',
      options: ['될 것이다', '어렵다'],
    },
  },
  {
    quiz: {
      id: 'q10',
      question: '한국의 법정 최저시급(2025년)에 가장 가까운 것은?',
      options: ['9,620원', '9,860원', '10,030원', '10,360원'],
      answer: 2,
      explanation: '2025년 한국의 최저시급은 10,030원으로 전년 대비 1.7% 인상되었습니다.',
    },
    poll: {
      id: 'p10',
      question: '전기차와 내연기관차 중 다음 차로 뭘 사겠습니까?',
      options: ['전기차', '내연기관차'],
    },
  },
  {
    quiz: {
      id: 'q11',
      question: '"ETF"는 무엇의 약자일까요?',
      options: ['Exchange Traded Fund', 'Electronic Transfer Fee', 'Equity Trust Framework', 'Estimated Tax Filing'],
      answer: 0,
      explanation: 'ETF(Exchange Traded Fund)는 거래소에 상장되어 주식처럼 거래되는 펀드입니다.',
    },
    poll: {
      id: 'p11',
      question: '월급의 몇 %를 저축하시나요?',
      options: ['20% 이상', '20% 미만'],
    },
  },
  {
    quiz: {
      id: 'q12',
      question: '다음 중 "기축통화"에 해당하지 않는 것은?',
      options: ['미국 달러', '유로', '일본 엔', '한국 원'],
      answer: 3,
      explanation: '한국 원화는 기축통화가 아닙니다. 주요 기축통화는 달러, 유로, 엔, 파운드 등입니다.',
    },
    poll: {
      id: 'p12',
      question: '지금 집을 사는 게 좋을까요, 기다리는 게 좋을까요?',
      options: ['지금 사야 한다', '더 기다린다'],
    },
  },
  {
    quiz: {
      id: 'q13',
      question: '코스피200 지수를 추종하는 대표 ETF는?',
      options: ['KODEX 200', 'TIGER 미국S&P500', 'ARIRANG 고배당', 'KBSTAR 중소형'],
      answer: 0,
      explanation: 'KODEX 200은 코스피200 지수를 추종하는 한국의 대표적인 ETF입니다.',
    },
    poll: {
      id: 'p13',
      question: '투자 정보를 주로 어디서 얻으시나요?',
      options: ['유튜브/SNS', '증권사 리포트/뉴스'],
    },
  },
  {
    quiz: {
      id: 'q14',
      question: '"인플레이션"의 반대 개념은?',
      options: ['디플레이션', '스태그플레이션', '리플레이션', '하이퍼인플레이션'],
      answer: 0,
      explanation: '디플레이션은 물가가 지속적으로 하락하는 현상으로, 인플레이션의 반대 개념입니다.',
    },
    poll: {
      id: 'p14',
      question: '은행 예금 vs 주식 투자, 어디가 더 안전하다고 느끼시나요?',
      options: ['은행 예금', '주식 투자'],
    },
  },
  {
    quiz: {
      id: 'q15',
      question: '다음 중 배당수익률이 가장 높은 업종은 일반적으로?',
      options: ['IT/반도체', '금융/보험', '바이오/헬스', '게임/엔터'],
      answer: 1,
      explanation: '금융/보험 업종은 전통적으로 안정적인 수익을 바탕으로 높은 배당을 지급합니다.',
    },
    poll: {
      id: 'p15',
      question: '해외 주식 투자를 하고 계신가요?',
      options: ['하고 있다', '안 하고 있다'],
    },
  },
  {
    quiz: {
      id: 'q16',
      question: '"블랙먼데이"가 처음 발생한 연도는?',
      options: ['1929년', '1987년', '2000년', '2008년'],
      answer: 1,
      explanation: '1987년 10월 19일 월요일, 다우존스 지수가 하루에 22.6% 폭락한 사건입니다.',
    },
    poll: {
      id: 'p16',
      question: '다음 중 더 유망하다고 생각하는 분야는?',
      options: ['AI/로봇', '바이오/헬스케어'],
    },
  },
  {
    quiz: {
      id: 'q17',
      question: '한국의 국가 신용등급(S&P 기준)은?',
      options: ['A+', 'AA-', 'AA', 'AA+'],
      answer: 1,
      explanation: '한국의 S&P 국가 신용등급은 AA-로, 높은 투자등급을 유지하고 있습니다.',
    },
    poll: {
      id: 'p17',
      question: '현재 경기 상황을 어떻게 느끼시나요?',
      options: ['좋아지고 있다', '나빠지고 있다'],
    },
  },
  {
    quiz: {
      id: 'q18',
      question: '"72의 법칙"에서 연 6% 수익률일 때 원금이 2배가 되는 기간은?',
      options: ['6년', '8년', '10년', '12년'],
      answer: 3,
      explanation: '72 / 6 = 12년. 72의 법칙은 72를 연수익률로 나누면 원금 2배 소요 기간을 알 수 있습니다.',
    },
    poll: {
      id: 'p18',
      question: '노후 준비 중 가장 걱정되는 것은?',
      options: ['의료비', '생활비'],
    },
  },
  {
    quiz: {
      id: 'q19',
      question: '다음 중 "양적완화(QE)"의 설명으로 맞는 것은?',
      options: ['세금을 줄이는 정책', '중앙은행이 채권을 매입하는 정책', '수입 관세를 낮추는 정책', '공공지출을 줄이는 정책'],
      answer: 1,
      explanation: '양적완화는 중앙은행이 국채 등을 매입하여 시중에 유동성을 공급하는 통화정책입니다.',
    },
    poll: {
      id: 'p19',
      question: '구독 서비스 지출이 부담스러우신가요?',
      options: ['부담스럽다', '괜찮다'],
    },
  },
  {
    quiz: {
      id: 'q20',
      question: '다음 중 "코스닥"에 상장된 기업 특징은?',
      options: ['대기업 위주', '중소·벤처 위주', '공기업 위주', '외국기업 위주'],
      answer: 1,
      explanation: '코스닥은 기술 중심의 중소·벤처기업이 주로 상장된 시장입니다.',
    },
    poll: {
      id: 'p20',
      question: '자녀에게 경제 교육이 필수라고 생각하시나요?',
      options: ['필수다', '선택이다'],
    },
  },
  {
    quiz: {
      id: 'q21',
      question: '워렌 버핏의 투자 회사 이름은?',
      options: ['Vanguard', 'Berkshire Hathaway', 'BlackRock', 'Bridgewater'],
      answer: 1,
      explanation: '워렌 버핏은 Berkshire Hathaway의 회장으로, 세계에서 가장 유명한 투자자 중 한 명입니다.',
    },
    poll: {
      id: 'p21',
      question: '개인연금 가입하고 계신가요?',
      options: ['하고 있다', '안 하고 있다'],
    },
  },
  {
    quiz: {
      id: 'q22',
      question: '"공매도"란 무엇일까요?',
      options: ['빌린 주식을 팔고 나중에 사서 갚는 것', '대량으로 주식을 사는 것', '비상장주식을 거래하는 것', '해외주식을 국내에서 파는 것'],
      answer: 0,
      explanation: '공매도는 주식을 빌려 먼저 매도한 뒤 가격이 하락하면 다시 사서 갚아 차익을 얻는 투자 기법입니다.',
    },
    poll: {
      id: 'p22',
      question: '주식 투자 경력이 얼마나 되시나요?',
      options: ['3년 이상', '3년 미만'],
    },
  },
  {
    quiz: {
      id: 'q23',
      question: '다음 중 "경상수지"에 포함되지 않는 것은?',
      options: ['상품수지', '서비스수지', '자본수지', '소득수지'],
      answer: 2,
      explanation: '자본수지는 경상수지가 아닌 자본·금융계정에 포함됩니다.',
    },
    poll: {
      id: 'p23',
      question: '현금 없는 사회가 올까요?',
      options: ['10년 내 온다', '아직 멀었다'],
    },
  },
  {
    quiz: {
      id: 'q24',
      question: '코스피와 코스닥의 가장 큰 차이는?',
      options: [
        '거래 시간이 다르다',
        '코스피는 대형주, 코스닥은 중소·벤처 중심',
        '코스닥은 외국인이 거래할 수 없다',
        '코스피만 배당금을 받을 수 있다',
      ],
      answer: 1,
      explanation: '코스피(KOSPI)는 삼성전자·SK하이닉스 같은 대형 우량주 중심, 코스닥(KOSDAQ)은 중소·벤처·IT기업 중심입니다. 코스닥은 일반적으로 변동성이 더 큽니다.',
    },
    poll: {
      id: 'p24',
      question: '가상화폐에 투자하고 계신가요?',
      options: ['하고 있다', '안 하고 있다'],
    },
  },
  {
    quiz: {
      id: 'q25',
      question: '"스태그플레이션"이란?',
      options: ['경기침체 + 물가상승', '경기호황 + 물가하락', '경기침체 + 물가하락', '경기호황 + 물가상승'],
      answer: 0,
      explanation: '스태그플레이션은 경기 침체(stagnation)와 인플레이션이 동시에 발생하는 현상입니다.',
    },
    poll: {
      id: 'p25',
      question: '연봉 협상에서 가장 중요한 것은?',
      options: ['성과/실적', '시장 평균 연봉'],
    },
  },
  {
    quiz: {
      id: 'q26',
      question: '다음 중 "나스닥"에 상장된 기업이 아닌 것은?',
      options: ['Apple', 'Amazon', 'Coca-Cola', 'Tesla'],
      answer: 2,
      explanation: 'Coca-Cola는 뉴욕증권거래소(NYSE)에 상장되어 있습니다.',
    },
    poll: {
      id: 'p26',
      question: '투자에서 가장 중요한 것은?',
      options: ['분산투자', '집중투자'],
    },
  },
  {
    quiz: {
      id: 'q27',
      question: '"국채"를 발행하는 주체는?',
      options: ['중앙은행', '정부', '시중은행', '증권사'],
      answer: 1,
      explanation: '국채는 정부가 재정 적자를 메우기 위해 발행하는 채권입니다.',
    },
    poll: {
      id: 'p27',
      question: '경제 뉴스를 매일 확인하시나요?',
      options: ['매일 본다', '가끔 본다'],
    },
  },
  {
    quiz: {
      id: 'q28',
      question: '다음 중 "베어마켓(Bear Market)"의 기준은?',
      options: ['고점 대비 10% 하락', '고점 대비 20% 하락', '고점 대비 30% 하락', '고점 대비 50% 하락'],
      answer: 1,
      explanation: '베어마켓은 일반적으로 고점 대비 20% 이상 하락한 시장 상태를 의미합니다.',
    },
    poll: {
      id: 'p28',
      question: '부업/사이드 프로젝트를 하고 계신가요?',
      options: ['하고 있다', '안 하고 있다'],
    },
  },
  {
    quiz: {
      id: 'q29',
      question: '"ROE"가 측정하는 것은?',
      options: ['매출 대비 이익률', '자기자본 대비 이익률', '총자산 대비 이익률', '부채 대비 이익률'],
      answer: 1,
      explanation: 'ROE(Return on Equity)는 자기자본이익률로, 투입한 자기자본 대비 얼마나 이익을 냈는지를 보여줍니다.',
    },
    poll: {
      id: 'p29',
      question: '향후 1년간 한국 경제가 성장할까요?',
      options: ['성장한다', '정체/후퇴'],
    },
  },
  {
    quiz: {
      id: 'q30',
      question: '한국 가계부채가 GDP 대비 어느 수준일까요?',
      options: ['약 60%', '약 80%', '약 100%', '약 120%'],
      answer: 2,
      explanation: '한국의 가계부채는 GDP 대비 약 100% 수준으로, 세계적으로도 높은 편입니다.',
    },
    poll: {
      id: 'p30',
      question: '재테크 공부를 체계적으로 하고 계신가요?',
      options: ['하고 있다', '해야 하는데 못하고 있다'],
    },
  },
];

/**
 * Get today's quiz & poll based on the current date (KST).
 * Rotates through the 30-item pool using day-of-year index.
 */
export function getTodayQuiz(): DailyQuizData {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return quizPool[dayOfYear % quizPool.length];
}

/**
 * Get date string for cache keys (YYYY-MM-DD in KST).
 */
export function getQuizDateKey(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().split('T')[0];
}
