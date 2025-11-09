# Technical Roadmap: From Chaos to Excellence
## Restaurant OS v6.0.14 - November 8, 2025

**Status:** MANDATORY IMPLEMENTATION
**Authority:** Technical Gatekeeper
**Timeline:** 3 Months to Stability
**Business Impact:** Ship 40% MORE features in 12 months by fixing foundations now

---

## Executive Mandate

Based on the Enterprise Architecture Assessment (Rating: 3.2/5), this roadmap is **NOT OPTIONAL**.

**The Situation:**
- 50 incidents per month (unsustainable)
- 4GB memory requirements (will fail under load)
- 5 competing API clients (causing bugs)
- Recurring migration failures (blocking deployments)

**The Decision:**
We implement this phased plan or accept system failure within 6-12 months. There is no third option.

---

## Success Metrics Dashboard

| Metric | Current | Week 1 | Week 2 | Month 1 | Month 3 |
|--------|---------|--------|---------|----------|----------|
| **Memory Required** | 4GB | 3GB | 2GB | 1.5GB | 1GB |
| **API Clients** | 5 | 5 | 3 | 1 | 1 |
| **Error Boundaries** | 8 | 8 | 5 | 3 | 3 |
| **Migration Success** | ~60% | 90% | 95% | 99% | 99% |
| **Monthly Incidents** | 50 | 40 | 25 | 10 | 5 |
| **Deployment Time** | Unknown | <30min | <20min | <15min | <10min |
| **Test Quarantine** | Unknown | <20% | <10% | <5% | <5% |
| **Tech Debt Sprint %** | 0% | 10% | 20% | 20% | 20% |

---

## 🔴 PHASE 0: IMMEDIATE FIXES (Day 1 - TODAY)
**Timeline:** 4 hours
**Feature Impact:** ZERO
**Status:** Some completed during gatekeeper review

### ✅ Already Completed
- [x] Tax rate standardization (0.08 → 0.0825)
- [x] CORS origin allowlist implementation
- [x] Duplicate route deletion (server/src/api/routes/tables.ts)
- [x] Archive flawed AI audit documents

### ⏳ Complete Today

**1. Security Updates (30 min)**
```bash
# Test first
npm audit
npm audit fix --dry-run

# If safe, apply
npm audit fix --force
npm test

# Commit
git commit -m "fix: resolve npm audit vulnerabilities"
```

**2. Memory Limit Enforcement (30 min)**
Add to package.json scripts:
```json
{
  "predev": "node -e \"require('v8').setFlagsFromString('--max-old-space-size=3072')\"",
  "prebuild": "node -e \"require('v8').setFlagsFromString('--max-old-space-size=3072')\""
}
```
This creates a "ratchet" - we can decrease but not increase.

**3. Archive Documentation Chaos (1 hour)**
```bash
# Move all root-level investigation reports
mkdir -p docs/archive/2025-11
mv *.md docs/archive/2025-11/ 2>/dev/null || true
mv *REPORT*.md docs/archive/2025-11/
mv *INVESTIGATION*.md docs/archive/2025-11/

# Keep only essential files in root
# README.md, CONTRIBUTING.md, SECURITY.md, LICENSE
```

**4. Type Import Enforcement (30 min)**
Add to .eslintrc:
```javascript
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        "../types/*",
        "../../types/*",
        "./types/*"
      ],
      "message": "Import types from 'shared/types' only"
    }]
  }
}
```

**5. Console.log Ban (30 min)**
```javascript
// .eslintrc addition
"no-console": ["error", {
  "allow": ["warn", "error"]
}]
```

---

## 🟡 PHASE 1: CRITICAL STABILIZATION (Week 1)
**Timeline:** 5 days
**Feature Impact:** 50% capacity (other 50% on fixes)
**Goal:** Stop the bleeding

### Day 1-2: Memory Crisis Resolution

**Memory Profiling Protocol:**
```bash
# 1. Start server with profiling
node --inspect --trace-gc --expose-gc server/src/index.ts

# 2. Chrome DevTools: chrome://inspect
# 3. Take heap snapshot at:
#    - Startup
#    - After 10 requests
#    - After 100 requests
#    - After 1000 requests

# 4. Look for:
#    - Growing heap size
#    - Retained objects increasing
#    - Event listeners not removed
#    - Large arrays/objects
```

**Common Memory Leak Patterns to Check:**
```typescript
// ❌ BAD: Event listeners not removed
componentDidMount() {
  window.addEventListener('resize', this.handler);
}
// ✅ GOOD: Clean up
componentWillUnmount() {
  window.removeEventListener('resize', this.handler);
}

// ❌ BAD: Unbounded cache
const cache = {};
function addToCache(key, value) {
  cache[key] = value; // Grows forever
}
// ✅ GOOD: LRU cache with max size
const cache = new LRUCache({ max: 100 });

// ❌ BAD: Circular references
const obj1 = {};
const obj2 = { ref: obj1 };
obj1.ref = obj2; // Memory leak
// ✅ GOOD: WeakMap for references
const refs = new WeakMap();
```

**Bundle Size Analysis:**
```bash
# Generate bundle analysis
npm run build -- --stats
npx webpack-bundle-analyzer dist/stats.json

# Look for:
# - Duplicate packages (multiple React versions?)
# - Large dependencies (moment.js → day.js)
# - Unused exports
# - Development dependencies in production
```

**Target Reductions:**
- Remove unused dependencies: `npx depcheck`
- Replace heavy libraries: moment → day.js, lodash → lodash-es
- Tree-shake properly: ensure sideEffects: false
- Lazy load routes: React.lazy() for code splitting

### Day 3-4: Migration Failure Fix

**Root Cause Investigation:**
```bash
# 1. Enhanced PR validation logging
# Edit .github/workflows/pr-validation.yml
- name: Validate migrations with verbose logging
  run: |
    echo "::group::Migration Files"
    ls -la supabase/migrations/
    echo "::endgroup::"

    echo "::group::Dry Run Test"
    supabase db push --dry-run --debug
    echo "::endgroup::"

    echo "::group::Rollback Test"
    for file in supabase/migrations/*_rollback.sql; do
      echo "Testing rollback: $file"
      psql $DATABASE_URL -f "$file" --dry-run
    done
    echo "::endgroup::"
```

**Migration Testing Infrastructure:**
```yaml
# .github/workflows/migration-integration.yml
name: Migration Integration Tests
on:
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Apply all migrations
        run: |
          for file in supabase/migrations/*.sql; do
            psql -h localhost -U postgres -d postgres -f "$file"
          done

      - name: Test rollbacks
        run: |
          for file in supabase/migrations/*_rollback.sql; do
            psql -h localhost -U postgres -d postgres -f "$file"
          done
```

**Migration Checklist (MANDATORY):**
```markdown
## Migration Checklist
- [ ] Tested locally with `supabase db push`
- [ ] Rollback script created and tested
- [ ] RPC functions have matching TypeScript types
- [ ] Prisma schema updated: `prisma db pull && prisma generate`
- [ ] Integration test passes in CI
- [ ] No breaking changes to existing data
- [ ] Performance impact assessed (EXPLAIN ANALYZE for queries)
```

### Day 5: Type Consolidation

**Type Migration Strategy:**
```bash
# 1. Generate truth from database
npx prisma db pull
npx prisma generate

# 2. Export Prisma types to shared
# shared/types/generated.ts
export * from '@prisma/client';

# 3. Codemod to fix imports
npx jscodeshift -t scripts/type-import-transform.js \
  --extensions=ts,tsx \
  --parser=tsx \
  client/src server/src

# Transform script (scripts/type-import-transform.js):
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  return j(fileInfo.source)
    .find(j.ImportDeclaration)
    .filter(path => {
      const value = path.value.source.value;
      return value.includes('../types') ||
             value.includes('./types');
    })
    .replaceWith(path => {
      path.value.source.value = 'shared/types';
      return path.value;
    })
    .toSource();
};

# 4. Delete old type files
rm -rf client/src/types
rm -rf server/src/types
# Keep shared/types only
```

---

## 🟠 PHASE 2: CONSOLIDATION SPRINT (Weeks 2-3)
**Timeline:** 2 weeks
**Feature Impact:** ZERO new features
**Goal:** Fix it right

### Week 2: API Client Consolidation

**The Plan: Adapter Pattern Migration**

**Step 1: Analysis (Day 1)**
```typescript
// Document what each client does
// client/src/services/CLIENT_ANALYSIS.md
| Client | Purpose | Auth Method | Error Handling | Usage Count |
|--------|---------|-------------|----------------|-------------|
| httpClient | Main client | Dual auth | Retry + timeout | 127 files |
| api.ts | Legacy | Basic token | Throws | 45 files |
| secureApi.ts | Auth wrapper | Token | Logger | 23 files |
| unifiedApiClient | Attempted fix | Mixed | Complex | 12 files |
| normalize.ts | Transform | None | None | 8 files |
```

**Step 2: Create Adapter (Day 2)**
```typescript
// server/src/services/http/apiAdapter.ts
import { httpClient } from './httpClient';

// Backward compatibility for old clients
export const api = {
  get: (url: string, options?: any) =>
    httpClient.request(url, { ...options, method: 'GET' }),
  post: (url: string, data?: any, options?: any) =>
    httpClient.request(url, { ...options, method: 'POST', body: data }),
  // etc...
};

export const secureApi = api; // They're the same now
export const unifiedApiClient = api;
export const normalize = {
  fetch: (url: string) => httpClient.request(url).then(r => r.data)
};

// Update imports to use adapters
// This maintains compatibility while consolidating
```

**Step 3: Gradual Migration (Days 3-8)**
```bash
# Start with least-used client
# Replace one file at a time
# Test after each change

# Priority order (least to most used):
1. normalize.ts (8 files) - Day 3
2. unifiedApiClient (12 files) - Day 4
3. secureApi.ts (23 files) - Days 5-6
4. api.ts (45 files) - Days 7-8
5. Already using httpClient (127 files) - No change needed
```

**Step 4: Delete Old Clients (Day 9)**
```bash
# Once all migrated, delete:
rm client/src/services/api.ts
rm client/src/services/secureApi.ts
rm client/src/core/api/unifiedApiClient.ts
rm client/src/api/normalize.ts

# Update adapter to throw deprecation errors
export const api = () => {
  throw new Error('Use httpClient directly');
};
```

**Step 5: Documentation (Day 10)**
```typescript
// client/src/services/http/README.md
# API Client Usage

## ✅ CORRECT: Use httpClient
import { httpClient } from 'services/http/httpClient';
const data = await httpClient.request('/api/orders');

## ❌ WRONG: Creating new clients
const myApi = new ApiClient(); // NO!

## httpClient Features:
- Dual auth (Supabase + localStorage)
- Automatic retry with exponential backoff
- Timeout protection (30s default)
- Structured error handling
- Request/response interceptors
```

### Week 3: Error Boundary Consolidation

**From 8 → 3 Error Boundaries**

**Target Architecture:**
```typescript
// 1. RootErrorBoundary (app-wide)
// client/src/components/errors/RootErrorBoundary.tsx
export const RootErrorBoundary: React.FC = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<CriticalError />}
      onError={(error, info) => {
        logger.error('Root boundary caught:', { error, info });
        Sentry.captureException(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// 2. RouteErrorBoundary (page isolation)
// client/src/components/errors/RouteErrorBoundary.tsx
export const RouteErrorBoundary: React.FC = ({ children, routeName }) => {
  return (
    <ErrorBoundary
      fallback={<RouteError routeName={routeName} />}
      onError={(error, info) => {
        logger.error(`Route ${routeName} error:`, { error, info });
      }}
      resetKeys={[routeName]} // Auto-reset on route change
    >
      {children}
    </ErrorBoundary>
  );
};

// 3. PaymentErrorBoundary (critical transactions)
// client/src/components/errors/PaymentErrorBoundary.tsx
export const PaymentErrorBoundary: React.FC = ({ children, orderId }) => {
  return (
    <ErrorBoundary
      fallback={<PaymentError orderId={orderId} />}
      onError={(error, info) => {
        logger.critical('Payment error:', { error, info, orderId });
        // Special handling for payment failures
        notifySupport(error, orderId);
      }}
      isolate={true} // Prevent bubbling to parent
    >
      {children}
    </ErrorBoundary>
  );
};
```

**Migration Plan:**
```bash
# Day 1: Create new consolidated boundaries
# Day 2: Update App.tsx to use RootErrorBoundary
# Day 3: Update router to wrap routes with RouteErrorBoundary
# Day 4: Update payment flow with PaymentErrorBoundary
# Day 5: Remove old boundaries one by one
# Day 6: Test error scenarios
```

---

## 🟢 PHASE 3: OPERATIONAL EXCELLENCE (Month 2-3)
**Timeline:** Ongoing
**Feature Impact:** 80% features, 20% maintenance
**Goal:** Sustainable velocity

### Enforcement Mechanisms (Cannot Be Bypassed)

**1. Pre-commit Hooks (.husky/pre-commit)**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Memory check
echo "Checking memory requirements..."
node --max-old-space-size=2048 -e "console.log('Memory OK')" || {
  echo "❌ Memory requirement exceeds 2GB limit"
  exit 1
}

# Type check
echo "Checking type imports..."
grep -r "from '\.\./types" client/src server/src 2>/dev/null && {
  echo "❌ Found relative type imports. Use 'shared/types' only"
  exit 1
}

# Console check
echo "Checking for console statements..."
grep -r "console\.\(log\|debug\|trace\)" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir="node_modules" \
  --exclude-dir="test" \
  client/src server/src 2>/dev/null && {
  echo "❌ Found console statements. Use logger instead"
  exit 1
}

# API client check
echo "Checking for new API clients..."
grep -r "new.*ApiClient\|new.*HttpClient" \
  --include="*.ts" \
  --include="*.tsx" \
  client/src server/src 2>/dev/null && {
  echo "❌ Found new API client creation. Use httpClient"
  exit 1
}

echo "✅ All checks passed"
```

**2. CI/CD Gates (GitHub branch protection)**
```yaml
# .github/settings.yml
branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts:
          - memory-check
          - migration-test
          - type-check
          - api-consolidation-check
      enforce_admins: true  # Even admins can't bypass
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: true
      restrictions:
        users: []
        teams: []
```

**3. Automated Monitoring**
```typescript
// scripts/health-monitor.ts
const metrics = {
  memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
  apiClients: countApiClients(),
  errorBoundaries: countErrorBoundaries(),
  migrationSuccess: checkLastMigration(),
  incidents: countIncidents(),
};

// Alert if degrading
if (metrics.memoryUsage > 2048) {
  alert('Memory exceeding limit');
}
if (metrics.apiClients > 1) {
  alert('Multiple API clients detected');
}
if (metrics.incidents > 10) {
  alert('High incident rate - consolidation sprint required');
}
```

### Process Changes

**1. Incident Response Protocol**
```markdown
## When Incident Occurs:
1. Fix immediate issue (stop bleeding)
2. Write incident report (what, when, impact)
3. Root cause analysis (5 whys)
4. Post-mortem meeting (blameless)
5. Add test preventing recurrence
6. Update runbook if needed

## Incident Threshold:
- >3 P0 incidents in week = Next sprint is consolidation
- >10 P1 incidents in month = Tech debt sprint
- Any data loss incident = Immediate all-stop
```

**2. Tech Debt Allocation**
```markdown
## Sprint Planning:
- 80% feature work
- 20% tech debt (MANDATORY, not "if time permits")

## Tech Debt Priority:
1. Security vulnerabilities
2. Performance degradation
3. Developer velocity blockers
4. Code quality issues

## Tracking:
- Label issues with "tech-debt"
- Review monthly in retrospective
- Celebrate debt reduction (not just features)
```

**3. Migration Protocol**
```markdown
## Database Migration Requirements:
1. Local test: `supabase db push --dry-run`
2. Create rollback script
3. Test rollback locally
4. Update Prisma: `prisma db pull && prisma generate`
5. Update TypeScript types
6. CI migration test passes
7. PR review by 2 developers
8. Deploy to staging first
9. Monitor for 24 hours
10. Deploy to production

## No emergency migrations without CTO approval
```

---

## Success Validation Checkpoints

### Week 1 Checkpoint
- [ ] Memory reduced to 3GB or less
- [ ] Zero migration failures this week
- [ ] All new code uses shared/types
- [ ] npm audit vulnerabilities fixed
- [ ] Pre-commit hooks installed

**If not met:** All-stop until fixed

### Week 2 Checkpoint
- [ ] Memory stable at 2GB
- [ ] API clients reduced to 3
- [ ] Error boundaries reduced to 5
- [ ] CI gates cannot be bypassed
- [ ] First post-mortem completed

**If not met:** No new features until fixed

### Month 1 Checkpoint
- [ ] Memory stable at 1.5GB
- [ ] Single API client (httpClient)
- [ ] 3 error boundaries maximum
- [ ] <10 incidents this month
- [ ] All incidents have post-mortems

**If not met:** Tech debt sprint required

### Month 3 Checkpoint
- [ ] Deployment success >95%
- [ ] Feature velocity increased 20%
- [ ] Zero emergency migrations
- [ ] Test quarantine <5%
- [ ] Team morale survey positive

**If not met:** Reassess strategy

---

## The "Stop Work" Criteria

**These conditions trigger immediate feature freeze:**

1. **Memory exceeds 4GB again** - We're going backward
2. **Migration fails in production** - Deployment broken
3. **>5 P0 incidents in a week** - System unstable
4. **Data loss incident** - Unacceptable
5. **Team burnout signals** - People matter most

When triggered:
1. Stop all feature work
2. All-hands on fixing root cause
3. Post-mortem required
4. Executive review before resuming

---

## The Ratchet Mechanism

**Things can only get better, never worse:**

```javascript
// ci/ratchet-check.js
const limits = {
  memory: 2048, // MB - can only decrease
  apiClients: 1, // can only stay at 1
  errorBoundaries: 3, // can only decrease
  incidents: 10, // can only decrease
};

// Check in CI - fail if exceeded
Object.entries(limits).forEach(([metric, limit]) => {
  const current = getCurrentMetric(metric);
  if (current > limit) {
    throw new Error(`Ratchet violation: ${metric} is ${current}, limit is ${limit}`);
  }
});

// Update limits weekly (only down)
if (current < limit) {
  updateLimit(metric, current); // New lower limit
}
```

---

## Expected Outcomes

### Month 1
- 50% reduction in incidents (50 → 25)
- 60% reduction in memory usage (4GB → 1.5GB)
- 80% reduction in API clients (5 → 1)
- Deployment success rate >90%

### Month 3
- 90% reduction in incidents (50 → 5)
- 75% reduction in memory usage (4GB → 1GB)
- 100% API consolidation (1 client)
- Deployment success rate >99%
- Feature velocity +40%

### Month 6
- Stable, predictable system
- Happy, productive team
- Fast feature delivery
- Low operational overhead
- Ready for scale

---

## Communication Plan

### Weekly Standup Addition
```markdown
Monday: "What tech debt are you tackling this week?"
Wednesday: "Any ratchet violations detected?"
Friday: "What can we automate to prevent issues?"
```

### Monthly All-Hands
- Review metrics dashboard
- Celebrate improvements
- Post-mortem learnings
- Adjust targets if needed

### Stakeholder Updates
```markdown
## Weekly Email to CEO/CTO:
- Incidents this week: X (target: <5)
- Memory usage: XGB (target: <2GB)
- Deployment success: X% (target: >95%)
- Feature velocity: +X% (target: +20%)
- Team morale: X/10 (target: >7)

## Key Message:
"Investing in stability to ship faster"
```

---

## The Contract

**This roadmap is a contract between engineering and the business:**

**Engineering Commits To:**
- Follow this plan without deviation
- Fix critical issues in Phase 1-2
- Maintain 20% tech debt allocation
- Communicate progress weekly

**Business Commits To:**
- Accept feature pause in Week 2-3
- Support 20% tech debt allocation
- Not override CI/CD gates
- Celebrate stability improvements

**Together We Achieve:**
- 40% more features shipped in 12 months
- 90% fewer production incidents
- Sustainable development pace
- Scalable architecture

---

## Final Word: No Exceptions

**This plan is MANDATORY, not advisory.**

Every shortcut taken, every gate bypassed, every "just this once" exception adds 2x the work later.

The path from 3.2/5 to 4.5/5 is clear. The only question is whether we have the discipline to follow it.

**The alternative is system failure. Choose wisely.**

---

**Roadmap Created:** 2025-11-08
**First Review:** 2025-11-15 (Week 1 checkpoint)
**Full Review:** 2026-02-08 (Month 3)
**Authority:** Technical Gatekeeper

**Questions? Concerns? Tough. This is the way.**