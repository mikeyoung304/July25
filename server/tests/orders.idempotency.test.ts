import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireIdempotencyKey, idempotencyMiddleware } from '../src/middleware/idempotency';
import { supabase } from '../src/utils/supabase';

// Mock Supabase
vi.mock('../src/utils/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Order Idempotency', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    vi.clearAllMocks();
  });

  describe('requireIdempotencyKey', () => {
    it('should reject requests without Idempotency-Key header', async () => {
      app.post('/test', requireIdempotencyKey, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ data: 'test' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for this operation'
      });
    });

    it('should allow requests with Idempotency-Key header', async () => {
      app.post('/test', requireIdempotencyKey, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('Idempotency-Key', 'test-key-123')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('idempotencyMiddleware', () => {
    it('should process first request and store result', async () => {
      // Mock database check - no existing key
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: 'Not found'
          })
        })
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'idempotency_keys') {
          return {
            select: mockSelect,
            upsert: mockUpsert
          };
        }
      });

      app.post('/test', idempotencyMiddleware, (req, res) => {
        res.status(201).json({ id: 'order_123', status: 'created' });
      });

      const response = await request(app)
        .post('/test')
        .set('Idempotency-Key', 'unique-key-456')
        .send({ items: ['item1'] });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 'order_123',
        status: 'created'
      });

      // Verify idempotency key was stored
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should return 409 for duplicate request with same key', async () => {
      const cachedResponse = {
        responseStatus: 201,
        responseBody: { id: 'order_123', status: 'created' }
      };

      // Mock database check - existing key found
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              key_hash: 'hash_123',
              request_path: '/test',
              request_body: { items: ['item1'] },
              response_status: cachedResponse.responseStatus,
              response_body: cachedResponse.responseBody,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 86400000).toISOString()
            },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      app.post('/test', idempotencyMiddleware, (req, res) => {
        res.status(201).json({ id: 'order_456', status: 'created' });
      });

      const response = await request(app)
        .post('/test')
        .set('Idempotency-Key', 'duplicate-key-789')
        .send({ items: ['item1'] });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'DUPLICATE_REQUEST',
        message: 'This request has already been processed',
        originalStatus: 201,
        originalResponse: cachedResponse.responseBody
      });
    });

    it('should process request if cached key is expired', async () => {
      // Mock database check - expired key
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              key_hash: 'hash_123',
              expires_at: new Date(Date.now() - 1000).toISOString() // Expired
            },
            error: null
          })
        })
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'idempotency_keys') {
          return {
            select: mockSelect,
            upsert: mockUpsert
          };
        }
      });

      app.post('/test', idempotencyMiddleware, (req, res) => {
        res.status(201).json({ id: 'order_789', status: 'created' });
      });

      const response = await request(app)
        .post('/test')
        .set('Idempotency-Key', 'expired-key-123')
        .send({ items: ['item1'] });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 'order_789',
        status: 'created'
      });
    });

    it('should allow requests without idempotency key', async () => {
      app.post('/test', idempotencyMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });
});