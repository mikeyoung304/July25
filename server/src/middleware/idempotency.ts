import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import { supabase } from '../utils/supabase';

interface IdempotencyCache {
  keyHash: string;
  requestPath: string;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
  restaurantId: string | null;
  createdAt: Date;
}

// In-memory cache for development (production should use Redis or DB)
const memoryCache = new Map<string, IdempotencyCache>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.createdAt.getTime() > CACHE_TTL) {
      memoryCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

export function generateIdempotencyKey(
  idempotencyKey: string | undefined,
  requestPath: string,
  requestBody: any
): string {
  // If explicit key provided, use it
  if (idempotencyKey) {
    return createHash('sha256').update(idempotencyKey).digest('hex');
  }

  // Otherwise generate from request signature
  const signature = JSON.stringify({
    path: requestPath,
    body: requestBody
  });

  return createHash('sha256').update(signature).digest('hex');
}

export async function checkIdempotency(
  keyHash: string
): Promise<IdempotencyCache | null> {
  // Check memory cache first (for dev)
  if (memoryCache.has(keyHash)) {
    const cached = memoryCache.get(keyHash)!;
    logger.debug('Idempotency key found in memory cache', { keyHash });
    return cached;
  }

  // Check database
  try {
    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      logger.debug('Idempotency key expired', { keyHash, expiresAt });
      return null;
    }

    logger.debug('Idempotency key found in database', { keyHash });
    return {
      keyHash: data.key_hash,
      requestPath: data.request_path,
      requestBody: data.request_body,
      responseStatus: data.response_status,
      responseBody: data.response_body,
      restaurantId: data.restaurant_id,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    logger.error('Error checking idempotency', { error, keyHash });
    return null;
  }
}

export async function storeIdempotency(
  keyHash: string,
  requestPath: string,
  requestBody: any,
  responseStatus: number,
  responseBody: any,
  restaurantId: string | null
): Promise<void> {
  const cache: IdempotencyCache = {
    keyHash,
    requestPath,
    requestBody,
    responseStatus,
    responseBody,
    restaurantId,
    createdAt: new Date()
  };

  // Store in memory cache (for dev)
  memoryCache.set(keyHash, cache);

  // Store in database
  try {
    const { error } = await supabase
      .from('idempotency_keys')
      .upsert({
        key_hash: keyHash,
        request_path: requestPath,
        request_body: requestBody,
        response_status: responseStatus,
        response_body: responseBody,
        restaurant_id: restaurantId,
        created_at: cache.createdAt.toISOString(),
        expires_at: new Date(cache.createdAt.getTime() + CACHE_TTL).toISOString()
      });

    if (error) {
      logger.error('Failed to store idempotency key', { error, keyHash });
    } else {
      logger.debug('Idempotency key stored', { keyHash });
    }
  } catch (error) {
    logger.error('Error storing idempotency key', { error, keyHash });
  }
}

export function requireIdempotencyKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    logger.warn('Missing idempotency key', {
      path: req.path,
      method: req.method
    });
    return res.status(400).json({
      error: 'MISSING_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key header is required for this operation'
    });
  }

  // Store the key on the request for later use
  (req as any).idempotencyKey = idempotencyKey;
  next();
}

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    // If no key provided, continue without idempotency
    return next();
  }

  const keyHash = generateIdempotencyKey(
    idempotencyKey,
    req.path,
    req.body
  );

  // Check for existing request
  const cached = await checkIdempotency(keyHash);

  if (cached) {
    logger.info('Duplicate request detected (idempotent)', {
      keyHash,
      path: req.path,
      restaurantId: (req as any).restaurantId
    });

    return res.status(409).json({
      error: 'DUPLICATE_REQUEST',
      message: 'This request has already been processed',
      originalStatus: cached.responseStatus,
      originalResponse: cached.responseBody
    });
  }

  // Store key hash for response interceptor
  (req as any).idempotencyKeyHash = keyHash;

  // Intercept response to store it
  const originalSend = res.send;
  res.send = function(data: any) {
    // Store the response
    storeIdempotency(
      keyHash,
      req.path,
      req.body,
      res.statusCode,
      data,
      (req as any).restaurantId || null
    );

    return originalSend.call(this, data);
  };

  next();
}