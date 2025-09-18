import type { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../utils/logger';
import cors, { CorsOptions } from 'cors';
import { apiLimiter } from './rateLimiter';

/**
 * Comprehensive security middleware for Restaurant OS
 * Implements defense-in-depth security strategy
 */

// Enhanced security headers configuration
export const securityHeaders = (allowedOrigins: string[]) => {
  const isDevelopment = process.env['NODE_ENV'] !== 'production';
  const connectSources = new Set(["'self'", 'https:', 'wss:', 'ws:']);
  allowedOrigins
    .filter(Boolean)
    .forEach(origin => connectSources.add(origin));

  const scriptSrc = isDevelopment
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'"];

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: Array.from(connectSources),
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: !isDevelopment,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    originAgentCluster: true,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });
};

// Request size limiting
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const maxBytes = parseSize(maxSize);
      
      if (bytes > maxBytes) {
        return res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request entity too large. Maximum size: ${maxSize}`,
          }
        });
      }
    }
    next();
  };
};

// Parse size string to bytes
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const [, num, unit = 'b'] = match;
  return parseFloat(num) * (units[unit] || 1);
};

// Security event logging
export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'csrf_violation' | 'suspicious_activity';
  ip: string;
  userId?: string;
  details: any;
  timestamp: Date;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 10000;
  
  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    this.events.push(fullEvent);
    
    // Prevent memory leak
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Log security events in development
    if (process.env['NODE_ENV'] === 'development') {
      logger.info('[SECURITY] Security event logged', fullEvent);
    }
    
    // TODO: Send to logging service (Datadog, Sentry, etc.)
  }
  
  getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    if (!filter) return [...this.events];
    
    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        return (event as any)[key] === value;
      });
    });
  }
  
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > oneHourAgo);
    const dailyEvents = this.events.filter(e => e.timestamp.getTime() > oneDayAgo);
    
    return {
      total: this.events.length,
      lastHour: recentEvents.length,
      last24Hours: dailyEvents.length,
      byType: this.groupByType(dailyEvents),
    };
  }
  
  private groupByType(events: SecurityEvent[]) {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const securityMonitor = new SecurityMonitor();

// IP extraction middleware
export const extractIP = (req: Request, res: Response, next: NextFunction) => {
  // Store IP in res.locals instead of trying to override req.ip
  const clientIp = req.headers['x-forwarded-for'] as string || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.ip ||
                   '';
  res.locals.clientIp = clientIp;
  next();
};

// Suspicious activity detection
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const suspicious = [];
  
  // Check for SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b|--|\/\*|\*\/|xp_|sp_|0x)/gi;
  const url = req.url + JSON.stringify(req.body || {});
  
  if (sqlPatterns.test(url)) {
    suspicious.push('SQL injection attempt');
  }
  
  // Check for XSS patterns
  const xssPatterns = /<script|javascript:|onerror=|onload=|<iframe|<embed|<object/gi;
  if (xssPatterns.test(url)) {
    suspicious.push('XSS attempt');
  }
  
  // Check for path traversal
  const pathTraversalPatterns = /\.\.[\/\\]|\.\.%2[fF]|%2e%2e/g;
  if (pathTraversalPatterns.test(req.url)) {
    suspicious.push('Path traversal attempt');
  }
  
  // Check for unusual user agents
  const userAgent = req.headers['user-agent'] || '';
  const suspiciousAgents = /sqlmap|nikto|nmap|masscan|metasploit/i;
  if (suspiciousAgents.test(userAgent)) {
    suspicious.push('Suspicious user agent');
  }
  
  if (suspicious.length > 0) {
    securityMonitor.logEvent({
      type: 'suspicious_activity',
      ip: req.ip || 'unknown',
      userId: (req as any).user?.id,
      details: {
        patterns: suspicious,
        url: req.url,
        method: req.method,
        userAgent,
      },
    });
    
    // In production, you might want to block these requests
    if (process.env['NODE_ENV'] === 'production' && suspicious.length > 1) {
      return res.status(400).json({
        error: {
          code: 'SUSPICIOUS_REQUEST',
          message: 'Request blocked due to suspicious patterns',
        }
      });
    }
  }
  
  next();
};

// Apply all security middleware
const buildAllowedOrigins = (): string[] => {
  const origins = new Set<string>();

  const addOrigin = (value?: string) => {
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed) origins.add(trimmed);
  };

  const corsOrigins = process.env['CORS_ORIGINS'];
  if (corsOrigins) {
    corsOrigins.split(',').forEach(origin => addOrigin(origin));
  }

  // Backwards compatibility with existing env vars
  addOrigin(process.env['FRONTEND_URL']);
  const legacyOrigins = process.env['ALLOWED_ORIGINS'];
  if (legacyOrigins) {
    legacyOrigins.split(',').forEach(origin => addOrigin(origin));
  }

  if (origins.size === 0 && process.env['NODE_ENV'] !== 'production') {
    addOrigin('http://localhost:5173');
    addOrigin('http://127.0.0.1:5173');
  }

  return Array.from(origins);
};

const createCorsMiddleware = (allowedOrigins: string[]) => {
  const options: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn('⚠️ CORS blocked origin', { origin });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Restaurant-ID',
      'x-restaurant-id',
      'x-request-id',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset'],
    maxAge: 86400,
  };

  return cors(options);
};

export const installSecurity = (app: Express) => {
  const allowedOrigins = buildAllowedOrigins();
  const corsMiddleware = createCorsMiddleware(allowedOrigins);

  logger.info('🔐 CORS allowed origins', { allowedOrigins });

  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  app.use(extractIP);
  app.use(securityHeaders(allowedOrigins));
  app.use(requestSizeLimit('10mb'));
  app.use(detectSuspiciousActivity);
  app.use('/api', apiLimiter);
};

export const applySecurity = installSecurity;

// Export for use in routes
export default {
  installSecurity,
  applySecurity,
  securityMonitor,
  securityHeaders,
  requestSizeLimit,
  extractIP,
  detectSuspiciousActivity,
  buildAllowedOrigins,
};
