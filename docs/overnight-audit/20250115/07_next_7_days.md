# Next 7 Days Priority Plan

## Day 1: Stop Critical Failures (Monday)

### 1. Fix Status Validation (30 min) 🔴
**Owner**: Backend Team  
**PR Name**: `fix/order-status-validation-schema`
```typescript
// /shared/types/validation.ts - Add 'new' status
// /server/src/models/order.model.ts - Add 'new' and 'confirmed'
```

### 2. Add Missing Status Handlers (1 hour) 🔴  
**Owner**: Frontend Team  
**PR Name**: `fix/kds-missing-status-handlers`
```typescript
// StationStatusBar.tsx:45 - Add 'cancelled' case
// useTableGrouping.tsx - Add 'new', 'pending', 'cancelled'
// Add default cases to all switches
```

### 3. Fix Memory Leaks (2 hours) 🔴
**Owner**: Full Stack  
**PR Name**: `fix/websocket-memory-leaks`
```typescript
// Add cleanup to 12 useEffect hooks
// Dispose WebRTC connections properly
// Clear WebSocket listeners on unmount
```

## Day 2: Security & Context (Tuesday)

### 4. Fix Restaurant ID in Kiosk (2 hours) 🟡
**Owner**: Frontend Team  
**PR Name**: `fix/kiosk-restaurant-context`
```typescript
// useOrderSubmission.ts:59 - Use context not env var
// Add restaurant selector for multi-tenant kiosks
```

### 5. Remove Node Crypto (1 hour) 🟡
**Owner**: Frontend Team  
**PR Name**: `fix/client-crypto-import`
```typescript
// client/src/utils/crypto.ts - Use Web Crypto API
// Update all crypto usage in client
```

## Day 3: Testing & Cleanup (Wednesday)

### 6. Delete Orphaned Files (1 hour) 🟢
**Owner**: Any Developer  
**PR Name**: `chore/remove-orphaned-files`
```bash
# Delete 41 identified orphan files
# Remove 4 stale test files  
# Consolidate duplicate implementations
```

### 7. Fix Critical Tests (3 hours) 🟡
**Owner**: QA Team  
**PR Name**: `fix/critical-test-failures`
```typescript
// Fix OrderService tests (8 failures)
// Install missing @testing-library packages
// Replace jest. with vi. references
```

## Day 4: Database Security (Thursday)

### 8. Add RLS Policies (4 hours) 🟡
**Owner**: Backend Team  
**PR Name**: `security/add-rls-policies`
```sql
-- Add policies for orders table
-- Add policies for menu_items table
-- Add policies for restaurants table
-- Test with non-service role
```

## Day 5: API Protection (Friday)

### 9. Protect Webhook Endpoints (2 hours) 🟡
**Owner**: Backend Team  
**PR Name**: `security/webhook-signature-validation`
```typescript
// Add signature validation middleware
// Implement webhook secret management
// Add rate limiting
```

### 10. Centralize Field Transforms (4 hours) 🟢
**Owner**: Full Stack  
**PR Name**: `refactor/centralize-field-transforms`
```typescript
// Move all transforms to boundary layer
// Remove ad-hoc transformations
// Update components to expect consistent format
```

## Weekend Sprint (Optional Overtime)

### Bonus 1: Integration Test Suite
**PR Name**: `test/add-integration-suite`
- Order creation flow
- Payment processing
- KDS updates

### Bonus 2: Split Payment UI
**PR Name**: `feat/split-payment-ui`
- Implement frontend for existing backend
- Add payment splitting modal
- Test with multiple payment methods

## Success Metrics

| Day | Metric | Target | Verification |
|-----|--------|--------|-------------|
| 1 | Order creation works | 100% success | Manual test |
| 1 | No KDS crashes | 0 errors | Console check |
| 2 | Memory stable | No leaks | 6-hour test |
| 3 | Test pass rate | >90% | CI/CD |
| 4 | RLS coverage | 3 tables | Supabase console |
| 5 | Webhook security | Validated | Signature test |

## Resource Allocation

| Developer | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|-----------|-------|-------|-------|-------|-------|
| Backend Lead | #1 | #4 | #7 | #8 | #9 |
| Frontend Lead | #2 | #5 | #6 | Support | #10 |
| Full Stack | #3 | Support | #7 | #8 | #10 |
| QA | Verify | Verify | #7 | Test | Test |

## Communication Plan

### Daily Standup Topics
- Day 1: "Are orders working?"
- Day 2: "Is kiosk multi-tenant?"
- Day 3: "What's test pass rate?"
- Day 4: "Is RLS enabled?"
- Day 5: "Are webhooks secure?"

### Escalation Triggers
- Any P0 issue not fixed by EOD
- Test pass rate drops below 80%
- New memory leaks discovered
- Security vulnerability found

## Rollback Plan

Each PR must include:
1. Feature flag for risky changes
2. Rollback instructions
3. Verification test
4. Monitoring alert

## Definition of Done

- [ ] Code reviewed by peer
- [ ] Tests pass locally
- [ ] No new TypeScript errors
- [ ] Memory leak test (6 hours)
- [ ] Manual QA verification
- [ ] Documentation updated
- [ ] PR merged to main

## Post-Week 1 Priorities

1. Implement monitoring/observability
2. Complete integration test suite
3. Build split payment UI
4. Fix remaining TypeScript errors
5. Update all documentation
6. Add performance tracking
7. Implement error tracking (Sentry)
8. Create disaster recovery plan

## Risk Mitigation

- **If validation fix breaks**: Revert immediately, orders > perfect validation
- **If memory leak persists**: Implement 4-hour auto-restart as temporary fix
- **If tests can't be fixed**: Mark as skipped, not deleted
- **If RLS breaks app**: Use service role temporarily with audit logging