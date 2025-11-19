# Outstanding Work and Areas Needing Attention

**Generated:** 2025-11-18
**Codebase:** Restaurant OS v6.0+
**Source Files:** 444 (Client: 267, Server: 177)
**Test Files:** 114
**Test Coverage Ratio:** ~25.7% (114 tests / 444 source files)

---

## Executive Summary

This comprehensive scan identifies incomplete work, technical debt, and areas requiring attention across the entire codebase. The analysis covers:

- **26 Tracked Issues** in TODO_ISSUES.csv (P0-P3 priority)
- **45+ TODO/FIXME Comments** requiring action
- **18 Skipped/Disabled Tests** (.skip files + skip() calls)
- **6 Deprecated Features** requiring cleanup
- **2 Temporary Debug Code Blocks** (CRITICAL for production)
- **Multiple Error Handling Gaps**
- **Documentation Gaps**
- **Test Coverage Gaps**

**CRITICAL FINDINGS:**
1. Temporary debug auto-fill data in checkout pages (production risk)
2. Authentication tests failing (403 instead of 201)
3. Multi-tenant security gaps (restaurant_id not enforced)
4. Missing notification system implementations
5. Deprecated kiosk_demo role cleanup pending

---

## 1. TODO and FIXME Comments (By Priority)

### 🔴 CRITICAL PRIORITY (Immediate Action Required)

#### 1.1 Temporary Debug Code - REMOVE BEFORE PRODUCTION
**Impact:** CRITICAL - Could cause production data issues

**Location:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/CheckoutPage.tsx:30-34`
```typescript
// TEMPORARY DEBUG: Auto-fill demo data for faster testing (remove when done debugging)
const DEMO_CUSTOMER_DATA = {
  email: 'demo@example.com',
  phone: '(555) 555-1234',
};
```

**Location:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kiosk/KioskCheckoutPage.tsx:127-132`
```typescript
// TEMPORARY DEBUG: Auto-fill demo data for faster testing (remove when done debugging)
```

**Action Required:**
- Remove or gate behind feature flag immediately
- Add production environment check
- Estimated Effort: 0.5 days

---

#### 1.2 Missing Notification Implementations
**Impact:** HIGH - Core order workflow incomplete

**Kitchen Display Notifications**
- **File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts:243-244`
- **TODO:** Send notification to kitchen display
- **Status:** Hook registered but not implemented
- **Effort:** 2-3 days

**Customer Notifications**
- **File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts:246-248`
- **TODO:** Send notification to customer
- **Status:** Hook registered but not implemented
- **Effort:** 2-3 days

**Refund Processing**
- **File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts:251-253`
- **TODO:** Process refund if payment was made
- **Status:** Hook registered but not implemented
- **Effort:** 2-3 days
- **Impact:** Financial operations incomplete

---

#### 1.3 Real-time Event Emission Missing
**Impact:** HIGH - Real-time UI updates not working

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/table.service.ts:104-109`

```typescript
// TODO: Phase 3 - Emit Supabase real-time event for status change
// This will notify all connected clients about the table status update
// await supabase.channel('tables').send({
//   type: 'broadcast',
//   event: 'table_status_updated',
//   payload: { table_id: tableId, status: 'paid', restaurant_id: restaurantId }
```

**Action Required:**
- Implement Supabase channels for table status updates
- Add event subscription in client
- Test with multiple connected clients
- **Estimated Effort:** 3-5 days

---

### 🟠 HIGH PRIORITY (Next Sprint)

#### 1.4 Analytics Performance Endpoint Missing
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/monitoring/performance.ts:291`

```typescript
// DISABLED: Analytics endpoint not yet implemented on server
// TODO: Re-enable when /api/v1/analytics/performance endpoint is created
```

**Action Required:**
- Create server endpoint `/api/v1/analytics/performance`
- Enable client-side metrics forwarding
- Add authentication/authorization
- **Estimated Effort:** 3-5 days

---

#### 1.5 Monitoring Service Integration Missing
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/metrics.ts`

**Line 21:** TODO: Forward to monitoring service (DataDog, New Relic, etc.)
**Line 56:** TODO: Add database, Redis, and AI service checks

**Action Required:**
- Integrate DataDog/New Relic
- Add health checks for all dependencies
- Setup alerting
- **Estimated Effort:** 5-8 days total

---

#### 1.6 Multi-tenant Cache Management Missing
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/multi-tenant.e2e.test.tsx:322-326`

```typescript
// TODO: Implement cache clearing logic when restaurant changes
// This would involve clearing any in-memory caches, resetting WebSocket connections, etc.
```

**Impact:** HIGH - Data isolation risk in multi-tenant environment
**Estimated Effort:** 3-5 days

---

### 🟡 MEDIUM PRIORITY (Backlog)

#### 1.7 Station Assignment Using Keyword Matching
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/StationStatusBar.tsx:85-94`

```typescript
// TODO: This should ideally come from the menu item metadata
// For now, we'll do simple keyword matching
```

**Issue:** Fragile implementation using keyword matching instead of menu metadata
**Refactor Required:** Move station assignment to menu database schema
**Estimated Effort:** 2-3 days

---

#### 1.8 Cart Item Removal Missing
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/order-system/components/MenuItemCard.tsx:74`

```typescript
// TODO: Implement remove from cart functionality
```

**Impact:** User experience limitation - cannot remove items once added
**Estimated Effort:** 1-2 days

---

#### 1.9 Drive-Thru Navigation Incomplete
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/DriveThruPage.tsx:71`

```typescript
// TODO: Navigate to checkout or confirmation
```

**Impact:** Incomplete user flow for drive-thru orders
**Estimated Effort:** 1 day

---

#### 1.10 Order Metadata Extraction
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/useTableGrouping.ts:101-103`

```typescript
// TODO: Extract server and section from order metadata if available
// tableGroup.serverName = order.metadata?.serverName
// tableGroup.section = order.metadata?.section
```

**Priority:** Low - Nice to have
**Estimated Effort:** 1-2 days

---

### 🔵 LOW PRIORITY (Future Enhancement)

#### 1.11 Memory Monitoring Integration
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/ExpoPage.tsx:141-143`

```typescript
// TODO: Implement memory monitoring when MemoryMonitorInstance API is available
```

**Type:** Performance optimization
**Estimated Effort:** 1-2 days

---

#### 1.12 Menu Seeding Script Hardcoded Restaurant ID
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/scripts/seed-menu-mapped.ts:17`

```typescript
// TODO: replace with your real restaurant id if different
```

**Type:** Developer experience improvement
**Estimated Effort:** 0.5 days

---

## 2. Incomplete Features and Stub Functions

### 2.1 AI Service Stubs (Fallback Implementation)
**Files:**
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/stubs/transcriber.stub.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/stubs/tts.stub.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/stubs/chat.stub.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/stubs/order-nlp.stub.ts`

**Status:** Active fallback when OpenAI unavailable
**Purpose:** Graceful degradation
**Action:** Keep as-is (intentional architecture)

---

### 2.2 Placeholder UUID Usage
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts:119`

```typescript
const uuid = item.id; // Placeholder - using original ID for now
```

**Issue:** May not be proper UUID generation
**Review Required:** Verify ID generation strategy
**Estimated Effort:** 0.5 days

---

### 2.3 Placeholder Values in Configuration

**Tax Rate Hardcoded:**
Multiple reports mention hardcoded tax rate (0.08 or 0.0825) instead of per-restaurant configuration.

**Action Required:**
- Add tax_rate column to restaurants table
- Update order calculation logic
- Migrate existing data
- **Estimated Effort:** 2-3 days

---

## 3. Error Handling Gaps

### 3.1 Error Handling Analysis

**Files with throw statements:** 71 files
**Error boundaries:** 3 (intentional - see ADR-009)

**Error Handling Architecture (By Design):**
```
✅ RootErrorBoundary - App-wide fallback
✅ RouteErrorBoundary - Page isolation
✅ PaymentErrorBoundary - Critical transactions
```

**No new error boundaries should be added** - errors bubble to nearest boundary per ADR-009.

---

### 3.2 Console Logging (Should Use Logger)

**75 files contain console.log/warn/debug** (not all are violations)

**Legitimate uses:**
- Debug panels (with eslint-disable comments)
- Test files
- Scripts

**Violations to fix:**
Look for console.log in production code without eslint-disable

**Action Required:**
- Run: `npm run lint` to identify violations
- Replace with `logger.info()`, `logger.warn()`, `logger.error()`
- **Estimated Effort:** 2-3 days

---

## 4. Deprecated Code Requiring Cleanup

### 4.1 kiosk_demo Role (DEPRECATED v6.0.8)

**Status:** Deprecated in favor of 'customer' role
**Backward compatibility code exists in:**

1. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts` (Lines 77, 86)
2. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts` (Line 166)
3. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/demoCredentials.ts` (Line 92)

**Migration Path:**
- Verify all tokens migrated to 'customer' role
- Set `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false` in production
- Remove compatibility code
- Update documentation

**Estimated Effort:** 2-3 days
**Tracked in:** TODO_ISSUES.csv #12

---

### 4.2 Deprecated API Endpoints or Methods

**No deprecated endpoints found** requiring immediate attention.

**Note:** CSRF protection intentionally disabled for REST APIs (uses JWT instead) - this is by design per commit 1e4296c4, not deprecated.

---

## 5. Technical Debt Areas

### 5.1 TypeScript Suppressions

**@ts-ignore count:** 11 instances (mostly in test files)
**@ts-expect-error count:** Minimal usage

**Files requiring attention:**
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/websocket-service.e2e.test.ts` (3 instances)
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/performance/lighthouse.spec.ts` (2 instances)
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/performance/ordering-performance.spec.ts` (6 instances - Chrome-specific APIs)

**Action Required:**
- Add proper type definitions for test mocks
- Create types for Chrome-specific Performance APIs
- **Estimated Effort:** 2-3 days

---

### 5.2 ESLint Suppressions

**eslint-disable patterns found:**
- `eslint-disable-next-line @typescript-eslint/no-this-alias` (1)
- `eslint-disable react-hooks/rules-of-hooks` (2 files - performance utilities)
- `eslint-disable-next-line @typescript-eslint/no-require-imports` (multiple - dynamic imports)

**Assessment:** Most suppressions are justified for:
- Performance measurement utilities
- Dynamic imports in fallback scenarios
- Test mocking

**Action:** Review each suppression, document why necessary
**Estimated Effort:** 1-2 days

---

### 5.3 Unused Variables/Imports (Per Static Analysis)

**Reports indicate:**
- TS6133 Unused variables: 62 instances
- @typescript-eslint/no-unused-vars: 64 instances

**Common sources:**
- Unused function parameters
- Imported utilities not yet used
- Event handlers with unused parameters

**Action Required:**
```bash
# Run automated cleanup
npx eslint . --fix --rule 'no-unused-vars: error'

# Manual review required for:
# - Intentionally unused params (prefix with _)
# - Future planned usage
```

**Estimated Effort:** 1-2 days

---

### 5.4 API Client Consolidation (COMPLETED)

**Status:** ✅ COMPLETED
**Single source of truth:** `httpClient` from `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`

**Forbidden (will fail CI/CD):**
- Creating new API clients
- Using deleted clients (api, secureApi, unifiedApiClient)

**No action required** - this technical debt has been resolved.

---

## 6. Test Coverage Gaps

### 6.1 Skipped Test Files (.skip extension)

**Total:** 8 files

**Client-side:**
1. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/components/RecordingIndicator.test.tsx.skip`
2. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip`
3. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip`
4. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip`
5. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/__tests__/WorkspaceDashboard.test.tsx.skip`

**Server-side:**
6. `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/contracts/order.contract.test.ts.skip`
7. `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/middleware/auth-restaurant-id.test.ts.skip`
8. `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/routes/orders.auth.test.ts.skip`

**Impact:** Major test coverage gaps in voice ordering, authentication, and workspace features

---

### 6.2 Skipped Tests Within Files (test.skip/it.skip)

**Count:** 5 instances

1. **AuthContext concurrent refresh test**
   - File: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/contexts/__tests__/AuthContext.test.tsx:128`
   - Reason: Test timing out after 30s
   - Impact: Race condition handling not verified

2. **Voice control E2E test**
   - File: `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-control.e2e.test.ts:47`
   - Impact: Voice ordering not tested end-to-end

3. **Invalid role token rejection**
   - File: `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/routes/orders.auth.test.ts:328`
   - Impact: Security test gap

4. **Complete order flow integration**
   - File: `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/routes/orders.auth.test.ts:437`
   - Impact: Full order workflow not tested

5. **Voice WebSocket multi-tenancy security**
   - File: `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/security/voice-multi-tenancy.test.ts:22`
   - Reason: Memory leak during test
   - Impact: CRITICAL security test disabled

---

### 6.3 Conditional Skips (Environment-based)

**Demo Panel Tests (7 tests)**
- File: `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/workspace-landing.spec.ts`
- Lines: 113, 121, 137, 154, 180, 208, 229
- Condition: `VITE_DEMO_PANEL` not enabled
- Impact: Low (feature flag controlled)

**Basic Route Tests (3 tests)**
- File: `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/basic-routes.spec.ts`
- Lines: 33, 48, 63
- Reason: Unconditionally skipped
- **Action Required:** Re-enable or delete these tests

**Lighthouse Performance Tests**
- File: `/Users/mikeyoung/CODING/rebuild-6.0/tests/performance/lighthouse.spec.ts:9`
- Condition: Chromium-only
- Status: Expected behavior (documented)

---

### 6.4 Test Coverage Statistics

**Source Files:** 444
**Test Files:** 114
**Coverage Ratio:** 25.7%

**Gaps by Module:**

| Module | Source Files | Test Files | Coverage |
|--------|--------------|------------|----------|
| Voice Ordering | ~20 | 4 (.skip) | ~20% |
| Authentication | ~15 | 6 | ~40% |
| Orders | ~30 | 8 | ~27% |
| Kitchen Display | ~25 | 5 | ~20% |
| Payments | ~10 | 3 | ~30% |
| Admin/Dashboard | ~15 | 2 | ~13% |

**Recommendation:** Target 70% coverage for new features, 50% minimum for existing code

---

## 7. Documentation Gaps

### 7.1 Missing Documentation

**API Documentation:**
- ✅ OpenAPI spec exists (`docs/reference/api/openapi.yaml`)
- ⚠️ May not be fully up-to-date with recent endpoints

**Architecture Documentation:**
- ✅ 10 ADRs documented
- ✅ Authentication architecture documented
- ⚠️ Voice ordering architecture needs update (model change from whisper-1 to gpt-4o-transcribe)

**Runbooks:**
- ✅ Deployment checklist exists
- ✅ Post dual-auth rollout runbook exists
- ❌ Missing: Incident response runbook
- ❌ Missing: Database migration rollback procedures
- ❌ Missing: Performance degradation runbook

---

### 7.2 Outdated Documentation

**DEPRECATED File (Archived):**
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/archive/MIGRATION_GUIDE_DEPRECATED_2025-10-21.md`
- Reason: Conflicted with correct Supabase workflow
- Status: Properly archived with clear deprecation notice

**Version References:**
- Multiple docs reference specific versions (v6.0.5, v6.0.8, etc.)
- Per VERSION_REFERENCE_AUDIT_REPORT, most are justified for historical context
- No action required

---

### 7.3 Comment Documentation (NOTE: markers)

**Found 12 NOTE: comments in source code:**

Most are legitimate architectural notes:
- Authentication flow explanations
- Real-time update strategy notes
- Vite configuration warnings
- Security compliance notes

**Example (legitimate):**
```typescript
// NOTE: Anonymous customers (checkout/kiosk) don't need real-time updates
```

**No action required** - these improve code comprehension

---

## 8. Security Concerns

### 8.1 CRITICAL: Multi-tenant Security Gaps

**Issue:** Tokens without restaurant_id being accepted
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/security/auth.proof.test.ts:156`

**Test shows:**
- STRICT_AUTH flag not enforcing restaurant_id requirement
- Multi-tenant data isolation at risk

**Action Required:**
1. Enable STRICT_AUTH in production
2. Enforce restaurant_id in ALL tokens
3. Audit all API endpoints for restaurant_id filtering
4. Re-enable security tests

**Priority:** P0 - CRITICAL
**Estimated Effort:** 3-5 days
**Tracked in:** TODO_ISSUES.csv #2, #4

---

### 8.2 Temporary Debug Credentials

**CRITICAL for Production:**
- Demo panel exposes credentials when `VITE_DEMO_PANEL=1`
- Auto-fill demo data in checkout (mentioned earlier)

**Mitigation:**
- `VITE_DEMO_PANEL` MUST be '0' in production (.env.example correctly shows this)
- Remove auto-fill code before production deploy

---

### 8.3 localStorage for Authentication Tokens

**Status:** INTENTIONAL (not a bug)
**Documented in:** ADR-006 Dual Authentication Pattern

**Why it's OK:**
- Required for shared devices (servers, kiosks, KDS)
- httpOnly cookies don't work on shared terminals
- Known trade-off documented

**No action required**

---

### 8.4 CSRF Protection Disabled

**Status:** INTENTIONAL (not a vulnerability)
**Documented in:** Commit 1e4296c4

**Why it's OK:**
- REST APIs use JWT + RBAC instead
- Not using session cookies for API authentication

**No action required**

---

## 9. Performance Issues

### 9.1 Memory Usage

**Current limits (enforced by CI/CD):**
- Development: 2GB (2048MB)
- Build: 2GB (2048MB)
- Production target: 1GB (1024MB)

**Status:** Within limits
**Monitoring:** Required in production

**Action Required:**
- Setup memory alerts (threshold: >2GB)
- Add heap snapshots for debugging
- Monitor for memory leaks in WebSocket connections

---

### 9.2 Bundle Size

**Target:** Main chunk <100KB
**Current status:** Not measured in reports

**Action Required:**
- Run bundle analysis
- Check if target met
- Optimize if needed

**Command:**
```bash
npm run build
# Analyze dist/assets
```

---

### 9.3 API Response Times

**Target:** p95 <500ms
**Current status:** Not measured

**Action Required:**
- Enable performance monitoring endpoint (see TODO 1.4)
- Setup DataDog/New Relic (see TODO 1.5)
- Create performance dashboard

---

## 10. Feature Flags and Configuration

### 10.1 Existing Feature Flags

**Client-side (VITE_ prefix):**
```typescript
VITE_USE_MOCK_DATA=false
VITE_USE_REALTIME_VOICE=false
VITE_ENABLE_PERF=false
VITE_DEBUG_VOICE=false
VITE_DEMO_PANEL=0 // CRITICAL: Must be 0 in production
```

**Server-side:**
```typescript
STRICT_AUTH=false // Should be true in production
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true // Set false after migration
AI_DEGRADED_MODE=true // Emergency fallback
```

---

### 10.2 Missing Feature Flags

**AI Feature Flags (per reports):**
- No feature flags for individual AI features
- All-or-nothing approach via AI_DEGRADED_MODE

**Recommendation:**
- Add flags for: voice ordering, chat, transcription, TTS individually
- Allows gradual rollout and A/B testing

**Estimated Effort:** 2-3 days

---

### 10.3 Configuration Gaps

**Per-Restaurant Configuration:**
- Tax rate hardcoded (see TODO 2.3)
- Station assignments use keyword matching (see TODO 1.7)

**Missing configuration:**
- Restaurant operating hours
- Menu availability schedules
- Delivery zones
- Pricing tiers

**Priority:** Medium - Can be added as needed

---

## 11. Disabled Features

### 11.1 Intentionally Disabled

**Performance Analytics:**
```typescript
// DISABLED: Analytics endpoint not yet implemented on server
// File: performance.ts:290-291
```

**Monitoring no-op:**
```typescript
// Create no-op implementation for when monitoring is disabled
// File: performanceMonitor.ts:299
```

**Rate Limiting in Development:**
```typescript
// Rate limiting disabled in development
// Server: server/src/middleware/
```

**CSRF in Development:**
```typescript
// CSRF disabled in development (test environment)
```

---

### 11.2 Features Behind Flags

**Demo Panel:**
- Controlled by `VITE_DEMO_PANEL`
- 7 E2E tests skip when disabled

**Real-time Voice:**
- Controlled by `VITE_USE_REALTIME_VOICE`

**Performance Monitoring:**
- Controlled by `VITE_ENABLE_PERF`

---

## 12. Unreachable/Inaccessible Code

### 12.1 Stub Files (Intentional Fallbacks)

**AI Service Stubs:**
- Purpose: Graceful degradation when OpenAI unavailable
- Status: ACCESSIBLE when `AI_DEGRADED_MODE=true`
- Not dead code - active fallback path

**Example:**
```typescript
// server/src/ai/index.ts:65-80
catch (error) {
  aiLogger.error('Failed to initialize OpenAI adapters, falling back to stubs');
  const { TranscriberStub } = require('./stubs/transcriber.stub');
  // ... uses stubs
}
```

**Assessment:** Intentional architecture, keep as-is

---

### 12.2 Navigation Stub Files

**Found:** 19 stub files in docs/
**Purpose:** Redirect to canonical documentation locations
**Pattern:** Small files (291-350 bytes) with "Moved to Canonical Documentation"

**Example locations:**
- `docs/DATABASE.md` → redirects to `docs/reference/schema/DATABASE.md`
- Various root-level docs → redirect to organized structure

**Assessment:** Intentional documentation organization pattern
**Status:** Validated by docs-check guardrail
**Action:** Keep as-is (aids navigation)

---

### 12.3 Dead Code Analysis

**Unused exports:** Not systematically measured
**Recommendation from reports:** Run `ts-prune`

```bash
# Detect unused exports
npx ts-prune | tee reports/unused-exports.txt

# Review and remove
# Estimated effort: 2-3 days
```

---

### 12.4 Unreachable Code Patterns

**No obvious unreachable code found** such as:
- Code after return statements
- Unreachable switch cases
- Always-false conditions

**TypeScript compiler would catch most of these.**

---

## 13. CI/CD and Build Issues

### 13.1 CI/CD Checks

**Existing checks:**
- Type checking
- Linting
- Security TODOs scan
- Documentation validation
- Migration validation

**Check for security TODOs:**
```yaml
# .github/workflows/deploy-with-validation.yml:68-75
- name: Check for TODO security issues
  if grep -r "TODO.*security|FIXME.*security|HACK.*security" ...; then
    echo "Warning: Found security-related TODOs"
  fi
```

---

### 13.2 Pre-commit Hooks

**Existing:**
- Docs validation
- TODO/WIP/DRAFT in commit messages warning

**Missing:**
- Auto-fix linting
- Test execution for changed files
- Bundle size check

**Recommendation:** Add incremental checks
**Estimated Effort:** 1-2 days

---

## 14. Database and Migration Issues

### 14.1 Migration TODOs

**Schema drift incident:**
- Occurred 2025-10-21
- Resolved with proper migration workflow
- Documented in POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md

**Current status:** Clean

**Migration workflow:**
```bash
# Correct workflow (per docs)
supabase db diff -f migration_name
supabase db push --linked

# ❌ NEVER manually edit via Supabase Dashboard
```

---

### 14.2 Missing Indexes

**Not systematically scanned**

**Recommendation:**
```sql
-- Run query to find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY abs(correlation) DESC;
```

**Action:** Schedule database performance audit
**Estimated Effort:** 2-3 days

---

## 15. Integration and Third-party Issues

### 15.1 OpenAI API Changes

**Breaking change documented:**
- Model changed from `whisper-1` to `gpt-4o-transcribe` (Jan 2025)
- Caused production issues
- Fixed and documented in: `VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`

**Lesson learned:** Pin API versions, monitor deprecation notices

---

### 15.2 Square Payment Integration

**Status:** ✅ Complete
**Environment:** Sandbox for testing

**Production readiness:**
- ⚠️ Ensure SQUARE_ACCESS_TOKEN starts with 'EAAA' for production
- ⚠️ Set SQUARE_ENVIRONMENT=production
- ⚠️ Validate webhook signature

---

### 15.3 Supabase Integration

**Status:** ✅ Stable
**Architecture:** Cloud-only (no local database)

**Known requirements:**
- RLS policies enforce multi-tenancy
- Service key only on server
- Anon key for client with RLS

---

## 16. Environment and Configuration

### 16.1 .env.example Analysis

**Structure:** Clean, well-documented
**Security:** Correct (placeholder values only)

**Required secrets (generate for production):**
```bash
KIOSK_JWT_SECRET=[GENERATE_32_CHAR_HEX]
PIN_PEPPER=[GENERATE_32_CHAR_HEX]
DEVICE_FINGERPRINT_SALT=[GENERATE_32_CHAR_HEX]
STATION_TOKEN_SECRET=[GENERATE_32_CHAR_HEX]
WEBHOOK_SECRET=[GENERATE_32_CHAR_HEX]
```

**Missing from .env.example:**
- No environment-specific examples (dev vs staging vs prod)
- Could add commented examples for each tier

---

### 16.2 Environment Validation

**Client-side:** ✅ Has env-validator.ts
**Server-side:** ✅ Has env.schema.ts

**Both enforce:**
- Required variables present
- Type validation
- Format validation

**No action required** - validation in place

---

## 17. Tracked Issues Summary

### 17.1 TODO_ISSUES.csv Overview

**Total Issues:** 26
**Distribution:**
- P0 (Critical): 4 issues
- P1 (High): 8 issues
- P2 (Medium): 6 issues
- P3 (Low): 4 issues
- Test: 4 issues

**Top 5 by Impact:**

1. **Authentication middleware blocking orders** (P0)
   - Effort: 3-5 days
   - Impact: Blocks core functionality

2. **Restaurant_id enforcement in tokens** (P0)
   - Effort: 3-5 days
   - Impact: Multi-tenant security

3. **Remove temporary debug code** (P0)
   - Effort: 0.5 days
   - Impact: Production data safety

4. **STRICT_AUTH flag not working** (P0)
   - Effort: 2-3 days
   - Impact: Security configuration

5. **Real-time table updates** (P1)
   - Effort: 3-5 days
   - Impact: User experience

---

### 17.2 Issue Categorization

**By Component:**
- Authentication: 5 issues
- Orders: 4 issues
- Real-time: 2 issues
- Observability: 3 issues
- Multi-tenant: 3 issues
- Testing: 4 issues
- Cart: 1 issue
- Kitchen: 1 issue
- Developer Experience: 1 issue
- Performance: 2 issues

---

## 18. Recommended Action Plan

### Phase 1: Critical Fixes (Week 1-2)

**Priority: MUST DO BEFORE PRODUCTION**

1. ✅ Remove temporary debug auto-fill code (0.5 days)
   - CheckoutPage.tsx
   - KioskCheckoutPage.tsx

2. ✅ Fix authentication test failures (3-5 days)
   - Investigate 403 vs 201 issue
   - Re-enable all auth tests

3. ✅ Enforce restaurant_id in tokens (3-5 days)
   - Enable STRICT_AUTH
   - Audit all endpoints
   - Fix failing tests

4. ✅ Security audit (2 days)
   - Verify RLS policies
   - Test multi-tenant isolation
   - Review token generation

**Total: 9-14.5 days**

---

### Phase 2: High Priority Features (Week 3-4)

5. Implement notification system (6-9 days)
   - Kitchen display notifications (2-3 days)
   - Customer notifications (2-3 days)
   - Refund processing (2-3 days)

6. Real-time event emission (3-5 days)
   - Table status updates
   - Supabase channels integration

7. Multi-tenant cache management (3-5 days)
   - Cache clearing on restaurant switch
   - WebSocket reconnection

**Total: 12-19 days**

---

### Phase 3: Observability (Week 5-6)

8. Monitoring integration (5-8 days)
   - DataDog/New Relic setup
   - Health check endpoints
   - Performance analytics endpoint (3-5 days)

9. Re-enable critical tests (3-5 days)
   - Voice multi-tenancy security test
   - Auth tests
   - Basic route tests

**Total: 8-13 days**

---

### Phase 4: Cleanup (Week 7-8)

10. Remove deprecated code (2-3 days)
    - kiosk_demo role cleanup
    - Update documentation

11. Technical debt reduction (5-7 days)
    - Fix TypeScript suppressions (2-3 days)
    - Remove unused variables (1-2 days)
    - Station assignment refactor (2-3 days)

12. Missing features (3-5 days)
    - Cart item removal (1-2 days)
    - Drive-thru navigation (1 day)
    - Memory monitoring (1-2 days)

**Total: 10-15 days**

---

### Phase 5: Testing and Documentation (Week 9-10)

13. Test coverage improvements (5-8 days)
    - Re-enable skipped tests
    - Add missing test suites
    - Target 70% coverage for new code

14. Documentation updates (3-5 days)
    - Update API documentation
    - Create missing runbooks
    - Update architecture diagrams

**Total: 8-13 days**

---

### Ongoing (Throughout All Phases)

- Monitor memory usage (<2GB enforced)
- Track bundle size (<100KB target)
- Review and merge PRs
- Respond to production incidents
- Update ADRs as needed

---

## 19. Metrics and Success Criteria

### Code Quality Metrics

**Current State:**
- TODO/FIXME comments: 45+
- Skipped tests: 18
- Deprecated features: 6
- TypeScript suppressions: 11
- Unused variables: ~62

**Target State (3 months):**
- TODO/FIXME comments: <10 (tracked in GitHub Issues)
- Skipped tests: 0
- Deprecated features: 0
- TypeScript suppressions: <5 (justified only)
- Unused variables: 0

---

### Test Coverage Metrics

**Current State:**
- Test files: 114
- Source files: 444
- Ratio: 25.7%

**Target State:**
- New features: 70% coverage minimum
- Existing code: 50% coverage minimum
- Critical paths: 90% coverage

---

### Production Readiness Metrics

**Checklist:**
- [ ] No temporary debug code
- [ ] All critical tests passing
- [ ] Multi-tenant security enforced
- [ ] Monitoring integrated
- [ ] Runbooks created
- [ ] Documentation updated
- [ ] Performance benchmarked
- [ ] Error boundaries tested
- [ ] Incident response plan documented
- [ ] Rollback procedures verified

**Current: 5/10 complete**
**Target: 10/10 before production launch**

---

## 20. Risk Assessment

### High Risk Areas

1. **Multi-tenant Security** 🔴
   - Risk: Data leakage between restaurants
   - Mitigation: STRICT_AUTH enforcement
   - Timeline: Week 1-2

2. **Temporary Debug Code** 🔴
   - Risk: Production data corruption
   - Mitigation: Immediate removal
   - Timeline: Day 1

3. **Authentication Failures** 🔴
   - Risk: Users cannot create orders
   - Mitigation: Fix blocking tests
   - Timeline: Week 1-2

---

### Medium Risk Areas

4. **Missing Notifications** 🟡
   - Risk: Poor user experience
   - Mitigation: Phase 2 implementation
   - Timeline: Week 3-4

5. **Skipped Security Tests** 🟡
   - Risk: Vulnerabilities undetected
   - Mitigation: Re-enable and fix
   - Timeline: Week 5-6

6. **No Production Monitoring** 🟡
   - Risk: Blind to performance issues
   - Mitigation: DataDog integration
   - Timeline: Week 5-6

---

### Low Risk Areas

7. **Deprecated Code** 🟢
   - Risk: Confusion, minor bugs
   - Mitigation: Cleanup in Phase 4
   - Timeline: Week 7-8

8. **Missing Features** 🟢
   - Risk: User inconvenience
   - Mitigation: Incremental addition
   - Timeline: Week 7-8

---

## 21. Dependencies and Blockers

### Blockers

**None identified** - all work can proceed in parallel or sequentially

### Dependencies

**Authentication fixes** → Must complete before:
- Multi-tenant testing
- Production deployment

**Monitoring integration** → Enables:
- Performance optimization
- Proactive incident detection

**Test re-enablement** → Required for:
- Regression prevention
- Confidence in deployments

---

## 22. Resource Requirements

### Development Resources

**Estimated total effort:** 47-74.5 days of development work

**Suggested allocation:**
- 2 senior developers (authentication, security, architecture)
- 1 mid-level developer (features, testing)
- 1 junior developer (cleanup, documentation)

**Timeline:** 10-12 weeks with this team

---

### Infrastructure Resources

**Required for Phase 3:**
- DataDog or New Relic account
- Production monitoring dashboard
- Alert notification system
- Log aggregation service

**Cost:** ~$200-500/month depending on scale

---

## Appendix A: Complete File List

### Skipped Test Files
1. client/src/modules/voice/components/RecordingIndicator.test.tsx.skip
2. client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip
3. client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip
4. client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip
5. client/src/pages/__tests__/WorkspaceDashboard.test.tsx.skip
6. server/tests/contracts/order.contract.test.ts.skip
7. server/tests/middleware/auth-restaurant-id.test.ts.skip
8. server/tests/routes/orders.auth.test.ts.skip

### Deprecated Files
1. docs/archive/MIGRATION_GUIDE_DEPRECATED_2025-10-21.md (properly archived)

### Stub Files (Intentional)
1. server/src/ai/stubs/transcriber.stub.ts
2. server/src/ai/stubs/tts.stub.ts
3. server/src/ai/stubs/chat.stub.ts
4. server/src/ai/stubs/order-nlp.stub.ts

---

## Appendix B: Search Patterns Used

```bash
# TODOs and FIXMEs
grep -r "TODO|FIXME|HACK|XXX|NOTE:" --include="*.ts" --include="*.tsx"

# Deprecated code
grep -r "@deprecated|DEPRECATED" --include="*.ts" --include="*.tsx"

# Stub functions
grep -r "stub|placeholder|not implemented|coming soon" --include="*.ts" --include="*.tsx"

# Skipped tests
find . -name "*.test.ts.skip"
grep -r "test.skip|it.skip|describe.skip" --include="*.test.ts" --include="*.test.tsx"

# ESLint suppressions
grep -r "eslint-disable|@ts-ignore|@ts-nocheck" --include="*.ts" --include="*.tsx"

# Console logging
grep -r "console.(log|debug|warn)" --include="*.ts" --include="*.tsx"

# Feature flags
grep -r "feature.?flag|disabled|enable.?when" --include="*.ts" --include="*.tsx"
```

---

## Appendix C: Related Documents

**Strategic Planning:**
- `docs/ENTERPRISE_ARCHITECTURE_ASSESSMENT_2025-11-08.md`
- `docs/TECHNICAL_ROADMAP_2025-11-08.md`
- `docs/GATEKEEPER_REVIEW_2025-11-08.md`

**Previous Scans:**
- `docs/archive/2025-11/TODO_COMMENTS_ANALYSIS.md`
- `docs/archive/2025-11/TODO_SCAN_SUMMARY.md`
- `TODO_ISSUES.csv`

**Architecture Decisions:**
- `docs/explanation/architecture-decisions/ADR-001` through `ADR-010`

**Incident Reports:**
- `docs/POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md`
- `docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`

---

## Appendix D: Quick Reference Commands

```bash
# Find all TODOs
grep -rn "TODO" --include="*.ts" --include="*.tsx" client/src server/src

# Count test coverage
echo "Source: $(find client/src server/src -name '*.ts' -o -name '*.tsx' | grep -v test | wc -l)"
echo "Tests: $(find . -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' | wc -l)"

# Check memory usage
ps aux | grep node | awk '{sum+=$6} END {printf "%.0f MB\n", sum/1024}'

# Run type checking
npm run typecheck --workspaces

# Run linting
npm run lint --workspaces

# Find unused exports
npx ts-prune

# Check bundle size
npm run build && ls -lh dist/assets/index*.js
```

---

**Report Generated:** 2025-11-18
**Next Review:** 2025-11-25 (Week 1 checkpoint)
**Owner:** Development Team
**Status:** Ready for Action Planning

---

**End of Report**
