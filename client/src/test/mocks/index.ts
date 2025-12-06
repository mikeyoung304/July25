/**
 * Centralized Test Mocks
 *
 * Re-exports all test mock utilities from a single entry point.
 *
 * Usage:
 * ```typescript
 * import {
 *   setupRouterMocks,
 *   setupStripeMocks,
 *   setupCanvasMock,
 *   setupWindowMocks,
 * } from '@/test/mocks';
 * ```
 */

// React Router mocks
export {
  mockNavigate,
  mockUseParams,
  mockUseLocation,
  mockUseSearchParams,
  setupRouterMocks,
  resetRouterMocks,
} from './react-router';

// Stripe mocks
export {
  mockStripe,
  mockElements,
  mockCardElement,
  setupStripeMocks,
  setupStripePaymentFailure,
  resetStripeMocks,
} from './stripe';

// Canvas mocks
export {
  mockContext2D,
  mockContextWebGL,
  setupCanvasMock,
  resetCanvasMocks,
} from './canvas';

// Window mocks
export {
  createMockMediaQueryList,
  setupMatchMediaMock,
  setMediaQueryMatch,
  setViewportSize,
  setWindowLocation,
  setupLocalStorageMock,
  setupSessionStorageMock,
  setupWindowMocks,
  resetWindowMocks,
} from './window';
