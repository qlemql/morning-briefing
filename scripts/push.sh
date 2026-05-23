#!/usr/bin/env bash
# Git push helper — switches to personal account (qlemql) for push, restores company account after.
#
# This machine has two GitHub accounts via gh CLI:
#   - torder-frontend-daniel (company, usually active)
#   - qlemql (personal, for this project)
#
# Usage:
#   bash scripts/push.sh [git push args...]
#   bash scripts/push.sh origin main
#   bash scripts/push.sh --tags
#
# Always uses `gh` CLI for account switching (never edits gitconfig directly).

set -euo pipefail

PERSONAL_USER="qlemql"
COMPANY_USER="torder-frontend-daniel"

if ! command -v gh >/dev/null 2>&1; then
  echo "[push] gh CLI not found. Install: brew install gh" >&2
  exit 1
fi

# 1. Record current active gh account so we can restore.
# Use `gh api user` which returns the *currently active* user's login.
CURRENT=$(gh api user --jq .login 2>/dev/null || echo "")
echo "[push] Current gh account: ${CURRENT:-unknown}"

# 2. Switch to personal account
if [ "$CURRENT" != "$PERSONAL_USER" ]; then
  echo "[push] Switching to $PERSONAL_USER..."
  gh auth switch --user "$PERSONAL_USER"
fi

# 3. Push (default to origin main if no args)
if [ "$#" -eq 0 ]; then
  set -- origin main
fi
echo "[push] git push $*"
git push "$@"
PUSH_STATUS=$?

# 4. Always restore company account if we switched
if [ "$CURRENT" = "$COMPANY_USER" ]; then
  echo "[push] Restoring $COMPANY_USER..."
  gh auth switch --user "$COMPANY_USER"
fi

exit $PUSH_STATUS
