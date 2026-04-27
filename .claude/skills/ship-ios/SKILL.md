---
name: ship-ios
description: |
  iOS 앱 (Capacitor) 빌드 → archive → IPA export → App Store Connect 업로드를 한 번에 자동화.
  버전 자동 bump (patch/minor/major), Cloud Managed Distribution cert + ASC API Key 사용해서
  Xcode UI 안 거치고 CLI로 끝낸다. iOS 1.0.x 업데이트 시 사용.

  Trigger when:
  - "iOS 빌드", "앱 빌드", "ipa 만들어", "앱스토어 업로드", "ship ios"
  - "버전 올려서 배포", "다음 빌드 올려"
  - "TestFlight 업로드", "App Store Connect 업로드"

  When NOT to use:
  - 웹 코드만 변경 (그냥 git push로 Vercel 배포 = 즉시 반영)
  - 네이티브 설정/플러그인 변경 시에만 사용

allowed-tools:
  - Bash
  - Read
  - Edit
  - Grep
  - Glob
---

# Ship iOS — 1.0.x → App Store Connect 자동 업로드

## 사전 조건 검증 (skill 시작 시 먼저 확인)

```bash
# 1) ASC API Key 셋업 확인
test -f ~/.appstoreconnect/private_keys/AuthKey_*.p8 || echo "❌ .p8 파일 없음"

# 2) 환경변수 확인
test -n "$ASC_KEY_ID" || ls ~/.appstoreconnect/private_keys/AuthKey_*.p8
test -n "$ASC_ISSUER_ID"
```

조건 미충족 시:
- `.p8` 없으면 → `~/Downloads/AuthKey_*.p8` 자동 탐색해서 옮김
- env vars 없으면 → 파일명에서 KEY_ID 추출, ISSUER_ID는 `503555f2-43ce-44dd-9a2a-5fb53b93094c` 사용 (Morning Briefing 팀 고정값)

## 실행 순서

### 1. 버전 bump (필요 시)

`ios/App/App.xcodeproj/project.pbxproj`에서 다음 두 값을 올림:

```
MARKETING_VERSION = 1.0.X      # 사용자 요청 시 버전 올림
CURRENT_PROJECT_VERSION = N    # 무조건 +1 (App Store Connect는 build number unique 요구)
```

기본 정책:
- 일반 업데이트: build number만 +1, MARKETING_VERSION 유지
- 버그 fix: 1.0.X → 1.0.(X+1) (App Store에서 1.0.X 심사 통과 후라면 무조건 올려야 함)
- 사용자가 "패치", "버그 fix" 등 명시하면 patch 올림
- 사용자가 "기능 추가", "신기능" 명시하면 minor 올림 (1.X.0 → 1.(X+1).0)
- 사용자가 명시 안 하면 변경 사항을 보고 판단 후 사용자에게 확인

```bash
# 예시: build number만 올리기
sed -i '' 's/CURRENT_PROJECT_VERSION = N;/CURRENT_PROJECT_VERSION = N+1;/g' \
  ios/App/App.xcodeproj/project.pbxproj

# 예시: patch + build 둘 다 올리기
sed -i '' 's/MARKETING_VERSION = 1.0.X;/MARKETING_VERSION = 1.0.(X+1);/g; \
           s/CURRENT_PROJECT_VERSION = N;/CURRENT_PROJECT_VERSION = N+1;/g' \
  ios/App/App.xcodeproj/project.pbxproj
```

bump 후 grep으로 확인.

### 2. Web 자산 빌드 (필요 시)

웹 코드 변경이 있으면:
```bash
npm run build
npx cap sync ios
```

웹 변경 없으면 스킵 가능 (capacitor-config.json만 변경됐으면 cap sync는 필요).

### 3. Archive + Export + Upload

```bash
ASC_KEY_ID=<KEY_ID> ASC_ISSUER_ID=<ISSUER_ID> bash scripts/upload-ios.sh
```

스크립트 내부에서:
- `xcodebuild clean`
- `xcodebuild archive` (with `-allowProvisioningUpdates` + auth keys)
- `xcodebuild -exportArchive` (with auth keys → cloud cert 자동 다운)
- `xcrun altool --upload-app` (App Store Connect 전송)

소요 시간: 약 3~7분.

### 4. 결과 보고

업로드 성공 시 사용자에게:
- ✅ Build N 업로드 완료
- ⏳ Apple 처리 10~30분
- 다음 액션:
  1. App Store Connect에서 새 버전(MARKETING_VERSION) 추가 (이미 있으면 스킵)
  2. Build N 선택
  3. 업데이트 메모(What's New) 작성
  4. App Review 제출

## 옵션 플래그

`bash scripts/upload-ios.sh --no-upload` — IPA만 만들고 업로드 안 함 (디버깅용)
`bash scripts/upload-ios.sh --skip-archive` — 기존 archive 재활용 (export+upload만)

## 흔한 에러 처리

### "Cloud signing permission error" / "No signing certificate iOS Distribution found"
→ ASC API Key의 권한이 부족. **Admin** 권한으로 재발급 필요.
→ 사용자에게 https://appstoreconnect.apple.com/access/integrations/api 에서
   기존 키 revoke + Admin 권한으로 새 키 생성 요청

### "Invalid Pre-Release Train. The train version 'X.X' is closed"
→ App Store Connect에 이미 해당 MARKETING_VERSION이 라이브 상태.
→ MARKETING_VERSION을 올려야 함 (1.0.X → 1.0.(X+1))

### "Validation failed: Bundle version must be higher"
→ CURRENT_PROJECT_VERSION이 기존 build number 이하.
→ +1 더 올려서 재시도

### archive 실패 — 코드 사인 에러
→ `~/.appstoreconnect/private_keys/AuthKey_*.p8` 존재 확인
→ env vars 셋업 확인
→ Apple Developer Program 멤버십 활성 상태 확인

## 보안 원칙

- `.p8` 파일은 절대 커밋 금지 (이미 .gitignore 등록)
- Key ID / Issuer ID도 코드/메시지에 평문 노출 최소화
- 사용자에게 ID 직접 받지 말고 env vars + .p8 파일 자동 탐색으로 처리

## 참고 파일

- `scripts/upload-ios.sh` — 메인 자동화 스크립트
- `ios/App/App.xcodeproj/project.pbxproj` — 버전 정보
- `ios/App/build/ExportOptions.plist` — 배포 옵션 (signingStyle: automatic)
- `ios/App/build/App.xcarchive` — archive 산출물 (재활용 가능)
- `ios/App/build/ipa/App.ipa` — 최종 IPA (Transporter 수동 업로드 백업용)
