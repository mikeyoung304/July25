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
export const nonceMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  res.locals['nonce'] = generateNonce();
  next();
};

// Enhanced security headers configuration
export const securityHeaders = () => {
  const isDevelopment = process.env['NODE_ENV'] !== 'production';
  
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
        scriptSrc: isDevelopment
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Development needs eval for HMR
          : ["'self'", (_req, res) => `'nonce-${(res as any).locals.nonce}'`],
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
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const maxBytes = parseSize(maxSize);
      
      if (bytes > maxBytes) {
        res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request entity too large. Maximum size: ${maxSize}`,
          }
        });
        return;
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
  return parseFloat(num || '0') * (units[unit] || 1);
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

    // Local logging
    logger.warn('Security event detected', {
      type: fullEvent.type,
      ip: fullEvent.ip,
      userId: fullEvent.userId,
      details: fullEvent.details,
      timestamp: fullEvent.timestamp,
    });

    // Forward to external logging services (non-blocking)
    this.forwardToExternalServices(fullEvent).catch(err => {
      logger.error('Failed to forward security event to external service', { error: err.message });
    });
  }

  private async forwardToExternalServices(event: SecurityEvent): Promise<void> {
    const promises: Promise<void>[] = [];

    // DataDog integration
    const datadogApiKey = process.env['DATADOG_API_KEY'];
    if (datadogApiKey) {
      promises.push(this.sendToDatadog(event, datadogApiKey));
    }

    // Sentry integration
    const sentryDsn = process.env['SENTRY_DSN'];
    if (sentryDsn) {
      promises.push(this.sendToSentry(event, sentryDsn));
    }

    // Fire and forget - don't await
    if (promises.length > 0) {
      Promise.allSettled(promises).catch(() => {
        // Silently fail - we don't want external logging to impact app
      });
    }
  }

  private async sendToDatadog(event: SecurityEvent, apiKey: string): Promise<void> {
    try {
      const payload = {
        ddsource: 'nodejs',
        ddtags: `env:${process.env['NODE_ENV'] || 'development'},service:restaurant-os`,
        hostname: process.env['HOSTNAME'] || 'unknown',
        message: `Security event: ${event.type}`,
        status: 'warn',
        service: 'restaurant-os',
        timestamp: event.timestamp.toISOString(),
        attributes: {
          security_event_type: event.type,
          ip_address: event.ip,
          user_id: event.userId,
          details: event.details,
        },
      };

      const response = await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        logger.debug('DataDog API returned non-OK status', { status: response.status });
      }
    } catch (err) {
      // Silent failure - external logging should not crash the app
      logger.debug('Failed to send security event to DataDog', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  private async sendToSentry(event: SecurityEvent, dsn: string): Promise<void> {
    try {
      // Parse DSN to extract project ID and key
      const dsnUrl = new URL(dsn);
      const publicKey = dsnUrl.username;
      const projectId = dsnUrl.pathname.substring(1);
      const sentryEndpoint = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/store/`;

      const payload = {
        event_id: crypto.randomBytes(16).toString('hex'),
        timestamp: Math.floor(event.timestamp.getTime() / 1000),
        platform: 'node',
        level: 'warning',
        logger: 'security-monitor',
        message: {
          formatted: `Security event: ${event.type}`,
        },
        tags: {
          security_event_type: event.type,
          ip_address: event.ip,
          environment: process.env['NODE_ENV'] || 'development',
        },
        extra: {
          user_id: event.userId,
          details: event.details,
        },
        server_name: process.env['HOSTNAME'] || 'unknown',
      };

      const response = await fetch(sentryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=custom-nodejs/1.0.0`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        logger.debug('Sentry API returned non-OK status', { status: response.status });
      }
    } catch (err) {
      // Silent failure - external logging should not crash the app
      logger.debug('Failed to send security event to Sentry', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
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
  res.locals['clientIp'] = clientIp;
  next();
};

// Suspicious activity detection
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction): void => {
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
      res.status(400).json({
        error: {
          code: 'SUSPICIOUS_REQUEST',
          message: 'Request blocked due to suspicious patterns',
        }
      });
      return;
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