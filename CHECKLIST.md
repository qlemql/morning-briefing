# Launch Checklist (데드라인: 2026-05-24)

## 💡 비즈니스 모델: 후원 (Donation-First)
구독 모델 → 후원 모델 전환 (2026-04-17). 사업자등록 블로커 해제, App Store 리젝 리스크 제거.
DAU 200+ & 리텐션 30%+ 검증 후 정식 구독 모델로 재전환 예정.

## 🍎 App Store 심사 기록
- **2026-04-16 제출 → 거절 (Guideline 2.1(a) App Completeness)**: 앱 아이콘이 placeholder로 판정됨 (카드 안 회색 가로선 = Lorem Ipsum 패턴)
- **2026-04-19 수정 완료**: 일출 심볼 기반 리디자인 (네이비→골든 그라데이션 + 산 실루엣), placeholder 요소 전부 제거, RGB 플래튼(알파 채널 없음)
- **재제출 필요**: Xcode clean build → Archive → App Store Connect 업로드

## 🔴 블로커 — 모두 해결됨
- [x] Upstash Redis 세팅 ✅
- [x] CRON_SECRET 세팅 ✅
- [x] Anthropic 크레딧 충전 ✅
- [x] Anthropic API 키 발급 + Vercel 등록 ✅
- [x] Cron 정상 동작 확인 ✅ (2026-04-13)
- [x] 서버 gating 비활성화 (MVP 단계) ✅
- [x] web_search cite 태그 제거 ✅
- [x] 페이월 UI 제거 (후원 모델 전환) ✅ (2026-04-17)
- [x] API 비용 절감 (카테고리 1개 + max_uses 3) ✅ (2026-04-17)

## 🟠 후원 인프라 (사업자등록 불필요)

- [ ] **CEO**: Anthropic Console에서 Workspace spend limit 설정 ($10 권장)
- [ ] **CEO**: 카카오페이 QR 후원 링크 검증 (현재 코드: https://qr.kakaopay.com/Fa0mKvPtZ)
- [ ] (선택) Buy Me a Coffee 또는 투네이션 계정 생성 (해외 유저 대비)
- [ ] 후원 금액/횟수 추적 안 함 (개인정보·세무 단순화)

## 🟡 CEO 직접 처리 — 유저 확보 (가장 중요!)

- [ ] 트위터/스레드 계정 생성
- [ ] 디스콰이엇 등록 + 프로덕트 소개 작성
- [ ] 지인 20명에게 링크 공유
- [ ] 빌드인퍼블릭 첫 트윗/스레드 작성 ("매일 아침 AI가 정리해주는 뉴스, 무료 + 후원 모델")
- [ ] 네이버 서치어드바이저 등록
- [ ] Google Search Console 등록

## 🟢 개발팀 — CEO 행동 후 진행

- [ ] SNS 계정 생성 후 → API 키 연동
- [ ] 서치어드바이저/Search Console → 인증 코드 삽입
- [ ] 유저 피드백 기반 버그 수정
- [ ] iOS App Store 제출 (Apple Developer 등록 후)
- [ ] VAPID 키 생성 + 등록 (푸시 알림 활성화)

## ⚪ 보류 (DAU 200+ & 리텐션 30%+ 검증 후)

- [ ] 사업자등록
- [ ] Toss Payments 연동 + 정식 구독 모델 재전환
- [ ] 서버 gating re-enable
- [ ] 관심종목/레퍼럴 활성화
- [ ] "왜 움직였나" AI 해설

## 완료 기준

- D7 리텐션 30%+ → PMF 신호 (후원 전환은 부수적 지표)
- 일일 활성 유저 50+ → 구독 모델 전환 시점 판단 시작
