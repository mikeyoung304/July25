import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface WebhookRequest extends Request {
  rawBody?: string;
}

/**
 * Verify webhook signature using HMAC-SHA256
 * Provides constant-time comparison to prevent timing attacks
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Middleware to verify webhook signatures
 * Requires x-webhook-signature header and WEBHOOK_SECRET env var
 */
export function webhookAuth(
  req: WebhookRequest,
  res: Response,
  next: NextFunction
): Response | void {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const secret = process.env['WEBHOOK_SECRET'];

    if (!signature) {
      logger.warn('Webhook request missing signature header');
      return res.status(401).json({
        error: 'Missing signature',
        message: 'x-webhook-signature header is required'
      });
    }

    if (!secret) {
      logger.error('WEBHOOK_SECRET not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Webhook authentication not properly configured'
      });
    }

    // Use raw body if available, otherwise stringify the parsed body
    const payload = req.rawBody || JSON.stringify(req.body);

    if (!verifyWebhookSignature(payload, signature, secret)) {
      logger.warn('Webhook request failed signature verification', {
        receivedSignature: signature.substring(0, 10) + '...',
        payloadLength: payload.length
      });
      return res.status(401).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed'
      });
    }

    logger.info('Webhook signature verified successfully');
    next();
  } catch (error) {
    logger.error('Webhook auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook authentication'
    });
  }
}

/**
 * Middleware to capture raw body for webhook signature verification
 * Must be used before body parsing middleware
 */
export function captureRawBody(
  req: WebhookRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.headers['x-webhook-signature']) {
    return next();
  }

  let data = '';
  req.on('data', chunk => {
    data += chunk.toString('utf8');
  });

  req.on('end', () => {
    req.rawBody = data;
    next();
  });

  req.on('error', (err) => {
    logger.error('Error capturing raw body:', err);
    next(err);
  });
}

/**
 * Verify webhook timestamp to prevent replay attacks
 * Rejects webhooks older than maxAge (default 5 minutes)
 */
export function verifyWebhookTimestamp(
  timestamp: string,
  maxAge: number = 300000 // 5 minutes in milliseconds
): boolean {
  try {
    const webhookTime = parseInt(timestamp, 10);
    const currentTime = Date.now();

    if (isNaN(webhookTime)) {
      return false;
    }

    const age = currentTime - webhookTime;
    return age > 0 && age < maxAge;
  } catch (error) {
    logger.error('Webhook timestamp verification error:', error);
    return false;
  }
}

/**
 * Enhanced webhook auth with timestamp verification
 */
export function webhookAuthWithTimestamp(
  req: WebhookRequest,
  res: Response,
  next: NextFunction
): Response | void {
  const timestamp = req.headers['x-webhook-timestamp'] as string;

  if (!timestamp) {
    return res.status(401).json({
      error: 'Missing timestamp',
      message: 'x-webhook-timestamp header is required'
    });
  }

  if (!verifyWebhookTimestamp(timestamp)) {
    logger.warn('Webhook request failed timestamp verification');
    return res.status(401).json({
      error: 'Invalid timestamp',
      message: 'Webhook timestamp is invalid or too old'
    });
  }

  // Continue with signature verification
  webhookAuth(req, res, next);
}