#!/usr/bin/env bash
# 브리핑이 오늘자로 갱신됐는지 빠르게 확인하는 스크립트.
#
# 두 가지를 본다:
#  1) 라이브 사이트가 지금 서빙하는 카드가 진짜인지 evergreen 폴백인지 (card id의 eg_ 접두)
#  2) Redis archive 기준 최근 N일 동안 economy 브리핑이 실제 생성됐는지
#
# 사용: bash scripts/check-briefing.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# .env.local 로드 (UPSTASH_*, NEXT_PUBLIC_SITE_URL)
set -a; [ -f .env.local ] && source .env.local; set +a
BASE="${NEXT_PUBLIC_SITE_URL:-https://morning-briefing-mocha.vercel.app}"
U="${UPSTASH_REDIS_REST_URL:-}"; T="${UPSTASH_REDIS_REST_TOKEN:-}"
TODAY="$(TZ=Asia/Seoul date +%F)"

echo "📅 오늘(KST): $TODAY"
echo "🌐 사이트   : $BASE"
echo ""

# 1) 라이브 서빙 확인 ----------------------------------------------------------
echo "── 라이브 서빙 (POST /api/briefing) ──────────────────────"
curl -s -X POST "$BASE/api/briefing" -H 'Content-Type: application/json' \
  -d '{"category":"economy"}' | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
cards = data.get('cards') or (data.get('briefing', {}) or {}).get('cards') or []
if not cards:
    print('  ⚠️  카드 없음:', json.dumps(d)[:300]); sys.exit()
c = cards[0]
cid, title = c.get('id', ''), c.get('title', '')
gen = data.get('generatedAt', '?')
if cid.startswith('eg_'):
    print(f'  🟡 폴백(evergreen) 서빙 중 — 갱신 안 됨')
else:
    print(f'  🟢 실제 생성 콘텐츠 서빙 중')
print(f'     id={cid}  generatedAt={gen}')
print(f'     title=\"{title}\"')
"
echo ""

# 2) Redis archive 기준 최근 생성 이력 ----------------------------------------
if [ -z "$U" ] || [ -z "$T" ]; then
  echo "ℹ️  UPSTASH 자격증명 없음 — archive 이력 확인 생략"
  exit 0
fi
echo "── 생성 이력 (archive, 최근 7일) ─────────────────────────"
for i in 6 5 4 3 2 1 0; do
  d="$(TZ=Asia/Seoul date -v-${i}d +%F 2>/dev/null || date -d "-$i day" +%F)"
  raw="$(curl -s "$U" -H "Authorization: Bearer $T" -d "[\"GET\",\"mb:archive:economy:$d\"]")"
  printf '  %s  ' "$d"
  echo "$raw" | python3 -c "
import sys, json
r = json.load(sys.stdin)['result']
if not r:
    print('❌ 생성 안됨'); sys.exit()
b = json.loads(r)
print('✅ 생성됨  generatedAt=' + str(b.get('generatedAt')))
"
done
