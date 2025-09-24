import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

describe('Security Proof: CORS Allow-List', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();

    // Explicit CORS allow-list (NO wildcards or regex)
    const allowedOrigins: string[] = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://july25-client.vercel.app',
      'https://rebuild-60.vercel.app',
    ];

    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Only allow explicitly listed origins - no wildcards
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    }));

    // Test endpoint
    app.get('/api/test', (_req, res) => {
      res.json({ success: true });
    });
  });

  describe('Allowed Origins', () => {
    it('should accept request from localhost:5173', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should accept request from july25-client.vercel.app', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://july25-client.vercel.app')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(response.headers['access-control-allow-origin']).toBe('https://july25-client.vercel.app');
    });

    it('should accept request from rebuild-60.vercel.app', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://rebuild-60.vercel.app')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(response.headers['access-control-allow-origin']).toBe('https://rebuild-60.vercel.app');
    });

    it('should accept request with no origin header', async () => {
      const response = await request(app)
        .get('/api/test')
        // No Origin header
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('Rejected Origins', () => {
    it('should reject request from evil.example', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://evil.example')
        .expect(500); // CORS error results in 500

      // CORS errors don't return body
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject request from random Vercel preview', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://random-app-xyz123.vercel.app')
        .expect(500);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject request from subdomain of allowed domain', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://evil.july25-client.vercel.app')
        .expect(500);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject request with wildcard pattern attempt', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://*.vercel.app')
        .expect(500);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject request from localhost on different port', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:8080')
        .expect(500);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS preflight for allowed origin', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://july25-client.vercel.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('https://july25-client.vercel.app');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should reject OPTIONS preflight for disallowed origin', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://malicious.site')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(500);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});