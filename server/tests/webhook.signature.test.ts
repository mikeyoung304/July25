import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createHmac } from 'crypto';
import { verifySquareWebhookSignature, verifyStripeWebhookSignature } from '../src/middleware/webhookSignature';

describe('Webhook Signature Verification', () => {
  let app: express.Application;
  const originalEnv = process.env;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Square Webhook Verification', () => {
    const signatureKey = 'test_square_signature_key_123';

    beforeEach(() => {
      process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'] = signatureKey;
    });

    it('should accept valid Square webhook signature', async () => {
      app.post('/webhook', verifySquareWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const body = {
        type: 'payment.created',
        event_id: 'evt_123',
        data: { payment: { id: 'pay_123' } }
      };

      const url = '/webhook';
      const hmac = createHmac('sha256', signatureKey);
      hmac.update(url + JSON.stringify(body));
      const signature = hmac.digest('base64');

      const response = await request(app)
        .post('/webhook')
        .set('x-square-signature', signature)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ verified: true });
    });

    it('should reject invalid Square webhook signature', async () => {
      app.post('/webhook', verifySquareWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const body = {
        type: 'payment.created',
        event_id: 'evt_123',
        data: { payment: { id: 'pay_123' } }
      };

      const response = await request(app)
        .post('/webhook')
        .set('x-square-signature', 'invalid_signature')
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed'
      });
    });

    it('should reject missing Square webhook signature', async () => {
      app.post('/webhook', verifySquareWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const response = await request(app)
        .post('/webhook')
        .send({ type: 'payment.created' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'MISSING_SIGNATURE',
        message: 'Webhook signature header is required'
      });
    });

    it('should return error if signature key not configured', async () => {
      delete process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'];

      app.post('/webhook', verifySquareWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const response = await request(app)
        .post('/webhook')
        .set('x-square-signature', 'some_signature')
        .send({ type: 'payment.created' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'WEBHOOK_CONFIG_ERROR',
        message: 'Webhook signature verification not configured'
      });
    });
  });

  describe('Stripe Webhook Verification', () => {
    const webhookSecret = 'whsec_test_stripe_secret_456';

    beforeEach(() => {
      process.env['STRIPE_WEBHOOK_SECRET'] = webhookSecret;
    });

    it('should accept valid Stripe webhook signature', async () => {
      app.post('/webhook', verifyStripeWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const body = {
        type: 'payment_intent.succeeded',
        id: 'evt_789',
        data: { object: { id: 'pi_456' } }
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const payload = `${timestamp}.${JSON.stringify(body)}`;
      const hmac = createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const signature = hmac.digest('hex');

      const stripeSignature = `t=${timestamp},v1=${signature}`;

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', stripeSignature)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ verified: true });
    });

    it('should reject Stripe webhook with old timestamp', async () => {
      app.post('/webhook', verifyStripeWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const body = {
        type: 'payment_intent.succeeded',
        id: 'evt_789'
      };

      // Timestamp from 10 minutes ago
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const payload = `${oldTimestamp}.${JSON.stringify(body)}`;
      const hmac = createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const signature = hmac.digest('hex');

      const stripeSignature = `t=${oldTimestamp},v1=${signature}`;

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', stripeSignature)
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'TIMESTAMP_TOO_OLD',
        message: 'Webhook signature timestamp is too old'
      });
    });

    it('should reject invalid Stripe webhook signature', async () => {
      app.post('/webhook', verifyStripeWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const stripeSignature = `t=${timestamp},v1=invalid_signature`;

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', stripeSignature)
        .send({ type: 'payment_intent.succeeded' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed'
      });
    });

    it('should reject malformed Stripe signature header', async () => {
      app.post('/webhook', verifyStripeWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'malformed_header')
        .send({ type: 'payment_intent.succeeded' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'INVALID_SIGNATURE_FORMAT',
        message: 'Invalid webhook signature format'
      });
    });

    it('should reject missing Stripe webhook signature', async () => {
      app.post('/webhook', verifyStripeWebhookSignature, (req, res) => {
        res.json({ verified: true });
      });

      const response = await request(app)
        .post('/webhook')
        .send({ type: 'payment_intent.succeeded' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'MISSING_SIGNATURE',
        message: 'Webhook signature header is required'
      });
    });
  });
});