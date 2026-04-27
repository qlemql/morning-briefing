#!/bin/bash
# iOS 빌드 → Archive → Export → Upload (App Store Connect API Key 사용)
# 사용법:
#   bash scripts/upload-ios.sh             # archive + export + upload
#   bash scripts/upload-ios.sh --no-upload # archive + export만 (IPA 파일 생성)
#   bash scripts/upload-ios.sh --skip-archive  # 이미 archive 있을 때 export부터

set -e

# === 설정 (사용자가 채워야 함) ===
ASC_KEY_ID="${ASC_KEY_ID:-}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-}"
ASC_KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios/App"
ARCHIVE_PATH="$IOS_DIR/build/App.xcarchive"
IPA_DIR="$IOS_DIR/build/ipa"
EXPORT_OPTIONS="$IOS_DIR/build/ExportOptions.plist"

# === 검증 ===
if [ -z "$ASC_KEY_ID" ] || [ -z "$ASC_ISSUER_ID" ]; then
  echo "❌ ASC_KEY_ID 또는 ASC_ISSUER_ID 환경변수가 설정되지 않음"
  echo ""
  echo "방법 1) 한 번만 export:"
  echo "   ASC_KEY_ID=ABCD1234 ASC_ISSUER_ID=12345-6789-... bash scripts/upload-ios.sh"
  echo ""
  echo "방법 2) ~/.zshrc 등에 영구 등록:"
  echo "   export ASC_KEY_ID=ABCD1234"
  echo "   export ASC_ISSUER_ID=12345-6789-..."
  exit 1
fi

if [ ! -f "$ASC_KEY_PATH" ]; then
  echo "❌ API Key 파일 없음: $ASC_KEY_PATH"
  echo "   App Store Connect에서 발급한 .p8 파일을 다음 경로에 두세요:"
  echo "   $HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  exit 1
fi

cd "$IOS_DIR"

# === Archive ===
if [[ "$*" != *"--skip-archive"* ]]; then
  echo "🧹 Cleaning..."
  xcodebuild clean -project App.xcodeproj -scheme App -configuration Release > /dev/null

  echo "📦 Archiving..."
  rm -rf "$ARCHIVE_PATH"
  xcodebuild archive \
    -project App.xcodeproj \
    -scheme App \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    -allowProvisioningUpdates \
    -authenticationKeyID "$ASC_KEY_ID" \
    -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
    -authenticationKeyPath "$ASC_KEY_PATH" \
    | tail -5
  echo "✅ Archive 완료"
fi

# === Export IPA ===
echo "📤 Exporting IPA..."
rm -rf "$IPA_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$IPA_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  | tail -3
echo "✅ IPA 생성: $IPA_DIR/App.ipa"

# === Upload ===
if [[ "$*" == *"--no-upload"* ]]; then
  echo "ℹ️  --no-upload 플래그로 업로드 스킵"
  echo "   IPA 위치: $IPA_DIR/App.ipa"
  exit 0
fi

echo "☁️  App Store Connect로 업로드..."
xcrun altool --upload-app \
  --type ios \
  --file "$IPA_DIR/App.ipa" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo "🎉 업로드 완료. App Store Connect에서 처리 상태 확인 가능."
