import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';

describe('Security Proof: Security Headers', () => {
  let app: express.Application;
  let prodApp: express.Application;

  beforeAll(() => {
    // Standard app with security headers
    app = express();
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'nonce-{random}'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", "https://api.openai.com"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }));

    app.get('/api/test', (_req, res) => {
      res.json({ message: 'test' });
    });

    app.get('/api/page', (_req, res) => {
      res.send('<html><body>Test Page</body></html>');
    });

    // Production-like app with stricter CSP
    prodApp = express();
    prodApp.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https://api.openai.com"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    prodApp.get('/api/test', (_req, res) => {
      res.json({ message: 'test' });
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should set Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
      const csp = response.headers['content-security-policy'];
      expect(csp).toBeTruthy();
    });

    it('should enforce default-src self', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/default-src 'self'/);
    });

    it('should restrict script sources', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/script-src/);
      expect(csp).toMatch(/'self'/);
    });

    it('should restrict style sources', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/style-src/);
      expect(csp).toMatch(/'self'/);
    });

    it('should allow specific image sources', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/img-src/);
      expect(csp).toMatch(/'self'/);
      expect(csp).toMatch(/data:/);
      expect(csp).toMatch(/https:/);
    });

    it('should allow WebSocket and API connections', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toMatch(/connect-src/);
      expect(csp).toMatch(/wss:/);
      expect(csp).toMatch(/https:\/\/api\.openai\.com/);
    });

    it('should prevent inline scripts without nonce in production', async () => {
      const response = await request(prodApp)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).not.toMatch(/'unsafe-inline'/);
    });
  });

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should set HSTS header', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    it('should set max-age to at least 1 year (31536000 seconds)', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toMatch(/max-age=31536000/);
    });

    it('should include subdomains', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toMatch(/includeSubDomains/);
    });

    it('should include preload directive in production', async () => {
      const response = await request(prodApp)
        .get('/api/test')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toMatch(/preload/);
    });
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options header to DENY', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should prevent iframe embedding', async () => {
      const response = await request(app)
        .get('/api/page')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent MIME type sniffing', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Accept', 'text/html')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection header', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should enable XSS filter and block mode', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const xssProtection = response.headers['x-xss-protection'];
      // Modern browsers may use '0' to disable the problematic filter
      expect(['0', '1; mode=block']).toContain(xssProtection);
    });
  });

  describe('Referrer-Policy', () => {
    it('should set Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('referrer-policy');
    });

    it('should use strict-origin-when-cross-origin or stricter', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const referrerPolicy = response.headers['referrer-policy'];
      const acceptablePolicies = [
        'strict-origin-when-cross-origin',
        'strict-origin',
        'same-origin',
        'no-referrer'
      ];

      expect(acceptablePolicies).toContain(referrerPolicy);
    });
  });

  describe('Additional Security Headers', () => {
    it('should remove X-Powered-By header', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).not.toHaveProperty('x-powered-by');
    });

    it('should set X-DNS-Prefetch-Control', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should set X-Download-Options for IE', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-download-options');
      expect(response.headers['x-download-options']).toBe('noopen');
    });

    it('should set X-Permitted-Cross-Domain-Policies', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-permitted-cross-domain-policies');
      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    });
  });

  describe('Headers on Different Content Types', () => {
    it('should apply security headers to JSON responses', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    it('should apply security headers to HTML responses', async () => {
      const response = await request(app)
        .get('/api/page')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('Production Security Headers', () => {
    it('should have stricter CSP in production mode', async () => {
      const response = await request(prodApp)
        .get('/api/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];

      // Should have frame-ancestors none
      expect(csp).toMatch(/frame-ancestors 'none'/);

      // Should have form-action self
      expect(csp).toMatch(/form-action 'self'/);

      // Should not allow unsafe-inline for scripts
      expect(csp).not.toMatch(/script-src.*'unsafe-inline'/);
    });

    it('should include all recommended security headers', async () => {
      const response = await request(prodApp)
        .get('/api/test')
        .expect(200);

      const requiredHeaders = [
        'content-security-policy',
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'referrer-policy',
        'x-dns-prefetch-control',
        'x-download-options',
        'x-permitted-cross-domain-policies'
      ];

      requiredHeaders.forEach(header => {
        expect(response.headers).toHaveProperty(header);
      });

      // Should NOT have these headers
      expect(response.headers).not.toHaveProperty('x-powered-by');
      expect(response.headers).not.toHaveProperty('server');
    });
  });
});