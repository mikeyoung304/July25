import request from 'supertest';
import express from 'express';
import { vi, describe, expect, beforeEach, afterEach, test } from 'vitest';
import { ai, checkAIHealth } from '../src/ai';

// Mock OpenAI client
vi.mock('../src/ai', () => ({
  ai: {
    transcriber: {
      transcribe: vi.fn(),
      transcribeFile: vi.fn()
    },
    tts: {
      synthesize: vi.fn(),
      speak: vi.fn()
    },
    chat: {
      chat: vi.fn(),
      complete: vi.fn()
    },
    orderNLP: {
      parse: vi.fn(),
      parseOrder: vi.fn()
    }
  },
  checkAIHealth: vi.fn()
}));

// Mock menu service
vi.mock('../src/services/menu.service', () => ({
  fetchMenuItemsForRestaurant: vi.fn().mockResolvedValue([
    { id: 'item-1', name: 'Margherita Pizza', price: 12.99 },
    { id: 'item-2', name: 'Pepperoni Pizza', price: 14.99 }
  ])
}));

describe('AI Routes', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Create minimal Express app with AI routes
    app = express();
    app.use(express.json());
    
    // Import routes after mocks are set up
    const aiRoutesModule = await import('../src/routes/ai.routes');
    const aiRoutes = aiRoutesModule.default;
    app.use('/api/v1/ai', aiRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/ai/parse-order', () => {
    test('returns valid ParsedOrder with canonical IDs', async () => {
      const mockParsedOrder = {
        items: [
          { menuItemId: 'item-1', quantity: 2, modifications: [], specialInstructions: undefined }
        ],
        notes: 'Test order'
      };

      (ai.orderNLP.parse as jest.Mock).mockResolvedValue(mockParsedOrder);

      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', 'Bearer test-token')
        .set('X-Restaurant-ID', 'test-restaurant')
        .send({ text: 'Two margherita pizzas please' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            menuItemId: 'item-1',
            quantity: 2
          })
        ])
      });
      expect(response.headers['cache-control']).toBe('no-store');
    });

    test('returns 422 with suggestions for unknown items', async () => {
      const error: any = new Error('Unknown item: "sushi"');
      error.status = 422;
      error.error = 'unknown_item';
      error.suggestions = [
        { name: 'Margherita Pizza', score: 0.2 },
        { name: 'Pepperoni Pizza', score: 0.15 }
      ];

      (ai.orderNLP.parse as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', 'Bearer test-token')
        .send({ text: 'One sushi roll' });

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        error: 'unknown_item',
        suggestions: expect.arrayContaining([
          expect.objectContaining({ name: 'Margherita Pizza' })
        ])
      });
      expect(response.headers['cache-control']).toBe('no-store');
    });
  });

  describe('POST /api/v1/ai/transcribe', () => {
    test('returns transcribed text', async () => {
      (ai.transcriber.transcribe as jest.Mock).mockResolvedValue({
        text: 'Hello, I would like to order a pizza'
      });

      const response = await request(app)
        .post('/api/v1/ai/transcribe-with-metadata')
        .set('X-Restaurant-ID', 'test-restaurant')
        .attach('audio', Buffer.from('fake-audio'), 'audio.webm');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        text: expect.any(String)
      });
      expect(response.headers['cache-control']).toBe('no-store');
    });

    test('returns 503 when provider unavailable', async () => {
      const error: any = new Error('OpenAI timeout');
      error.code = 'ETIMEDOUT';

      (ai.transcriber.transcribe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/v1/ai/transcribe-with-metadata')
        .attach('audio', Buffer.from('fake-audio'), 'audio.webm');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: 'provider_unavailable'
      });
      expect(response.headers['x-ai-degraded']).toBe('true');
      expect(response.headers['cache-control']).toBe('no-store');
    });
  });

  describe('GET /api/v1/ai/provider-health', () => {
    test('returns ok when provider healthy', async () => {
      (checkAIHealth as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .get('/api/v1/ai/provider-health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        provider: 'openai'
      });
      expect(response.headers['cache-control']).toBe('no-store');
    });

    test('returns 503 when provider unhealthy', async () => {
      (checkAIHealth as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .get('/api/v1/ai/provider-health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ok: false,
        provider: 'stubs'
      });
      expect(response.headers['x-ai-degraded']).toBe('true');
      expect(response.headers['cache-control']).toBe('no-store');
    });
  });
});