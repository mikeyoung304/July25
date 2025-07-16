import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthenticatedRequest } from './auth';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'Too many requests from this restaurant/IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for voice orders
export const voiceOrderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 voice orders per minute
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'Voice ordering rate limit exceeded. Please wait a moment before placing another order.',
  standardHeaders: true,
  legacyHeaders: false,
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
  max: 20, // Max 20 AI requests per 5 minutes
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'AI service rate limit exceeded. Please wait before making more requests.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Transcription rate limiter (more restrictive due to cost)
export const transcriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Max 5 transcriptions per minute
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'Transcription rate limit exceeded. Please wait before transcribing more audio.',
  standardHeaders: true,
  legacyHeaders: false,
});