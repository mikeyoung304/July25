import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const csrfLogger = logger.child({ module: 'csrf' });

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF cookie on initial page load / login
 * Returns the generated token for potential inline use
 */
export function setCsrfCookie(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,  // Must be readable by JavaScript to send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours (matches auth token expiry)
    path: '/'
  });
  return token;
}

/**
 * Clear CSRF cookie on logout
 */
export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

/**
 * Validate CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 * Uses timing-safe comparison to prevent timing attacks
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    csrfLogger.warn('CSRF token missing', {
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      path: req.path,
      method: req.method
    });
    res.status(403).json({ error: 'CSRF token required' });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const cookieBuffer = Buffer.from(cookieToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    if (cookieBuffer.length !== headerBuffer.length ||
        !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
      csrfLogger.warn('CSRF token mismatch', {
        path: req.path,
        method: req.method
      });
      res.status(403).json({ error: 'CSRF token invalid' });
      return;
    }
  } catch (err) {
    csrfLogger.error('CSRF validation error', { error: err });
    res.status(403).json({ error: 'CSRF validation failed' });
    return;
  }

  next();
}

/**
 * Middleware that exempts routes from CSRF protection
 * Use for webhook endpoints that need raw body access
 */
export function csrfExempt(req: Request, _res: Response, next: NextFunction): void {
  // Mark request as CSRF exempt
  (req as any).csrfExempt = true;
  next();
}

/**
 * CSRF protection with exemption support
 * Checks for csrfExempt flag set by csrfExempt middleware
 */
export function csrfProtectionWithExempt(req: Request, res: Response, next: NextFunction): void {
  // Skip if route is exempt
  if ((req as any).csrfExempt) {
    return next();
  }

  return csrfProtection(req, res, next);
}
