import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict'
  }
});

// Middleware to conditionally apply CSRF based on environment
export function csrfMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF in development for easier testing
    if (process.env['NODE_ENV'] === 'development') {
      logger.debug('CSRF protection skipped in development mode');
      return next();
    }

    // Skip CSRF for certain paths
    const skipPaths = [
      '/api/v1/health',
      '/api/v1/auth/demo',
      '/api/v1/realtime/session' // WebRTC doesn't need CSRF
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Apply CSRF protection
    csrfProtection(req, res, next);
  };
}

// Middleware to provide CSRF token to client
export function csrfToken(req: Request, res: Response) {
  res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
}

// Error handler for CSRF token errors
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  logger.warn('CSRF token validation failed', {
    ip: req.ip,
    path: req.path,
    method: req.method
  });

  res.status(403).json({
    error: 'Invalid CSRF token',
    message: 'Form submission failed. Please refresh and try again.'
  });
}