import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Security Headers Middleware
 * Implements CSP, HSTS, and other security headers for production
 */

interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  isDevelopment: boolean;
}

// Generate nonce for inline scripts (if needed)
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Content Security Policy configuration
export function getCSPDirectives(nonce?: string): string {
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      process.env['NODE_ENV'] === 'development' ? "'unsafe-inline'" : `'nonce-${nonce}'`,
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://*.sentry.io',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for React inline styles
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.stripe.com',
      'https://*.supabase.co',
      'https://*.googleapis.com',
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.openai.com',
      'https://*.stripe.com',
      'https://*.sentry.io',
      'wss://localhost:*', // Development WebSocket
      process.env['VITE_API_BASE_URL'] || '',
    ],
    'media-src': [
      "'self'",
      'blob:',
      'https://*.supabase.co',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'frame-src': [
      'https://checkout.stripe.com',
      'https://hooks.stripe.com',
    ],
    'worker-src': [
      "'self'",
      'blob:',
    ],
    'manifest-src': ["'self'"],
    'upgrade-insecure-requests': process.env['NODE_ENV'] === 'production' ? [''] : [],
  };

  // Build CSP string
  return Object.entries(directives)
    .filter(([_, values]) => values.length > 0)
    .map(([directive, values]) => {
      if (directive === 'upgrade-insecure-requests' && values[0] === '') {
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

export function securityHeaders(config?: Partial<SecurityConfig>) {
  const settings: SecurityConfig = {
    enableCSP: process.env['CSP_ENABLED'] === 'true' || process.env['NODE_ENV'] === 'production',
    enableHSTS: process.env['HSTS_ENABLED'] === 'true' || process.env['NODE_ENV'] === 'production',
    isDevelopment: process.env['NODE_ENV'] === 'development',
    ...config,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate nonce for this request
    const nonce = settings.enableCSP && !settings.isDevelopment ? generateNonce() : undefined;
    
    // Store nonce in res.locals for use in templates
    if (nonce) {
      res.locals.nonce = nonce;
    }

    // Content Security Policy
    if (settings.enableCSP) {
      const cspDirectives = process.env['CSP_DIRECTIVES'] || getCSPDirectives(nonce);
      res.setHeader('Content-Security-Policy', cspDirectives);
      
      // Report-only mode for development
      if (settings.isDevelopment) {
        res.setHeader('Content-Security-Policy-Report-Only', cspDirectives);
      }
    }

    // HTTP Strict Transport Security
    if (settings.enableHSTS && !settings.isDevelopment) {
      const maxAge = process.env['HSTS_MAX_AGE'] || '31536000'; // 1 year
      res.setHeader('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains; preload`);
    }

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS Protection (for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 
      'accelerometer=(), ' +
      'camera=(), ' +
      'geolocation=(self), ' +
      'gyroscope=(), ' +
      'magnetometer=(), ' +
      'microphone=(self), ' + // For voice ordering
      'payment=(self), ' + // For Square payments
      'usb=(), ' +
      'interest-cohort=()' // Opt out of FLoC
    );

    // DNS Prefetch Control
    res.setHeader('X-DNS-Prefetch-Control', 'on');

    // Download Options for IE
    res.setHeader('X-Download-Options', 'noopen');

    // Permitted Cross-Domain Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove powered by header
    res.removeHeader('X-Powered-By');

    // Add custom security headers for API
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
  };
}

// CORS configuration for production
export function getCORSOptions() {
  const allowedOrigins = [
    process.env['CLIENT_URL'],
    process.env['FRONTEND_URL'],
    'https://checkout.stripe.com',
  ].filter(Boolean);

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (process.env['NODE_ENV'] === 'development' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Restaurant-Id',
      'X-Session-Id',
      'X-Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}

// Rate limiting headers
export function addRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: Date
) {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
  res.setHeader('Retry-After', Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString());
}

export default securityHeaders;