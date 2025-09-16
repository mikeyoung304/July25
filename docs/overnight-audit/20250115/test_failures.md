# Test Failures Analysis
**Date**: 2025-09-16
**Total Tests**: 316
**Passing**: 258 (81.6%)
**Failing**: 58 (18.4%)
**Test Files**: 39

## Summary
Tests are functional with Vitest but have various failures related to missing files, moved components, and API changes. The Jest→Vitest migration appears complete with compatibility shim in place.

## Failure Categories

### 1. Missing/Deleted Files (7 tests)
**Pattern**: Import resolution failures for components/services that no longer exist
**Affected Domains**:
- `CheckoutPage.demo.test.tsx` - Missing `@/services/auth/demoAuth`
- `KDSOrderCard.test.tsx` - Missing `@/components/orders/KDSOrderCard`
- `OrderCard.test.tsx` - Missing `../OrderCard/OrderCard`
- `RecordingIndicator.test.tsx` - Missing `./RecordingIndicator` component file
- `orderIntegration.integration.test.tsx` - Missing `shared/utils/voice-metrics`

### 2. Missing Test Dependencies (1 test)
**Pattern**: Required testing libraries not installed
- `accessibility.test.tsx` - Missing `jest-axe` package for accessibility testing

### 3. Component Rendering Issues (10 tests)
**Pattern**: Components not rendering expected text/elements
**Affected Domains**:
- **ElapsedTimer** (3 tests) - Timer format display not matching expectations
  - Cannot find "30s", "1h 14m", "14m 30s" text elements
- **HoldToRecordButton** (5 tests) - Button text/interactions failing
  - Cannot find "LISTENING..." or "PROCESSING..." text
  - Event handlers not being called (onMouseUp, onMouseLeave, onTouchEnd)
- **checkout.e2e.test.tsx** - Invalid element type (undefined component)

### 4. API/Service Layer Issues (8 tests)
**Pattern**: Service methods returning unexpected values or null
**Affected Domains**:
- **OrderService** (8 tests) - All CRUD operations failing
  - `getOrders` - Returns null instead of order array
  - `getOrderById` - Target null/undefined
  - `updateOrderStatus` - Failing status updates
  - `submitOrder` - Order creation failing
- **WebSocketService** (1 test) - Auth token expected but receiving null

### 5. Hook/State Management Issues (4 tests)
**Pattern**: React hooks not behaving as expected
**Affected Domain**:
- **useOrderData** (4 tests)
  - Data shape mismatch (expecting array, receiving object)
  - Filter arguments not matching expectations
  - Cannot read properties of undefined (status)
  - Restaurant ID mismatch ("rest-1" vs actual)

### 6. Build Safety Violations (1 test)
**Pattern**: Client code importing Node.js modules
- `useKioskOrderSubmission.ts` - Importing Node.js `crypto` module (line 4)

### 7. Mock/Setup Issues (1 test)
**Pattern**: Vitest hoisting problems with vi.mock
- `checkout-simple.test.tsx` - Top-level variables in vi.mock factory

## Priority Fixes

1. **Critical**: Remove stale test files for deleted components
2. **High**: Fix Node.js imports in client code (crypto usage)
3. **High**: Update OrderService tests for new API structure
4. **Medium**: Install missing jest-axe for accessibility tests
5. **Low**: Fix timer display format tests