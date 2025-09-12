# Test Suite Status & Priority

**Last Updated**: September 10, 2025  
**Status**: ⚠️ PARTIALLY BROKEN (Jest → Vitest migration incomplete)

## Current Issues

### Critical Problem
- Tests written with Jest syntax (`jest.fn()`, `jest.mock()`)
- Running with Vitest (uses `vi.fn()`, `vi.mock()`)
- Result: ReferenceError: jest is not defined

### Timeout Configuration ✅ FIXED
- Increased from 30s to 120s for both client and server
- Located in: `client/vitest.config.ts`, `server/vitest.config.ts`

## Test Categories

### 🔴 ESSENTIAL (Revenue-Critical)
These tests MUST work before production:

1. **Payment Processing**
   - `/client/src/modules/payment/` - Currently broken (Jest syntax)
   - `/server/src/services/payment*.ts` - Status unknown
   - **Impact**: Can't process payments = no revenue

2. **Authentication**
   - `/client/src/services/auth/` - Needs verification
   - `/server/src/routes/auth.routes.test.ts` - Needs verification
   - **Impact**: Can't log in = system unusable

3. **Order Creation**
   - `/client/src/modules/order-system/` - Needs verification
   - `/server/src/services/order*.ts` - Needs verification
   - **Impact**: Can't create orders = no sales

### 🟡 IMPORTANT (Operational)
Should work but not blocking launch:

1. **Kitchen Display**
   - KDS components and WebSocket tests
   - **Impact**: Manual kitchen operations possible

2. **Voice Ordering**
   - WebRTC and AI integration tests
   - **Impact**: Can use traditional ordering

3. **Table Management**
   - Table assignment and status tests
   - **Impact**: Can manage manually

### 🟢 NICE-TO-HAVE (Quality)
Can be fixed post-launch:

1. **UI Components**
   - Button, Modal, Form component tests
   - **Impact**: Visual regression only

2. **Utility Functions**
   - Date formatting, validation helpers
   - **Impact**: Edge cases only

3. **Performance Tests**
   - Memory monitoring, optimization tests
   - **Impact**: Already optimized

## Quick Test Commands

```bash
# Test only critical paths (created but needs Jest→Vitest fixes)
npm run test:quick

# Test everything (will timeout on broken tests)
npm test

# Test with coverage disabled (faster)
VITEST_COVERAGE=false npm test

# Test specific file
cd client && npx vitest run src/path/to/test.ts
```

## Migration Path

### Option 1: Quick Fix (1-2 hours)
Add Jest compatibility to Vitest setup:
```javascript
// client/test/setup.ts
import { vi } from 'vitest';
global.jest = vi;
```

### Option 2: Proper Migration (1-2 days)
1. Find all `jest.fn()` → replace with `vi.fn()`
2. Find all `jest.mock()` → replace with `vi.mock()`
3. Update all test files systematically

### Option 3: Skip Tests (Not Recommended)
Focus only on manual testing and monitoring in production

## Recommendation

**For Phase 0**: Use Option 1 (Quick Fix) to get tests running, then gradually migrate to proper Vitest syntax during Phase 3.

## Files Needing Jest→Vitest Migration

Priority files (count from grep):
- `PaymentMethodPicker.test.tsx` - 2 jest references
- `TipSelector.test.tsx` - 2 jest references
- `useTablePayment.test.ts` - Multiple jest references
- Additional ~177 payment test errors to investigate

## Success Metrics

- [ ] At least one payment test passes
- [ ] At least one auth test passes
- [ ] Test suite completes without timeout
- [ ] Can run `npm run test:quick` successfully