/**
 * Auth Response Types
 *
 * NOTE: Different auth endpoints return different response structures.
 * This is intentional to support different use cases:
 * - Email login: Uses Supabase session pattern (nested session object)
 * - PIN/Station login: Direct token pattern for kiosk/shared devices
 *
 * The distinction exists because:
 * 1. Email login leverages Supabase Auth, which returns a session object
 *    containing access_token and refresh_token
 * 2. PIN and Station login use custom JWT tokens for shared devices
 *    where Supabase sessions aren't appropriate
 *
 * A future v2 API may standardize to OAuth 2.0 conventions.
 * See ADR-006 for dual authentication pattern rationale.
 */

/**
 * Base user fields shared across all auth responses
 */
export interface AuthUserBase {
  id: string;
  role: string;
  restaurant_id: string;
}

/**
 * Email login user - includes email and restaurant name
 */
export interface EmailLoginUser extends AuthUserBase {
  email: string;
  restaurant_name: string;
}

/**
 * PIN login user - includes name for display on shared devices
 */
export interface PinLoginUser extends AuthUserBase {
  name: string;
}

/**
 * Station login user - includes station name for KDS identification
 */
export interface StationLoginUser extends AuthUserBase {
  station_name: string;
}

/**
 * Supabase-style session object
 * Used by email login and token refresh
 */
export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * Email login response - matches Supabase session pattern
 *
 * Endpoint: POST /api/auth/login
 *
 * @example
 * {
 *   user: { id: "...", email: "manager@restaurant.com", role: "manager", restaurant_id: "...", restaurant_name: "Demo Restaurant" },
 *   session: { access_token: "...", refresh_token: "...", expires_in: 3600 },
 *   restaurantId: "..."
 * }
 */
export interface EmailLoginResponse {
  user: EmailLoginUser;
  session: AuthSession;
  restaurantId: string;
}

/**
 * PIN login response - direct token for kiosk devices
 *
 * PIN auth is used on shared devices (kiosks, tablets) where
 * individual user accounts aren't practical. The token is
 * returned directly (not nested) for simpler client handling.
 *
 * Endpoint: POST /api/auth/pin
 *
 * @example
 * {
 *   user: { id: "...", name: "John Server", role: "server", restaurant_id: "..." },
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   expiresIn: 28800,
 *   restaurantId: "..."
 * }
 */
export interface PinLoginResponse {
  user: PinLoginUser;
  token: string;
  expiresIn: number;
  restaurantId: string;
}

/**
 * Station login response - direct token for KDS stations
 *
 * Station auth is used for Kitchen Display System (KDS) devices
 * that need persistent authentication without individual users.
 * Uses expiresAt (epoch timestamp) instead of expiresIn for
 * easier expiration checking on long-running displays.
 *
 * Endpoint: POST /api/auth/station
 *
 * @example
 * {
 *   user: { id: "...", station_name: "Grill Station", role: "station", restaurant_id: "..." },
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   expiresAt: 1735689600,
 *   restaurantId: "..."
 * }
 */
export interface StationLoginResponse {
  user: StationLoginUser;
  token: string;
  expiresAt: number;
  restaurantId: string;
}

/**
 * Refresh token response - matches email login pattern
 *
 * Used to refresh an expiring Supabase session. Returns
 * the same session structure as email login.
 *
 * Endpoint: POST /api/auth/refresh
 *
 * @example
 * {
 *   session: { access_token: "...", refresh_token: "...", expires_in: 3600 }
 * }
 */
export interface RefreshTokenResponse {
  session: AuthSession;
}

/**
 * Demo login response - matches email login pattern
 * Only available when DEMO_MODE=true
 *
 * Endpoint: POST /api/auth/demo
 */
export interface DemoLoginResponse extends EmailLoginResponse {}

/**
 * Logout response - confirms successful logout
 *
 * Endpoint: POST /api/auth/logout
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Type guard to check if response is email/demo login format
 */
export function isSessionBasedAuthResponse(
  response: unknown
): response is EmailLoginResponse | DemoLoginResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'session' in response &&
    typeof (response as EmailLoginResponse).session === 'object' &&
    'access_token' in (response as EmailLoginResponse).session
  );
}

/**
 * Type guard to check if response is PIN/Station login format
 */
export function isDirectTokenAuthResponse(
  response: unknown
): response is PinLoginResponse | StationLoginResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'token' in response &&
    typeof (response as PinLoginResponse).token === 'string'
  );
}

/**
 * Union type for all possible auth responses
 */
export type AuthResponse =
  | EmailLoginResponse
  | PinLoginResponse
  | StationLoginResponse
  | DemoLoginResponse;
