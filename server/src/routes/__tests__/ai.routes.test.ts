import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { aiRoutes } from '../ai.routes';
import { errorHandler } from '../../middleware/errorHandler';
import { aiService } from '../../services/ai.service';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../../services/ai.service');
vi.mock('../../config/database', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { restaurant_id: 'test-restaurant', role: 'admin' } }))
          }))
        }))
      }))
    }))
  }
}));

// Mock rate limiters to avoid 429 errors in tests
vi.mock('../../middleware/rateLimiter', () => ({
  apiLimiter: (req: any, res: any, next: any) => next(),
  voiceOrderLimiter: (req: any, res: any, next: any) => next(),
  authLimiter: (req: any, res: any, next: any) => next(),
  healthCheckLimiter: (req: any, res: any, next: any) => next(),
  aiServiceLimiter: (req: any, res: any, next: any) => next(),
  transcriptionLimiter: (req: any, res: any, next: any) => next(),
}));

// Mock file validation middleware
vi.mock('../../middleware/fileValidation', () => ({
  audioUpload: {
    single: () => (req: any, res: any, next: any) => {
      req.file = req.body.file || { size: 1000, mimetype: 'audio/wav' };
      next();
    }
  }
}));

describe('AI Routes Authentication Tests', () => {
  let app: express.Application;
  let validToken: string;
  let adminToken: string;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai', aiRoutes);
    app.use(errorHandler);

    // Create test tokens
    validToken = jwt.sign(
      { sub: 'user-123', email: 'user@test.com', role: 'user' },
      'test-secret'
    );
    
    adminToken = jwt.sign(
      { sub: 'admin-123', email: 'admin@test.com', role: 'admin' },
      'test-secret'
    );

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('POST /api/v1/ai/menu', () => {
    const validMenuData = {
      restaurant: 'Test Restaurant',
      menu: [
        { name: 'Pizza', price: 12.99, category: 'Main' },
        { name: 'Salad', price: 8.99, category: 'Appetizer' }
      ]
    };

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .send(validMenuData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', 'Bearer invalid-token')
        .send(validMenuData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject request from non-admin user', async () => {
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .send(validMenuData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should accept request from admin user', async () => {
      vi.mocked(aiService.updateMenu).mockImplementation(() => {});

      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .send(validMenuData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(aiService.updateMenu).toHaveBeenCalled();
    });

    it('should validate menu data', async () => {
      const invalidData = {
        restaurant: '', // Empty restaurant name
        menu: [] // Empty menu
      };

      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });

  });

  describe('GET /api/v1/ai/menu', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/ai/menu');

      expect(response.status).toBe(401);
    });

    it('should return menu for authenticated user', async () => {
      const mockMenu = {
        restaurant: 'Test Restaurant',
        menu: [{ name: 'Pizza', price: 12.99 }],
        restaurantId: 'test-restaurant'
      };
      vi.mocked(aiService.getMenu).mockReturnValue(mockMenu);

      const response = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMenu);
    });

    it('should deny access to menu from different restaurant', async () => {
      const mockMenu = {
        restaurant: 'Other Restaurant',
        menu: [{ name: 'Burger', price: 10.99 }],
        restaurantId: 'other-restaurant'
      };
      vi.mocked(aiService.getMenu).mockReturnValue(mockMenu);

      const response = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('POST /api/v1/ai/transcribe', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .attach('audio', Buffer.from('fake-audio'), 'test.wav');

      expect(response.status).toBe(401);
    });

    it('should accept request with valid authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .attach('audio', Buffer.from('fake-audio'), 'test.wav');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.restaurantId).toBe('test-restaurant');
    });
  });

  describe('POST /api/v1/ai/parse-order', () => {
    const validOrderText = "I'd like a large pizza with extra cheese";

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .send({ text: validOrderText });

      expect(response.status).toBe(401);
    });

    it('should accept request with valid authentication', async () => {
      const mockParsedOrder = {
        items: [{ name: 'Large Pizza', modifiers: ['extra cheese'] }],
        confidence: 0.95
      };
      vi.mocked(aiService.parseOrder).mockResolvedValue(mockParsedOrder);

      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .send({ text: validOrderText });

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual(mockParsedOrder.items);
      expect(response.body.restaurantId).toBe('test-restaurant');
      expect(response.body.parsedBy).toBe('user-123');
    });

    it('should validate order text', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .send({ text: '' }); // Empty text

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle very long order text', async () => {
      const longText = 'a'.repeat(6000); // Exceeds 5000 char limit

      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant')
        .send({ text: longText });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must not exceed 5000 characters');
    });
  });

  describe('GET /api/v1/ai/health', () => {
    it('should be publicly accessible', async () => {
      vi.mocked(aiService.getMenu).mockReturnValue(null);

      const response = await request(app)
        .get('/api/v1/ai/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.hasMenu).toBe(false);
    });
  });
});