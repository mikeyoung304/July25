# Error Boundary Quick Reference Guide

## Current State (8 Boundaries)

| Boundary | File | LOC | Status | Used | Risk |
|----------|------|-----|--------|------|------|
| ErrorBoundary | shared/errors/ | 131 | Active | 3+ | Low |
| GlobalErrorBoundary | errors/ | 208 | Active | 1 | Medium |
| PaymentErrorBoundary | errors/ | 189 | Active | 2 | High |
| WebSocketErrorBoundary | errors/ | 208 | Inactive | 0 | N/A |
| OrderStatusErrorBoundary | errors/ | 109 | Active | 2 | Low |
| KitchenErrorBoundary | errors/ | 164 | Orphaned | 0 | N/A |
| KDSErrorBoundary | errors/ | 227 | Active | 2 | High |
| KioskErrorBoundary | kiosk/ | 217 | Active | 1 | High |

**TOTAL: 1,253 LOC**

---

## Target State (3 Boundaries)

```
RootErrorBoundary (App.tsx)
├── Catches: Unhandled React errors at app level
├── Features: Circuit breaker, error counting, auto-reset
├── Lines: ~150 LOC
└── Risk: Low

RouteErrorBoundary (AppRoutes.tsx + Route wrappers)
├── Catches: Route/section level errors
├── Features: Context-aware UI, auto-recovery, retry logic
├── Lines: ~250 LOC
└── Risk: Medium

PaymentErrorBoundary (Payment pages)
├── Catches: Payment processing errors
├── Features: Retry counter, audit trail, network detection
├── Lines: ~200 LOC (enhanced)
└── Risk: High (but specialized)
```

**TOTAL: ~600 LOC (52% reduction)**

---

## Migration Quick Start

### Week 1: Create New Boundaries
```bash
# Create RootErrorBoundary
client/src/components/errors/RootErrorBoundary.tsx

# Create RouteErrorBoundary
client/src/components/errors/RouteErrorBoundary.tsx

# Add tests
client/src/components/errors/__tests__/RootErrorBoundary.test.tsx
client/src/components/errors/__tests__/RouteErrorBoundary.test.tsx
```

### Week 2: Update App.tsx
```typescript
// BEFORE
<GlobalErrorBoundary>
  <ErrorBoundary level="page">
    <Router>{...}</Router>
  </ErrorBoundary>
</GlobalErrorBoundary>

// AFTER
<RootErrorBoundary>
  <Router>{...}</Router>
</RootErrorBoundary>
```

### Week 3: Update Routes
```typescript
// BEFORE
<Route path="/kitchen">
  <ErrorBoundary level="section">
    <KitchenDisplayOptimized />
  </ErrorBoundary>
</Route>

// AFTER
<Route path="/kitchen">
  <RouteErrorBoundary context="kitchen">
    <KitchenDisplayOptimized />
  </RouteErrorBoundary>
</Route>
```

### Weeks 4-6: Remove Nested Boundaries
```typescript
// BEFORE
<KDSErrorBoundary stationName="Kitchen Display">
  <OrderGrid />
</KDSErrorBoundary>

// AFTER
<OrderGrid /> // Error handled by RouteErrorBoundary
```

### Week 7: Cleanup
```bash
# Remove unused boundaries
rm client/src/components/errors/KitchenErrorBoundary.tsx
rm client/src/components/errors/WebSocketErrorBoundary.tsx
rm client/src/components/errors/OrderStatusErrorBoundary.tsx
rm client/src/components/errors/KDSErrorBoundary.tsx
rm client/src/components/kiosk/KioskErrorBoundary.tsx
```

---

## RootErrorBoundary Props

```typescript
interface RootErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: (string | number)[]
  maxErrorsBeforeReset?: number // default: 3
}
```

**Features:**
- Circuit breaker (reset after N consecutive errors)
- Full-screen error UI
- Console logging
- Custom error handler support

**Usage:**
```typescript
<RootErrorBoundary
  maxErrorsBeforeReset={3}
  onError={(error, errorInfo) => {
    logger.error('App error', { error, componentStack: errorInfo.componentStack })
  }}
>
  <Router>{...}</Router>
</RootErrorBoundary>
```

---

## RouteErrorBoundary Props

```typescript
interface RouteErrorBoundaryProps {
  children: ReactNode
  context?: 'kitchen' | 'kiosk' | 'order' | 'menu' | 'default'
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRetry?: () => void
  autoRecoveryDelay?: number // ms, default: 0
  maxRetries?: number // default: 3
  stationName?: string // for kitchen context
}
```

**Features:**
- Context-specific error messages
- Auto-recovery for transient errors
- Retry button with counter
- Custom fallback UI support
- Station-aware error handling

**Usage Examples:**

```typescript
// Kitchen Display
<RouteErrorBoundary 
  context="kitchen"
  stationName="Kitchen Display"
  autoRecoveryDelay={30000}
>
  <KitchenDisplayOptimized />
</RouteErrorBoundary>

// Kiosk
<RouteErrorBoundary 
  context="kiosk"
  onRetry={() => window.location.href = '/kiosk'}
  maxRetries={3}
>
  <KioskPage />
</RouteErrorBoundary>

// Order Display
<RouteErrorBoundary 
  context="order"
  fallback={<OrderErrorPlaceholder />}
>
  <ExpoPage />
</RouteErrorBoundary>
```

---

## PaymentErrorBoundary Props (Enhanced)

```typescript
interface PaymentErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  context?: 'checkout' | 'kiosk-checkout'
  maxRetries?: number // default: 3
}
```

**Features:**
- Retry counter (max 3)
- Network error detection
- localStorage audit trail (last 10 errors)
- Payment context tracking
- Production monitoring integration

**Usage:**
```typescript
<PaymentErrorBoundary
  context="checkout"
  maxRetries={3}
  onRetry={() => form.resetForm()}
>
  <SquarePaymentForm />
</PaymentErrorBoundary>
```

---

## Error Context Behaviors

### Context: kitchen
- **Auto-recovery:** 30 seconds
- **Messages:** Station-specific
- **Actions:** Try Again, Reload
- **Features:** Error categorization (status/order/render)

### Context: kiosk
- **Auto-recovery:** None (manual only)
- **Messages:** User-friendly, assistance-oriented
- **Actions:** Try Again, Start Over, Reload, Dashboard
- **Features:** Retry counter with messaging

### Context: order
- **Auto-recovery:** None
- **Messages:** Order-specific
- **Actions:** Inline try-again button
- **Features:** Per-item error isolation possible

### Context: menu
- **Auto-recovery:** None
- **Messages:** Menu loading errors
- **Actions:** Retry, back
- **Features:** Customer-facing messaging

### Context: default
- **Auto-recovery:** None
- **Messages:** Generic
- **Actions:** Try again, go home
- **Features:** Basic error display

---

## File Changes Summary

### Create (2 files)
```
✚ RootErrorBoundary.tsx (~150 LOC)
✚ RouteErrorBoundary.tsx (~250 LOC)
```

### Modify (9 files)
```
~ App.tsx - Replace GlobalErrorBoundary wrapper
~ AppRoutes.tsx - Replace ErrorBoundary wrappers
~ CheckoutPage.tsx - Keep PaymentErrorBoundary
~ KioskPage.tsx - Remove KioskErrorBoundary
~ KitchenDisplayOptimized.tsx - Remove KDSErrorBoundary
~ ExpoPage.tsx - Remove OrderStatusErrorBoundary/KDSErrorBoundary
~ KioskCheckoutPage.tsx - Keep PaymentErrorBoundary
~ AppContent.tsx - No changes needed
~ ErrorBoundary.test.tsx - Update tests
```

### Delete (5 files)
```
✕ GlobalErrorBoundary.tsx
✕ ErrorBoundary.tsx (from shared/errors)
✕ WebSocketErrorBoundary.tsx
✕ OrderStatusErrorBoundary.tsx
✕ KitchenErrorBoundary.tsx
✕ KDSErrorBoundary.tsx
✕ KioskErrorBoundary.tsx
```

---

## Testing Checklist

### Unit Tests
- [ ] RootErrorBoundary circuit breaker
- [ ] RootErrorBoundary auto-reset
- [ ] RouteErrorBoundary context handling
- [ ] RouteErrorBoundary auto-recovery
- [ ] PaymentErrorBoundary retry counting

### Integration Tests
- [ ] Error propagation through component tree
- [ ] Recovery mechanism works
- [ ] Context-specific UI displays
- [ ] Error logging captures details
- [ ] Reset keys trigger properly

### E2E Tests
- [ ] Payment error and recovery
- [ ] Kitchen display error and auto-recovery
- [ ] Kiosk error and mode reset
- [ ] Order display errors
- [ ] Cross-route error scenarios

### Error Injection Tests
```typescript
// Throw error at different levels
const ThrowError = () => throw new Error('test')

// Verify boundary catches it
// Verify UI displays correctly
// Verify recovery works
```

---

## Rollout Strategy (Phased)

### Phase A: Internal Testing (Days 1-7)
- [ ] Create and test new boundaries
- [ ] Run full test suite
- [ ] Test on local dev environment
- [ ] Internal QA sign-off

### Phase B: Staging (Days 8-14)
- [ ] Deploy to staging
- [ ] Run error injection tests
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] Team review

### Phase C: Canary (Days 15-21)
- [ ] Deploy to production (10% users)
- [ ] Monitor error metrics
- [ ] Gather user feedback
- [ ] Monitor performance

### Phase D: Full Rollout (Days 22-28)
- [ ] Gradual rollout (25% → 50% → 100%)
- [ ] Continue monitoring
- [ ] Support team notification
- [ ] Documentation ready

---

## Monitoring & Metrics

### Track Before & After
- Error boundary catches per route
- Error category distribution
- Auto-recovery success rate
- Payment error retry rates
- Time to user recovery
- Page reload frequency

### Alerting Rules
- Error catch rate spike > 2x baseline
- Auto-recovery failure > 10%
- Payment errors > 5 per hour
- Circuit breaker triggers > 1x per hour

---

## Key Dates & Milestones

| Date | Milestone | Owner |
|------|-----------|-------|
| Day 1 | Start boundary development | Dev Team |
| Day 7 | Testing & approval | QA/Lead |
| Day 14 | Staging ready | Dev Team |
| Day 21 | Canary deployment | DevOps |
| Day 28 | Full rollout complete | Product |

---

## FAQ Quick Answers

**Q: Will my page break?**
A: No, with feature flags you can roll back instantly.

**Q: How do I test error boundaries?**
A: Throw test errors and verify catch and recovery.

**Q: What if auto-recovery fails?**
A: User sees error with retry button and other options.

**Q: Does payment error handling change?**
A: No, payment boundaries work the same way.

**Q: How long does migration take?**
A: 6-7 weeks with careful testing.

**Q: What's the risk level?**
A: Medium - mitigated through testing and feature flags.

---

## Support & Questions

- **Documentation:** ERROR_BOUNDARY_CONSOLIDATION_ANALYSIS.md
- **Questions:** Ask lead architect
- **Issues:** File detailed bug reports with error context
- **Questions:** See FAQ section above

