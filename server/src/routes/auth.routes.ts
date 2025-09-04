import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/environment';
import { BadRequest, Unauthorized } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { validatePin, createOrUpdatePin } from '../services/auth/pinAuth';
import { createStationToken, validateStationToken, revokeAllStationTokens } from '../services/auth/stationAuth';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { requireScopes, ApiScope } from '../middleware/rbac';

const router = Router();
const config = getConfig();

// Constants for demo auth
const DEMO_ROLE = 'kiosk_demo';
const DEMO_SCOPES = ['menu:read', 'orders:create', 'ai.voice:chat', 'payments:process'];
const ALLOWED_DEMO_RESTAURANTS = [
  '11111111-1111-1111-1111-111111111111' // Default demo restaurant
];

/**
 * POST /api/v1/auth/kiosk
 * Issues a short-lived JWT for kiosk demo sessions
 */
router.post('/kiosk', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.body;

    // Validate restaurant ID
    if (!restaurantId) {
      throw BadRequest('restaurantId is required');
    }

    if (!ALLOWED_DEMO_RESTAURANTS.includes(restaurantId)) {
      throw BadRequest('Invalid restaurant ID for demo');
    }

    // Get JWT secret with fallback chain for resilience
    const jwtSecret = process.env.KIOSK_JWT_SECRET || 
                     process.env.SUPABASE_JWT_SECRET ||
                     (process.env.NODE_ENV === 'development' ? 
                      'demo-secret-key-for-local-development-only' : null);
    
    if (!jwtSecret) {
      logger.error('KIOSK_JWT_SECRET not configured - see docs/DEMO_AUTH_SETUP.md');
      throw BadRequest('Demo authentication not configured. Please contact support or see docs/DEMO_AUTH_SETUP.md for setup instructions.');
    }

    // Generate random demo user ID
    const randomId = Math.random().toString(36).substring(2, 15);
    
    // Create JWT payload
    const payload = {
      sub: `demo:${randomId}`,
      role: DEMO_ROLE,
      restaurant_id: restaurantId,
      scope: DEMO_SCOPES,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

    // Sign the token
    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    logger.info('Demo kiosk token issued', {
      restaurantId,
      demoUserId: payload.sub,
      expiresIn: 3600
    });

    res.json({
      token,
      expiresIn: 3600
    });

  } catch (error) {
    logger.error('Kiosk auth error:', error);
    throw error;
  }
});

/**
 * POST /api/v1/auth/login
 * Email/password login for managers and owners via Supabase
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, restaurantId } = req.body;

    // Validate input
    if (!email || !password) {
      throw BadRequest('Email and password are required');
    }

    if (!restaurantId) {
      throw BadRequest('Restaurant ID is required');
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      logger.warn('Login failed', { email, error: authError?.message });
      throw Unauthorized('Invalid email or password');
    }

    // Check user's role in the restaurant
    let { data: userRole, error: roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    // For demo admin, create access if it doesn't exist
    if ((roleError || !userRole) && email === 'admin@demo.com') {
      // Create restaurant access for demo admin
      const { error: insertError } = await supabase
        .from('user_restaurants')
        .upsert({
          user_id: authData.user.id,
          restaurant_id: restaurantId,
          role: 'owner',
          is_active: true
        }, {
          onConflict: 'user_id,restaurant_id'
        });
      
      if (!insertError) {
        logger.info('Created restaurant access for demo admin');
      }
      
      // Set role for response
      userRole = { role: 'owner' };
    } else if (roleError || !userRole) {
      logger.warn('User has no access to restaurant', {
        userId: authData.user.id,
        restaurantId
      });
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

    logger.info('User logged in successfully', {
      userId: authData.user.id,
      email,
      role: userRole.role,
      restaurantId
    });

    // Return session data
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole.role
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
 * Now uses proper Supabase authentication for all PIN users
 */
router.post('/pin-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, restaurantId } = req.body;

    // Validate input
    if (!pin || !restaurantId) {
      throw BadRequest('PIN and restaurant ID are required');
    }

    // Import userService for PIN authentication
    const userService = (await import('../services/userService')).default;

    // Authenticate with PIN using Supabase
    const result = await userService.authenticateWithPin(pin, restaurantId);

    if (!result) {
      logger.warn('PIN login failed', { restaurantId });
      throw Unauthorized('Invalid PIN');
    }

    // Log successful authentication
    logger.info('PIN login successful', {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      restaurantId
    });

    // Return the Supabase session
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      },
      token: result.session.access_token,
      session: {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_in: result.session.expires_in
      },
      expiresIn: result.session.expires_in || 12 * 60 * 60,
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
router.post('/station-login', authenticate, requireScopes(ApiScope.STAFF_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    logger.info('Station login successful', {
      stationType,
      stationName,
      restaurantId,
      createdBy: req.user!.id
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
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore Supabase signout errors (user might be using PIN/station auth)
      logger.debug('Supabase signout error (ignored):', error);
    }

    logger.info('User logged out', {
      userId,
      restaurantId
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
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const restaurantId = req.restaurantId;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('display_name, phone, employee_id')
      .eq('user_id', userId)
      .single();

    // Get user's role in current restaurant
    const { data: userRole, error: roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    res.json({
      user: {
        id: userId,
        email: req.user!.email,
        displayName: profile?.display_name,
        phone: profile?.phone,
        employeeId: profile?.employee_id,
        role: userRole?.role || req.user!.role,
        scopes: req.user!.scopes
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
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
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
      logger.warn('Token refresh failed', { error: authError?.message });
      throw Unauthorized('Invalid refresh token');
    }

    logger.info('Token refreshed successfully', {
      userId: authData.user?.id
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

    logger.info('PIN set successfully', {
      userId,
      restaurantId
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

    logger.info('Station tokens revoked', {
      restaurantId,
      revokedBy: userId,
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