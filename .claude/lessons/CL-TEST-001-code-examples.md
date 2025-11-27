# CL-TEST-001 Code Examples - Implementation Details

This document provides complete code examples referenced in CL-TEST-001.

## 1. Fixed Mock Exports (Client Tests)

### CheckoutPage.demo.test.tsx - Complete Mock Fix

#### Before (Broken)
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';

// Mock dependencies - INCOMPLETE MOCKS CAUSE RUNTIME ERRORS
vi.mock('@/contexts/UnifiedCartContext', () => ({
  UnifiedCartContext: React.createContext(null),
  UnifiedCartProvider: ({ children }: any) => <>{children}</>,
  useUnifiedCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
      }],
      subtotal: 10.00,
      tax: 1.00,
      total: 11.00,
    },
    clearCart: vi.fn(),
    addToCart: vi.fn(),
  })
}));

vi.mock('@/contexts/cart.hooks', () => ({
  useCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
      }],
      subtotal: 10.00,
      tax: 1.00,
      total: 11.00,
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
  })
  // ERROR: useUnifiedCart not exported!
  // When CheckoutPage imports useUnifiedCart, test fails:
  // "useUnifiedCart is not a function"
}));

vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    // ERROR: child() method missing!
    // When code calls logger.child({ context: 'checkout' }), test fails
  }
}));
```

#### After (Fixed)
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';
import { DemoAuthService } from '@/services/auth/demoAuth';

// Create mock functions before vi.mock calls
const mockPost = vi.fn().mockResolvedValue({
  id: 'order-123',
  order_number: 'ORD-001'
});

// Mock dependencies - ALL EXPORTS INCLUDED
vi.mock('@/contexts/UnifiedCartContext', () => ({
  UnifiedCartContext: React.createContext(null),
  UnifiedCartProvider: ({ children }: any) => <>{children}</>,
  useUnifiedCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        menuItemId: 'menu-1',
        modifiers: [],
        specialInstructions: ''
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00,
      itemCount: 1,
      restaurantId: '11111111-1111-1111-1111-111111111111'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    itemCount: 1,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  })
}));

vi.mock('@/contexts/cart.hooks', () => ({
  useCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        menuItemId: 'menu-1'
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00,
      itemCount: 1,
      restaurantId: '11111111-1111-1111-1111-111111111111'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    itemCount: 1,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  }),
  // FIX 1: Export useUnifiedCart from cart.hooks mock
  useUnifiedCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        menuItemId: 'menu-1'
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00,
      itemCount: 1,
      restaurantId: '11111111-1111-1111-1111-111111111111'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    itemCount: 1,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  })
}));

vi.mock('@/hooks/useApiRequest', () => ({
  useApiRequest: () => ({
    post: mockPost
  })
}));

vi.mock('@/services/auth/demoAuth', () => ({
  DemoAuthService: {
    getDemoToken: vi.fn().mockResolvedValue('demo-token-123'),
    refreshTokenIfNeeded: vi.fn().mockResolvedValue('demo-token-123')
  }
}));

// FIX 2: Include child() method in logger mock
vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: () => ({  // <-- ADDED: child() method for contextual logging
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    })
  }
}));

// Mock AuthContext hooks
vi.mock('@/contexts/auth.hooks', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false
  })
}));

// Mock RestaurantContext
vi.mock('@/core/restaurant-hooks', () => ({
  useRestaurant: () => ({
    restaurant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test Restaurant'
    }
  })
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('CheckoutPage - Demo Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', true);
  });

  it('shows demo mode banner when in demo environment', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Demo Mode – No cards will be charged/)).toBeInTheDocument();
  });

  it('processes demo payment successfully', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    // Fill in required fields
    const emailInput = screen.getByLabelText(/Email Address/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });

    // Click demo payment button
    const demoButton = screen.getByRole('button', { name: /Complete Order \(Demo\)/i });
    fireEvent.click(demoButton);

    // Wait for navigation to confirmation page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/order-confirmation', {
        state: expect.objectContaining({
          orderId: 'order-123',
          order_number: 'ORD-001',
          total: 13.00
        })
      });
    });
  });
});
```

## 2. Payment Routes Error Logging Fix

### server/src/routes/payments.routes.ts

#### Before (Silent Failures)
```typescript
import { Router } from 'express';
import { PaymentService } from '../services/payment.service';
import { OrdersService } from '../services/orders.service';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();
const routeLogger = logger.child({ route: 'payments' });
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!);

// POST /api/v1/payments/confirm - Confirm payment after client-side completion
router.post('/confirm', async (req, res, next) => {
  try {
    const { payment_intent_id, order_id } = req.body;
    if (!payment_intent_id || !order_id) {
      throw new Error('Missing required fields');
    }

    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    routeLogger.info('Confirming payment', { payment_intent_id, order_id });

    // Demo mode - auto-confirm
    if (!stripe) {
      routeLogger.info('Demo mode: Auto-confirming payment');

      await OrdersService.updateOrderPayment(
        restaurantId,
        order_id,
        'paid',
        'card',
        payment_intent_id,
        undefined,
        req.user?.id
      );

      // Update audit log
      const idempotencyKey = `${order_id.slice(-12)}-confirm`;
      await PaymentService.updatePaymentAuditStatus(
        idempotencyKey,
        'success',
        payment_intent_id
      ).catch(() => {}); // PROBLEM: Silent failure! Audit log update errors are hidden

      return res.json({
        success: true,
        paymentId: payment_intent_id,
        status: 'succeeded',
        order: await OrdersService.getOrder(restaurantId, order_id),
      });
    }

    // Retrieve payment intent to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      routeLogger.warn('Payment not completed', {
        status: paymentIntent.status,
        order_id
      });

      // Update audit log to failed
      const idempotencyKey = paymentIntent.metadata?.['idempotency_key'];
      if (idempotencyKey) {
        await PaymentService.updatePaymentAuditStatus(
          idempotencyKey,
          'failed',
          undefined,
          paymentIntent.status,
          'Payment not completed'
        ).catch(() => {}); // PROBLEM: Silent failure! Audit log update errors are hidden

      }

      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        paymentStatus: paymentIntent.status,
      });
    }

    // Update order payment status
    await OrdersService.updateOrderPayment(
      restaurantId,
      order_id,
      'paid',
      'card',
      paymentIntent.id,
      undefined,
      req.user?.id
    );

    return res.json({
      success: true,
      paymentId: paymentIntent.id,
      status: 'succeeded',
      order: await OrdersService.getOrder(restaurantId, order_id),
    });
  } catch (error) {
    next(error);
  }
});

export { router as paymentRoutes };
```

#### After (Error Logging Added)
```typescript
import { Router } from 'express';
import { PaymentService } from '../services/payment.service';
import { OrdersService } from '../services/orders.service';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();
const routeLogger = logger.child({ route: 'payments' });
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!);

// POST /api/v1/payments/confirm - Confirm payment after client-side completion
router.post('/confirm', async (req, res, next) => {
  try {
    const { payment_intent_id, order_id } = req.body;
    if (!payment_intent_id || !order_id) {
      throw new Error('Missing required fields');
    }

    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    routeLogger.info('Confirming payment', { payment_intent_id, order_id });

    // Demo mode - auto-confirm
    if (!stripe) {
      routeLogger.info('Demo mode: Auto-confirming payment');

      await OrdersService.updateOrderPayment(
        restaurantId,
        order_id,
        'paid',
        'card',
        payment_intent_id,
        undefined,
        req.user?.id
      );

      // Update audit log - FIX: Log errors instead of silently swallowing
      const idempotencyKey = `${order_id.slice(-12)}-confirm`;
      await PaymentService.updatePaymentAuditStatus(
        idempotencyKey,
        'success',
        payment_intent_id
      ).catch((err) => routeLogger.error('Failed to update payment audit', {
        err,         // Include the error object for debugging
        order_id,    // Include context
        operation: 'update-audit-success',
        flow: 'demo-mode'
      }));

      return res.json({
        success: true,
        paymentId: payment_intent_id,
        status: 'succeeded',
        order: await OrdersService.getOrder(restaurantId, order_id),
      });
    }

    // Retrieve payment intent to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      routeLogger.warn('Payment not completed', {
        status: paymentIntent.status,
        order_id
      });

      // Update audit log to failed - FIX: Log errors instead of silently swallowing
      const idempotencyKey = paymentIntent.metadata?.['idempotency_key'];
      if (idempotencyKey) {
        await PaymentService.updatePaymentAuditStatus(
          idempotencyKey,
          'failed',
          undefined,
          paymentIntent.status,
          'Payment not completed'
        ).catch((err) => routeLogger.error('Failed to update payment audit', {
          err,         // Include the error object for debugging
          order_id,    // Include context
          operation: 'update-audit-failed',
          paymentStatus: paymentIntent.status
        }));
      }

      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        paymentStatus: paymentIntent.status,
      });
    }

    // Update order payment status
    await OrdersService.updateOrderPayment(
      restaurantId,
      order_id,
      'paid',
      'card',
      paymentIntent.id,
      undefined,
      req.user?.id
    );

    return res.json({
      success: true,
      paymentId: paymentIntent.id,
      status: 'succeeded',
      order: await OrdersService.getOrder(restaurantId, order_id),
    });
  } catch (error) {
    next(error);
  }
});

export { router as paymentRoutes };
```

## 3. Form Input Mock Fixes

### Handling Default Values in Tests

#### Before (Broken)
```typescript
it('should fill checkout form and submit', async () => {
  const emailInput = screen.getByLabelText(/Email/i);

  // PROBLEM: If input has a default value, fireEvent.change may not work correctly
  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

  const phoneInput = screen.getByLabelText(/Phone/i);
  fireEvent.change(phoneInput, { target: { value: '555-1234' } });

  const button = screen.getByRole('button', { name: /Submit/i });
  fireEvent.click(button);

  // May fail if default values weren't cleared first
  expect(mockSubmit).toHaveBeenCalled();
});
```

#### After (Fixed)
```typescript
import userEvent from '@testing-library/user-event';

it('should fill checkout form and submit', async () => {
  const user = userEvent.setup();

  const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
  const phoneInput = screen.getByLabelText(/Phone/i) as HTMLInputElement;

  // FIX 1: Clear default values first
  await user.clear(emailInput);
  await user.clear(phoneInput);

  // FIX 2: Use userEvent for more realistic typing
  await user.type(emailInput, 'test@example.com');
  await user.type(phoneInput, '555-1234');

  const button = screen.getByRole('button', { name: /Submit/i });
  await user.click(button);

  // Now works correctly with default values handled
  expect(mockSubmit).toHaveBeenCalled();
});
```

## 4. Skipped Tests - Documentation Format

### Marking Tests as Skipped with Context

```typescript
// client/src/services/stationRouting.test.ts.skip
//
// SKIP REASON: Implementation drift
// STATUS: v6.0.15+ refactored Order type structure
// REQUIRED: Rewrite for new snake_case schema (order_number instead of orderNumber)
//
// MIGRATION CHECKLIST:
// - [ ] Update Order mock data to snake_case (ADR-001)
// - [ ] Update station assignment expectations
// - [ ] Test against new Order state machine
// - [ ] Validate integration with KDS
//
// PRIORITY: Medium - Core feature but not blocking (KDS works with v1 API)
// ASSIGNED: N/A (self-serve rewrite)
// CREATED: 2024-11-26
// LAST UPDATED: 2024-11-26

import { stationRouting } from './stationRouting'
import { Order } from './types'

describe('stationRouting', () => {
  // ... test code ...
})
```

## 5. Best Practice Patterns

### Pattern 1: Always Check Mock Exports

```typescript
// When you write:
import { useCart, useUnifiedCart } from '@/contexts/cart.hooks';

// Your mock MUST export both:
vi.mock('@/contexts/cart.hooks', () => ({
  useCart: () => ({ /* ... */ }),
  useUnifiedCart: () => ({ /* ... */ })  // Don't forget!
}));

// PATTERN: Use type checking to ensure completeness
import type { CartHook, UnifiedCartHook } from '@/contexts/cart.hooks';

const mockCart: CartHook = () => ({ /* ... */ });
const mockUnifiedCart: UnifiedCartHook = () => ({ /* ... */ });

vi.mock('@/contexts/cart.hooks', () => ({
  useCart: mockCart,
  useUnifiedCart: mockUnifiedCart
}));
```

### Pattern 2: Error Logging Template

```typescript
// GOOD: Comprehensive error logging
.catch((err) => {
  logger.error('Operation failed', {
    err,                      // The error object
    operation: 'specific-op', // What were you doing?
    context: 'order-123',     // What data was involved?
    userId: user.id,          // Who triggered this?
    timestamp: new Date()     // When did it happen?
  });
});

// BAD: Silent failure
.catch(() => {});

// ALSO BAD: Logging without context
.catch((err) => console.error(err));
```

### Pattern 3: Skipped Test Documentation

```typescript
// client/src/pages/__tests__/CheckoutPage.demo.test.tsx.skip
/**
 * SKIPPED: Implementation drift (v6.0.16+)
 *
 * Reason: This test assumes the old Stripe Elements payment flow.
 * In v6.0.16, we migrated to Stripe Payment Intent + Webhooks.
 *
 * What needs fixing:
 * 1. Mock Stripe client to use paymentIntents API
 * 2. Add webhook event simulation
 * 3. Update payment confirmation flow
 *
 * Time estimate: 2-3 hours
 * Priority: Medium (covered by E2E tests in Playwright)
 *
 * Last attempted: 2024-11-26
 * Created: 2024-11-25
 */

describe.skip('CheckoutPage - Stripe Payment Intent Flow', () => {
  // Test code preserved for reference
});
```
