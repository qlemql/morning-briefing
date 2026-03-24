# 아침 브리핑 배포 가이드

## 1. Vercel 배포 (권장)

### 사전 준비
- GitHub 계정
- Vercel 계정 (무료 Hobby 플랜 OK)
- Anthropic API 키

### 단계

1. **GitHub에 코드 푸시**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Morning Briefing MVP"
   git remote add origin https://github.com/YOUR_USERNAME/morning-briefing.git
   git push -u origin main
   ```

2. **Vercel에 프로젝트 연결**
   - https://vercel.com/new 접속
   - GitHub 리포 선택
   - Framework: Next.js (자동 감지)
   - Root Directory: `.` (기본값)

3. **환경변수 설정** (중요!)
   Vercel 프로젝트 Settings → Environment Variables:

   | 변수명 | 값 | 환경 |
   |--------|-----|------|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview |

4. **배포**
   - Deploy 클릭 → 자동 빌드 및 배포
   - 약 1~2분 소요

### 커스텀 도메인 (선택)
- Vercel Settings → Domains에서 추가
- 무료 `.vercel.app` 서브도메인도 사용 가능

## 2. 환경변수 목록

| 변수 | 필수 | 설명 |
|------|------|------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API 키 |

## 3. 비용 구조

### Vercel (무료 Hobby 플랜)
- 100GB 대역폭/월
- Serverless Functions 무제한
- 자동 HTTPS

### Claude API 비용 예상
- 모델: claude-sonnet-4-20250514
- 카테고리당 1회/일 = **하루 2회** 호출
- 예상 토큰: ~1,000 입력 + ~800 출력 / 요청
- 월간 예상: **약 $2~5**

### 서버 캐시 전략
- 첫 번째 유저 요청 시 API 호출 → 결과 서버 메모리에 캐시
- 이후 같은 날 모든 유저는 캐시에서 서빙 (0원)
- 유저 수가 늘어도 API 비용 고정

## 4. 로컬 개발

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local에 ANTHROPIC_API_KEY 입력

# 개발 서버
npm run dev
# http://localhost:3000

# 빌드 테스트
npm run build

# API 품질 테스트 (API 키 필요)
node scripts/test-api.mjs
```

## 5. 후원 링크 설정

`src/app/page.tsx`의 `DONATION_URL` 상수를 수정:
```typescript
const DONATION_URL = 'https://toss.me/YOUR_TOSS_ID';
// 또는
const DONATION_URL = 'https://qr.kakaopay.com/YOUR_KAKAO_ID';
```

## 6. 모니터링

- Vercel Dashboard → Analytics (무료)
- `/api/briefing` GET 요청으로 헬스체크 + 캐시 상태 확인
