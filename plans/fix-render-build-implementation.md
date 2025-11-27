# Implementation Plan: Fix Render Build Errors

**Reference:** `plans/fix-render-build-errors.md`
**Execution Mode:** Phased with parallel subagents where possible

---

## Phase 1: Dependencies (Parallel Operations)

Execute these two operations in parallel - they are independent:

### 1A. Add async-mutex to server

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0/server && npm install async-mutex@^0.5.0
```

**Verify:** Check `server/package.json` contains `"async-mutex": "^0.5.0"` in dependencies.

### 1B. Remove from root (can run in parallel)

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0 && npm uninstall async-mutex node-fetch
```

**Verify:** Check root `package.json` no longer contains `async-mutex` or `node-fetch`.

---

## Phase 2: Code Changes

### 2A. Update realtime.routes.ts

**File:** `server/src/routes/realtime.routes.ts`

**Change 1 - Line 4:** Delete the node-fetch import
```typescript
// DELETE THIS LINE:
import fetch, { AbortError } from 'node-fetch';
```

**Change 2 - Line 440:** Update error handling
```typescript
// CHANGE FROM:
if (fetchError instanceof AbortError || (fetchError as Error).name === 'AbortError') {

// CHANGE TO:
if (fetchError instanceof Error && fetchError.name === 'AbortError') {
```

---

## Phase 3: Verification (Parallel Tests)

Run these verifications in parallel:

### 3A. Isolated Server Build (Critical)

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0/server && rm -rf node_modules dist && npm install && npm run build
```

**Success:** No TypeScript errors, `dist/` directory created.

### 3B. Full Typecheck (Parallel)

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0 && npm run typecheck
```

**Success:** No type errors across all workspaces.

### 3C. Run Tests (Parallel)

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0 && npm run test:server
```

**Success:** All server tests pass.

---

## Phase 4: Commit & Deploy

### 4A. Commit Changes

```bash
git add server/package.json server/package-lock.json package.json package-lock.json server/src/routes/realtime.routes.ts
git commit -m "fix: resolve Render build errors (async-mutex + native fetch)

- Move async-mutex to server/package.json (was in root, caused TS2307)
- Remove node-fetch, use native fetch (Node 20.x)
- Update AbortError handling for native fetch pattern

Fixes workspace hoisting issue where Render builds server in isolation."
```

### 4B. Push to Main

```bash
git push origin main
```

Render will auto-deploy from main branch.

---

## Execution Commands for Claude Code

To execute this plan optimally, use these commands:

### Quick Execute (All Phases)

```
/workflows:work plans/fix-render-build-implementation.md
```

### Manual Phased Execution

**Phase 1 (parallel):**
```
Run in parallel:
1. cd server && npm install async-mutex@^0.5.0
2. npm uninstall async-mutex node-fetch
```

**Phase 2 (sequential):**
```
Edit server/src/routes/realtime.routes.ts:
- Delete line 4 (node-fetch import)
- Update line 440 (error handling)
```

**Phase 3 (parallel):**
```
Run in parallel:
1. cd server && rm -rf node_modules dist && npm install && npm run build
2. npm run typecheck
3. npm run test:server
```

**Phase 4 (sequential):**
```
git add && git commit && git push
```

---

## Rollback (if needed)

```bash
git revert HEAD
git push origin main
```

---

## Success Criteria

- [ ] Render build succeeds (no TS2307, no TS2322)
- [ ] Server starts and /api/v1/health returns 200
- [ ] Voice ordering handshake works (/api/v1/ai/realtime/handshake)
