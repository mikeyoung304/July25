# Claude Development Handbook
## System Constraints & Development Guidelines
**Version:** 2.0.0
**Updated:** 2025-11-08
**Authority:** Technical Gatekeeper
**Status:** ENFORCED - Violations will break CI/CD

---

## 🔴 CRITICAL SYSTEM CONSTRAINTS

**These are NOT suggestions. These are hard limits enforced by CI/CD:**

### Memory Limits
```javascript
// MAXIMUM ALLOWED (will decrease over time)
Development: 2GB (2048MB)
Build: 2GB (2048MB)
Test: 2GB (2048MB)
Production: 1GB (1024MB) target

// FORBIDDEN
NODE_OPTIONS='--max-old-space-size=4096' // NEVER USE
```

### API Client Rules
```typescript
// ✅ ONLY ALLOWED API CLIENT
import { httpClient } from 'services/http/httpClient';

// ❌ FORBIDDEN - Will fail CI/CD
import { api } from 'services/api'; // DELETED
import { secureApi } from 'services/secureApi'; // DELETED
import { unifiedApiClient } from 'core/api/unifiedApiClient'; // DELETED
new MyApiClient(); // NEVER CREATE NEW CLIENTS
```

### Type System Rules
```typescript
// ✅ ONLY ALLOWED TYPE IMPORTS
import { Order, User, Table } from 'shared/types';

// ❌ FORBIDDEN - ESLint will block
import { Order } from '../types'; // NO RELATIVE IMPORTS
import { Order } from './types'; // NO LOCAL TYPES
import { Order } from 'client/src/types'; // DELETED FOLDER
import { Order } from 'server/src/types'; // DELETED FOLDER
```

### Logging Rules
```typescript
// ✅ CORRECT
import { logger } from 'utils/logger';
logger.info('Operation completed', { orderId, userId });

// ❌ FORBIDDEN - Pre-commit hook will block
console.log('Debug'); // NEVER USE
console.error('Error'); // USE logger.error()
console.warn('Warning'); // USE logger.warn()
```

### Error Boundary Rules
```typescript
// ✅ ONLY 3 ALLOWED BOUNDARIES
<RootErrorBoundary>  // App-wide fallback
<RouteErrorBoundary> // Page isolation
<PaymentErrorBoundary> // Critical transactions

// ❌ FORBIDDEN - No new error boundaries
<MyCustomErrorBoundary> // USE ONE OF THE 3 ABOVE
```

---

## 🏛️ ARCHITECTURAL DECISIONS

**These are intentional choices documented in ADRs. Do not "fix" them:**

### Authentication (ADR-006)
```typescript
// Dual auth pattern is INTENTIONAL
// httpClient checks both Supabase AND localStorage
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  // Use Supabase token
} else {
  const savedSession = localStorage.getItem('auth_session');
  // Use localStorage token for PIN/station/demo auth
}

// This is NOT a bug, it's required for:
// - PIN authentication (servers)
// - Station authentication (KDS)
// - Demo mode (development)
```

### CSRF Protection
```typescript
// CSRF is INTENTIONALLY disabled for REST APIs
// We use JWT + RBAC instead
const skipPaths = [
  '/api/v1/orders',  // Protected by JWT
  '/api/v1/payments', // Protected by JWT + Square validation
  '/api/v1/tables'   // Protected by JWT + RBAC
];

// This is NOT a vulnerability, it's intentional (commit 1e4296c4)
```

### localStorage Usage
```typescript
// localStorage for auth tokens is REQUIRED for shared devices
// httpOnly cookies don't work on shared terminals (servers, kiosks)
localStorage.setItem('auth_session', JSON.stringify(session));

// This is a KNOWN trade-off, not an oversight
```

---

## 📋 DEVELOPMENT WORKFLOWS

### Adding a New Feature

**✅ CORRECT WORKFLOW:**
```markdown
1. Check existing patterns
   - Is there a similar feature? Copy its structure
   - Use existing API client (httpClient)
   - Import types from shared/types

2. File placement
   - Components: client/src/components/{feature}/
   - Business logic: client/src/modules/{feature}/
   - API calls: Use httpClient directly
   - Types: shared/types/{feature}.types.ts

3. State management
   - Local state: useState for UI-only state
   - Global state: Use existing Context (Auth, Cart)
   - Server state: React Query with httpClient

4. Error handling
   - Let errors bubble to nearest error boundary
   - Don't create new error boundaries
   - Log errors with logger, not console

5. Testing
   - Unit test: {component}.test.tsx
   - Integration test: tests/integration/{feature}.spec.ts
   - E2E test: tests/e2e/{feature}.spec.ts

6. Before commit
   - Run: npm test
   - Run: npm run typecheck
   - Memory check: ps aux | grep node (should be <2GB)
   - No console.log statements
   - All types from shared/types
```

### Fixing a Bug

**✅ CORRECT WORKFLOW:**
```markdown
1. Reproduce
   - Add failing test FIRST
   - Verify test fails
   - Keep test when fixed (regression prevention)

2. Investigate
   - Check recent commits: git log --oneline -20
   - Check for similar past issues: docs/archive/
   - Don't create new investigation.md in root

3. Fix
   - Minimal change required
   - Don't refactor unrelated code
   - Don't add new abstractions

4. Verify
   - Original test now passes
   - No other tests broken
   - Memory usage unchanged
   - No performance regression

5. Document
   - Clear commit message explaining WHY
   - If complex: Add comment in code
   - If architectural: Update relevant ADR
```

### Handling a Production Incident

**✅ INCIDENT RESPONSE PROTOCOL:**
```markdown
1. IMMEDIATE (0-15 min)
   - Acknowledge incident
   - Assess impact (users affected, data loss?)
   - Communicate status to team
   - Start incident log

2. MITIGATE (15-60 min)
   - Stop bleeding (rollback, feature flag, manual fix)
   - Verify mitigation working
   - Communicate to stakeholders
   - Continue logging actions

3. INVESTIGATE (1-4 hours)
   - Root cause analysis (5 whys)
   - Collect evidence (logs, metrics, user reports)
   - Document timeline
   - Identify contributing factors

4. FIX (same day if critical)
   - Create proper fix (not just band-aid)
   - Add test preventing recurrence
   - Deploy carefully (staging first)
   - Monitor closely

5. POST-MORTEM (within 48 hours)
   - Write post-mortem (template below)
   - Blameless review meeting
   - Action items to prevent recurrence
   - Share learnings with team
```

### Database Migration

**✅ MIGRATION CHECKLIST:**
```sql
-- 1. Naming: YYYYMMDD_HHMMSS_description.sql
-- Example: 20251108_143000_add_user_preferences.sql

-- 2. Structure
-- Forward migration
CREATE TABLE IF NOT EXISTS user_preferences (...);

-- 3. Rollback script (separate file)
-- 20251108_143000_rollback_add_user_preferences.sql
DROP TABLE IF EXISTS user_preferences;

-- 4. Testing requirements
-- [ ] Local: supabase db push --dry-run
-- [ ] Rollback tested locally
-- [ ] Types generated: prisma db pull && prisma generate
-- [ ] CI migration test passes
-- [ ] No data loss for existing records
-- [ ] Performance acceptable (EXPLAIN ANALYZE)
```

---

## ❌ FORBIDDEN PATTERNS

**These will cause CI/CD failures or production issues:**

### Memory Leaks
```javascript
// ❌ NEVER: Event listeners without cleanup
componentDidMount() {
  window.addEventListener('resize', this.handler);
}

// ❌ NEVER: Unbounded caches
const cache = {};
function addToCache(key, value) {
  cache[key] = value; // Grows forever
}

// ❌ NEVER: Circular references
obj1.ref = obj2;
obj2.ref = obj1;

// ❌ NEVER: Uncleared timers
setInterval(pollAPI, 1000); // Where's the clearInterval?
```

### API Anti-patterns
```typescript
// ❌ NEVER: Create new API clients
class MyApiClient extends BaseClient { }

// ❌ NEVER: Direct fetch without httpClient
fetch('/api/orders'); // Use httpClient

// ❌ NEVER: Duplicate API logic
async function myFetch(url) { // Just use httpClient
  // Custom implementation
}
```

### Type Anti-patterns
```typescript
// ❌ NEVER: Define types outside shared/
interface Order { // Should be in shared/types
  id: string;
}

// ❌ NEVER: Type assertions without validation
const order = response as Order; // Validate first!

// ❌ NEVER: any type
let data: any; // Use unknown or proper type
```

---

## 🚨 EMERGENCY PROTOCOLS

### When Memory Exceeds Limit
```bash
# 1. Find what's using memory
ps aux | grep node | awk '{print $6/1024 " MB " $11}'

# 2. Take heap snapshot
node --inspect server/src/index.ts
# Chrome DevTools → Memory → Take Snapshot

# 3. Common fixes
- Clear caches
- Remove event listeners
- Fix circular references
- Reduce bundle size
```

### When Migration Fails
```bash
# 1. DON'T PANIC
# 2. Check migration log
supabase db diff --debug

# 3. Rollback if needed
psql $DATABASE_URL -f migrations/XXXXX_rollback.sql

# 4. Fix locally first
supabase db reset
supabase db push

# 5. Test thoroughly before re-deploying
```

### When Tests Fail in CI
```bash
# 1. Check if flaky
npm test -- --run=3 # Run 3 times

# 2. If consistently failing
git bisect start
git bisect bad HEAD
git bisect good HEAD~10
# Find breaking commit

# 3. If flaky, quarantine
mv test.spec.ts test-quarantine/
# Fix within 1 week or delete
```

---

## 📊 MONITORING & ALERTS

### Key Metrics to Watch
```javascript
// Memory Usage (TARGET: <1GB production)
process.memoryUsage().heapUsed / 1024 / 1024

// API Response Time (TARGET: p95 <500ms)
httpClient.interceptors.response.use(response => {
  logger.metric('api.response.time', Date.now() - response.config.startTime);
});

// Error Rate (TARGET: <1%)
logger.metric('error.rate', errors / requests);

// Deployment Success (TARGET: >95%)
logger.metric('deployment.success', successful / total);
```

### Alert Thresholds
```yaml
alerts:
  - name: memory-high
    condition: memory > 2GB
    action: investigate immediately

  - name: error-rate-high
    condition: errors > 5%
    action: rollback consideration

  - name: response-time-slow
    condition: p95 > 1000ms
    action: performance investigation

  - name: deployment-failed
    condition: deployment failed
    action: all-stop until fixed
```

---

## 🎯 SUCCESS CRITERIA

### Daily Checks
- [ ] No memory limit violations
- [ ] No new API clients created
- [ ] All types from shared/
- [ ] Zero console.log added
- [ ] Tests passing

### Weekly Checks
- [ ] Memory usage trending down
- [ ] API clients = 1
- [ ] Error boundaries ≤ 3
- [ ] Incidents < 5
- [ ] Tech debt addressed (20% sprint time)

### Monthly Checks
- [ ] All metrics improving
- [ ] No emergency migrations
- [ ] Post-mortems for all incidents
- [ ] Team morale positive
- [ ] Feature velocity increased

---

## 📚 REFERENCE

### ADRs (Architecture Decision Records)
- [ADR-001](../../explanation/architecture-decisions/ADR-001-snake-case-convention.md): Snake case convention
- [ADR-002](../../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md): Multi-tenancy
- [ADR-003](../../explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md): Embedded orders
- [ADR-004](../../explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md): WebSocket
- [ADR-005](../../explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md): Voice ordering
- [ADR-006](../../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md): Dual auth
- [ADR-007](../../explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md): Config
- [ADR-008](../../explanation/architecture-decisions/ADR-008-slug-based-routing.md): Routing
- [ADR-009](../../explanation/architecture-decisions/ADR-009-error-handling-philosophy.md): Error handling
- [ADR-010](../../explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md): Database

### Key Documents
- [Enterprise Assessment](../../ENTERPRISE_ARCHITECTURE_ASSESSMENT_2025-11-08.md)
- [Technical Roadmap](../../TECHNICAL_ROADMAP_2025-11-08.md)
- [Gatekeeper Review](../../GATEKEEPER_REVIEW_2025-11-08.md)

### Templates
- [Post-mortem Template](docs/templates/post-mortem.md)
- [Migration Checklist](docs/templates/migration-checklist.md)
- [Feature Checklist](docs/templates/feature-checklist.md)

---

## ⚠️ FINAL WARNING

**Every violation of these constraints adds technical debt.**
**Every shortcut taken costs 10x more to fix later.**
**Every "just this once" becomes "always like this".**

Follow this handbook or watch the system fail. The choice is yours.

---

**Handbook Version:** 2.0.0
**Last Updated:** 2025-11-08
**Next Review:** 2025-11-15 (Week 1 checkpoint)
**Authority:** Technical Gatekeeper

**This is the way.**