import type { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';
import { logger } from '../utils/logger';

// Square webhook signature verification
export function verifySquareWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-square-signature'] as string;
  const signatureKey = process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'];

  if (!signatureKey) {
    logger.error('Square webhook signature key not configured');
    return res.status(500).json({
      error: 'WEBHOOK_CONFIG_ERROR',
      message: 'Webhook signature verification not configured'
    });
  }

  if (!signature) {
    logger.warn('Missing Square webhook signature', {
      path: req.path,
      headers: Object.keys(req.headers)
    });
    return res.status(401).json({
      error: 'MISSING_SIGNATURE',
      message: 'Webhook signature header is required'
    });
  }

  // Square uses HMAC-SHA256 with base64 encoding
  const body = JSON.stringify(req.body);
  const hmac = createHmac('sha256', signatureKey);
  hmac.update(req.url + body);
  const expectedSignature = hmac.digest('base64');

  if (signature !== expectedSignature) {
    logger.warn('Invalid Square webhook signature', {
      path: req.path,
      receivedSignature: signature,
      // Don't log expected signature in production
      ...(process.env['NODE_ENV'] !== 'production' && { expectedSignature })
    });
    return res.status(401).json({
      error: 'INVALID_SIGNATURE',
      message: 'Webhook signature verification failed'
    });
  }

  logger.debug('Square webhook signature verified', {
    path: req.path,
    eventType: req.body.type
  });

  next();
}

// Stripe webhook signature verification (for future use)
export function verifyStripeWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured');
    return res.status(500).json({
      error: 'WEBHOOK_CONFIG_ERROR',
      message: 'Webhook signature verification not configured'
    });
  }

  if (!signature) {
    logger.warn('Missing Stripe webhook signature', {
      path: req.path
    });
    return res.status(401).json({
      error: 'MISSING_SIGNATURE',
      message: 'Webhook signature header is required'
    });
  }

  // Parse Stripe signature header
  const elements = signature.split(',');
  let timestamp = '';
  let signatures: string[] = [];

  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    logger.warn('Invalid Stripe signature format', {
      path: req.path,
      signature
    });
    return res.status(401).json({
      error: 'INVALID_SIGNATURE_FORMAT',
      message: 'Invalid webhook signature format'
    });
  }

  // Verify timestamp to prevent replay attacks (5 minute tolerance)
  const currentTime = Math.floor(Date.now() / 1000);
  const signatureTime = parseInt(timestamp, 10);
  const tolerance = 300; // 5 minutes

  if (currentTime - signatureTime > tolerance) {
    logger.warn('Stripe webhook timestamp too old', {
      path: req.path,
      signatureTime,
      currentTime,
      age: currentTime - signatureTime
    });
    return res.status(401).json({
      error: 'TIMESTAMP_TOO_OLD',
      message: 'Webhook signature timestamp is too old'
    });
  }

  // Compute expected signature
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const hmac = createHmac('sha256', webhookSecret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  // Check if any provided signature matches
  const validSignature = signatures.some(sig => sig === expectedSignature);

  if (!validSignature) {
    logger.warn('Invalid Stripe webhook signature', {
      path: req.path,
      timestamp
    });
    return res.status(401).json({
      error: 'INVALID_SIGNATURE',
      message: 'Webhook signature verification failed'
    });
  }

  logger.debug('Stripe webhook signature verified', {
    path: req.path,
    eventType: req.body.type,
    timestamp
  });

  next();
}