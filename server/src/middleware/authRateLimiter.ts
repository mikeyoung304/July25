/**
 * Enhanced Authentication Rate Limiters
 * 
 * Implements defense-in-depth rate limiting strategy for authentication endpoints
 * to prevent brute force, credential stuffing, and enumeration attacks.
 */

import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { logger } from '../utils/logger';

// Only disable rate limiting in local development (not on Render production)
const isDevelopment = process.env['NODE_ENV'] === 'development' && process.env['RENDER'] !== 'true';

// Store for tracking suspicious IPs
const suspiciousIPs = new Map<string, number>();
const blockedIPs = new Set<string>();

// Cleanup interval reference for proper shutdown
let cleanupInterval: NodeJS.Timeout | null = null;

// Helper to get client identifier
const getClientId = (req: Request): string => {
  // Use multiple factors for fingerprinting
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const fingerprint = req.headers['x-device-fingerprint'] as string || '';
  
  // Combine for unique identifier
  return `${ip}:${fingerprint || userAgent.slice(0, 50)}`;
};

// Track failed attempts
const trackFailedAttempt = (clientId: string) => {
  const attempts = suspiciousIPs.get(clientId) || 0;
  suspiciousIPs.set(clientId, attempts + 1);
  
  // Auto-block after 10 failed attempts
  if (attempts >= 10) {
    blockedIPs.add(clientId);
    logger.error(`[SECURITY] Client blocked after 10 failed attempts: ${clientId}`);
    
    // Auto-unblock after 24 hours
    setTimeout(() => {
      blockedIPs.delete(clientId);
      suspiciousIPs.delete(clientId);
      logger.info(`[SECURITY] Client unblocked: ${clientId}`);
    }, 24 * 60 * 60 * 1000);
  }
};

// Reset on successful auth
export const resetFailedAttempts = (req: Request) => {
  const clientId = getClientId(req);
  suspiciousIPs.delete(clientId);
};

// Check if client is blocked
const isBlocked = (req: Request): boolean => {
  const clientId = getClientId(req);
  return blockedIPs.has(clientId);
};

// Login rate limiter - strict (relaxed for local development only)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // 100 in local dev, 5 in production (including Render)
  keyGenerator: getClientId,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => isBlocked(req), // Skip if already blocked
  handler: (req, res) => {
    const clientId = getClientId(req);
    trackFailedAttempt(clientId);
    
    logger.warn(`[RATE_LIMIT] Login limit exceeded for ${clientId}`);
    
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again in 15 minutes',
      retryAfter: 900
    });
  }
});

// PIN authentication rate limiter - very strict
export const pinAuthRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Only 3 PIN attempts per 5 minutes
  keyGenerator: (req) => {
    // Use device fingerprint + restaurant for PIN auth
    const restaurantId = req.headers['x-restaurant-id'] as string || 'unknown';
    return `${getClientId(req)}:${restaurantId}`;
  },
  message: 'Too many PIN attempts. Please contact your manager.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const clientId = getClientId(req);
    trackFailedAttempt(clientId);
    
    logger.error(`[SECURITY] Excessive PIN attempts from ${clientId}`);
    
    res.status(429).json({
      error: 'Too many PIN attempts',
      message: 'Account temporarily locked. Please contact your manager.',
      retryAfter: 300
    });
  }
});

// Password reset rate limiter
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  keyGenerator: (req) => {
    // Use email if provided, otherwise client ID
    const email = req.body?.email || '';
    return email || getClientId(req);
  },
  message: 'Too many password reset requests. Please check your email or try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[RATE_LIMIT] Password reset limit exceeded for ${getClientId(req)}`);
    
    res.status(429).json({
      error: 'Too many reset requests',
      message: 'Please check your email for existing reset links',
      retryAfter: 3600
    });
  }
});

// Token refresh rate limiter
export const tokenRefreshRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 refresh attempts per minute
  keyGenerator: getClientId,
  message: 'Too many token refresh attempts.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Registration rate limiter
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour per IP
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many registration attempts from this IP address.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[RATE_LIMIT] Registration limit exceeded for IP ${req.ip}`);
    
    res.status(429).json({
      error: 'Registration limit exceeded',
      message: 'Please try again in 1 hour',
      retryAfter: 3600
    });
  }
});

// Kiosk/Demo mode rate limiter - more lenient
export const kioskAuthRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 attempts per 5 minutes (customers might struggle)
  keyGenerator: (req) => {
    const restaurantId = req.headers['x-restaurant-id'] as string || 'unknown';
    return `kiosk:${restaurantId}:${req.ip}`;
  },
  message: 'Too many attempts. Please ask for assistance.',
  standardHeaders: true,
  legacyHeaders: false
});

// Station (kitchen/expo) auth rate limiter
export const stationAuthRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 attempts per 10 minutes
  keyGenerator: (req) => {
    const stationId = req.body?.stationId || req.headers['x-station-id'] || 'unknown';
    return `station:${stationId}:${req.ip}`;
  },
  message: 'Station authentication failed. Please contact IT support.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const stationId = req.body?.stationId || req.headers['x-station-id'] || 'unknown';
    logger.error(`[SECURITY] Station auth limit exceeded for ${stationId} from ${req.ip}`);
    
    res.status(429).json({
      error: 'Station locked',
      message: 'Too many failed attempts. Contact IT support.',
      retryAfter: 600
    });
  }
});

// Suspicious activity checker middleware
export const suspiciousActivityCheck = (req: Request, res: any, next: any) => {
  const clientId = getClientId(req);

  // 🔍 DIAGNOSTIC LOGGING
  logger.info('🔍 AUTH CHECK:', {
    clientId,
    ip: req.ip,
    isBlocked: blockedIPs.has(clientId),
    attempts: suspiciousIPs.get(clientId) || 0,
    endpoint: req.path,
    method: req.method,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']?.slice(0, 100)
    }
  });

  // Check if client is blocked
  if (blockedIPs.has(clientId)) {
    logger.error(`[SECURITY] Blocked client attempted access: ${clientId}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your access has been temporarily suspended due to suspicious activity.'
    });
  }

  // Check suspicious activity threshold
  const attempts = suspiciousIPs.get(clientId) || 0;
  if (attempts > 5) {
    logger.warn(`[SECURITY] Suspicious client activity: ${clientId} (${attempts} failed attempts)`);
  }

  next();
};

// Export all limiters as a group for easy application
export const authRateLimiters = {
  login: loginRateLimiter,
  pin: pinAuthRateLimiter,
  passwordReset: passwordResetRateLimiter,
  tokenRefresh: tokenRefreshRateLimiter,
  registration: registrationRateLimiter,
  kiosk: kioskAuthRateLimiter,
  station: stationAuthRateLimiter,
  checkSuspicious: suspiciousActivityCheck
};

/**
 * Start the rate limiter cleanup interval
 * IMPORTANT: Called during server initialization
 */
export function startRateLimiterCleanup(): void {
  if (cleanupInterval) {
    logger.warn('[SECURITY] Rate limiter cleanup already started');
    return;
  }

  // Cleanup old entries periodically (every hour)
  cleanupInterval = setInterval(() => {
    // Clean up old suspicious IPs (reset counts after 1 hour of no activity)
    for (const [clientId, attempts] of suspiciousIPs.entries()) {
      if (attempts < 3) { // Only clean up low-attempt entries
        suspiciousIPs.delete(clientId);
      }
    }

    logger.info(`[SECURITY] Rate limiter cleanup: Suspicious IPs: ${suspiciousIPs.size}, Blocked IPs: ${blockedIPs.size}`);
  }, 60 * 60 * 1000);

  logger.info('[SECURITY] Rate limiter cleanup interval started');
}

/**
 * Stop the rate limiter cleanup and clear all tracked IPs
 * CRITICAL: Must be called during server shutdown to prevent memory leaks
 */
export function stopRateLimiterCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[SECURITY] Rate limiter cleanup interval stopped');
  }

  // Clear all tracked data
  const suspiciousCount = suspiciousIPs.size;
  const blockedCount = blockedIPs.size;
  suspiciousIPs.clear();
  blockedIPs.clear();

  logger.info(`[SECURITY] Rate limiter data cleared: ${suspiciousCount} suspicious IPs, ${blockedCount} blocked IPs`);
}

// Start cleanup on module load
startRateLimiterCleanup();