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

const router = Router();

// Constants for demo auth
const DEMO_SCOPES = ['menu:read', 'orders:create', 'ai.voice:chat', 'payments:process'];
const ALLOWED_DEMO_RESTAURANTS = [
  '11111111-1111-1111-1111-111111111111' // Default demo restaurant
];

/**
 * POST /api/v1/auth/demo-session
 * Issues a short-lived JWT for demo sessions (replaces client-side credentials)
 */
router.post('/demo-session',
  authRateLimiters.checkSuspicious,
  authRateLimiters.kiosk,
  async (req: Request, res: Response) => {
  try {
    const { role, restaurantId } = req.body;

    // Validate inputs
    if (!role || !restaurantId) {
      throw BadRequest('role and restaurantId are required');
    }

    if (!ALLOWED_DEMO_RESTAURANTS.includes(restaurantId)) {
      throw BadRequest('Invalid restaurant ID for demo');
    }

    // Get JWT secret (no fallbacks for security)
    const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - demo auth cannot proceed');
      throw new Error('Server authentication not configured');
    }

    // Generate random demo user ID
    const randomId = Math.random().toString(36).substring(2, 15);
    const demoUserId = `demo:${role}:${randomId}`;

    // Create JWT payload
    const payload = {
      sub: demoUserId,
      role: role,
      restaurant_id: restaurantId,
      scope: DEMO_SCOPES,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

    // Sign the token
    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    logger.info('demo_session_created', {
      user_id: demoUserId,
      restaurant_id: restaurantId
    });

    res.json({
      user: {
        id: demoUserId,
        role: role,
        scopes: DEMO_SCOPES
      },
      token,
      expiresIn: 3600,
      restaurantId
    });

  } catch (error) {
    logger.error('Demo session creation failed:', error);
    throw error;
  }
});

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
      .select('scope')  // ✅ Fixed: column is 'scope' not 'scope_name'
      .eq('role', userRole.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];  // ✅ Fixed: use 'scope' property

    logger.info('auth_success', {
      user_id: authData.user.id,
      restaurant_id: restaurantId
    });

    // Reset rate limiting on successful auth
    resetFailedAttempts(req);

    // Return session data
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole.role,
        scopes
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_in: authData.session?.expires_in
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
      auth_method: 'pin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) // 12 hours for staff
    };

    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    // Fetch user scopes from role_scopes table
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')  // ✅ Fixed: column is 'scope' not 'scope_name'
      .eq('role', result.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];  // ✅ Fixed: use 'scope' property

    logger.info('auth_success', {
      user_id: result.userId,
      restaurant_id: restaurantId
    });

    res.json({
      user: {
        id: result.userId,
        email: result.userEmail,
        role: result.role,
        scopes
      },
      token,
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
      .select('scope')  // ✅ Fixed: column is 'scope' not 'scope_name'
      .eq('role', role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];  // ✅ Fixed: use 'scope' property

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