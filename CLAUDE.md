@AGENTS.md

# Git Push Protocol — **READ EVERY SESSION**

이 PC에는 GitHub 계정이 2개 있고 둘 다 gh CLI에 로그인되어 있음:
- **torder-frontend-daniel** — 회사 계정 (평소 active, 다른 작업에서 사용)
- **qlemql** — 개인 계정 (이 프로젝트 전용)

## 절대 지킬 것

1. **항상 `gh` CLI**로 계정 전환 (gitconfig 직접 수정 금지)
2. push 전: `qlemql`로 스위칭 → push → `torder-frontend-daniel`로 복원
3. 가장 안전한 방법: **`bash scripts/push.sh [args...]` 사용** (자동 처리)
4. 직접 git push 하지 말 것 — 회사 계정으로 잘못 push되면 회사 활동 그래프에 기록됨

## 표준 절차 (자동)

```bash
bash scripts/push.sh origin main
```

이 스크립트가 알아서:
- 현재 active 계정 기록
- `qlemql`로 스위칭
- `git push`
- 원래 계정(회사)으로 복원

## 수동 절차 (스크립트 못 쓸 때만)

```bash
gh auth status              # 현재 active 확인
gh auth switch --user qlemql
git push origin main
gh auth switch --user torder-frontend-daniel
```

## 절대 금지

- ❌ `gh auth status` 없이 바로 `git push`
- ❌ gitconfig user.email / user.name 직접 수정
- ❌ `--force-with-lease` 없는 force push
- ❌ 회사 계정으로 이 프로젝트에 push

