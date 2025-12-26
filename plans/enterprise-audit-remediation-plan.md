# Enterprise Audit Remediation Plan v2.0

**Created**: 2025-12-26
**Revised**: 2025-12-26 (Post-Review)
**Status**: Approved - Ready for Implementation
**Project**: Restaurant OS v6.0.14

---

## Context

- **No real users** - This is not a launched product
- **No timeline pressure** - Quality is the only metric
- **Direct deployment** - No staging/canary needed
- **Rollback not needed** - No production traffic at risk

This plan focuses purely on improving codebase quality, not managing production risk.

---

## Decision Log

Decisions made during plan review:

| Topic | Decision | Rationale |
|-------|----------|-----------|
| God file splits | **Split fully** | User preference for smaller files |
| getErrorMessage utility | **Create** | Narrow scope, safe abstraction |
| TaxRateService | **Skip** | No bugs from current state |
| Circuit breakers | **Skip** | Solves non-problem |
| React.memo/useMemo | **Add** | Defensive optimization |
| Menu RAG pattern | **Implement** | Cleaner architecture |
| PIN migration | **Force reset** | No existing users affected |
| Audit files | **Archive** | Move to docs/archive/audits/ |

---

## Implementation Phases

Organized by logical dependency, not timeline.

### Phase 1: Security Hardening

These changes are foundational and must be done first.

#### 1.1 Remove PIN_PEPPER Default Fallback

**File**: `server/src/services/auth/pinAuth.ts:17`

```typescript
// Before
const PIN_PEPPER = process.env['PIN_PEPPER'] || 'default-pepper-change-in-production';

// After
const PIN_PEPPER = process.env['PIN_PEPPER'];
if (!PIN_PEPPER && process.env['NODE_ENV'] === 'production') {
  throw new Error('PIN_PEPPER environment variable is required in production');
}
const effectivePepper = PIN_PEPPER || 'dev-only-pepper';
```

**Migration**: Force PIN reset for all users after deployment (acceptable since no real users exist).

**Verification**:
- [ ] `npm run test:server -- auth`
- [ ] Server starts in development without PIN_PEPPER
- [ ] Server fails to start in production without PIN_PEPPER

#### 1.2 Require restaurant_id in AI Routes

**File**: `server/src/routes/ai.routes.ts:102,159`

```typescript
// Before
const restaurantId = req.headers['x-restaurant-id'] as string || env.DEFAULT_RESTAURANT_ID;

// After
const restaurantId = req.headers['x-restaurant-id'] as string;
if (!restaurantId) {
  return res.status(400).json({
    success: false,
    error: 'x-restaurant-id header is required'
  });
}
```

**Verification**:
- [ ] `npm run test:server -- ai`
- [ ] AI endpoints return 400 without header

#### 1.3 Fix setInterval Timer Leak

**File**: `server/src/ai/functions/realtime-menu-tools.ts:1159`

```typescript
// Add module-level reference
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCartCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    cleanupExpiredCarts().catch(error => {
      logger.error('[MenuTools] Cleanup interval error', { error });
    });
  }, 5 * 60 * 1000);
}

export function stopCartCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
```

**Also update**: `server/src/server.ts` graceful shutdown to call `stopCartCleanup()`.

**Verification**:
- [ ] `npm run test:server`
- [ ] Verify cleanup function is exported

#### 1.4 Remove Auth Secrets Empty Fallbacks

**File**: `server/src/config/environment.ts`

```typescript
function validateRequiredSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['KIOSK_JWT_SECRET', 'STATION_TOKEN_SECRET', 'PIN_PEPPER'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
}

validateRequiredSecrets();
```

**Verification**:
- [ ] `npm run test:server`
- [ ] Server starts in development without secrets

---

### Phase 2: Code Cleanup

Remove dead code and establish utilities.

#### 2.1 Delete Orphan Files (10 files)

```bash
rm client/src/hooks/useSquareTerminal.refactored.ts
rm client/src/hooks/terminalStateMachine.ts
rm client/src/hooks/kiosk/useOrderSubmission.ts
rm client/src/routes/LazyRoutes.tsx
rm client/src/components/shared/MenuItemGrid.example.tsx
rm client/src/contexts/UnifiedCartContext.refactored.tsx
rm client/src/components/shared/lists/VirtualizedOrderList.tsx
rm client/src/hooks/useFocusManagement.ts
rm client/src/hooks/useWebSocketConnection.ts
rm -rf client/public/logo-animation/
```

**Also delete**: `client/src/hooks/useVirtualization.ts` (dependent on VirtualizedOrderList)

**Verification**:
- [ ] `npm run typecheck`
- [ ] `npm run test:client`

#### 2.2 Archive Diagnostic Scripts (12 scripts)

```bash
mkdir -p scripts/archive/2025-12/
mv scripts/validate-square-credentials.sh scripts/archive/2025-12/
mv scripts/check-orders-kds.ts scripts/archive/2025-12/
mv scripts/check-schema.ts scripts/archive/2025-12/
mv scripts/check-db-schema.ts scripts/archive/2025-12/
mv scripts/diagnose-demo-auth.ts scripts/archive/2025-12/
mv scripts/fix-kitchen-scopes.ts scripts/archive/2025-12/
mv scripts/test-kitchen-auth.ts scripts/archive/2025-12/
mv scripts/verify_p0_db.sh scripts/archive/2025-12/
mv scripts/verify_p0_local.sh scripts/archive/2025-12/
mv scripts/verify_track_a_stabilization.sh scripts/archive/2025-12/
mv scripts/verify_schema_sync.sh scripts/archive/2025-12/
```

**Also**: Remove `validate:square` from package.json scripts.

**Verification**:
- [ ] `npm run typecheck`

#### 2.3 Archive Audit Reports

```bash
mkdir -p docs/archive/audits/2025-12-26/
mv AUDIT_REPORT.md docs/archive/audits/2025-12-26/
mv AI_HYGIENE_REPORT.md docs/archive/audits/2025-12-26/
mv ARCH_REPORT.md docs/archive/audits/2025-12-26/
mv CICD_REPORT.md docs/archive/audits/2025-12-26/
mv CONSOLIDATION_NOTES.md docs/archive/audits/2025-12-26/
mv DOC_DRIFT_REPORT.md docs/archive/audits/2025-12-26/
mv GIT_FORENSICS.md docs/archive/audits/2025-12-26/
mv ORPHAN_REGISTER.md docs/archive/audits/2025-12-26/
mv PERF_REPORT.md docs/archive/audits/2025-12-26/
mv REFACTOR_REPORT.md docs/archive/audits/2025-12-26/
mv RELIABILITY_REPORT.md docs/archive/audits/2025-12-26/
mv RISK_MAP.md docs/archive/audits/2025-12-26/
mv SECURITY_REPORT.md docs/archive/audits/2025-12-26/
mv UNFINISHED_REGISTER.md docs/archive/audits/2025-12-26/
mv FIX_PLAN.json docs/archive/audits/2025-12-26/
mv VERIFICATION_LOG.md docs/archive/audits/2025-12-26/
```

#### 2.4 Create getErrorMessage Utility

**New File**: `shared/utils/error-utils.ts`

```typescript
/**
 * Safely extract error message from unknown error type.
 * Replaces 50+ duplicate patterns across codebase.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
```

**Update**: `shared/utils/index.ts` to export new utilities.

**Then**: Search and replace all 50 occurrences:
```typescript
// Before
const msg = error instanceof Error ? error.message : String(error);

// After
import { getErrorMessage } from '@rebuild/shared';
const msg = getErrorMessage(error);
```

**Verification**:
- [ ] `npm run typecheck`
- [ ] `npm test`

---

### Phase 3: God File Splits

Split large files into focused modules.

#### 3.1 Split realtime-menu-tools.ts (1163 lines)

**Current**: `server/src/ai/functions/realtime-menu-tools.ts`

**Target Structure**:
```
server/src/ai/
  functions/
    realtime-menu-tools.ts      # Tool definitions (~300 lines)
  types/
    menu-tools.types.ts         # All interfaces/types
  services/
    cart.service.ts             # Cart CRUD operations
    modifier-pricing.service.ts # Modifier lookup logic
  validators/
    menu-input.validator.ts     # Input validation
```

**Extraction Steps**:
1. Create `types/menu-tools.types.ts` - move all interfaces (lines 8-110)
2. Create `validators/menu-input.validator.ts` - move validation functions
3. Create `services/cart.service.ts` - move cart CRUD (lines 376-486)
4. Create `services/modifier-pricing.service.ts` - move pricing logic
5. Update main file to import from new modules
6. Move timer cleanup functions to cart.service.ts

**Verification**:
- [ ] `npm run typecheck`
- [ ] `npm run test:server`

#### 3.2 Split VoiceEventHandler.ts (1271 lines)

**Current**: `client/src/modules/voice/services/VoiceEventHandler.ts`

**Target Structure**:
```
client/src/modules/voice/
  types/
    realtime-events.types.ts    # All interfaces (~420 lines)
  services/
    VoiceEventHandler.ts        # Handler logic (~850 lines)
```

**Extraction Steps**:
1. Create `types/realtime-events.types.ts` - move all interfaces (lines 59-449)
2. Update VoiceEventHandler.ts to import types
3. Update any consumers of these types

**Verification**:
- [ ] `npm run typecheck`
- [ ] `npm run test:client -- voice`

#### 3.3 Split orders.service.ts (820 lines)

**Current**: `server/src/services/orders.service.ts`

**Target Structure**:
```
server/src/services/
  orders.service.ts             # Core order CRUD (~500 lines)
  order-validation.service.ts   # Seat/status validation (~120 lines)
  order-tax.ts                  # Tax calculation helpers (~100 lines)
```

Note: NOT creating TaxRateService (per decision). Just extracting helpers.

**Extraction Steps**:
1. Create `order-tax.ts` - move tax calculation logic (lines 87-152)
2. Create `order-validation.service.ts` - move validation (lines 768-818)
3. Update imports in main file

**Verification**:
- [ ] `npm run test:server -- orders`

#### 3.4 Split error-handling.ts (852 lines)

**Current**: `shared/utils/error-handling.ts`

**Target Structure**:
```
shared/utils/
  error-handling.ts             # Core EnterpriseErrorHandler
  error-reporter.ts             # Remote reporting
  error-recovery.ts             # Recovery strategies
  error-pattern-tracker.ts      # Pattern analysis
```

**Verification**:
- [ ] `npm run typecheck`
- [ ] `npm test`

---

### Phase 4: Performance & Database

#### 4.1 Add Database Indexes

**New Migration**: `supabase/migrations/[timestamp]_orders_composite_indexes.sql`

```sql
-- Index for KDS queries (restaurant_id + status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status
ON orders (restaurant_id, status);

-- Index for order history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_created
ON orders (restaurant_id, created_at DESC);

-- Index for table-specific lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_table_status
ON orders (table_id, status) WHERE table_id IS NOT NULL;
```

**Verification**:
- [ ] `npm run db:push`
- [ ] Run EXPLAIN ANALYZE on common queries

#### 4.2 Add LIMIT Clauses

**File 1**: `server/src/services/scheduledOrders.service.ts`
- Add `.limit(100)` to scheduled orders query

**File 2**: `server/src/services/table.service.ts`
- Add `.limit(50)` to table orders query

**Verification**:
- [ ] `npm run test:server`

#### 4.3 Add React.memo and useMemo

**File**: `client/src/components/shared/MenuItemGrid.tsx`

```typescript
import { memo, useMemo } from 'react';

// Wrap component
export const MenuGridCard = memo(function MenuGridCard({
  item,
  onSelect
}: MenuGridCardProps) {
  // ... component body
});

// Memoize filtered items
const filteredItems = useMemo(() =>
  items.filter(item => !selectedCategory || item.category === selectedCategory),
  [items, selectedCategory]
);
```

**Verification**:
- [ ] `npm run test:client`

---

### Phase 5: AI Architecture (Menu RAG)

Implement RAG pattern for menu context to improve AI architecture.

#### 5.1 Design Overview

**Current**: Full menu (~1000 tokens) embedded in every voice session instruction.

**Target**:
- Menu items stored with embeddings
- Dynamic retrieval based on user query
- Only relevant items included in context

#### 5.2 Implementation Steps

1. **Add pg_vector extension** to Supabase (if not present)

2. **Create embeddings for menu items**:
   ```sql
   ALTER TABLE menu_items ADD COLUMN embedding vector(1536);
   ```

3. **Create embedding generation service**:
   - Generate embeddings when menu items are created/updated
   - Use OpenAI embeddings API

4. **Create retrieval function**:
   ```typescript
   async function findRelevantMenuItems(
     query: string,
     restaurantId: string,
     limit: number = 10
   ): Promise<MenuItem[]>
   ```

5. **Update voice session initialization**:
   - Remove inline menu dump from instructions
   - Add `find_menu_items` tool for dynamic lookup

6. **Cache strategy**:
   - Cache formatted menu context per restaurant (5-minute TTL)
   - Invalidate on menu updates

**Verification**:
- [ ] Voice ordering E2E tests pass
- [ ] Verify reduced token usage in logs

---

### Phase 6: Documentation

#### 6.1 Fix Version Alignment

Update to 6.0.14:
- [ ] `README.md`
- [ ] `docs/VERSION.md`
- [ ] `docs/meta/SOURCE_OF_TRUTH.md`

**Verification**:
```bash
grep -r '6.0.1[567]' --include='*.md' .
# Should return no results
```

#### 6.2 Fix Square to Stripe References

Run search and fix:
```bash
grep -r 'Square' docs/ | grep -v 'archive'
```

Key files:
- `docs/reference/api/api/README.md`
- `index.md`
- `docs/README.md`

Delete broken Square documentation links.

**Verification**:
- [ ] `python3 scripts/validate_links.py`

#### 6.3 Create ADR-010 Remote-First Database

**New File**: `docs/explanation/architecture-decisions/ADR-010-remote-first-database.md`

Document:
- Remote Supabase is source of truth
- Prisma schema generated via `db pull`
- Migration workflow

#### 6.4 Add Zod Validation to Order Status

**File**: `server/src/routes/orders.routes.ts`

```typescript
const StatusUpdateSchema = z.object({
  status: z.enum([
    'new', 'pending', 'confirmed', 'preparing',
    'ready', 'picked-up', 'completed', 'cancelled'
  ]),
  notes: z.string().optional()
});

router.patch('/:id/status',
  authenticate,
  validateRestaurantAccess,
  validateBody(StatusUpdateSchema),
  // ...
);
```

#### 6.5 Implement Exponential Backoff

**File**: `server/src/ai/adapters/openai/utils.ts`

```typescript
// Exponential backoff with jitter
const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
const jitter = Math.random() * 1000;
const actualDelay = Math.min(exponentialDelay + jitter, maxDelayMs);
```

---

## Items Explicitly Skipped

Per review decisions, these are NOT being implemented:

| Item | Reason |
|------|--------|
| TaxRateService | No bugs from current state; risk of wrong abstraction |
| Circuit breakers | Solves non-problem; retry pattern is sufficient |
| Distributed tracing | Over-engineering for current scale |
| React Query migration | Out of scope for remediation |

---

## Verification Checklist

After all phases complete:

- [ ] `npm run typecheck` - No type errors
- [ ] `npm test` - All tests pass
- [ ] `npm run build` - Build succeeds
- [ ] `npm run lint` - No linting errors
- [ ] Voice ordering works end-to-end
- [ ] PIN authentication works (new PIN required)
- [ ] AI endpoints require restaurant_id header
- [ ] No orphan files remain
- [ ] Audit reports archived

---

## Files Changed Summary

| Phase | Files Modified | Files Created | Files Deleted |
|-------|----------------|---------------|---------------|
| 1 | 4 | 0 | 0 |
| 2 | 1 | 1 | 11+ |
| 3 | 4 | 10 | 0 |
| 4 | 3 | 1 | 0 |
| 5 | 3 | 2 | 0 |
| 6 | 5 | 1 | 0 |

---

## References

### Research Sources
- [Sandi Metz on Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
- [Microsoft Patterns: Cohesion & Coupling](https://learn.microsoft.com/en-us/archive/msdn-magazine/2008/october/patterns-in-practice-cohesion-and-coupling)
- [Rule of Three](https://understandlegacycode.com/blog/refactoring-rule-of-three/)
- [Circuit Breaker Pattern](https://microservices.io/patterns/reliability/circuit-breaker.html)

### Internal References
- Original audit: `docs/archive/audits/2025-12-26/AUDIT_REPORT.md`
- Fix plan: `docs/archive/audits/2025-12-26/FIX_PLAN.json`

---

*Plan revised based on multi-agent review and user decisions*
*Quality-focused: no timeline constraints, no production users*
