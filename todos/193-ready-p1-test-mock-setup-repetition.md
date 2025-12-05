---
status: ready
priority: p1
issue_id: "193"
tags: [testing, vitest, architecture, code-quality, code-review]
dependencies: []
created_date: 2025-12-05
source: multi-agent-code-review
---

# CRITICAL: Repetitive Mock Setup Across Test Files

## Problem Statement

Multiple test files duplicate the same mock setup code (React Router, Stripe, Canvas, etc.), violating DRY principles and making maintenance difficult. Changes to mocking strategy require updates across 10+ files.

## Findings

### Pattern Recognition & Code Simplicity Agent Discovery

**Affected Files:**
- `CardPayment.test.tsx`
- `CashPayment.test.tsx`
- `CheckoutForm.test.tsx`
- `CheckoutValidation.test.ts`
- `HoldToRecordButton.test.tsx`
- `ServerView.test.tsx`
- `TableInteraction.test.tsx`
- `WorkspaceDashboard.test.tsx`
- `routes.test.tsx`
- `useViewport.test.ts`

**Duplicated Patterns:**

1. **React Router Mock** (repeated in 8+ files):
```typescript
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-id' }),
  useLocation: () => ({ pathname: '/test' }),
}));
```

2. **Stripe Mock** (repeated in payment tests):
```typescript
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  CardElement: () => <div data-testid="card-element" />,
}));
```

3. **Canvas Mock** (repeated in 4+ files):
```typescript
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  // ... 20+ lines of mock
}));
```

### Impact Assessment

- **Maintenance**: Bug in mock requires 10+ file changes
- **Consistency**: Mock implementations drift between files
- **Onboarding**: New developers copy-paste without understanding
- **Test Size**: Each file inflated by 50-100 lines of setup

## Proposed Solution

**Effort:** 2-3 hours | **Risk:** Medium

Create centralized test utilities:

```typescript
// client/src/test/mocks/react-router.ts
export const mockNavigate = vi.fn();
export const mockUseParams = vi.fn(() => ({}));

export function setupRouterMocks(params = {}) {
  mockUseParams.mockReturnValue(params);
  return {
    navigate: mockNavigate,
    params: mockUseParams,
  };
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  useLocation: () => ({ pathname: '/test', search: '', hash: '' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  Outlet: () => null,
}));
```

```typescript
// client/src/test/mocks/stripe.ts
export const mockStripe = {
  confirmCardPayment: vi.fn(),
  // ...
};

export function setupStripeMocks(overrides = {}) {
  return { ...mockStripe, ...overrides };
}
```

```typescript
// client/src/test/mocks/canvas.ts
export function setupCanvasMock() {
  const context = {
    fillRect: vi.fn(),
    // ...
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => context);
  return context;
}
```

**Usage in test files:**
```typescript
import { setupRouterMocks } from '@/test/mocks/react-router';
import { setupStripeMocks } from '@/test/mocks/stripe';

describe('PaymentForm', () => {
  beforeEach(() => {
    setupRouterMocks({ orderId: '123' });
    setupStripeMocks();
  });
});
```

## Technical Details

**Files to Create:**
- `client/src/test/mocks/react-router.ts`
- `client/src/test/mocks/stripe.ts`
- `client/src/test/mocks/canvas.ts`
- `client/src/test/mocks/window.ts`
- `client/src/test/mocks/index.ts` (barrel export)

**Files to Update:**
- All 10+ test files using duplicated mocks

## Acceptance Criteria

- [ ] Centralized mock utilities created
- [ ] All duplicate mock setups replaced with imports
- [ ] Mock functions exported for assertion access
- [ ] All tests still pass after refactor
- [ ] Documentation added for mock usage patterns

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review of commit 3b463dcb |

## Resources

- Pattern Recognition agent findings
- Code Simplicity agent findings
- [Vitest Setup Files](https://vitest.dev/config/#setupfiles)
