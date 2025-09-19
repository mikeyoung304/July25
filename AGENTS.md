# AGENTS.md — Agent & Human Operator Guide

## Mission
Keep `main` green with small, auditable PRs. Prioritize correctness, security, reproducibility.

## Repository Structure
- client/ (React + Vite)
- server/ (Express + TypeScript)
- shared/ (types/utils)
- supabase/ (SQL, RLS, seeds)
- scripts/ (ops/dev)
- tests/ (unit/integration/e2e)

## Models
- Default: **gpt-5-codex** for code; fallback **gpt-5** for planning/summary.

## Commands & Checks (canonical)
- Typecheck: `npm run typecheck --workspaces`
- Lint: `npm run lint --workspaces --silent`
- Tests (quick): `CI=1 RUN_VISUAL=0 RUN_PERF=0 RUN_E2E=0 npm run test:quick --workspaces`
- Builds: `npm run build --workspace client && npm run build --workspace server`
- Run-all script: `bash docs/CHECKS.sh` (app checks commented until re-enabled)

## Quality Gates (PR must show)
- TS errors: 0; Lint: 0 errors; Tests: pass; Client & Server build: pass
- Bundle budget (info): main JS < 100KB

## Security Rails
- No secrets in logs. Staging creds only.
- No DB schema/RLS edits without explicit approval.
- CSRF on state-changing routes; webhook signatures; origin/CSP/helmet; rate limits.

## Feature Flags (default prod=false)
VOICE_ENABLED • TWILIO_ENABLED • PAYMENTS_WEBHOOKS_ENABLED • DEMO_MODE  
Risky surfaces must be fenced **server and client**, with tests for both states.

## Output Contract (every run)
1) PLAN 2) FILES CHANGED 3) DIFF 4) CHECKS (summaries) 5) RISK & ROLLBACK (with `git revert <sha>`) 6) NEXT STEP

## Stop Conditions (escalate)
Security test fails; payment/webhook signature issue; touching migrations/secrets; irreducible flake after one small iteration.
