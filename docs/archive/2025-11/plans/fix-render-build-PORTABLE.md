# PORTABLE: Fix Render Build Errors

**Copy this entire file to a new Claude Code chat if needed.**

---

## Problem

Render deployment fails with two TypeScript errors:

```
src/ai/functions/realtime-menu-tools.ts(5,23): error TS2307: Cannot find module 'async-mutex'
src/routes/realtime.routes.ts(434,9): error TS2322: Type 'AbortSignal' is not assignable...
```

**Root Cause:** `async-mutex` and `node-fetch` are in root `package.json` but not `server/package.json`. npm workspace hoisting makes them work locally, but Render builds server in isolation.

---

## Verified Facts

- Node version: Render uses 20.19.6, root package.json specifies `"node": "20.x"`
- Native fetch: Available and stable in Node 18.13+, enabled by default in 20+
- Mutex necessity: KEEP IT - protects real race condition (OpenAI parallel function calls)
- node-fetch usage: Only in `server/src/routes/realtime.routes.ts:4`

---

## Exact Changes Required

### 1. Add async-mutex to server
```bash
cd server && npm install async-mutex@^0.5.0
```

### 2. Remove from root
```bash
npm uninstall async-mutex node-fetch
```

### 3. Edit `server/src/routes/realtime.routes.ts`

**Line 4 - DELETE:**
```typescript
import fetch, { AbortError } from 'node-fetch';
```

**Line 440 - CHANGE FROM:**
```typescript
if (fetchError instanceof AbortError || (fetchError as Error).name === 'AbortError') {
```

**Line 440 - CHANGE TO:**
```typescript
if (fetchError instanceof Error && fetchError.name === 'AbortError') {
```

---

## Verification Commands

```bash
# Isolated build (simulates Render) - MUST PASS
cd server && rm -rf node_modules dist && npm install && npm run build

# Typecheck
npm run typecheck

# Tests
npm run test:server
```

---

## Commit Message

```
fix: resolve Render build errors (async-mutex + native fetch)

- Move async-mutex to server/package.json (was in root, caused TS2307)
- Remove node-fetch, use native fetch (Node 20.x)
- Update AbortError handling for native fetch pattern

Fixes workspace hoisting issue where Render builds server in isolation.
```

---

## Context Files (if you need to read them)

- `server/src/routes/realtime.routes.ts` - lines 4, 434-450
- `server/src/ai/functions/realtime-menu-tools.ts` - lines 5, 130-142
- `server/package.json` - dependencies
- `package.json` (root) - dependencies to remove
- `.claude/lessons/CL-BUILD-001-vercel-production-flag.md` - similar past issue

---

## Why We Keep the Mutex

The mutex in `realtime-menu-tools.ts` protects against a **real race condition**:

1. OpenAI Realtime API supports parallel function calling
2. User says "Add burger and fries" → two concurrent `add_to_order` calls
3. Both calls have same `sessionId`, both read/modify/write the cart
4. Without mutex: lost update (one item overwrites the other)
5. With mutex: operations serialize correctly

This is NOT cargo-cult programming. JavaScript is single-threaded but async operations can interleave at await points.
