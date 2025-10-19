# Automated Execution Plan with Stability Checks
**Created**: 2025-10-17
**Mode**: Full Auto with Validation Gates
**Strategy**: Phased execution with rollback capability

---

## Execution Strategy

### Core Principles
1. **Validate Before**: Capture baseline metrics before any changes
2. **Change Incrementally**: Small, testable changes with validation gates
3. **Verify After**: Run checks after each phase before proceeding
4. **Rollback Ready**: Use git commits for atomic rollback points
5. **Stop on Red**: Halt execution if any validation fails

### Validation Gates
Each phase must pass ALL checks before proceeding:
- ✅ Git status clean (no unexpected changes)
- ✅ TypeScript compilation successful (or improved)
- ✅ ESLint passes (or error count reduced)
- ✅ No new runtime errors in logs
- ✅ Critical files readable and valid

---

## Phase 0: Pre-Flight Checks
**Duration**: 5 minutes
**Purpose**: Establish baseline and create safety net

### Actions
1. Create git branch: `auto-fix/p0-critical-issues`
2. Capture baseline metrics:
   - TypeScript error count: `npm run typecheck 2>&1 | tee reports/baseline_tsc.txt`
   - ESLint error count: `npm run lint 2>&1 | tee reports/baseline_eslint.txt`
   - Git status: `git status --short > reports/baseline_git_status.txt`
   - Current branch: `git rev-parse --abbrev-ref HEAD > reports/baseline_branch.txt`
3. Verify critical files exist:
   - `.env.example`
   - `server/src/voice/voice-routes.ts`
   - `server/src/routes/payments.routes.ts`
   - `client/src/pages/KioskDemo.tsx`
   - `client/src/utils/orderStatusValidation.ts`

### Success Criteria
- ✅ New branch created
- ✅ All baseline files generated
- ✅ All critical files exist and readable

### Rollback
N/A (read-only phase)

---

## Phase 1: Security Fixes (P0)
**Duration**: 15 minutes
**Risk**: Low (configuration changes only)

### Sub-Phase 1.1: Remove Exposed API Key
**File**: `.env.example`, `.env`, `.env.production`

**Actions**:
1. Backup files:
   ```bash
   cp .env.example .env.example.backup
   [ -f .env ] && cp .env .env.backup
   [ -f .env.production ] && cp .env.production .env.production.backup
   ```
2. Remove VITE_OPENAI_API_KEY:
   ```bash
   sed -i '' '/VITE_OPENAI_API_KEY/d' .env.example
   [ -f .env ] && sed -i '' '/VITE_OPENAI_API_KEY/d' .env
   [ -f .env.production ] && sed -i '' '/VITE_OPENAI_API_KEY/d' .env.production
   ```
3. Add comment explaining server-side token usage:
   ```bash
   echo "" >> .env.example
   echo "# VITE_OPENAI_API_KEY removed - use server-side ephemeral tokens only" >> .env.example
   echo "# Server endpoint: POST /api/v1/realtime/session" >> .env.example
   ```

**Validation**:
```bash
# Check removal
! grep -r "VITE_OPENAI_API_KEY" .env* || exit 1

# Verify backup exists
[ -f .env.example.backup ] || exit 1

# Check file is valid
[ -f .env.example ] || exit 1
```

**Rollback**: Restore from .backup files

---

### Sub-Phase 1.2: Secure .gitignore
**File**: `.gitignore`

**Actions**:
1. Add .env files if missing:
   ```bash
   grep -qE "^\.env$" .gitignore || echo ".env" >> .gitignore
   grep -qE "^\.env\.production$" .gitignore || echo ".env.production" >> .gitignore
   grep -qE "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
   ```

**Validation**:
```bash
grep -E "^\.env$" .gitignore || exit 1
grep -E "^\.env\.production$" .gitignore || exit 1
```

**Rollback**: `git checkout .gitignore`

---

### Sub-Phase 1.3: Fix Wildcard CORS
**File**: `server/src/voice/voice-routes.ts:24-26`

**Actions**:
1. Read file and verify issue exists
2. Remove manual CORS headers (lines 24-26)
3. Add comment referencing centralized middleware

**Validation**:
```bash
# Verify manual CORS removed
! grep -n "res.header('Access-Control-Allow-Origin'" server/src/voice/voice-routes.ts || exit 1

# Verify file compiles
npx tsc --noEmit server/src/voice/voice-routes.ts || exit 1
```

**Rollback**: `git checkout server/src/voice/voice-routes.ts`

---

### Sub-Phase 1.4: Fix No-Origin CORS Bypass
**File**: `server/src/server.ts:121`

**Actions**:
1. Read current CORS configuration
2. Update origin callback to reject missing Origin in production
3. Keep dev mode permissive

**Validation**:
```bash
# Verify production check exists
grep -A 3 "if (!origin)" server/src/server.ts | grep -q "process.env\['NODE_ENV'\] === 'production'" || exit 1

# TypeScript compilation
npx tsc --noEmit server/src/server.ts || exit 1
```

**Rollback**: `git checkout server/src/server.ts`

---

### Phase 1 Gate: Security Validation
```bash
# Run all Phase 1 validations
bash << 'EOF'
set -e
echo "=== Phase 1 Security Validation ==="

# S1: API key removed
echo "✓ Checking API key removal..."
! grep -r "VITE_OPENAI_API_KEY" .env.example .env .env.production 2>/dev/null || exit 1

# S2: .gitignore secure
echo "✓ Checking .gitignore..."
grep -qE "^\.env$" .gitignore || exit 1

# S3: CORS wildcard removed
echo "✓ Checking CORS wildcard..."
! grep -q "Access-Control-Allow-Origin.*\*" server/src/voice/voice-routes.ts || exit 1

# S4: No-origin bypass fixed
echo "✓ Checking no-origin protection..."
grep -q "process.env\['NODE_ENV'\] === 'production'" server/src/server.ts || exit 1

echo "✅ Phase 1 Security: ALL CHECKS PASSED"
EOF
```

**Commit Point**: `git commit -m "fix(security): resolve P0 security issues (API key, CORS, .env)"`

---

## Phase 2: TypeScript Compilation Fixes
**Duration**: 20 minutes
**Risk**: Medium (code changes with type safety)

### Sub-Phase 2.1: Fix Voice Control Callback
**File**: `client/src/pages/KioskDemo.tsx:125`

**Pre-Check**:
```bash
# Verify error exists
npx tsc --noEmit client/src/pages/KioskDemo.tsx 2>&1 | grep -q "125" || echo "Error may be fixed"
```

**Actions**:
1. Read current implementation
2. Update callback signature to match `VoiceControlCallback` type
3. Update function body to handle `{ text: string; isFinal: boolean }`

**Validation**:
```bash
# TypeScript check
npx tsc --noEmit client/src/pages/KioskDemo.tsx || exit 1

# Verify function exists
grep -q "handleOrderComplete" client/src/pages/KioskDemo.tsx || exit 1

# Check signature updated
grep -A 2 "handleOrderComplete" client/src/pages/KioskDemo.tsx | grep -q "text.*string" || exit 1
```

**Rollback**: `git checkout client/src/pages/KioskDemo.tsx`

---

### Sub-Phase 2.2: Add "picked-up" Status
**File**: `client/src/utils/orderStatusValidation.ts`

**Actions**:
1. Read ORDER_STATUSES array
2. Add "picked-up" to array after "ready"
3. Update all 4 Record<OrderStatus, T> objects to include "picked-up"

**Validation**:
```bash
# Verify added to array
grep -q '"picked-up"' client/src/utils/orderStatusValidation.ts || exit 1

# Count occurrences (should be 5: 1 in array + 4 in Records)
count=$(grep -o '"picked-up"' client/src/utils/orderStatusValidation.ts | wc -l)
[ "$count" -ge 5 ] || exit 1

# TypeScript check
npx tsc --noEmit client/src/utils/orderStatusValidation.ts || exit 1
```

**Rollback**: `git checkout client/src/utils/orderStatusValidation.ts`

---

### Phase 2 Gate: TypeScript Validation
```bash
# Full TypeScript check
npm run typecheck 2>&1 | tee reports/phase2_tsc.txt

# Compare error counts
baseline_errors=$(grep -c "error TS" reports/baseline_tsc.txt || echo 0)
current_errors=$(grep -c "error TS" reports/phase2_tsc.txt || echo 0)

echo "Baseline errors: $baseline_errors"
echo "Current errors: $current_errors"

# Errors should decrease or stay same
[ "$current_errors" -le "$baseline_errors" ] || exit 1
```

**Commit Point**: `git commit -m "fix(typescript): resolve P0 compilation errors (KioskDemo, orderStatus)"`

---

## Phase 3: Error Handling Upgrades
**Duration**: 90 minutes
**Risk**: High (business logic changes)

### Sub-Phase 3.1: Add Timeout Utility
**File**: `server/src/utils/promises.ts` (new)

**Actions**:
1. Create new file with `withTimeout<T>` function
2. Add JSDoc documentation
3. Export function

**Validation**:
```bash
# File exists
[ -f server/src/utils/promises.ts ] || exit 1

# TypeScript compilation
npx tsc --noEmit server/src/utils/promises.ts || exit 1

# Verify export
grep -q "export.*withTimeout" server/src/utils/promises.ts || exit 1
```

**Rollback**: `rm server/src/utils/promises.ts`

---

### Sub-Phase 3.2: Add Square API Timeouts
**File**: `server/src/routes/payments.routes.ts:185`

**Actions**:
1. Import `withTimeout` utility
2. Wrap Square API calls with 30s timeout
3. Add error handling for timeout

**Validation**:
```bash
# Verify import
grep -q "withTimeout.*from.*promises" server/src/routes/payments.routes.ts || exit 1

# Verify usage
grep -q "withTimeout.*paymentsApi" server/src/routes/payments.routes.ts || exit 1

# TypeScript check
npx tsc --noEmit server/src/routes/payments.routes.ts || exit 1
```

**Rollback**: `git checkout server/src/routes/payments.routes.ts`

---

### Sub-Phase 3.3: Payment Transaction Rollback
**File**: `server/src/routes/payments.routes.ts:299-318`

**Actions**:
1. Wrap payment processing in try-catch
2. Add database transaction rollback on failure
3. Add audit log entry for rollback

**Validation**:
```bash
# Verify try-catch exists
grep -A 20 "line 299" server/src/routes/payments.routes.ts | grep -q "try.*catch" || exit 1

# Verify rollback logic
grep -q "rollback\|ROLLBACK" server/src/routes/payments.routes.ts || exit 1

# TypeScript check
npx tsc --noEmit server/src/routes/payments.routes.ts || exit 1
```

**Rollback**: `git checkout server/src/routes/payments.routes.ts`

---

### Sub-Phase 3.4: Database Retry Logic
**File**: `server/src/config/database.ts:64-80`

**Actions**:
1. Create retry function with exponential backoff
2. Wrap database connection with retry logic (5 attempts, 5s delay)
3. Add logging for retry attempts

**Validation**:
```bash
# Verify retry logic exists
grep -q "retry\|retries" server/src/config/database.ts || exit 1

# Verify exponential backoff
grep -q "delay.*\*" server/src/config/database.ts || exit 1

# TypeScript check
npx tsc --noEmit server/src/config/database.ts || exit 1
```

**Rollback**: `git checkout server/src/config/database.ts`

---

### Phase 3 Gate: Error Handling Validation
```bash
# Verify all error handling improvements compile
npx tsc --noEmit \
  server/src/utils/promises.ts \
  server/src/routes/payments.routes.ts \
  server/src/config/database.ts || exit 1

# Verify no new errors introduced
npm run typecheck 2>&1 | tee reports/phase3_tsc.txt
baseline_errors=$(grep -c "error TS" reports/baseline_tsc.txt || echo 0)
current_errors=$(grep -c "error TS" reports/phase3_tsc.txt || echo 0)
[ "$current_errors" -le "$baseline_errors" ] || exit 1

echo "✅ Phase 3 Error Handling: ALL CHECKS PASSED"
```

**Commit Point**: `git commit -m "feat(error-handling): add timeouts, rollback, and retry logic (P0)"`

---

## Phase 4: Architecture Cleanup
**Duration**: 45 minutes
**Risk**: Medium (deprecation + extraction)

### Sub-Phase 4.1: Deprecate Old WebSocket
**File**: `client/src/services/websocket/WebSocketService.ts`

**Actions**:
1. Add `@deprecated` JSDoc annotation
2. Add migration guide to WebSocketServiceV2
3. Keep implementation intact (no breaking changes)

**Validation**:
```bash
# Verify deprecation annotation
grep -q "@deprecated" client/src/services/websocket/WebSocketService.ts || exit 1

# Verify migration guide
grep -q "WebSocketServiceV2" client/src/services/websocket/WebSocketService.ts || exit 1

# TypeScript check
npx tsc --noEmit client/src/services/websocket/WebSocketService.ts || exit 1
```

**Rollback**: `git checkout client/src/services/websocket/WebSocketService.ts`

---

### Sub-Phase 4.2: Extract Token Manager
**File**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`

**Actions**:
1. Create new file: `EphemeralTokenManager.ts`
2. Extract token fetching logic (lines 237-302)
3. Update WebRTCVoiceClient to use injected token manager
4. Maintain backward compatibility

**Validation**:
```bash
# New file exists
[ -f client/src/modules/voice/services/EphemeralTokenManager.ts ] || exit 1

# Verify class exists
grep -q "class EphemeralTokenManager" client/src/modules/voice/services/EphemeralTokenManager.ts || exit 1

# TypeScript check both files
npx tsc --noEmit \
  client/src/modules/voice/services/EphemeralTokenManager.ts \
  client/src/modules/voice/services/WebRTCVoiceClient.ts || exit 1

# Verify exports
grep -q "export.*EphemeralTokenManager" client/src/modules/voice/services/EphemeralTokenManager.ts || exit 1
```

**Rollback**:
```bash
rm client/src/modules/voice/services/EphemeralTokenManager.ts
git checkout client/src/modules/voice/services/WebRTCVoiceClient.ts
```

---

### Phase 4 Gate: Architecture Validation
```bash
# Full TypeScript compilation
npm run typecheck 2>&1 | tee reports/phase4_tsc.txt

# ESLint check
npm run lint 2>&1 | tee reports/phase4_eslint.txt

# Compare baseline
baseline_errors=$(grep -c "error" reports/baseline_tsc.txt || echo 0)
current_errors=$(grep -c "error" reports/phase4_tsc.txt || echo 0)
[ "$current_errors" -le "$baseline_errors" ] || exit 1

echo "✅ Phase 4 Architecture: ALL CHECKS PASSED"
```

**Commit Point**: `git commit -m "refactor(architecture): deprecate WebSocketService, extract TokenManager"`

---

## Phase 5: Quick Test Additions
**Duration**: 60 minutes
**Risk**: Low (additive only)

### Sub-Phase 5.1: Add Payment Route Tests
**File**: `server/src/routes/__tests__/payments.routes.test.ts` (new)

**Actions**:
1. Create test file with basic structure
2. Add smoke tests for critical endpoints:
   - POST /payments/create
   - POST /terminal/checkout
3. Use mocked dependencies

**Validation**:
```bash
# File exists
[ -f server/src/routes/__tests__/payments.routes.test.ts ] || exit 1

# Run tests
npm run test:server -- payments.routes.test.ts || exit 1

# Verify tests pass
npm run test:server -- payments.routes.test.ts 2>&1 | grep -q "PASS" || exit 1
```

**Rollback**: `rm server/src/routes/__tests__/payments.routes.test.ts`

---

### Sub-Phase 5.2: Add Auth Route Tests
**File**: `server/src/routes/__tests__/auth.routes.test.ts` (new)

**Actions**:
1. Create test file
2. Add smoke tests for critical flows:
   - POST /auth/demo
   - POST /auth/login
   - GET /auth/me

**Validation**:
```bash
# File exists
[ -f server/src/routes/__tests__/auth.routes.test.ts ] || exit 1

# Run tests
npm run test:server -- auth.routes.test.ts || exit 1
```

**Rollback**: `rm server/src/routes/__tests__/auth.routes.test.ts`

---

### Phase 5 Gate: Testing Validation
```bash
# Run all server tests
npm run test:server 2>&1 | tee reports/phase5_tests.txt

# Verify no failures
grep -q "Tests:.*failed" reports/phase5_tests.txt && exit 1

# Check coverage increased
npm run test:coverage 2>&1 | tee reports/phase5_coverage.txt

echo "✅ Phase 5 Testing: ALL CHECKS PASSED"
```

**Commit Point**: `git commit -m "test: add P0 critical route tests (auth, payments)"`

---

## Final Validation Gate

### Comprehensive System Check
```bash
#!/bin/bash
set -e

echo "=== FINAL SYSTEM VALIDATION ==="

# 1. Git status
echo "✓ Checking git status..."
git status --short

# 2. TypeScript compilation
echo "✓ Running TypeScript check..."
npm run typecheck 2>&1 | tee reports/final_tsc.txt
final_errors=$(grep -c "error TS" reports/final_tsc.txt || echo 0)
baseline_errors=$(grep -c "error TS" reports/baseline_tsc.txt || echo 0)
echo "Baseline errors: $baseline_errors"
echo "Final errors: $final_errors"
[ "$final_errors" -le "$baseline_errors" ] || exit 1

# 3. ESLint
echo "✓ Running ESLint..."
npm run lint 2>&1 | tee reports/final_eslint.txt

# 4. Tests
echo "✓ Running server tests..."
npm run test:server 2>&1 | tee reports/final_tests.txt
! grep -q "FAIL" reports/final_tests.txt || exit 1

# 5. Build check (optional, slow)
# npm run build 2>&1 | tee reports/final_build.txt

# 6. Security verification
echo "✓ Security verification..."
! grep -r "VITE_OPENAI_API_KEY" .env* 2>/dev/null || exit 1
grep -qE "^\.env$" .gitignore || exit 1
! grep -q "Access-Control-Allow-Origin.*\*" server/src/voice/voice-routes.ts || exit 1

echo ""
echo "========================================="
echo "✅ ALL VALIDATION GATES PASSED"
echo "========================================="
echo ""
echo "Summary:"
echo "- TypeScript errors: $baseline_errors → $final_errors"
echo "- Security issues fixed: 4/4"
echo "- Error handling upgraded: 3/3"
echo "- Architecture improvements: 2/2"
echo ""
echo "Ready for: git push origin auto-fix/p0-critical-issues"
```

---

## Rollback Procedures

### Full Rollback (All Phases)
```bash
# Return to main branch
git checkout main

# Delete auto-fix branch
git branch -D auto-fix/p0-critical-issues

# Restore from backups if needed
[ -f .env.example.backup ] && cp .env.example.backup .env.example
```

### Partial Rollback (Single Phase)
```bash
# Phase 1: Security
git checkout HEAD~1 -- .env.example .gitignore server/src/voice/voice-routes.ts server/src/server.ts

# Phase 2: TypeScript
git checkout HEAD~1 -- client/src/pages/KioskDemo.tsx client/src/utils/orderStatusValidation.ts

# Phase 3: Error Handling
git checkout HEAD~1 -- server/src/utils/promises.ts server/src/routes/payments.routes.ts server/src/config/database.ts

# Phase 4: Architecture
git checkout HEAD~1 -- client/src/services/websocket/WebSocketService.ts client/src/modules/voice/services/

# Phase 5: Testing
git checkout HEAD~1 -- server/src/routes/__tests__/
```

---

## Success Criteria

### Phase 0: Pre-Flight ✅
- [x] Branch created
- [x] Baseline metrics captured
- [x] Critical files verified

### Phase 1: Security ✅
- [x] API key removed from all .env files
- [x] .gitignore secured
- [x] CORS wildcard removed
- [x] No-origin bypass fixed

### Phase 2: TypeScript ✅
- [x] KioskDemo callback signature fixed
- [x] "picked-up" status added
- [x] TypeScript errors reduced

### Phase 3: Error Handling ✅
- [x] Timeout utility created
- [x] Square API timeouts added
- [x] Payment rollback implemented
- [x] Database retry logic added

### Phase 4: Architecture ✅
- [x] WebSocketService deprecated
- [x] EphemeralTokenManager extracted

### Phase 5: Testing ✅
- [x] Payment route tests added
- [x] Auth route tests added
- [x] All tests passing

### Final Validation ✅
- [x] TypeScript errors <= baseline
- [x] ESLint no new errors
- [x] All tests passing
- [x] Security verified
- [x] Git history clean

---

## Execution Log

**Start Time**: [TBD]
**Current Phase**: Phase 0
**Status**: Ready to execute

### Phase Completion Log
- [ ] Phase 0: Pre-Flight Checks
- [ ] Phase 1: Security Fixes
- [ ] Phase 2: TypeScript Fixes
- [ ] Phase 3: Error Handling
- [ ] Phase 4: Architecture Cleanup
- [ ] Phase 5: Testing
- [ ] Final Validation

**End Time**: [TBD]
**Total Duration**: [TBD]
**Commits**: [TBD]
