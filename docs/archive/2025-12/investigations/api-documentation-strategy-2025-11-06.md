# API Documentation Strategy & Implementation Plan

**Date:** 2025-11-06
**Status:** Architecture Design
**Author:** Claude Code

---

## Executive Summary

**Problem:** 62 API endpoints exist, only ~25 accurately documented (40% accuracy).

**Root Cause:** No automation, documentation-last culture, rapid development without doc gates.

**Impact:** Integration issues, developer confusion, incomplete API contracts.

**Solution:** 3-phase hybrid approach balancing immediate needs with long-term sustainability.

---

## Current State Analysis

### Documentation Accuracy Breakdown

| Category | Total Endpoints | Documented | Accurate | Accuracy |
|----------|----------------|------------|----------|----------|
| Health | 6 | 2 | 2 | 33% |
| Auth | 8 | 5 | 5 | 63% |
| Menu | 6 | 5 | 1 | 17% |
| Orders | 6 | 5 | 5 | 83% |
| Tables | 7 | 4 | 4 | 57% |
| Payments | 4 | 3 | 1 | 25% |
| Terminal | 5 | 2 | 1 | 20% |
| AI | 10 | 3 | 0 | 0% |
| Realtime | 2 | 0 | 0 | 0% |
| Security | 4 | 3 | 0 | 0% |
| Webhooks | 3 | 2 | 0 | 0% |
| Restaurants | 1 | 1 | 1 | 100% |
| **TOTAL** | **62** | **35** | **20** | **32%** |

### Critical Gaps (Production-Breaking)

1. **POST /orders/voice** - Voice ordering (primary feature!)
2. **PUT /tables/batch** - Floor plan batch updates
3. **POST /payments/cash** - Cash payments
4. **POST /ai/transcribe** - Voice transcription
5. **POST /ai/parse-order** - Order parsing
6. **GET /auth/me** - User profile
7. **GET /ready, /live** - Kubernetes probes

---

## Root Cause Analysis

### Architectural Anti-Patterns

1. **No Single Source of Truth**
   ```
   Route Definitions (.ts files)
        ↓
   OpenAPI Spec (openapi.yaml)
        ↓
   API README (README.md)

   All three drift independently ❌
   ```

2. **Manual Sync Process**
   - Developer implements feature
   - Developer (maybe) updates OpenAPI
   - Developer (maybe) updates README
   - No enforcement, high error rate

3. **No CI Validation**
   - Can merge PRs with undocumented endpoints
   - No warning when docs drift
   - No coverage metric tracked

4. **Mixed Concerns**
   - Production endpoints mixed with dev/test endpoints
   - No clear tagging system
   - Unclear what should be documented

---

## Solution Architecture

### Three-Phase Hybrid Approach

```
PHASE 1: Immediate Triage (8 hours)
   ↓ Manual documentation of P0 endpoints
   ↓ Deploy to production

PHASE 2: Semi-Automation (16 hours)
   ↓ Build route scanner
   ↓ Add CI validation
   ↓ Prevent future drift

PHASE 3: Full Automation (40 hours - Future)
   ↓ Code-first OpenAPI generation
   ↓ Decorators on routes
   ↓ Zero manual docs
```

---

## PHASE 1: Immediate Documentation (RECOMMENDED NOW)

### Objective
Document 7 P0 critical endpoints + fix 10 path mismatches

### Deliverables
1. OpenAPI spec updated with P0 endpoints
2. API README table corrected
3. Path mismatches fixed
4. Example requests/responses for critical endpoints

### Endpoints to Document

**P0 - Critical (Must Do):**
1. POST /api/v1/orders/voice - Voice order creation
2. PUT /api/v1/tables/batch - Batch table updates
3. POST /api/v1/payments/cash - Cash payment
4. POST /api/v1/ai/transcribe - Audio transcription
5. POST /api/v1/ai/parse-order - Order parsing
6. GET /api/v1/auth/me - Current user
7. GET /health/ready - Readiness probe
8. GET /health/live - Liveness probe

**Path Fixes (Critical):**
9. Fix /payments/process → /payments/create
10. Fix /security/audit → /security/events
11. Fix /webhooks/square → /webhooks/payments
12. Fix menu paths (/items, /items/:id, /categories)

### Time Estimate
- Research endpoints: 2 hours
- Write OpenAPI schemas: 4 hours
- Update README table: 1 hour
- Validate with Swagger: 1 hour
- **Total: 8 hours**

### Success Criteria
- All 7 P0 endpoints fully documented in OpenAPI
- All path mismatches corrected
- OpenAPI validates without errors
- README table matches OpenAPI spec

---

## PHASE 2: Semi-Automated Documentation (NEXT SPRINT)

### Objective
Prevent future drift with automation and CI checks

### Architecture

```typescript
// Tool 1: Route Scanner
// Scans all *.routes.ts files, extracts endpoints

interface RouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  file: string;
  middleware: string[];
  isDev: boolean; // test- prefix detection
}

function scanRoutes(): RouteDefinition[] {
  // Read all route files
  // Parse with TypeScript AST
  // Extract router.get/post/etc calls
  // Return structured data
}

// Tool 2: OpenAPI Validator
// Compares route scanner output vs OpenAPI spec

function validateOpenAPI(
  routes: RouteDefinition[],
  openapi: OpenAPISpec
): ValidationReport {
  const missing = routes.filter(r => !inOpenAPI(r, openapi));
  const extra = openapi.paths.filter(p => !inRoutes(p, routes));
  const pathMismatches = findPathMismatches(routes, openapi);

  return { missing, extra, pathMismatches, coverage };
}

// Tool 3: CI Check
// Runs in GitHub Actions

jobs:
  api-docs-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Scan routes
        run: npm run docs:scan-routes
      - name: Validate OpenAPI
        run: npm run docs:validate-api
      - name: Fail if coverage < 95%
        run: npm run docs:check-coverage
```

### Deliverables

1. **Route Scanner Script** (`scripts/scan-api-routes.ts`)
   - Scans all route files
   - Generates JSON inventory
   - Excludes dev-only endpoints (test- prefix)

2. **OpenAPI Validator** (`scripts/validate-openapi.ts`)
   - Compares scanner output vs OpenAPI
   - Reports missing/extra/mismatched endpoints
   - Calculates coverage percentage

3. **CI Integration** (`.github/workflows/api-docs-check.yml`)
   - Runs on every PR
   - Blocks merge if coverage < 95%
   - Comments on PR with coverage report

4. **NPM Scripts** (`package.json`)
   ```json
   {
     "scripts": {
       "docs:scan-routes": "tsx scripts/scan-api-routes.ts",
       "docs:validate-api": "tsx scripts/validate-openapi.ts",
       "docs:check-coverage": "tsx scripts/check-api-coverage.ts"
     }
   }
   ```

### Time Estimate
- Route scanner: 4 hours
- OpenAPI validator: 4 hours
- CI integration: 2 hours
- Document P1 endpoints: 4 hours
- Testing and refinement: 2 hours
- **Total: 16 hours**

### Success Criteria
- CI blocks PRs with undocumented endpoints
- Coverage metric tracked (target: 95%+)
- Zero false positives
- Developer-friendly error messages

---

## PHASE 3: Full Automation (FUTURE - LOW PRIORITY)

### Objective
Single source of truth with code-first OpenAPI generation

### Architecture

```typescript
// Decorator-based approach (like NestJS)

@ApiRoute({
  path: '/orders/voice',
  method: 'POST',
  tags: ['Orders', 'Voice'],
  summary: 'Create order via voice',
  description: 'Process voice-based order creation...',
  security: ['BearerAuth'],
  rateLimit: { limit: 10, window: '1m' }
})
@ApiBody({
  schema: VoiceOrderSchema,
  example: { transcription: '...', items: [...] }
})
@ApiResponse(201, {
  schema: OrderSchema,
  description: 'Order created successfully'
})
router.post('/voice',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.ORDERS_CREATE),
  async (req, res) => {
    // Handler
  }
);

// Auto-generate openapi.yaml from decorators
```

### Deliverables
1. Decorator library (or adopt existing like tsoa)
2. OpenAPI generator from decorators
3. Refactor all 62 endpoints with decorators
4. Update CI to regenerate OpenAPI on every build

### Time Estimate
- **40-60 hours** (major refactor)

### Why Not Now?
- Team is 99% production ready
- Phase 2 prevents drift effectively
- Phase 3 is optimization, not necessity
- ROI is lower with semi-automation in place

---

## Comparison of Approaches

| Approach | Time | Sustainability | Coverage | Maintenance | Recommended |
|----------|------|----------------|----------|-------------|-------------|
| **Manual Only** | 8h | LOW | 40% → 100% | High (constant drift) | ❌ No |
| **Phase 1 + 2** | 24h | MEDIUM | 95%+ | Medium (CI prevents drift) | ✅ **YES** |
| **Phase 1 + 2 + 3** | 64h | HIGH | 100% | Low (fully automated) | ⏳ Future |

---

## Recommendation

**Execute Phase 1 IMMEDIATELY** (8 hours):
- Document 7 P0 critical endpoints
- Fix 10 path mismatches
- Deploy to production

**Execute Phase 2 NEXT SPRINT** (16 hours):
- Build route scanner + validator
- Add CI enforcement
- Document P1 endpoints

**Defer Phase 3** (40 hours):
- Revisit in 6 months
- Only if documentation becomes bottleneck
- Lower ROI with Phase 2 in place

---

## Implementation Checklist

### Phase 1 (This Week)

- [ ] Document POST /orders/voice in OpenAPI
- [ ] Document PUT /tables/batch in OpenAPI
- [ ] Document POST /payments/cash in OpenAPI
- [ ] Document POST /ai/transcribe in OpenAPI
- [ ] Document POST /ai/parse-order in OpenAPI
- [ ] Document GET /auth/me in OpenAPI
- [ ] Document GET /health/ready, /live in OpenAPI
- [ ] Fix payment paths (/create not /process)
- [ ] Fix security paths (/events not /audit)
- [ ] Fix webhook paths (specific not generic)
- [ ] Fix menu paths (/items, /categories)
- [ ] Update API README table with corrections
- [ ] Validate OpenAPI with Swagger Editor
- [ ] Deploy documentation to production

### Phase 2 (Next Sprint)

- [ ] Create scripts/scan-api-routes.ts
- [ ] Create scripts/validate-openapi.ts
- [ ] Create scripts/check-api-coverage.ts
- [ ] Add NPM scripts to package.json
- [ ] Create .github/workflows/api-docs-check.yml
- [ ] Test CI on feature branch
- [ ] Document P1 endpoints (menu, terminal, realtime)
- [ ] Achieve 95%+ coverage
- [ ] Merge to main
- [ ] Monitor for false positives

### Phase 3 (Future Consideration)

- [ ] Research decorator libraries (tsoa, routing-controllers)
- [ ] POC with 5 endpoints
- [ ] Evaluate developer experience
- [ ] Calculate full refactor effort
- [ ] Get team buy-in
- [ ] Execute if ROI justifies

---

## Metrics to Track

### Current State
- **Endpoint Coverage:** 32% (20/62 accurate)
- **Path Accuracy:** 60% (40% have mismatches)
- **Documentation Drift:** HIGH (37 missing)

### Phase 1 Target
- **P0 Coverage:** 100% (7/7 critical)
- **Path Accuracy:** 90%+ (mismatches fixed)
- **Documentation Drift:** MEDIUM (30 still missing but not critical)

### Phase 2 Target
- **Endpoint Coverage:** 95%+ (all production endpoints)
- **Path Accuracy:** 100% (CI enforced)
- **Documentation Drift:** ZERO (CI prevents)
- **CI Checks:** 100% pass rate

### Phase 3 Target
- **Endpoint Coverage:** 100% (automated)
- **Maintenance Time:** 0 hours/month (fully automated)
- **Documentation Lag:** 0 (generated on every build)

---

## Risk Assessment

### Risks of NOT Fixing

| Risk | Impact | Probability | Severity |
|------|--------|-------------|----------|
| Integration failures | HIGH | 60% | CRITICAL |
| Developer confusion | MEDIUM | 80% | HIGH |
| Incomplete contracts | HIGH | 70% | HIGH |
| Support burden | MEDIUM | 50% | MEDIUM |

### Risks of Phase 1 Approach

| Risk | Impact | Mitigation |
|------|--------|------------|
| Documentation still drifts | MEDIUM | Execute Phase 2 next sprint |
| Manual errors | LOW | Swagger validation catches |
| Takes 8 hours | LOW | Essential work, can't defer |

### Risks of Phase 2 Approach

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives in CI | MEDIUM | Thorough testing, escape hatch |
| Developer friction | LOW | Clear error messages, docs |
| 16-hour investment | LOW | Prevents infinite future drift |

---

## Conclusion

The API documentation gap occurred due to **documentation-last culture** and **lack of automation**. The solution is a **3-phase hybrid approach**:

1. **Phase 1 (Immediate):** Manual fix of P0 critical endpoints (8 hours)
2. **Phase 2 (Next sprint):** Semi-automated validation with CI enforcement (16 hours)
3. **Phase 3 (Future):** Full automation with code-first generation (40 hours, deferred)

**Recommendation:** Execute Phase 1 NOW, Phase 2 next sprint, defer Phase 3.

This balances **immediate production needs** (99% ready to launch) with **long-term sustainability** (prevent future drift).

---

**Total Investment:** 24 hours (Phase 1 + 2)
**Return:** 95%+ documentation accuracy, zero future drift, CI enforcement
**ROI:** Excellent - prevents hundreds of hours of future confusion and errors
