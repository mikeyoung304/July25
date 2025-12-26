# Enterprise Quality Excellence Initiative

## Overview

Transform the Restaurant OS codebase from 85% enterprise readiness to 100% by addressing all quality gaps systematically. This initiative prioritizes **correctness over velocity** - we accept no technical debt.

**Current State:** v6.0.14 | 1,672 tests passing | 2 vulnerabilities | 8 type errors
**Target State:** 0 type errors | 0 vulnerabilities | 80%+ coverage | Full observability

---

## Progress Log

### 2024-12-26: Phase 1 Progress (Express v5 Types)

**Completed:**
- ✅ Added npm overrides for @types/express: 5.0.6 in root package.json
- ✅ Updated server/package.json to @types/express: ^5.0.6
- ✅ Fixed 12 Express v5 route handler type errors across 6 files:
  - `ai.routes.ts` (10 handlers) - Changed return types to `Promise<void>`
  - `orders.routes.ts` (1 handler) - Voice order handler
  - `realtime.routes.ts` (2 handlers) - Menu check, session handlers
  - `security.routes.ts` (1 handler) - Test endpoint
  - `tables.routes.ts` - Previously fixed
  - `payments.routes.ts` - Previously fixed
  - `requestSanitizer.ts` - Previously fixed
  - `webhookSignature.ts` - Previously fixed
- ✅ Deleted dead file: `server/src/ai/functions/realtime-menu-tools.ts.bak`
- ✅ Commit: `b5c29e50 fix(types): resolve express v5 type compatibility`

**Remaining Type Errors (8 total):**

| Category | File | Error | Priority |
|----------|------|-------|----------|
| Buffer | `server/src/ai/adapters/openai/utils.ts:15` | Buffer → Uint8Array | P1 |
| Buffer | `server/src/middleware/webhookSignature.ts:25` | Buffer → ArrayBufferView | P1 |
| Buffer | `server/src/services/ai.service.ts:101` | Buffer[] → Uint8Array[] | P1 |
| External | `@supabase/supabase-js` | InternalSupabaseKey | P3 (node_modules) |
| External | `framer-motion` | MotionStyle interface conflict | P3 (node_modules) |
| External | `framer-motion` | JSX namespace | P3 (node_modules) |
| External | `goober` | export assignment | P3 (node_modules) |

**Type Error Reduction:** 57 → 8 (86% reduction)

---

## Problem Statement

The codebase has accumulated quality gaps that prevent enterprise-grade certification:

| Category | Issue | Impact |
|----------|-------|--------|
| Type Safety | 57 TS errors from duplicate @types/express | Blocks clean CI gates |
| Security | 2 moderate vulns (esbuild in vite 5.x) | Audit findings |
| Testing | 195 TODO skeleton tests, 16 skipped specs | False coverage metrics |
| Observability | No distributed tracing | Blind to production issues |
| Logging | 30+ console.log in production code | Unstructured, unsearchable |

---

## Technical Approach

### Phase 1: Foundation (Type Safety & Build Health)

**Goal:** Zero type errors, clean dependency tree

#### 1.1 Fix @types/express Duplication ✅ DONE

**Root Cause:**
- Root has @types/express@5.0.6 (via @types/cookie-parser)
- Server pins @types/express@4.17.21
- Rate limiter middleware fails with incompatible Request types

**Solution:**

```json
// package.json (root) - Add overrides
{
  "overrides": {
    "@types/express": "5.0.6",
    "@types/express-serve-static-core": "5.0.6"
  }
}
```

```json
// server/package.json - Update to match
{
  "devDependencies": {
    "@types/express": "^5.0.6"
  }
}
```

**Files to Modify:**
- `/package.json` - Add overrides section
- `/server/package.json` - Update @types/express version
- `/server/src/middleware/rateLimiter.ts` - Fix Request type annotations
- `/server/src/middleware/authRateLimiter.ts` - Fix Request type annotations

**Acceptance Criteria:**
- [x] `npm run typecheck` exits with 0 Express v5 errors (done - 12 errors fixed)
- [x] `npm ls @types/express` shows single version (5.0.6)
- [x] All rate limiter tests pass
- [x] Pre-commit hooks pass without --no-verify

#### 1.2 Fix Buffer Type Incompatibilities ⏳ IN PROGRESS

**Files (3 remaining):**
- `/server/src/ai/adapters/openai/utils.ts:15` - Buffer not assignable to Stream/ArrayBufferView
- `/server/src/middleware/webhookSignature.ts:25` - Buffer not assignable to ArrayBufferView
- `/server/src/services/ai.service.ts:101` - Buffer[] not assignable to Uint8Array[]

**Root Cause:**
Node.js 22+ / TypeScript 5.7+ stricter type checking on Buffer vs Uint8Array.
`Buffer.prototype.slice().buffer` returns `ArrayBufferLike` (includes SharedArrayBuffer),
but typed APIs expect `ArrayBuffer` specifically.

**Solution Pattern:**
```typescript
// Pattern 1: Buffer.concat → Uint8Array
const combined = Buffer.concat(chunks);
// Becomes:
const combined = new Uint8Array(Buffer.concat(chunks));

// Pattern 2: Single Buffer → Uint8Array
const buf = Buffer.from(data);
// Becomes:
const buf = new Uint8Array(Buffer.from(data));

// Pattern 3: For APIs expecting specific buffer types
// Use explicit type assertion when Buffer semantics are actually needed:
timingSafeEqual(buf as unknown as Uint8Array, expected as unknown as Uint8Array);
```

**Note:** External module errors (@supabase, framer-motion, goober) are P3 priority
and will resolve with package updates or skipLibCheck in tsconfig.

#### 1.3 Delete Dead Code ✅ DONE

```bash
rm server/src/ai/functions/realtime-menu-tools.ts.bak  # Completed 2024-12-26
```

---

### Phase 2: Security Hardening

**Goal:** Zero vulnerabilities, defense in depth

#### 2.1 Vite 7.x Upgrade (Breaking Change)

**Risk Assessment:**
- Vulnerability is in dev server only (not production builds)
- Vite 7.x has breaking changes in config API
- Requires ecosystem package updates

**Upgrade Path:**

```json
// client/package.json
{
  "devDependencies": {
    "vite": "^7.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "vitest": "^4.0.0"
  }
}
```

**Verification Steps:**
1. `npm run build:client` succeeds
2. `npm run test:client` passes
3. `npm run dev:client` starts without errors
4. Bundle size within budget (<2MB)

**Rollback Strategy:**
- Revert package.json changes
- Document accepted risk in ADR if upgrade blocked
- Add compensating control (network isolation in dev)

#### 2.2 Add Missing Security Headers

**Note:** Permissions-Policy already exists in `/server/src/middleware/security-headers.ts`

Verify and enhance:
```typescript
// Confirm in security-headers.ts
res.setHeader('Permissions-Policy',
  'geolocation=(), microphone=(self), camera=(), payment=(self)');
```

---

### Phase 3: Logging Excellence

**Goal:** All production logs structured and searchable

#### 3.1 Console → Logger Migration

**Priority Files:**

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `server/src/server.ts` | 152-153 | `console.error` | `logger.error('CORS blocked', { origin, allowed })` |
| `server/src/server.ts` | 291 | `console.error` | `logger.error` |
| `server/src/routes/tables.routes.ts` | 275 | `console.error` | `logger.error` |

**Exception:** `/server/src/config/env.schema.ts` runs before logger initialization - keep console for bootstrap warnings.

**Log Format Standard:**
```typescript
logger.info('Order created', {
  orderId: order.id,
  restaurantId: order.restaurant_id,
  total: order.total_amount,
  items: order.items.length,
  duration_ms: endTime - startTime
});
```

---

### Phase 4: Test Excellence

**Goal:** 80% coverage, zero skipped tests, zero flaky tests

#### 4.1 Eliminate Test Quarantine

**Current Skipped Tests:**

| File | Skip Reason | Resolution |
|------|-------------|------------|
| `tests/e2e/voice-ordering.spec.ts` | Requires OpenAI API | Mock or integration flag |
| `tests/e2e/card-payment.spec.ts` | Requires Stripe sandbox | Add CI secret |
| `tests/e2e/cash-payment.spec.ts` | Requires Stripe sandbox | Add CI secret |
| `tests/e2e/payments/payment.smoke.spec.ts` | Unknown | Investigate and fix |

**Resolution Strategy:**
1. Audit each skipped test for actual reason
2. Either fix the test or remove if testing deprecated feature
3. For external API tests, add mock or `TEST_INTEGRATION=true` flag
4. Update quarantine.list as tests are fixed

#### 4.2 Implement Skeleton Tests

**195 TODO Items in Kitchen Tests:**

```typescript
// Example: ScheduledOrdersSection.test.tsx has 34 TODOs
// Each TODO becomes a real test:

it('should display scheduled orders sorted by time', () => {
  const orders = [
    mockOrder({ scheduled_for: '2025-01-01T12:00:00Z' }),
    mockOrder({ scheduled_for: '2025-01-01T10:00:00Z' }),
  ];
  render(<ScheduledOrdersSection orders={orders} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('10:00');
  expect(items[1]).toHaveTextContent('12:00');
});
```

#### 4.3 Add Coverage Gates to CI

```yaml
# .github/workflows/gates.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Check coverage thresholds
  run: |
    LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)
    if (( $(echo "$LINES < 60" | bc -l) )); then
      echo "Coverage $LINES% below 60% threshold"
      exit 1
    fi
```

**Thresholds:**
| Metric | Minimum | Target |
|--------|---------|--------|
| Lines | 60% | 80% |
| Branches | 50% | 70% |
| Functions | 60% | 80% |

---

### Phase 5: Observability

**Goal:** Full distributed tracing, real-time metrics, automated alerting

#### 5.1 OpenTelemetry Integration

**Create:** `/server/src/instrumentation.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: 'restaurant-os-server',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
    }),
  ],
});

sdk.start();
```

**Update:** `/server/package.json` - Move OTel from devDeps to deps

**Environment Variables:**
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_SERVICE_NAME=restaurant-os
```

#### 5.2 Key Metrics to Track

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| Request latency P95 | Histogram | > 500ms |
| Error rate | Counter | > 1% |
| Order creation rate | Counter | < baseline -50% |
| WebSocket connections | Gauge | > 1000 |
| Memory usage | Gauge | > 80% of limit |

---

## Acceptance Criteria

### Phase 1: Foundation
- [ ] `npm run typecheck` returns 0 errors (currently 8 - down from 57)
- [x] `npm ls @types/express` shows exactly one version (5.0.6)
- [x] No `.bak` files in repository
- [x] All middleware tests pass
- [ ] Buffer type incompatibilities fixed (3 remaining)

### Phase 2: Security
- [ ] `npm audit` returns 0 vulnerabilities
- [ ] Vite 7.x builds successfully
- [ ] All E2E tests pass after upgrade
- [ ] Bundle size < 2MB

### Phase 3: Logging
- [ ] `grep -r "console\." server/src --include="*.ts" | grep -v test | wc -l` = 0 (excluding env bootstrap)
- [ ] All logs include `restaurantId` context
- [ ] Log output is valid JSON in production

### Phase 4: Testing
- [ ] `grep -r "test\.skip\|describe\.skip" | wc -l` = 0
- [ ] `grep -r "TODO" client/src/**/*.test.* | wc -l` < 10
- [ ] Coverage > 60% lines
- [ ] CI gates job enforces coverage threshold

### Phase 5: Observability
- [ ] Traces visible in observability platform
- [ ] Spans include `restaurant_id` attribute
- [ ] Health endpoint returns trace context
- [ ] Alert configured for P95 > 500ms

---

## Success Metrics

| Metric | Before | Current | Target | Measurement |
|--------|--------|---------|--------|-------------|
| TypeScript errors | 57 | 8 | 0 | `npm run typecheck` |
| Vulnerabilities | 2 | 2 | 0 | `npm audit` |
| Console.log in prod | 30+ | TBD | 0 | grep count |
| Test coverage | ~40% | ~40% | 80%+ | vitest coverage |
| Skipped tests | 16 files | TBD | 0 | grep count |
| Quarantine list | ~50 tests | TBD | 0 | file line count |
| P95 latency | Unknown | Unknown | <200ms | OTel metrics |

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vite 7.x breaks build | Medium | High | Branch testing, rollback plan, document in ADR if blocked |
| @types change breaks middleware | Medium | Medium | Comprehensive middleware tests before merge |
| Coverage threshold fails existing PRs | High | Low | Start at 60%, increase quarterly |
| OTel memory overhead | Low | Medium | Sampling config, memory monitoring |

---

## Dependencies

```
Phase 1 (Types) ──► Phase 2 (Security) ──► Phase 3 (Logging)
                                               │
                                               ▼
Phase 4 (Testing) ◄─────────────────────────────
        │
        ▼
Phase 5 (Observability)
```

**Critical Path:** Phases 1-2 must complete before 3-5 can be reliably validated.

---

## Future Considerations

1. **Token Storage Migration:** Move from localStorage JWT to httpOnly cookies (XSS mitigation)
2. **Progressive Deployment:** Implement blue/green or canary releases
3. **Feature Flags:** Runtime feature toggles for safer rollouts
4. **Compliance Automation:** Automated PCI DSS and GDPR checks
5. **Service Mesh:** Circuit breakers and retry policies

---

## References

### Internal
- ADR-001: Snake Case Convention
- ADR-006: Dual Authentication Pattern
- ADR-009: Error Handling Philosophy
- CL-AUTH-001: STRICT_AUTH Drift Incident
- CL-MEM-001: Interval Leak Pattern

### External
- [TypeScript Strict Mode Best Practices](https://whatislove.dev/articles/the-strictest-typescript-config/)
- [Express.js Security 2025](https://corgea.com/Learn/express-js-security-best-practices-2025)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces/)
