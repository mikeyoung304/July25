import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { BadRequest, Unauthorized } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { supabase, supabaseAuth } from '../config/database';
import { validatePin, createOrUpdatePin } from '../services/auth/pinAuth';
import { createStationToken, validateStationToken as _validateStationToken, revokeAllStationTokens } from '../services/auth/stationAuth';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes, ApiScope } from '../middleware/rbac';
import {
  authRateLimiters,
  resetFailedAttempts
} from '../middleware/authRateLimiter';
import { setCsrfCookie, clearCsrfCookie } from '../middleware/csrf';

const AUTH_TOKEN_EXPIRY_HOURS = 8;

/**
 * Set HTTPOnly auth cookie
 */
function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,  // Match JWT expiry
    path: '/'
  });
}

/**
 * Clear auth cookie on logout
 */
function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

const router = Router();

/**
 * POST /api/v1/auth/login
 * Email/password login for managers and owners via Supabase
 */
router.post('/login',
  authRateLimiters.checkSuspicious,
  authRateLimiters.login,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, restaurantId } = req.body;

    // Validate input
    if (!email || !password) {
      logger.warn('auth_validation_fail', { reason: 'missing_credentials', restaurant_id: restaurantId });
      throw BadRequest('Email and password are required');
    }

    if (!restaurantId) {
      logger.warn('auth_validation_fail', { reason: 'missing_restaurant_id' });
      throw BadRequest('Restaurant ID is required');
    }

    // Authenticate with Supabase using anon client
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      logger.warn('auth_fail', { reason: authError?.message, restaurant_id: restaurantId });
      throw Unauthorized('Invalid email or password');
    }

    // Check user's role in the restaurant
    const { data: userRole, error: _roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (_roleError || !userRole) {
      logger.warn('auth_fail', { reason: 'no_restaurant_access', restaurant_id: restaurantId });
      throw Unauthorized('No access to this restaurant');
    }

    // Log successful login
    await supabase
      .from('auth_logs')
      .insert({
        user_id: authData.user.id,
        restaurant_id: restaurantId,
        event_type: 'login_success',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

    // Fetch user scopes from role_scopes table
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', userRole.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];

    // Generate custom JWT with scopes (instead of using Supabase's token)
    // This ensures scopes are embedded in the token for authorization checks
    const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - login cannot proceed');
      throw new Error('Server authentication not configured');
    }

    const payload = {
      sub: authData.user.id,
      email: authData.user.email,
      role: userRole.role,
      restaurant_id: restaurantId,
      scope: scopes,  // Required for RBAC authorization checks
      auth_method: 'email',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 hours for email login
    };

    const customToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    logger.info('auth_success', {
      user_id: authData.user.id,
      restaurant_id: restaurantId,
      scopes_count: scopes.length
    });

    // Reset rate limiting on successful auth
    resetFailedAttempts(req);

    // Set HTTPOnly auth cookie (JS cannot read)
    setAuthCookie(res, customToken);

    // Set CSRF cookie (JS CAN read for X-CSRF-Token header)
    setCsrfCookie(res);

    // Return user AND token (token is ALSO in HTTPOnly cookie for same-origin)
    // Cross-origin deployments (Vercel → Render) need the token in response body
    // because SameSite=strict cookies are not sent with cross-origin requests
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole.role,
        scopes
      },
      // Include access_token for cross-origin deployments where HTTPOnly cookies fail
      session: {
        access_token: customToken,  // JWT for cross-origin localStorage auth
        refresh_token: authData.session?.refresh_token,
        expires_in: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60  // 8 hours in seconds
      },
      restaurantId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/pin-login
 * PIN-based login for servers and cashiers
 */
router.post('/pin-login', 
  authRateLimiters.checkSuspicious,
  authRateLimiters.pin,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, restaurantId } = req.body;

    // Validate input
    if (!pin || !restaurantId) {
      throw BadRequest('PIN and restaurant ID are required');
    }

    // Validate PIN
    const result = await validatePin(pin, restaurantId);

    if (!result.isValid) {
      logger.warn('auth_fail', { reason: 'invalid_pin', restaurant_id: restaurantId });
      throw Unauthorized(result.error || 'Invalid PIN');
    }

    // Fetch user scopes from role_scopes table BEFORE creating JWT
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', result.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];

    // Generate JWT token for PIN user (no fallbacks for security)
    const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - PIN auth cannot proceed');
      throw new Error('Server authentication not configured');
    }

    const payload = {
      sub: result.userId,
      email: result.userEmail,
      role: result.role,
      restaurant_id: restaurantId,
      scope: scopes,  // Required for RBAC authorization checks
      auth_method: 'pin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) // 12 hours for staff
    };

    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    logger.info('auth_success', {
      user_id: result.userId,
      restaurant_id: restaurantId,
      scopes_count: scopes.length
    });

    // Set HTTPOnly auth cookie
    setAuthCookie(res, token);

    // Set CSRF cookie
    setCsrfCookie(res);

    // Return user AND token for cross-origin deployments
    res.json({
      user: {
        id: result.userId,
        email: result.userEmail,
        role: result.role,
        scopes
      },
      token,  // JWT for cross-origin localStorage auth
      expiresIn: 12 * 60 * 60,
      restaurantId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/station-login
 * Station authentication for kitchen and expo displays
 */
router.post('/station-login', 
  authRateLimiters.checkSuspicious,
  authRateLimiters.station,
  authenticate, 
  requireScopes(ApiScope.STAFF_MANAGE), 
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { stationType, stationName, restaurantId } = req.body;

    // Validate input
    if (!stationType || !stationName || !restaurantId) {
      throw BadRequest('Station type, name, and restaurant ID are required');
    }

    // Create station token
    const { token, expiresAt } = await createStationToken({
      stationType,
      stationName,
      restaurantId,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      createdBy: req.user!.id
    });

    logger.info('auth_success', {
      user_id: `station:${stationType}:${stationName}`,
      restaurant_id: restaurantId
    });

    res.json({
      token,
      expiresAt,
      stationType,
      stationName,
      restaurantId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout and session cleanup
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const restaurantId = req.restaurantId;

    // Log logout event
    await supabase
      .from('auth_logs')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        event_type: 'logout',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

    // Sign out from Supabase (if using Supabase auth)
    try {
      await supabaseAuth.auth.signOut();
    } catch (error) {
      // Ignore Supabase signout errors (user might be using PIN/station auth)
      logger.debug('Supabase signout error (ignored):', error);
    }

    logger.info('logout_success', {
      user_id: userId,
      restaurant_id: restaurantId
    });

    // Clear auth and CSRF cookies
    clearAuthCookie(res);
    clearCsrfCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information
 * Requires X-Restaurant-ID header to retrieve restaurant-specific role
 */
router.get('/me', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const restaurantId = req.restaurantId;

    // Get user profile
    const { data: profile, error: _profileError } = await supabase
      .from('user_profiles')
      .select('display_name, phone, employee_id')
      .eq('user_id', userId)
      .single();

    // Get user's role in current restaurant
    const { data: userRole, error: _roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    // Fetch user scopes from role_scopes table (same as login endpoint)
    const role = userRole?.role || req.user!.role;
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];

    res.json({
      user: {
        id: userId,
        email: req.user!.email,
        displayName: profile?.display_name,
        phone: profile?.phone,
        employeeId: profile?.employee_id,
        role,
        scopes
      },
      restaurantId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', 
  authRateLimiters.tokenRefresh,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw BadRequest('Refresh token is required');
    }

    // Refresh session with Supabase
    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (authError || !authData.session) {
      logger.warn('token_refresh_fail', { reason: 'invalid_token' });
      throw Unauthorized('Invalid refresh token');
    }

    logger.info('token_refresh_success', {
      user_id: authData.user?.id
    });

    res.json({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/set-pin
 * Set or update user's PIN (requires authentication)
 */
router.post('/set-pin', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { pin, restaurantId } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!pin || !restaurantId) {
      throw BadRequest('PIN and restaurant ID are required');
    }

    // Create or update PIN
    await createOrUpdatePin({
      userId,
      restaurantId,
      pin
    });

    logger.info('pin_set_success', {
      user_id: userId,
      restaurant_id: restaurantId
    });

    res.json({
      success: true,
      message: 'PIN set successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/revoke-stations
 * Revoke all station tokens for a restaurant (requires management role)
 */
router.post('/revoke-stations', authenticate, requireScopes(ApiScope.STAFF_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.body;
    const userId = req.user!.id;

    if (!restaurantId) {
      throw BadRequest('Restaurant ID is required');
    }

    const revokedCount = await revokeAllStationTokens(restaurantId, userId);

    logger.info('station_tokens_revoked', {
      restaurant_id: restaurantId,
      count: revokedCount
    });

    res.json({
      success: true,
      message: `Revoked ${revokedCount} station tokens`
    });

  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };