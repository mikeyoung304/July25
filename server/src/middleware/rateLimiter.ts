import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthenticatedRequest } from './auth';

// Only disable rate limiting in local development
const isDevelopment = process.env['NODE_ENV'] === 'development' && process.env['RENDER'] !== 'true';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120, // 120 requests per IP per minute
  keyGenerator: (req: Request) => req.ip || 'anonymous',
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for voice orders
export const voiceOrderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 100, // Higher limit in dev
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'Voice ordering rate limit exceeded. Please wait a moment before placing another order.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDevelopment, // Skip in development
});

// Even stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 auth attempts per window
  keyGenerator: (req: Request) => req.ip || 'anonymous',
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth
});

// Health check rate limiter (to prevent monitoring abuse)
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 health checks per minute
  keyGenerator: (req: Request) => req.ip || 'anonymous',
  message: 'Health check rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
});

// AI service rate limiter (to prevent abuse of expensive AI operations)
export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 100 : 50, // Strict limit to prevent cost explosion
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'AI service rate limit exceeded. Please wait before making more requests.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDevelopment, // Skip in development
  handler: (req, res) => {
    // Log potential abuse for monitoring
    console.error(`[RATE_LIMIT] AI service limit exceeded for ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Too many AI requests. Please wait 5 minutes.',
      retryAfter: 300
    });
  }
});

// Transcription rate limiter (more restrictive due to cost)
export const transcriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 30 : 20, // Very strict - transcription is expensive
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'Transcription rate limit exceeded. Please wait before transcribing more audio.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDevelopment, // Skip in development
  handler: (req, res) => {
    // Log potential abuse for monitoring
    console.error(`[RATE_LIMIT] Transcription limit exceeded for ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Too many transcription requests. Please wait 1 minute.',
      retryAfter: 60
    });
  }
});
