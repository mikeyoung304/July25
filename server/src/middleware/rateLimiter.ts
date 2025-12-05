import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

// Only disable rate limiting in local development
const isDevelopment = process.env['NODE_ENV'] === 'development' && process.env['RENDER'] !== 'true';

/**
 * Get IP address from request, handling proxies correctly
 */
function getClientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Generate rate limit key for authenticated vs anonymous users
 * Uses IP-based keys for anonymous users to prevent shared rate limit pool
 */
function getUserRateLimitKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (userId) {
    return `user:${userId}`;
  }

  // Use IP for anonymous users instead of shared 'anonymous' key
  const ip = getClientIp(req);
  return `ip:${ip}`;
}

/**
 * Generate rate limit key for restaurant-scoped endpoints
 * Falls back to IP for anonymous users
 */
function getRestaurantRateLimitKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;

  if (authReq.restaurantId) {
    return `restaurant:${authReq.restaurantId}`;
  }

  // Use IP for anonymous users instead of shared 'anonymous' key
  const ip = getClientIp(req);
  return `ip:${ip}`;
}

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 1000, // Very high limit in dev
  keyGenerator: getRestaurantRateLimitKey,
  message: 'Too many requests from this restaurant/IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Keep rate limiting in dev mode but with higher limits
});

// Stricter rate limiter for voice orders
export const voiceOrderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 100, // Higher limit in dev
  keyGenerator: getRestaurantRateLimitKey,
  message: 'Voice ordering rate limit exceeded. Please wait a moment before placing another order.',
  standardHeaders: true,
  legacyHeaders: false,
  // Keep rate limiting in dev mode but with higher limits
});

// Even stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // More permissive in dev, strict in prod
  keyGenerator: (req: Request) => {
    const ip = getClientIp(req);
    return `auth:${ip}`;
  },
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth
});

// Health check rate limiter (to prevent monitoring abuse)
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 300 : 30, // More permissive in dev
  keyGenerator: (req: Request) => {
    const ip = getClientIp(req);
    return `health:${ip}`;
  },
  message: 'Health check rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
});

// AI service rate limiter (to prevent abuse of expensive AI operations)
export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 100 : 20, // Reduced from 50 to 20 for anonymous users
  keyGenerator: getUserRateLimitKey,
  message: 'AI service rate limit exceeded. Please wait before making more requests.',
  standardHeaders: true,
  legacyHeaders: false,
  // Keep rate limiting in dev mode but with higher limits
  handler: (req, res) => {
    // Log potential abuse for monitoring
    const authReq = req as AuthenticatedRequest;
    logger.warn('[RATE_LIMIT] AI service limit exceeded', {
      ip: getClientIp(req),
      userId: authReq.user?.id,
      restaurantId: authReq.restaurantId,
      userAgent: req.headers['user-agent'],
      rateLimitKey: getUserRateLimitKey(req)
    });
    res.status(429).json({
      error: 'Too many AI requests. Please wait 5 minutes.',
      retryAfter: 300
    });
  }
});

// Transcription rate limiter (more restrictive due to cost)
export const transcriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 30 : 10, // Reduced from 20 to 10 for anonymous users
  keyGenerator: getUserRateLimitKey,
  message: 'Transcription rate limit exceeded. Please wait before transcribing more audio.',
  standardHeaders: true,
  legacyHeaders: false,
  // Keep rate limiting in dev mode but with higher limits
  handler: (req, res) => {
    // Log potential abuse for monitoring
    const authReq = req as AuthenticatedRequest;
    logger.warn('[RATE_LIMIT] Transcription limit exceeded', {
      ip: getClientIp(req),
      userId: authReq.user?.id,
      restaurantId: authReq.restaurantId,
      userAgent: req.headers['user-agent'],
      rateLimitKey: getUserRateLimitKey(req)
    });
    res.status(429).json({
      error: 'Too many transcription requests. Please wait 1 minute.',
      retryAfter: 60
    });
  }
});

// Menu update rate limiter (Todo #171)
// Stricter than general API limiter because each update clears cache
export const menuUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 100 : 30, // 30 updates per minute max in production
  keyGenerator: getUserRateLimitKey,
  message: 'Too many menu updates. Please wait before making more changes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn('[RATE_LIMIT] Menu update limit exceeded', {
      ip: getClientIp(req),
      userId: authReq.user?.id,
      restaurantId: authReq.restaurantId,
      userAgent: req.headers['user-agent'],
      rateLimitKey: getUserRateLimitKey(req)
    });
    res.status(429).json({
      error: 'Too many menu updates. Please wait 1 minute.',
      retryAfter: 60
    });
  }
});