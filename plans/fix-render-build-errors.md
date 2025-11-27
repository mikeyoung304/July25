# fix: Render Build Errors (async-mutex + native fetch)

**Type:** Bug Fix
**Priority:** Critical - Production Blocked
**Date:** 2025-11-25
**Verified:** Node 20.x (Render uses 20.19.6, root package.json specifies 20.x)

---

## Problem

Render deployment fails with two TypeScript errors:

```
src/ai/functions/realtime-menu-tools.ts(5,23): error TS2307: Cannot find module 'async-mutex'
src/routes/realtime.routes.ts(434,9): error TS2322: Type 'AbortSignal' is not assignable...
```

**Root Cause:** Dependencies in root package.json (workspace hoisting) but not in server/package.json. Render builds server in isolation.

---

## Solution

### 1. Add async-mutex to server dependencies

**Why keep mutex:** Protects real race condition - OpenAI Realtime API makes parallel function calls (e.g., "Add burger and fries" → concurrent `add_to_order` calls with same sessionId). Without mutex, concurrent cart modifications cause lost updates.

```bash
cd server && npm install async-mutex@^0.5.0
```

### 2. Remove node-fetch, use native fetch

Node.js 20.x has native fetch. Remove import and update error handling with best-practice pattern.

**server/src/routes/realtime.routes.ts**

```typescript
// Line 4: DELETE this import
- import fetch, { AbortError } from 'node-fetch';

// Lines 440-450: UPDATE error handling (best practice for native fetch)
- if (fetchError instanceof AbortError || (fetchError as Error).name === 'AbortError') {
+ if (fetchError instanceof Error && fetchError.name === 'AbortError') {
```

**Note:** Native fetch throws `DOMException` with `name === 'AbortError'`. The `instanceof Error` check is defensive - DOMException extends Error in Node.js.

### 3. Cleanup root package.json

```bash
npm uninstall async-mutex node-fetch
```

---

## Verification

Only one import of node-fetch exists in server (verified via grep):
- `server/src/routes/realtime.routes.ts:4`

---

## Files Changed

| File | Change |
|------|--------|
| `server/package.json` | Add async-mutex@^0.5.0 |
| `server/src/routes/realtime.routes.ts` | Remove node-fetch import, update error handling |
| `package.json` (root) | Remove async-mutex, node-fetch |

---

## Acceptance Criteria

- [ ] `npm run build:render` succeeds
- [ ] Server starts without module errors
- [ ] Voice ordering works (realtime API handshake)
- [ ] Timeout returns 504 with code `OPENAI_TIMEOUT`

---

## Test Commands

```bash
# Isolated build (simulates Render)
cd server && rm -rf node_modules dist && npm install && npm run build

# Full typecheck
npm run typecheck

# Run tests
npm test
```

---

## Why This Happened

npm workspace hoisting made root dependencies available locally. Render builds server in isolation, so dependencies must be explicit in server/package.json.

**Prevention:** Dependencies go where they're imported.

---

## References

- `server/src/routes/realtime.routes.ts:4,434-450` - fetch import and error handling
- `server/src/ai/functions/realtime-menu-tools.ts:5,130-142` - mutex usage
- `.claude/lessons/CL-BUILD-001-vercel-production-flag.md` - similar dependency issue
