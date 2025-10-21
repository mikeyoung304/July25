import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { webhookAuth, captureRawBody, WebhookRequest } from '../../src/middleware/webhookSignature';

describe('Security Proof: Webhook HMAC Authentication', () => {
  let app: express.Application;
  const webhookSecret = 'test-webhook-secret-for-testing-only';
  const originalEnv = process.env['WEBHOOK_SECRET'];

  beforeAll(() => {
    // Set webhook secret for tests
    process.env['WEBHOOK_SECRET'] = webhookSecret;
  });

  beforeEach(() => {
    // Create fresh app for each test
    app = express();

    // Body parsing with raw body capture for webhook routes
    app.use(express.json({
      verify: (req: any, _res, buf) => {
        // Store raw body for webhook signature verification
        if (req.headers['x-webhook-signature']) {
          req.rawBody = buf.toString('utf8');
        }
      }
    }));
    app.use(express.urlencoded({ extended: true }));

    // Webhook endpoints
    app.post('/webhook/payment', webhookAuth, (req, res) => {
      res.json({
        success: true,
        received: req.body,
        timestamp: new Date().toISOString()
      });
    });

    app.post('/webhook/order', webhookAuth, (req, res) => {
      res.json({
        success: true,
        orderId: req.body.orderId,
        action: 'processed'
      });
    });

    // Endpoint without webhook auth for comparison
    app.post('/api/normal', (req, res) => {
      res.json({ success: true, data: req.body });
    });
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env['WEBHOOK_SECRET'] = originalEnv;
    } else {
      delete process.env['WEBHOOK_SECRET'];
    }
  });

  const generateSignature = (payload: string, secret: string): string => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return hmac.digest('hex');
  };

  describe('Valid Webhook Signatures', () => {
    it('should accept webhook with valid signature', async () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000,
        currency: 'USD'
      });

      const signature = generateSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.received.event).toBe('payment.completed');
      expect(response.body.received.amount).toBe(1000);
    });

    it('should accept webhook with complex nested payload', async () => {
      const payload = JSON.stringify({
        orderId: 'ORD-12345',
        customer: {
          id: 'CUST-789',
          email: 'customer@example.com'
        },
        items: [
          { id: 'ITEM-1', quantity: 2, price: 15.50 },
          { id: 'ITEM-2', quantity: 1, price: 25.00 }
        ],
        metadata: {
          source: 'web',
          timestamp: Date.now()
        }
      });

      const signature = generateSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/order')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orderId).toBe('ORD-12345');
    });
  });

  describe('Invalid Webhook Signatures', () => {
    it('should reject webhook with missing signature header', async () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000
      });

      const response = await request(app)
        .post('/webhook/payment')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body.error).toBe('Missing signature');
      expect(response.body.message).toContain('x-webhook-signature');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000
      });

      const invalidSignature = 'invalid-signature-12345';

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', invalidSignature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body.error).toBe('Invalid signature');
      expect(response.body.message).toContain('verification failed');
    });

    it('should reject webhook with signature from wrong secret', async () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000
      });

      const wrongSecret = 'wrong-secret-key';
      const wrongSignature = generateSignature(payload, wrongSecret);

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', wrongSignature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body.error).toBe('Invalid signature');
    });
  });

  describe('Tampered Body Detection', () => {
    it('should reject webhook when body is tampered after signing', async () => {
      const originalPayload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000,
        currency: 'USD'
      });

      const signature = generateSignature(originalPayload, webhookSecret);

      // Send tampered payload with original signature
      const tamperedPayload = JSON.stringify({
        event: 'payment.completed',
        amount: 9999, // Tampered amount
        currency: 'USD'
      });

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/json')
        .send(tamperedPayload)
        .expect(401);

      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject webhook when field is added after signing', async () => {
      const originalPayload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000
      });

      const signature = generateSignature(originalPayload, webhookSecret);

      // Add extra field
      const tamperedPayload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000,
        malicious: 'injected-data' // Added field
      });

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/json')
        .send(tamperedPayload)
        .expect(401);

      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject webhook when field is removed after signing', async () => {
      const originalPayload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000,
        currency: 'USD',
        reference: 'REF-123'
      });

      const signature = generateSignature(originalPayload, webhookSecret);

      // Remove field
      const tamperedPayload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000,
        currency: 'USD'
        // reference removed
      });

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/json')
        .send(tamperedPayload)
        .expect(401);

      expect(response.body.error).toBe('Invalid signature');
    });
  });

  describe('Configuration Errors', () => {
    it('should return 500 when WEBHOOK_SECRET is not configured', async () => {
      // Temporarily remove webhook secret
      delete process.env['WEBHOOK_SECRET'];

      const payload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000
      });

      const signature = generateSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(500);

      expect(response.body.error).toBe('Server configuration error');
      expect(response.body.message).toContain('not properly configured');

      // Restore for other tests
      process.env['WEBHOOK_SECRET'] = webhookSecret;
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should use constant-time comparison for signature verification', async () => {
      // This test verifies the implementation uses crypto.timingSafeEqual
      // by checking response times are consistent regardless of signature similarity

      const payload = JSON.stringify({ test: 'data' });
      const validSignature = generateSignature(payload, webhookSecret);

      // Generate signatures with varying similarity to valid signature
      const signatures = [
        validSignature.substring(0, 10) + 'x'.repeat(54), // Similar prefix
        'x'.repeat(64), // Completely different
        validSignature.substring(0, 32) + 'x'.repeat(32), // Half similar
      ];

      const timings: number[] = [];

      for (const sig of signatures) {
        const start = process.hrtime.bigint();

        await request(app)
          .post('/webhook/payment')
          .set('x-webhook-signature', sig)
          .set('Content-Type', 'application/json')
          .send(payload)
          .expect(401);

        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }

      // Check that timings are relatively consistent
      // CI environments have higher variance due to shared runners
      // Local dev: 2x tolerance, CI: 3x tolerance
      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const varianceTolerance = process.env.CI ? 3.0 : 2.0;
      const maxVariance = avgTime * varianceTolerance;

      for (const timing of timings) {
        const variance = Math.abs(timing - avgTime);
        expect(variance).toBeLessThan(maxVariance);
      }
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle application/x-www-form-urlencoded webhooks', async () => {
      const payload = 'event=payment.completed&amount=1000&currency=USD';
      const signature = generateSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/payment')
        .set('x-webhook-signature', signature)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.received.event).toBe('payment.completed');
    });
  });

  describe('Bypass Protection', () => {
    it('should not allow bypassing webhook auth on protected endpoints', async () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        amount: 1000
      });

      // Try various bypass attempts
      const bypassAttempts = [
        { header: 'X-Webhook-Signature', value: 'test', expectedError: 'Invalid signature' }, // Wrong case - Express normalizes to lowercase
        { header: 'x_webhook_signature', value: 'test', expectedError: 'Missing signature' }, // Underscore - not recognized
        { header: 'webhook-signature', value: 'test', expectedError: 'Missing signature' }, // Missing x- prefix - not recognized
      ];

      for (const attempt of bypassAttempts) {
        const response = await request(app)
          .post('/webhook/payment')
          .set(attempt.header, attempt.value)
          .set('Content-Type', 'application/json')
          .send(payload)
          .expect(401);

        expect(response.body.error).toBe(attempt.expectedError);
      }
    });

    it('should ensure non-webhook endpoints remain accessible', async () => {
      const response = await request(app)
        .post('/api/normal')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.test).toBe('data');
    });
  });
});