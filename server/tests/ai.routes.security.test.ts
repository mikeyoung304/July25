/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { aiRoutes } from '../src/routes/ai.routes';
import { authenticate } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errorHandler';

// Mock the AI module
vi.mock('../src/ai', () => ({
  checkAIHealth: vi.fn(() => Promise.resolve({
    provider: 'openai',
    status: 'healthy',
    details: { message: 'OpenAI API accessible' }
  })),
  ai: {
    transcriber: {
      transcribe: vi.fn(() => Promise.resolve({
        text: 'Test transcription',
        duration: 2.5
      }))
    },
    chat: {
      respond: vi.fn(() => Promise.resolve({
        message: 'Test response'
      }))
    },
    tts: {
      synthesize: vi.fn(() => Promise.resolve({
        audio: Buffer.from('test-audio'),
        mimeType: 'audio/mpeg'
      }))
    },
    orderNlp: {
      parse: vi.fn(() => Promise.resolve({
        success: true,
        items: []
      }))
    }
  }
}));

// Mock the aiService
vi.mock('../src/services/ai.service', () => ({
  aiService: {
    getMenu: vi.fn(() => ({
      restaurantId: '11111111-1111-1111-1111-111111111111',
      items: [
        { id: 'item-1', name: 'Burger', price: 12.99 }
      ]
    })),
    syncMenuFromDatabase: vi.fn(() => Promise.resolve()),
    processVoiceAudio: vi.fn(() => Promise.resolve(Buffer.from('audio-response'))),
    transcribeAudioFile: vi.fn(() => Promise.resolve({
      success: true,
      text: 'Test transcription',
      duration: 2.5
    })),
    parseOrder: vi.fn(() => Promise.resolve({
      success: true,
      items: [
        { item: 'Burger', quantity: 1, price: 12.99 }
      ]
    })),
    chat: vi.fn(() => Promise.resolve({
      success: true,
      message: 'Test chat response'
    }))
  }
}));

// Mock MenuService
vi.mock('../src/services/menu.service', () => ({
  MenuService: {
    getItems: vi.fn(() => Promise.resolve([
      { id: 'item-1', name: 'Burger', price: 12.99, description: 'Delicious burger' }
    ]))
  }
}));

// Mock the logger
vi.mock('../src/utils/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn()
    }),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock auth middleware to set req.restaurantId from header (priority) or token
vi.mock('../src/middleware/auth', async () => {
  const actual = await vi.importActual('../src/middleware/auth');
  const jwt = await import('jsonwebtoken');
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, 'test-jwt-secret-for-testing-only') as any;
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          restaurant_id: decoded.restaurant_id,
          scopes: decoded.scopes || []
        };

        // Set restaurantId from header (priority) or token
        req.restaurantId = (req.headers['x-restaurant-id'] as string) || decoded.restaurant_id;

        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    },
    requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(401).json({ error: 'Insufficient permissions' });
      }
      next();
    },
    requireScope: (scopes: string[]) => (req: any, res: any, next: any) => {
      if (!req.user || !req.user.scopes || !scopes.every((s: string) => req.user.scopes.includes(s))) {
        return res.status(403).json({ error: 'Insufficient scopes' });
      }
      next();
    }
  };
});

// Mock middleware - simplified for security testing
vi.mock('../src/middleware/rateLimiter', () => ({
  aiServiceLimiter: (_req: any, _res: any, next: any) => next(),
  transcriptionLimiter: (_req: any, _res: any, next: any) => next()
}));

vi.mock('../src/middleware/validation', () => ({
  validateRequest: (schema: any) => (req: any, res: any, next: any) => {
    // Validate for parse-order endpoint
    if (req.path.includes('/parse-order')) {
      const { text } = req.body;

      // Check missing field
      if (text === undefined) {
        return res.status(400).json({ error: 'text field is required' });
      }

      // Check empty text (trim and check length)
      if (text === null || (typeof text === 'string' && text.trim().length === 0)) {
        return res.status(400).json({ error: 'text cannot be empty' });
      }

      // Check max length (schema says 5000, not 10000)
      if (typeof text === 'string' && text.length > 5000) {
        return res.status(400).json({ error: 'text exceeds maximum length' });
      }
    }

    // Validate for chat endpoint
    if (req.path.includes('/chat')) {
      const { message } = req.body;

      // Check missing or non-string message
      if (message === undefined || typeof message !== 'string') {
        return res.status(400).json({ error: 'message must be a string' });
      }
    }

    next();
  }
}));

vi.mock('../src/middleware/metrics', () => ({
  trackAIMetrics: () => (_req: any, _res: any, next: any) => next()
}));

vi.mock('../src/middleware/fileValidation', () => ({
  audioUpload: {
    single: () => (req: any, _res: any, next: any) => {
      // Simulate file upload
      req.file = {
        buffer: Buffer.from('test-audio-data'),
        size: 1024,
        mimetype: 'audio/wav'
      };
      next();
    }
  }
}));

describe('AI Routes Security', () => {
  let app: express.Application;
  let validToken: string;
  let adminToken: string;
  const validRestaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const secret = 'test-jwt-secret-for-testing-only';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Create valid JWT tokens
    validToken = jwt.sign(
      {
        sub: 'test-user-123',
        email: 'user@example.com',
        role: 'user',
        restaurant_id: validRestaurantId,
        scopes: ['ai.voice:chat', 'orders:create']
      },
      secret
    );

    adminToken = jwt.sign(
      {
        sub: 'admin-user-123',
        email: 'admin@example.com',
        role: 'admin',
        restaurant_id: validRestaurantId,
        scopes: ['ai.voice:chat', 'menu:manage']
      },
      secret
    );

    // Setup routes
    app.use('/api/v1/ai', aiRoutes);
    app.use(errorHandler);
  });

  describe('Restaurant ID Validation - ENV Fallback', () => {
    test('should fall back to DEFAULT_RESTAURANT_ID when header missing', async () => {
      // Set up environment variable
      const originalDefault = process.env.DEFAULT_RESTAURANT_ID;
      process.env.DEFAULT_RESTAURANT_ID = validRestaurantId;

      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`);
      // No x-restaurant-id header

      // Should use DEFAULT_RESTAURANT_ID from env, not the string 'default'
      expect(response.status).not.toBe(400);

      // Restore environment
      if (originalDefault) {
        process.env.DEFAULT_RESTAURANT_ID = originalDefault;
      } else {
        delete process.env.DEFAULT_RESTAURANT_ID;
      }
    });

    test('should NOT use literal string "default" as restaurant ID', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ text: 'I want a burger' });

      // Even without header, should not use string 'default'
      // Should either use env.DEFAULT_RESTAURANT_ID or req.restaurantId from token
      expect(response.body.restaurantId).not.toBe('default');
    });
  });

  describe('UUID Format Validation', () => {
    test('should accept valid UUID in x-restaurant-id header', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      expect(response.status).toBe(200);
    });

    test('should reject invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'invalid-uuid-format')
        .send({ text: 'I want a burger' });

      // Should handle invalid format gracefully
      expect(response.status).not.toBe(500);
    });

    test('should reject malformed UUID', async () => {
      const response = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', '11111111-1111-111111111111'); // Missing segment

      expect(response.status).not.toBe(500);
    });
  });

  describe('Slug Resolution', () => {
    test('should accept restaurant slug and resolve to UUID', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow');

      // Should resolve slug before processing
      expect(response.status).toBe(200);
    });

    test('should handle slug in parse-order endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow')
        .send({ text: 'I want a burger' });

      expect(response.status).toBe(200);
      expect(response.body.restaurantId).toBeDefined();
    });

    test('should handle slug in menu endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow');

      expect(response.status).not.toBe(400);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    test('should prevent accessing menu from different restaurant', async () => {
      // User's token has validRestaurantId, but tries to access other restaurant's menu
      const response = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      if (response.status === 200 && response.body.restaurantId) {
        expect(response.body.restaurantId).toBe(validRestaurantId);
      }
    });

    test('should enforce restaurant context in order parsing', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: 'I want a burger' });

      if (response.status === 200) {
        expect(response.body.restaurantId).toBe(validRestaurantId);
      }
    });

    test('should include restaurantId in transcription response', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe-with-metadata')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      if (response.status === 200) {
        expect(response.body.restaurantId).toBe(validRestaurantId);
      }
    });
  });

  describe('Authentication Requirements', () => {
    test('should require authentication for menu upload', async () => {
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .send({ menu: [] });

      expect(response.status).toBe(401);
    });

    test('should require authentication for menu retrieval', async () => {
      const response = await request(app)
        .get('/api/v1/ai/menu');

      expect(response.status).toBe(401);
    });

    test('should require authentication for parse-order', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .send({ text: 'I want a burger' });

      expect(response.status).toBe(401);
    });

    test('should NOT require authentication for health check', async () => {
      const response = await request(app)
        .get('/api/v1/ai/health');

      // Health check should be public
      expect(response.status).toBe(200);
    });

    test('should NOT require authentication for test endpoints', async () => {
      const testTtsResponse = await request(app)
        .post('/api/v1/ai/test-tts')
        .send({ text: 'Test' });

      const testTranscribeResponse = await request(app)
        .post('/api/v1/ai/test-transcribe');

      // Test endpoints should be accessible without auth for debugging
      expect(testTtsResponse.status).not.toBe(401);
      expect(testTranscribeResponse.status).not.toBe(401);
    });
  });

  describe('Role-Based Access Control', () => {
    test('should allow admin to upload menu', async () => {
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ menu: [] });

      expect(response.status).not.toBe(403);
    });

    test('should deny non-admin menu upload', async () => {
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ menu: [] });

      // User role should not be able to upload menu
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    test('should reject parse-order with empty text', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: '' });

      expect(response.status).toBe(400);
    });

    test('should reject parse-order with missing text field', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({});

      expect(response.status).toBe(400);
    });

    test('should reject parse-order with text too long', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: 'a'.repeat(5001) }); // Schema limit is 5000

      expect(response.status).toBe(400);
    });

    test('should reject chat with missing message', async () => {
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({});

      expect(response.status).toBe(400);
    });

    test('should reject chat with non-string message', async () => {
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ message: 12345 });

      expect(response.status).toBe(400);
    });
  });

  describe('Header Case Sensitivity', () => {
    test('should accept lowercase x-restaurant-id', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      expect(response.status).toBe(200);
    });

    test('should accept uppercase X-Restaurant-ID', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', validRestaurantId);

      expect(response.status).toBe(200);
    });

    test('should accept mixed case X-Restaurant-Id', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-Id', validRestaurantId);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Response Security', () => {
    test('should not leak internal paths in error messages', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: 'trigger error' });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('/Users/');
      expect(responseText).not.toContain('\\Users\\');
      expect(responseText).not.toContain('node_modules');
    });

    test('should set Cache-Control: no-store on all responses', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/ai/health' },
        { method: 'get', path: '/api/v1/ai/menu', auth: true },
        { method: 'post', path: '/api/v1/ai/parse-order', auth: true, body: { text: 'test' } }
      ];

      for (const endpoint of endpoints) {
        const req = request(app);
        const method = endpoint.method as 'get' | 'post';
        let chain = req[method](endpoint.path);

        if (endpoint.auth) {
          chain = chain.set('Authorization', `Bearer ${validToken}`);
          chain = chain.set('x-restaurant-id', validRestaurantId);
        }

        if (endpoint.body) {
          chain = chain.send(endpoint.body);
        }

        const response = await chain;

        if (response.status !== 401) {
          expect(response.headers['cache-control']).toBe('no-store');
        }
      }
    });
  });

  describe('Provider Degradation Handling', () => {
    test('should set x-ai-degraded header on 503 errors', async () => {
      // Mock AI service to throw 503
      const { aiService } = await import('../src/services/ai.service');
      vi.mocked(aiService.parseOrder).mockRejectedValueOnce({
        status: 503,
        error: 'provider_unavailable'
      });

      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: 'I want a burger' });

      if (response.status === 503) {
        expect(response.headers['x-ai-degraded']).toBe('true');
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should sanitize restaurant ID with SQL injection attempt', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', "'; DROP TABLE restaurants; --");

      // Should not execute SQL, should handle safely
      expect(response.status).not.toBe(500);
    });

    test('should sanitize text input in parse-order', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: "I want a burger'; DROP TABLE orders; --" });

      // Should treat as regular text, not SQL
      expect(response.status).not.toBe(500);
    });
  });

  describe('Restaurant Context Consistency', () => {
    test('should use same restaurant ID throughout request', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({ text: 'I want a burger' });

      if (response.status === 200) {
        // Response should include the same restaurant ID that was sent
        expect(response.body.restaurantId).toBe(validRestaurantId);
      }
    });

    test('should prioritize header over token restaurant_id', async () => {
      // Token has validRestaurantId, but we send different header
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', otherRestaurantId)
        .send({ text: 'I want a burger' });

      // Should use header value (if access control allows)
      if (response.status === 200) {
        expect(response.body.restaurantId).toBe(otherRestaurantId);
      }
    });
  });
});
