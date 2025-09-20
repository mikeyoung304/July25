/**
 * Request Sanitization Middleware
 * 
 * Sanitizes incoming requests to prevent injection attacks and data corruption
 */

import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import validator from 'validator';
import { logger } from '../utils/logger';

// XSS sanitization options
const xssOptions = {
  whiteList: {}, // No HTML tags allowed by default
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

// Fields that should never be sanitized (e.g., passwords, tokens)
const SKIP_FIELDS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'jwt',
  'authorization',
  'x-csrf-token',
]);

// Fields that might contain legitimate HTML/code
const ALLOW_HTML_FIELDS = new Set([
  'description',
  'notes',
  'instructions',
  'specialInstructions',
]);

/**
 * Deep sanitize an object recursively
 */
function sanitizeObject(obj: any, path: string = ''): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string') {
    const fieldName = path.split('.').pop() || '';
    
    // Skip sensitive fields
    if (SKIP_FIELDS.has(fieldName.toLowerCase())) {
      return obj;
    }
    
    // Allow HTML in specific fields but still sanitize
    if (ALLOW_HTML_FIELDS.has(fieldName)) {
      return xss(obj, {
        whiteList: {
          p: [], br: [], strong: [], em: [], u: [], 
          ul: [], ol: [], li: [], span: []
        },
        stripIgnoreTag: true,
      });
    }
    
    // Strict sanitization for everything else
    let sanitized = xss(obj, xssOptions);
    
    // Additional validation based on field name
    if (fieldName.includes('email')) {
      sanitized = validator.normalizeEmail(sanitized) || sanitized;
    } else if (fieldName.includes('url')) {
      if (!validator.isURL(sanitized, { require_protocol: false })) {
        logger.warn(`Invalid URL detected: ${sanitized}`);
        sanitized = '';
      }
    } else if (fieldName.includes('phone')) {
      // Remove non-numeric characters from phone numbers
      sanitized = sanitized.replace(/[^\d+\-() ]/g, '');
    }
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Log if sanitization changed the value
    if (sanitized !== obj && process.env.NODE_ENV === 'development') {
      logger.debug(`Sanitized field ${path}: "${obj}" -> "${sanitized}"`);
    }
    
    return sanitized;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      sanitized[key] = sanitizeObject(value, newPath);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate and sanitize request parameters
 */
function sanitizeParams(params: any): any {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(params)) {
    // Sanitize key (parameter names shouldn't have special characters)
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_\-]/g, '');
    
    if (sanitizedKey !== key) {
      logger.warn(`Suspicious parameter name blocked: ${key}`);
      continue;
    }
    
    // Sanitize value
    if (typeof value === 'string') {
      // URL decode and sanitize
      try {
        const decoded = decodeURIComponent(value);
        sanitized[sanitizedKey] = validator.escape(decoded);
      } catch {
        sanitized[sanitizedKey] = validator.escape(value);
      }
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check for common injection patterns
 */
function detectInjectionPatterns(data: string): string[] {
  const patterns = [];
  
  // NoSQL injection patterns
  const noSqlPatterns = /\$where|\$regex|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$type/gi;
  if (noSqlPatterns.test(data)) {
    patterns.push('NoSQL injection');
  }
  
  // Command injection patterns
  const cmdPatterns = /;|\||&&|\$\(|`|\\n|\\r/g;
  if (cmdPatterns.test(data)) {
    patterns.push('Command injection');
  }
  
  // LDAP injection patterns
  const ldapPatterns = /[*()\\|&=]/g;
  if (ldapPatterns.test(data)) {
    patterns.push('LDAP injection');
  }
  
  // XML injection patterns
  const xmlPatterns = /<!DOCTYPE|<!ENTITY|SYSTEM|PUBLIC|<\?xml/gi;
  if (xmlPatterns.test(data)) {
    patterns.push('XML injection');
  }
  
  return patterns;
}

/**
 * Main sanitization middleware
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip sanitization for specific content types
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // File uploads handled separately
      return next();
    }
    
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      const bodyString = JSON.stringify(req.body);
      const injectionPatterns = detectInjectionPatterns(bodyString);
      
      if (injectionPatterns.length > 0) {
        logger.warn(`Potential injection detected: ${injectionPatterns.join(', ')}`, {
          ip: req.ip,
          url: req.url,
          method: req.method,
        });
        
        // In production, you might want to block these
        if (process.env.NODE_ENV === 'production' && injectionPatterns.length > 1) {
          return res.status(400).json({
            error: 'Invalid request data detected',
            code: 'INVALID_INPUT'
          });
        }
      }
      
      req.body = sanitizeObject(req.body, 'body');
    }
    
    // Sanitize query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = sanitizeParams(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && Object.keys(req.params).length > 0) {
      req.params = sanitizeParams(req.params);
    }
    
    // Sanitize headers (only specific ones that might contain user input)
    const userInputHeaders = ['x-forwarded-for', 'referer', 'origin'];
    for (const header of userInputHeaders) {
      if (req.headers[header] && typeof req.headers[header] === 'string') {
        req.headers[header] = validator.escape(req.headers[header] as string);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error in request sanitization:', error);
    // Don't block the request on sanitization error
    next();
  }
};

/**
 * Strict sanitization for critical operations
 */
export const strictSanitize = (req: Request, res: Response, next: NextFunction) => {
  // Apply regular sanitization first
  sanitizeRequest(req, res, (err?: any) => {
    if (err) return next(err);
    
    // Additional strict checks
    const allData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Check length to prevent buffer overflow
    if (allData.length > 100000) { // 100KB limit
      return res.status(413).json({
        error: 'Request too large',
        code: 'PAYLOAD_TOO_LARGE'
      });
    }
    
    // Check for binary data in text fields
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(allData)) {
      logger.warn('Binary data in text fields detected', {
        ip: req.ip,
        url: req.url,
      });
      
      return res.status(400).json({
        error: 'Invalid characters in request',
        code: 'INVALID_CHARACTERS'
      });
    }
    
    next();
  });
};

/**
 * Sanitize output before sending to client
 */
export const sanitizeResponse = (data: any): any => {
  // Don't sanitize non-objects
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Deep clone to avoid modifying original
  const cloned = JSON.parse(JSON.stringify(data));
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordHash',
    'salt',
    'token',
    'secret',
    'api_key',
    'private_key',
    'refresh_token',
  ];
  
  function removeSensitive(obj: any) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const field of sensitiveFields) {
      delete obj[field];
      delete obj[field.toLowerCase()];
      delete obj[field.replace(/_/g, '')];
    }
    
    for (const value of Object.values(obj)) {
      if (typeof value === 'object') {
        removeSensitive(value);
      }
    }
  }
  
  removeSensitive(cloned);
  
  return cloned;
};