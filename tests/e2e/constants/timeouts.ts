/**
 * E2E Test Timeout Constants
 *
 * Named constants for test timeouts to improve maintainability and
 * make it clear what each timeout is waiting for.
 *
 * When adding new timeouts:
 * 1. Add a descriptive JSDoc comment explaining the purpose
 * 2. Use underscore notation for readability (e.g., 10_000)
 * 3. Group related timeouts together
 */

export const TIMEOUTS = {
  // ============================================
  // Page Load Timeouts
  // ============================================

  /** Time for initial page hydration after SSR (React needs to mount) */
  PAGE_HYDRATION: 5_000,

  /** Time for dashboard tiles to appear after initial load */
  DASHBOARD_LOAD: 10_000,

  /** Time for full page load with all assets */
  FULL_PAGE_LOAD: 15_000,

  // ============================================
  // Network/API Timeouts
  // ============================================

  /** Time for standard API response (menu, tables, orders) */
  API_RESPONSE: 10_000,

  /** Time for order submission POST and response */
  ORDER_SUBMISSION: 15_000,

  /** Time for login API call and token storage */
  AUTH_COMPLETE: 10_000,

  // ============================================
  // WebSocket/Real-time Timeouts
  // ============================================

  /** Time for WebSocket connection establishment */
  WEBSOCKET_CONNECT: 15_000,

  /** Time for WebSocket reconnection after disconnect */
  WEBSOCKET_RECONNECT: 10_000,

  /** Time for real-time order updates to propagate */
  REALTIME_UPDATE: 5_000,

  // ============================================
  // Voice/Media Timeouts
  // ============================================

  /** Time for voice recording initialization (microphone permission + SDK) */
  VOICE_INIT: 30_000,

  /** Time for OpenAI ephemeral token generation */
  VOICE_TOKEN: 10_000,

  // ============================================
  // UI Animation/Transition Timeouts
  // ============================================

  /** Time for modal open/close animations */
  MODAL_ANIMATION: 2_000,

  /** Time for navigation transitions between views */
  NAVIGATION: 3_000,

  /** Time for floor plan/table selection UI to update */
  FLOOR_PLAN_UPDATE: 3_000,

  /** Debounce time for checking loading states */
  LOADING_CHECK: 5_000,

  // ============================================
  // Element Visibility Timeouts
  // ============================================

  /** Standard timeout for elements that should appear quickly */
  ELEMENT_VISIBLE: 5_000,

  /** Extended timeout for elements that depend on network calls */
  ELEMENT_AFTER_NETWORK: 10_000,

  /** Short timeout for elements that should already be present */
  ELEMENT_IMMEDIATE: 2_000,

  // ============================================
  // Polling/Retry Intervals
  // ============================================

  /** Interval between retry attempts for flaky operations */
  RETRY_INTERVAL: 1_000,

  /** Total time to spend retrying before giving up */
  MAX_RETRY_DURATION: 30_000,
} as const;

/**
 * Production-specific timeouts
 * These are longer because production may have variable latency
 */
export const PRODUCTION_TIMEOUTS = {
  /** Extended API timeout for production cold starts */
  API_RESPONSE: 15_000,

  /** Extended auth timeout for Supabase in production */
  AUTH_COMPLETE: 15_000,

  /** Extended dashboard load for Vercel cold starts */
  DASHBOARD_LOAD: 15_000,
} as const;

/**
 * Test environment configuration
 */
export const TEST_CONFIG = {
  /** Production deployment URL */
  PRODUCTION_URL: 'https://july25-client.vercel.app',

  /** Default demo credentials */
  DEMO_EMAIL: 'server@restaurant.com',
  DEMO_PASSWORD: 'Demo123!',

  /** Test restaurant ID */
  RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
} as const;
