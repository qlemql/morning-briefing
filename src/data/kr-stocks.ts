/**
 * Korean stock market major tickers for watchlist search
 * Format: Yahoo Finance ticker (with .KS for KOSPI, .KQ for KOSDAQ)
 */

export interface KrStock {
  /** Yahoo Finance ticker symbol (e.g., "005930.KS") */
  ticker: string;
  /** Korean name */
  name: string;
  /** English name (for fallback search) */
  nameEn: string;
  /** Market: KOSPI or KOSDAQ */
  market: 'KOSPI' | 'KOSDAQ';
}

export const KR_STOCKS: KrStock[] = [
  // KOSPI Top 30
  { ticker: '005930.KS', name: '삼성전자', nameEn: 'Samsung Electronics', market: 'KOSPI' },
  { ticker: '000660.KS', name: 'SK하이닉스', nameEn: 'SK Hynix', market: 'KOSPI' },
  { ticker: '373220.KS', name: 'LG에너지솔루션', nameEn: 'LG Energy Solution', market: 'KOSPI' },
  { ticker: '207940.KS', name: '삼성바이오로직스', nameEn: 'Samsung Biologics', market: 'KOSPI' },
  { ticker: '005380.KS', name: '현대차', nameEn: 'Hyundai Motor', market: 'KOSPI' },
  { ticker: '000270.KS', name: '기아', nameEn: 'Kia', market: 'KOSPI' },
  { ticker: '006400.KS', name: '삼성SDI', nameEn: 'Samsung SDI', market: 'KOSPI' },
  { ticker: '051910.KS', name: 'LG화학', nameEn: 'LG Chem', market: 'KOSPI' },
  { ticker: '035420.KS', name: 'NAVER', nameEn: 'NAVER', market: 'KOSPI' },
  { ticker: '005490.KS', name: 'POSCO홀딩스', nameEn: 'POSCO Holdings', market: 'KOSPI' },
  { ticker: '055550.KS', name: '신한지주', nameEn: 'Shinhan Financial', market: 'KOSPI' },
  { ticker: '105560.KS', name: 'KB금융', nameEn: 'KB Financial', market: 'KOSPI' },
  { ticker: '035720.KS', name: '카카오', nameEn: 'Kakao', market: 'KOSPI' },
  { ticker: '000810.KS', name: '삼성화재', nameEn: 'Samsung Fire & Marine', market: 'KOSPI' },
  { ticker: '012330.KS', name: '현대모비스', nameEn: 'Hyundai Mobis', market: 'KOSPI' },
  { ticker: '066570.KS', name: 'LG전자', nameEn: 'LG Electronics', market: 'KOSPI' },
  { ticker: '003550.KS', name: 'LG', nameEn: 'LG Corp', market: 'KOSPI' },
  { ticker: '034730.KS', name: 'SK', nameEn: 'SK Inc', market: 'KOSPI' },
  { ticker: '032830.KS', name: '삼성생명', nameEn: 'Samsung Life', market: 'KOSPI' },
  { ticker: '086790.KS', name: '하나금융지주', nameEn: 'Hana Financial', market: 'KOSPI' },
  { ticker: '003670.KS', name: '포스코퓨처엠', nameEn: 'POSCO Future M', market: 'KOSPI' },
  { ticker: '030200.KS', name: 'KT', nameEn: 'KT Corp', market: 'KOSPI' },
  { ticker: '017670.KS', name: 'SK텔레콤', nameEn: 'SK Telecom', market: 'KOSPI' },
  { ticker: '028260.KS', name: '삼성물산', nameEn: 'Samsung C&T', market: 'KOSPI' },
  { ticker: '096770.KS', name: 'SK이노베이션', nameEn: 'SK Innovation', market: 'KOSPI' },
  { ticker: '009150.KS', name: '삼성전기', nameEn: 'Samsung Electro-Mechanics', market: 'KOSPI' },
  { ticker: '018260.KS', name: '삼성에스디에스', nameEn: 'Samsung SDS', market: 'KOSPI' },
  { ticker: '010130.KS', name: '고려아연', nameEn: 'Korea Zinc', market: 'KOSPI' },
  { ticker: '034020.KS', name: '두산에너빌리티', nameEn: 'Doosan Enerbility', market: 'KOSPI' },
  { ticker: '015760.KS', name: '한국전력', nameEn: 'KEPCO', market: 'KOSPI' },

  // KOSDAQ Top 20
  { ticker: '247540.KQ', name: '에코프로비엠', nameEn: 'EcoPro BM', market: 'KOSDAQ' },
  { ticker: '086520.KQ', name: '에코프로', nameEn: 'EcoPro', market: 'KOSDAQ' },
  { ticker: '263750.KQ', name: '펄어비스', nameEn: 'Pearl Abyss', market: 'KOSDAQ' },
  { ticker: '196170.KQ', name: '알테오젠', nameEn: 'Alteogen', market: 'KOSDAQ' },
  { ticker: '403870.KQ', name: 'HPSP', nameEn: 'HPSP', market: 'KOSDAQ' },
  { ticker: '035900.KQ', name: 'JYP엔터', nameEn: 'JYP Entertainment', market: 'KOSDAQ' },
  { ticker: '041510.KQ', name: 'SM엔터', nameEn: 'SM Entertainment', market: 'KOSDAQ' },
  { ticker: '293490.KQ', name: '카카오게임즈', nameEn: 'Kakao Games', market: 'KOSDAQ' },
  { ticker: '112040.KQ', name: '위메이드', nameEn: 'Wemade', market: 'KOSDAQ' },
  { ticker: '377300.KS', name: '카카오페이', nameEn: 'Kakao Pay', market: 'KOSPI' },
  { ticker: '352820.KS', name: '하이브', nameEn: 'HYBE', market: 'KOSPI' },
  { ticker: '068270.KS', name: '셀트리온', nameEn: 'Celltrion', market: 'KOSPI' },
  { ticker: '036570.KS', name: '엔씨소프트', nameEn: 'NCsoft', market: 'KOSPI' },
  { ticker: '028300.KQ', name: 'HLB', nameEn: 'HLB', market: 'KOSDAQ' },
  { ticker: '145020.KQ', name: '휴젤', nameEn: 'Hugel', market: 'KOSDAQ' },
  { ticker: '039030.KQ', name: '이오테크닉스', nameEn: 'EO Technics', market: 'KOSDAQ' },
  { ticker: '257720.KQ', name: '실리콘투', nameEn: 'Silicon2', market: 'KOSDAQ' },
  { ticker: '095340.KQ', name: 'ISC', nameEn: 'ISC', market: 'KOSDAQ' },
  { ticker: '058470.KQ', name: '리노공업', nameEn: 'Leeno Industrial', market: 'KOSDAQ' },
  { ticker: '357780.KQ', name: '솔브레인', nameEn: 'Soulbrain', market: 'KOSDAQ' },
];

/**
 * Search stocks by Korean name (case-insensitive, partial match)
 */
export function searchStocks(query: string): KrStock[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return KR_STOCKS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.nameEn.toLowerCase().includes(q) ||
      s.ticker.toLowerCase().includes(q),
  );
}
