# Authentication Architecture

## What's true now
- **Single JWT secret** is required; server fails to start if unset (no default/fallback).
- **No client-bundled secrets**; demo access (if enabled) is server-minted via `/api/v1/auth/demo-session` and only in non-prod (`DEMO_LOGIN_ENABLED=true`).
- **WebSocket auth** requires a valid JWT in prod; anonymous access disabled.
- **Client session stability** uses a refresh latch + single timer guard to prevent concurrent refresh attempts.

## Flows
1. **Email/Password** (owners/staff) → Supabase → JWT/refresh → backend validates JWT → role resolved → session stored.
2. **PIN Login** (shared devices) → backend validates per-restaurant PIN → issues JWT scoped to restaurant/role.
3. **Demo Session** (non-prod only) → backend mints short-lived JWT (30m) if `DEMO_LOGIN_ENABLED=true`.

## Refresh Strategy
- `refreshSession()` is memoized; concurrent calls coalesce via a ref latch; single timer managed via ref; timers cleared on unmount.
