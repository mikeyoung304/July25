# RCTX Post-Merge Checklist (PR #22, tag: rctx-enforcement-v1)

## 0) Meta
- PR: #22 (merged)
- Tag: `rctx-enforcement-v1`
- Scope: server auth/rctx enforcement only

## 1) Branch protection
- In GitHub → Settings → Branches → *main*:
  - Require status check **ci:auth-orders**.
  - (Optional) Dismiss stale approvals on new commits.

## 2) CI/Local gates
- Confirm `.github/workflows/ci-auth-orders.yml` exists and is green.
- Confirm `.husky/pre-commit` runs `precommit:auth-orders`.

## 3) RLS spot-check (staging DB)
- Run: `NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/check-rls-status.cjs`
- Expect: RLS **enabled + forced** on `orders`, `order_status_history`, `user_restaurants`.

## 4) Tenancy & membership verifier (staging API)
- Temporarily set API base to staging (env or one-off patch) and run:
  - `node scripts/verify-tenancy-and-cache.cjs`
- Expect:
  - Missing `X-Restaurant-ID` (staff) → **400** `RESTAURANT_CONTEXT_MISSING`
  - No membership (staff) → **403** `RESTAURANT_ACCESS_DENIED`
  - Kiosk token without header → **2xx** (token fallback)
  - Header vs body spoof → header wins

## 5) Frontend header requirement
- Ensure staff flows send `X-Restaurant-ID` on every write:
  - Axios/fetch wrapper adds header when tokenType = 'supabase'.
  - Confirm in network tab for Orders, Payments, Terminal routes.

## 6) Feature-flag rollout plan (AUTH_V2)
- Canary 10% → 50% (24h) → 100% (48h).
- If available, prefer the script:
  - `node scripts/enable-authv2.mjs --percent 10`
  - `node scripts/enable-authv2.mjs --percent 50`
  - `node scripts/enable-authv2.mjs --percent 100`
- Fallback env (if script unavailable):
  - `FEATURE_AUTH_V2=true`, `AUTH_V2_ROLLOUT_PERCENTAGE={10|50|100}`

## 7) Monitoring & alerts
- Create/verify alerts for:
  - `RESTAURANT_CONTEXT_MISSING` (400) > 1% reqs
  - `RESTAURANT_ACCESS_DENIED` (403) > 0.5% reqs
  - Order create failure rate +2% from baseline
- Add dashboards/queries for those codes and overall order throughput.

## 8) WebSocket / real-time smoke (if used)
- Verify authenticated socket can subscribe within a restaurant context.
- Ensure no cross-tenant leakage.

## 9) Clean up legacy
- After 7 days clean:
  - Delete `server/src/middleware/restaurantAccess.ts` (deprecated re-export).
  - Re-run route-guard tests; ensure no imports regress.

## 10) Changelog & comms
- Update CHANGELOG with tag `rctx-enforcement-v1`.
- Notify frontend that staff APIs must send `X-Restaurant-ID`.