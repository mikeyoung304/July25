import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/environment';
import { BadRequest } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const config = getConfig();

// Constants for demo auth
const DEMO_ROLE = 'kiosk_demo';
const DEMO_SCOPES = ['menu:read', 'orders:create', 'ai.voice:chat'];
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

    // Get JWT secret
    const jwtSecret = process.env.KIOSK_JWT_SECRET;
    if (!jwtSecret) {
      logger.error('KIOSK_JWT_SECRET not configured');
      throw new Error('Demo auth not available');
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

export { router as authRoutes };