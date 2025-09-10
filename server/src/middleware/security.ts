import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Comprehensive security middleware for Restaurant OS
 * Implements defense-in-depth security strategy
 */

// Generate nonce for CSP
export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

// Add nonce to response locals for CSP
export const nonceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.locals.nonce = generateNonce();
  next();
};

// Enhanced security headers configuration
export const securityHeaders = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
        scriptSrc: isDevelopment 
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Development needs eval for HMR
          : ["'self'", (req, res) => `'nonce-${(res as any).locals.nonce}'`],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:", "https://api.openai.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        ...(isDevelopment ? {} : { upgradeInsecureRequests: [] }),
      },
    },
    
    // Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    
    // Additional security headers
    crossOriginEmbedderPolicy: !isDevelopment,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    originAgentCluster: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Frame Options (clickjacking protection)
    frameguard: { action: 'deny' },
    
    // Hide powered by Express
    hidePoweredBy: true,
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff
    noSniff: true,
    
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // XSS Filter
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
    if (process.env.NODE_ENV === 'development') {
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
    if (process.env.NODE_ENV === 'production' && suspicious.length > 1) {
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
export const applySecurity = (app: any) => {
  // Apply in order
  app.use(extractIP);
  app.use(nonceMiddleware);
  app.use(securityHeaders());
  app.use(requestSizeLimit('10mb'));
  app.use(detectSuspiciousActivity);
};

// Export for use in routes
export default {
  applySecurity,
  securityMonitor,
  generateNonce,
  nonceMiddleware,
  securityHeaders,
  requestSizeLimit,
  extractIP,
  detectSuspiciousActivity,
};