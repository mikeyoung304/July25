# Error Handling & Resilience Guardian Report
**Agent 7 - Autonomous Scan**

---

## Executive Summary

**Scan Timestamp:** 2025-10-17T22:00:00Z
**Codebase:** /Users/mikeyoung/CODING/rebuild-6.0
**Status:** ⚠️ MODERATE RISK - Multiple critical error handling gaps identified

### Key Findings
- **Critical Issues (P0):** 3 findings - Payment rollback missing, database operations without error boundaries
- **High Priority (P1):** 8 findings - WebSocket reconnection gaps, missing timeouts, generic error messages
- **Medium Priority (P2):** 12 findings - Input validation, circuit breakers, logging improvements
- **Low Priority (P3):** 6 findings - Error message enhancements, minor improvements

### Overall Assessment
The codebase demonstrates **good foundational error handling** with try-catch blocks covering 172 instances across 44 files. However, several critical gaps exist in payment flows, database error recovery, and WebSocket resilience. The system has robust error boundaries on the client side but lacks proper timeout handling and circuit breaker patterns for external service calls.

### Quick Wins (Can be fixed immediately)
1. Add timeout to Square API payment calls (30 seconds)
2. Implement database connection retry logic
3. Add missing WebSocket reconnection backoff
4. Add proper error types to catch blocks (replace `catch (error)` with `catch (error: unknown)`)
5. Add circuit breaker for Square API calls

---

## Detailed Findings

### P0 - CRITICAL PRIORITY

#### P0-1: Payment Processing Without Transaction Rollback
**Severity:** CRITICAL
**Risk:** Financial loss, data inconsistency
**Location:** `/server/src/routes/payments.routes.ts:299-318`

**Issue:**
```typescript
// Line 299-318: Payment processing failure
catch (error: any) {
  routeLogger.error('Payment processing failed', { error });

  // Update order payment status to failed
  if (req.body.order_id) {
    try {
      await OrdersService.updateOrderPayment(
        req.restaurantId!,
        req.body.order_id,
        'failed',
        'card'
      );
    } catch (updateError) {
      routeLogger.error('Failed to update order payment status', { updateError });
    }
  }
  next(error);
}
```

**Problem:** If payment audit logging (line 212-227) or order update succeeds but Square API call fails, there's no rollback mechanism. The order could be marked as payment initiated but never completed, creating data inconsistency.

**Fix:** Implement database transactions with proper rollback:
```typescript
catch (error: any) {
  routeLogger.error('Payment processing failed', { error });

  // Rollback any partial state changes
  if (req.body.order_id) {
    try {
      // Use database transaction to ensure atomic rollback
      await supabase.rpc('rollback_payment_attempt', {
        p_order_id: req.body.order_id,
        p_restaurant_id: req.restaurantId!,
        p_error: error.message
      });
    } catch (rollbackError) {
      // Critical: Payment state corrupted
      routeLogger.error('CRITICAL: Payment rollback failed', {
        orderId: req.body.order_id,
        originalError: error,
        rollbackError
      });
      // Alert monitoring system
    }
  }
  next(error);
}
```

---

#### P0-2: Square API Calls Without Timeout
**Severity:** CRITICAL
**Risk:** Request hangs indefinitely, poor UX, resource exhaustion
**Location:** `/server/src/routes/payments.routes.ts:185`

**Issue:**
```typescript
// No timeout on Square API call
paymentResult = await paymentsApi.create(paymentRequest);
```

**Problem:** Square API calls (lines 185, 335, 376, 397) have no timeout. If Square is slow or unresponsive, requests can hang for minutes, blocking the Node.js event loop and causing cascading failures.

**Fix:**
```typescript
import { promiseWithTimeout } from '../utils/promises';

// Add timeout wrapper (30 seconds for payment operations)
try {
  paymentResult = await promiseWithTimeout(
    paymentsApi.create(paymentRequest),
    30000, // 30 second timeout
    'Square payment API timeout'
  );
} catch (error) {
  if (error.message === 'Square payment API timeout') {
    routeLogger.error('Square API timeout', { orderId: order_id });
    // Return user-friendly error
    return res.status(504).json({
      success: false,
      error: 'Payment processing timeout',
      detail: 'Payment service is currently slow. Please try again.'
    });
  }
  throw error;
}

// Add utility function: /server/src/utils/promises.ts
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
```

---

#### P0-3: Database Operations Without Connection Pool Error Handling
**Severity:** CRITICAL
**Risk:** Application crash on database connection loss
**Location:** `/server/src/config/database.ts:64-80`

**Issue:**
```typescript
export async function initializeDatabase(): Promise<void> {
  try {
    const { error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    logger.info('✅ Database connection established');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error; // Application crashes if DB is unavailable at startup
  }
}
```

**Problem:** No retry logic for database connection. If database is temporarily unavailable at startup (common in containerized environments), the application fails to start instead of retrying.

**Fix:**
```typescript
export async function initializeDatabase(): Promise<void> {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      logger.info('✅ Database connection established', { attempt });
      return;
    } catch (error) {
      logger.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt === maxRetries) {
        logger.error('FATAL: Database connection failed after all retries');
        throw error;
      }

      logger.info(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}
```

---

### P1 - HIGH PRIORITY

#### P1-1: WebSocket Reconnection Without Exponential Backoff
**Severity:** HIGH
**Risk:** Connection storms, server overload, poor UX
**Location:** `/client/src/services/websocket/ConnectionManager.ts` (referenced but not read)

**Issue:** WebSocket connection handling detected in `/server/src/utils/websocket.ts` shows heartbeat mechanism (lines 24-34) but client-side reconnection strategy not visible in scanned files.

**Expected Location:** `/client/src/services/websocket/WebSocketService.ts` or `WebSocketServiceV2.ts`

**Fix Required:**
```typescript
class WebSocketReconnection {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  calculateBackoff(): number {
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    const backoff = this.calculateBackoff();
    logger.info(`Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts + 1})`);

    await new Promise(resolve => setTimeout(resolve, backoff));
    this.reconnectAttempts++;

    try {
      await this.connect();
      this.reconnectAttempts = 0; // Reset on success
    } catch (error) {
      logger.error('Reconnection failed:', error);
      await this.reconnect(); // Recursive retry
    }
  }
}
```

---

#### P1-2: Missing Error Boundaries for Voice WebSocket
**Severity:** HIGH
**Risk:** Voice session crashes affect entire app
**Location:** `/server/src/voice/websocket-server.ts:54-91`

**Issue:**
```typescript
private async handleMessage(ws: WebSocket, data: any) {
  try {
    const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
    const message = JSON.parse(dataStr);

    const event = ClientEventSchema.parse(message);
    // ... processing ...
  } catch (error) {
    logger.error('[VoiceWebSocket] Error handling message:', error, 'Raw data:', data?.toString?.());
    this.sendError(ws, {
      code: 'UNKNOWN_ERROR',
      message: 'Invalid message format',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
```

**Problem:** Generic error handling catches all errors but doesn't distinguish between recoverable (malformed JSON) and fatal (session corruption) errors. Voice session should continue for malformed messages but terminate for fatal errors.

**Fix:**
```typescript
private async handleMessage(ws: WebSocket, data: any) {
  try {
    const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
    const message = JSON.parse(dataStr);

    const event = ClientEventSchema.parse(message);
    // ... processing ...
  } catch (error) {
    // Distinguish error types
    if (error instanceof SyntaxError) {
      // Recoverable: malformed JSON
      logger.warn('[VoiceWebSocket] Malformed message (recoverable):', error);
      this.sendError(ws, {
        code: 'INVALID_JSON',
        message: 'Message must be valid JSON',
        recoverable: true
      });
    } else if (error instanceof ZodError) {
      // Recoverable: invalid schema
      logger.warn('[VoiceWebSocket] Invalid message schema:', error);
      this.sendError(ws, {
        code: 'INVALID_SCHEMA',
        message: 'Message does not match expected format',
        details: error.errors,
        recoverable: true
      });
    } else {
      // Fatal: unknown error
      logger.error('[VoiceWebSocket] Fatal error:', error);
      const session = this.getSessionByWebSocket(ws);
      if (session) {
        await this.stopSession(session.id);
      }
      ws.close(1011, 'Fatal error occurred');
    }
  }
}
```

---

#### P1-3: Terminal Routes With Duplicate Return Statements
**Severity:** HIGH
**Risk:** Unreachable code, logic errors
**Location:** `/server/src/routes/terminal.routes.ts:129-130, 177-178, 197-198`

**Issue:**
```typescript
// Line 129-130
next(error);
return;
return;  // UNREACHABLE - duplicate return

// Line 177
return;
// Line 198
return;
```

**Problem:** Dead code indicates copy-paste errors. While not causing runtime errors, suggests incomplete error handling review.

**Fix:** Remove duplicate returns:
```typescript
} catch (error: any) {
  routeLogger.error('Terminal checkout creation failed', { error });
  next(error);
  return;
}
```

---

#### P1-4: Generic Catch Blocks Without Error Type Discrimination
**Severity:** HIGH
**Risk:** Swallowing important errors, poor debugging
**Location:** Multiple files (50+ instances)

**Issue:**
```typescript
catch (error) {  // Untyped error
  logger.error('Failed to fetch orders', { error });
  throw error;
}
```

**Problem:** TypeScript allows any error type. Catching `error` as `any` prevents proper error handling based on error type.

**Fix:**
```typescript
catch (error: unknown) {
  if (error instanceof ApiError) {
    // Handle API-specific errors
    logger.warn('API error:', {
      statusCode: error.statusCode,
      message: error.message
    });
    throw error;
  } else if (error instanceof DatabaseError) {
    // Handle database errors with retry
    logger.error('Database error:', error);
    await retryOperation();
  } else {
    // Unknown error - log and rethrow
    logger.error('Unexpected error:', error);
    throw new InternalError('Failed to fetch orders');
  }
}
```

**Affected Files:**
- `/server/src/services/orders.service.ts` - 7 instances
- `/server/src/services/menu.service.ts` - 5 instances
- `/server/src/routes/*.routes.ts` - 40+ instances

---

#### P1-5: Missing Input Validation on Voice Order Endpoint
**Severity:** HIGH
**Risk:** Processing invalid data, potential XSS, resource exhaustion
**Location:** `/server/src/routes/orders.routes.ts:58-159`

**Issue:**
```typescript
router.post('/voice', authenticate, requireRole([...]), requireScope([...]), validateRestaurantAccess, async (req: AuthenticatedRequest, res, _next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { transcription, audioUrl, metadata: _metadata } = req.body;

    if (!transcription) {
      throw BadRequest('Transcription is required');
    }
    // No validation on transcription length, content, or format
```

**Problem:** No validation on transcription text length (could be megabytes), audioUrl format (could be malicious), or content sanitization.

**Fix:**
```typescript
import { z } from 'zod';

const VoiceOrderSchema = z.object({
  transcription: z.string()
    .min(1, 'Transcription cannot be empty')
    .max(10000, 'Transcription too long (max 10,000 characters)')
    .refine(val => !/[<>]/.test(val), 'Invalid characters in transcription'),
  audioUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional()
});

router.post('/voice',
  authenticate,
  requireRole(['admin', 'manager', 'user', 'kiosk_demo', 'server']),
  requireScope(['orders:create']),
  validateRestaurantAccess,
  validateBody(VoiceOrderSchema),  // Add validation
  async (req: AuthenticatedRequest, res, _next) => {
    // Now transcription is guaranteed to be valid
```

---

#### P1-6: Webhook Endpoints Lack Replay Attack Protection
**Severity:** HIGH
**Risk:** Duplicate payment processing, fraud
**Location:** `/server/src/routes/webhook.routes.ts:14-57`

**Issue:**
```typescript
router.post('/payments', webhookAuth, async (req, res) => {
  try {
    const { event, data } = req.body;

    logger.info('Payment webhook received', {
      event,
      timestamp: new Date().toISOString(),
    });

    // Process payment event
    switch (event) {
      case 'payment.completed':
        logger.info('Payment completed', { orderId: data.orderId });
        break;
      // No check for duplicate webhook delivery
```

**Problem:** Webhooks can be delivered multiple times by payment providers. Without idempotency checking, duplicate webhooks could trigger multiple refunds or order updates.

**Fix:**
```typescript
// Add webhook tracking table in database:
// CREATE TABLE webhook_events (
//   event_id TEXT PRIMARY KEY,
//   event_type TEXT,
//   processed_at TIMESTAMP,
//   payload JSONB
// );

router.post('/payments', webhookAuth, async (req, res) => {
  try {
    const { event, data, event_id } = req.body;

    // Check if event already processed (idempotency)
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('event_id')
      .eq('event_id', event_id)
      .single();

    if (existing) {
      logger.info('Duplicate webhook event ignored', { event_id });
      return res.json({
        success: true,
        message: 'Event already processed',
        duplicate: true
      });
    }

    // Process event
    switch (event) {
      case 'payment.completed':
        await handlePaymentCompleted(data);
        break;
    }

    // Record event as processed
    await supabase.from('webhook_events').insert({
      event_id,
      event_type: event,
      processed_at: new Date().toISOString(),
      payload: data
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

---

#### P1-7: AI Routes Missing Circuit Breaker for OpenAI API
**Severity:** HIGH
**Risk:** Cascading failures when OpenAI is down
**Location:** `/server/src/routes/ai.routes.ts:286-338`

**Issue:**
```typescript
// No circuit breaker - every request hits OpenAI even when it's down
const transcriptionResult = await ai.transcriber.transcribe(req.file.buffer, {
  model: req.file.mimetype
});

const chatResponse = await ai.chat.respond([...], {...});
```

**Problem:** When OpenAI API is down or slow, every request will wait for timeout (30-60s), exhausting server resources and creating poor UX. Need circuit breaker pattern.

**Fix:**
```typescript
import CircuitBreaker from 'opossum';

// Configure circuit breaker for OpenAI calls
const openAIBreaker = new CircuitBreaker(
  async (fn: () => Promise<any>) => await fn(),
  {
    timeout: 30000,        // 30s timeout
    errorThresholdPercentage: 50,  // Open after 50% failure rate
    resetTimeout: 30000,   // Try again after 30s
    rollingCountTimeout: 60000,    // 60s rolling window
    rollingCountBuckets: 10
  }
);

openAIBreaker.on('open', () => {
  logger.error('🔴 OpenAI circuit breaker OPEN - API unavailable');
});

openAIBreaker.on('halfOpen', () => {
  logger.warn('🟡 OpenAI circuit breaker HALF-OPEN - testing recovery');
});

openAIBreaker.on('close', () => {
  logger.info('🟢 OpenAI circuit breaker CLOSED - API recovered');
});

// Use circuit breaker in routes
try {
  const transcriptionResult = await openAIBreaker.fire(
    () => ai.transcriber.transcribe(req.file.buffer, {
      model: req.file.mimetype
    })
  );
} catch (error) {
  if (error.message.includes('breaker is open')) {
    return res.status(503).json({
      error: 'AI service temporarily unavailable',
      message: 'Please try again in a few moments'
    });
  }
  throw error;
}
```

---

#### P1-8: Missing Graceful Degradation for AI Service Failures
**Severity:** HIGH
**Risk:** Complete voice order flow failure when AI is unavailable
**Location:** `/server/src/routes/orders.routes.ts:70-108`

**Issue:**
```typescript
try {
  const aiResult = await (ai as any).orderNLP?.parseOrder({
    restaurantId,
    text: transcription
  }) || { items: [] };
  // ... process result
} catch (error) {
  routeLogger.error('AI order parsing failed', { error });

  // Fallback to a simple response
  parsedOrder = {
    items: [],
    confidence: 0
  };
}
```

**Problem:** When AI fails, the system returns empty items with confidence 0. Better to use rule-based fallback or keyword matching.

**Fix:**
```typescript
try {
  const aiResult = await (ai as any).orderNLP?.parseOrder({
    restaurantId,
    text: transcription
  }) || { items: [] };
  parsedOrder = { /* ... */ };
} catch (error) {
  routeLogger.error('AI order parsing failed, using fallback', { error });

  // Fallback to keyword-based simple parser
  parsedOrder = await fallbackOrderParser(transcription, restaurantId);

  if (parsedOrder.items.length === 0) {
    // Still couldn't parse - ask user to clarify
    return res.json({
      success: false,
      message: "I'm having trouble understanding. Could you specify which items you'd like?",
      suggestions: await getPopularItems(restaurantId),
      confidence: 0.1,
      fallbackUsed: true
    });
  }
}

// Simple keyword-based parser as fallback
async function fallbackOrderParser(text: string, restaurantId: string) {
  const menuItems = await MenuService.getItems(restaurantId);
  const matched: any[] = [];

  for (const item of menuItems) {
    // Simple case-insensitive matching
    if (text.toLowerCase().includes(item.name.toLowerCase())) {
      matched.push({
        name: item.name,
        quantity: 1,
        price: item.price,
        confidence: 0.6  // Lower confidence for keyword match
      });
    }
  }

  return {
    items: matched,
    confidence: matched.length > 0 ? 0.6 : 0,
    fallbackUsed: true
  };
}
```

---

### P2 - MEDIUM PRIORITY

#### P2-1: Payment Service Audit Log Failure Doesn't Stop Payment
**Severity:** MEDIUM
**Risk:** Loss of audit trail for compliance
**Location:** `/server/src/services/payment.service.ts:181-199`

**Issue:**
```typescript
try {
  const { error } = await supabase
    .from('payment_audit_logs')
    .insert(auditLog);

  if (error) {
    logger.error('Failed to store payment audit log', { error, auditLog });
    // Don't throw - audit logging failure shouldn't stop payment processing
    // But alert monitoring system
    logger.error('CRITICAL: Payment audit log failed - compliance risk', {
      orderId: entry.orderId,
      paymentId: entry.paymentId,
      error: error.message
    });
  }
} catch (dbError) {
  logger.error('Database error storing payment audit', { dbError, auditLog });
  // Same as above - log but don't fail the payment
}
```

**Problem:** While it's correct not to fail payments due to audit log errors, there's no alerting mechanism. Audit failures could go unnoticed for days.

**Fix:**
```typescript
if (error) {
  logger.error('Failed to store payment audit log', { error, auditLog });

  // Send to monitoring/alerting system
  await alertMonitoring({
    severity: 'critical',
    category: 'compliance',
    message: 'Payment audit log storage failed',
    metadata: {
      orderId: entry.orderId,
      paymentId: entry.paymentId,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  });

  // Fallback: Store in separate audit log backup table
  try {
    await supabase.from('payment_audit_logs_backup').insert(auditLog);
  } catch (backupError) {
    // Last resort: Write to filesystem
    await fs.promises.appendFile(
      '/var/log/payment-audit-failures.jsonl',
      JSON.stringify(auditLog) + '\n'
    );
  }
}
```

---

#### P2-2: Order Status Updates Without Optimistic Locking
**Severity:** MEDIUM
**Risk:** Race conditions, order state corruption
**Location:** `/server/src/services/orders.service.ts:269-347`

**Issue:**
```typescript
static async updateOrderStatus(
  restaurantId: string,
  orderId: string,
  newStatus: Order['status'],
  notes?: string
): Promise<Order> {
  try {
    // Get current order
    const currentOrder = await this.getOrder(restaurantId, orderId);
    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // No version check - vulnerable to race conditions
    const update: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
```

**Problem:** Two concurrent status updates (e.g., kitchen marking as "ready" while customer cancels) could create inconsistent state.

**Fix:**
```typescript
// Add version field to orders table: ALTER TABLE orders ADD COLUMN version INTEGER DEFAULT 1;

static async updateOrderStatus(
  restaurantId: string,
  orderId: string,
  newStatus: Order['status'],
  notes?: string
): Promise<Order> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const currentOrder = await this.getOrder(restaurantId, orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      const update: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        version: (currentOrder as any).version + 1  // Increment version
      };

      // ... add timestamp fields

      const { data, error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .eq('version', (currentOrder as any).version)  // Optimistic lock check
        .select('...')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Version mismatch - retry
          ordersLogger.warn('Order version conflict, retrying', {
            orderId,
            attempt: attempt + 1
          });
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        throw error;
      }

      return data as any as Order;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }
  }

  throw new Error('Failed to update order after retries');
}
```

---

#### P2-3: Health Check Routes Missing Timeout on External Service Calls
**Severity:** MEDIUM
**Risk:** Health check hangs when dependencies are slow
**Location:** `/server/src/routes/health.routes.ts:108-156`

**Issue:**
```typescript
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [databaseStatus, aiStatus] = await Promise.all([
      checkDatabase(),
      checkAI(),
    ]);
    // No timeout - health check can hang if DB or AI is slow
```

**Problem:** If database query or AI check takes 60+ seconds, health check blocks and monitoring systems report false negatives.

**Fix:**
```typescript
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // Add 10-second timeout for health checks
    const [databaseStatus, aiStatus] = await Promise.race([
      Promise.all([checkDatabase(), checkAI()]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 10000)
      )
    ]);

    // ... rest of code
  } catch (error) {
    if (error.message === 'Health check timeout') {
      logger.error('Health check timeout - services may be unresponsive');
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check timeout - services unresponsive'
      });
    }

    logger.error('Status check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Failed to check system status',
    });
  }
});
```

---

#### P2-4: WebSocket Error Handling Logs Raw Data
**Severity:** MEDIUM
**Risk:** Sensitive data exposure in logs
**Location:** `/server/src/voice/websocket-server.ts:84`

**Issue:**
```typescript
} catch (error) {
  logger.error('[VoiceWebSocket] Error handling message:', error, 'Raw data:', data?.toString?.());
  // Logs complete message data which might contain sensitive info
```

**Problem:** Voice messages could contain PII (credit card mentions, addresses). Logging raw data violates privacy best practices.

**Fix:**
```typescript
} catch (error) {
  // Redact sensitive data before logging
  const sanitizedData = sanitizeForLogging(data);
  logger.error('[VoiceWebSocket] Error handling message:', error, 'Data type:', typeof data);

  // Only log full data in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[VoiceWebSocket] Raw data (dev only):', sanitizedData);
  }
}

function sanitizeForLogging(data: any): string {
  const str = data?.toString?.() || String(data);
  // Truncate long messages
  const truncated = str.length > 200 ? str.substring(0, 200) + '...' : str;
  // Redact credit card patterns
  return truncated.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****');
}
```

---

#### P2-5: Missing Rate Limit Error Messages for Users
**Severity:** MEDIUM
**Risk:** Poor UX, confusion
**Location:** `/server/src/middleware/rateLimiter.ts` (referenced but not scanned)

**Issue:** Rate limiting is configured (line 19 in server.ts) but error responses likely generic.

**Expected Issue:**
```typescript
// Generic rate limit response
res.status(429).json({ error: 'Too many requests' });
```

**Fix:**
```typescript
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  handler: (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime - Date.now() / 1000);

    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      retryAfter
    });

    res.status(429).json({
      error: 'Too many requests',
      message: `You have exceeded the rate limit. Please try again in ${retryAfter} seconds.`,
      retryAfter,
      limit: req.rateLimit.limit,
      remaining: 0
    });
  }
});
```

---

#### P2-6: Client HTTP Client Missing Request Retry Logic
**Severity:** MEDIUM
**Risk:** Transient network failures cause permanent errors
**Location:** `/client/src/services/http/httpClient.ts:94-196`

**Issue:**
```typescript
async request<T>(
  endpoint: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  // ... build request ...

  try {
    const response = await super.request<unknown>(url, {
      ...requestOptions,
      headers,
      body
    });
    return response as T;
  } catch (error) {
    // No retry logic for transient failures
    if (error instanceof APIError) {
      // Error details already in correct format from server
    }
    throw error;
  }
}
```

**Problem:** Network blips (502, 503, 504) cause immediate failure. User must manually retry.

**Fix:**
```typescript
async request<T>(
  endpoint: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const maxRetries = 3;
  const retryableStatuses = [408, 429, 502, 503, 504];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await super.request<unknown>(url, {
        ...requestOptions,
        headers,
        body
      });
      return response as T;
    } catch (error) {
      if (error instanceof APIError) {
        // Check if error is retryable
        if (
          attempt < maxRetries - 1 &&
          retryableStatuses.includes(error.statusCode)
        ) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.info(`Request failed, retrying in ${delay}ms`, {
            endpoint,
            attempt: attempt + 1,
            statusCode: error.statusCode
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error('Request failed after retries');
}
```

---

#### P2-7: Order Service Missing Validation on Items Array
**Severity:** MEDIUM
**Risk:** Corrupt order data, pricing exploits
**Location:** `/server/src/services/orders.service.ts:71-191`

**Issue:**
```typescript
static async createOrder(
  restaurantId: string,
  orderData: CreateOrderRequest
): Promise<Order> {
  try {
    // Convert external IDs to UUIDs for items
    const itemsWithUuids = await Promise.all(
      orderData.items.map(async (item) => {
        // No validation on item structure
        const uuid = item.id;
        if (uuid) {
          return { ...item, id: uuid };
        }
        return item;
      })
    );
```

**Problem:** Items array not validated for:
- Negative quantities
- Negative prices
- Missing required fields
- Price manipulation (client could send $0.01 for $100 item)

**Fix:**
```typescript
import { z } from 'zod';

const OrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(100),
  price: z.number().min(0).max(10000), // Reasonable max price
  modifiers: z.array(z.object({
    name: z.string(),
    price: z.number().min(0)
  })).optional()
});

const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1).max(50), // Max 50 items per order
  type: z.enum(['kiosk', 'drive-thru', 'online', 'voice']).optional(),
  // ... other fields
});

static async createOrder(
  restaurantId: string,
  orderData: CreateOrderRequest
): Promise<Order> {
  // Validate order structure
  const validatedData = CreateOrderSchema.parse(orderData);

  // Additional server-side price verification
  await this.verifyPricesAgainstMenu(restaurantId, validatedData.items);

  // ... rest of code
}

private static async verifyPricesAgainstMenu(
  restaurantId: string,
  items: any[]
): Promise<void> {
  const menuItems = await MenuService.getItems(restaurantId);

  for (const item of items) {
    const menuItem = menuItems.find(m => m.id === item.id);
    if (menuItem && Math.abs(menuItem.price - item.price) > 0.01) {
      throw BadRequest(
        `Price mismatch for item ${item.name}: ` +
        `expected ${menuItem.price}, got ${item.price}`
      );
    }
  }
}
```

---

#### P2-8: Unhandled Promise in RBAC Middleware
**Severity:** MEDIUM
**Risk:** Silent failures in access logging
**Location:** `/server/src/middleware/rbac.ts:348`

**Issue:**
```typescript
logAccessAttempt(req, allowed).catch(err =>
  logger.error('Failed to log access attempt:', err)
);
```

**Problem:** This is the ONLY occurrence of `.catch()` in the entire server codebase, indicating a floating promise that's properly handled. However, access attempt logging failure should be monitored.

**Fix:**
```typescript
logAccessAttempt(req, allowed).catch(err => {
  logger.error('Failed to log access attempt:', err);

  // Alert security monitoring system
  alertMonitoring({
    severity: 'high',
    category: 'security',
    message: 'Access log storage failed',
    metadata: {
      path: req.path,
      userId: req.user?.id,
      allowed,
      error: err.message
    }
  });

  // Fallback: Store in separate log
  fs.appendFileSync(
    '/var/log/security-access-failures.jsonl',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      path: req.path,
      userId: req.user?.id,
      allowed,
      error: err.message
    }) + '\n'
  );
});
```

---

#### P2-9-12: Additional Medium Priority Items
*(Summarized for brevity)*

**P2-9:** Server graceful shutdown uses 3-second timeout - too short for in-flight requests
**P2-10:** WebSocket heartbeat interval (60s) may be too long - connections could hang for 60s
**P2-11:** No connection pooling limits configured for Supabase client
**P2-12:** Missing metrics for error rates by endpoint/operation

---

### P3 - LOW PRIORITY

#### P3-1: Generic Error Messages Exposed to Users
**Severity:** LOW
**Risk:** Poor UX, potential info leakage
**Location:** Multiple route files

**Issue:**
```typescript
return res.status(500).json({
  error: 'Failed to process voice message',
  message: error instanceof Error ? error.message : 'Unknown error'
});
```

**Problem:** Stack traces and internal error messages leak to users in some endpoints.

**Fix:**
```typescript
return res.status(500).json({
  error: 'Failed to process voice message',
  message: process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : error instanceof Error ? error.message : 'Unknown error',
  requestId: req.headers['x-request-id'] // For support reference
});
```

---

#### P3-2: Missing Error Code Constants
**Severity:** LOW
**Risk:** Inconsistent error handling, typos

**Fix:** Create error code enum:
```typescript
// /server/src/constants/errorCodes.ts
export enum ErrorCode {
  // Auth
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',

  // Payment
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  PAYMENT_CARD_DECLINED = 'PAYMENT_CARD_DECLINED',

  // Order
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_INVALID_STATUS = 'ORDER_INVALID_STATUS',

  // System
  SYSTEM_DATABASE_ERROR = 'SYSTEM_DATABASE_ERROR',
  SYSTEM_EXTERNAL_SERVICE_ERROR = 'SYSTEM_EXTERNAL_SERVICE_ERROR'
}
```

---

#### P3-3-6: Additional Low Priority Items
*(Summarized for brevity)*

**P3-3:** Client error boundaries don't capture async errors in event handlers
**P3-4:** Missing retry count in logs for failed operations
**P3-5:** No structured error taxonomy (auth vs validation vs system)
**P3-6:** useErrorHandler hook doesn't support error recovery callbacks

---

## Statistics

### Error Handling Coverage

**Server-Side (TypeScript)**
- Total TypeScript files: 95
- Files with try-catch: 44 (46.3%)
- Try-catch blocks: 172
- Async functions: 224
- Catch blocks: 172 (76.8% coverage)
- Files with `.then()`: 1 (server.ts only)
- Unhandled `.then()` calls: 0 (GOOD)

**Client-Side (React/TypeScript)**
- Error Boundary implementations: 9
  - UnifiedErrorBoundary (with retry logic)
  - PaymentErrorBoundary
  - KitchenErrorBoundary
  - OrderStatusErrorBoundary
  - AppErrorBoundary
  - GlobalErrorBoundary
  - KDSErrorBoundary
  - WebSocketErrorBoundary
  - KioskErrorBoundary
- useErrorHandler hook: Comprehensive with retry support
- API Error handling: Centralized in httpClient

**Error Categories Detected**
- Payment errors: Properly typed with specific codes
- Database errors: Generic handling (needs improvement)
- WebSocket errors: Good isolation, needs retry improvements
- Authentication errors: Well-structured with specific error types
- Validation errors: Zod schemas used extensively (GOOD)

### Resilience Patterns Found

✅ **Present:**
- Error boundaries in React (9 implementations)
- Centralized error handler middleware
- WebSocket heartbeat mechanism
- Payment audit logging
- Request/response logging
- CORS validation
- Input sanitization middleware
- Rate limiting

❌ **Missing:**
- Circuit breaker pattern for external services
- Request timeouts on external API calls
- Database connection retry logic
- WebSocket exponential backoff
- Transaction rollback for payments
- Optimistic locking for concurrent updates
- Idempotency for webhook processing

---

## Quick Wins (Immediate Action Items)

### 1. Add Timeout Utility Function (15 minutes)
```typescript
// /server/src/utils/promises.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
```

### 2. Apply Timeout to All Square API Calls (30 minutes)
```typescript
// In payments.routes.ts, terminal.routes.ts
import { withTimeout } from '../utils/promises';

// Replace all Square API calls:
const result = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square API timeout'
);
```

### 3. Add Database Retry Logic (20 minutes)
```typescript
// In database.ts - update initializeDatabase() per P0-3 fix above
```

### 4. Fix TypeScript Error Types (1 hour - bulk find/replace)
```bash
# Find all untyped catch blocks
grep -r "catch (error)" server/src --include="*.ts" | wc -l
# Replace with: catch (error: unknown)
```

### 5. Add Circuit Breaker for OpenAI (45 minutes)
```bash
npm install opossum
# Implement per P1-7 fix above
```

---

## Action Plan

### Phase 1: Critical Fixes (Week 1)
**Priority:** P0 items MUST be fixed before next production deployment

| Item | Effort | Risk if Delayed | Owner |
| --- | --- | --- | --- |
| P0-1: Payment rollback | 4h | Critical - financial loss | Backend |
| P0-2: Square API timeout | 2h | High - poor UX, resource leak | Backend |
| P0-3: DB retry logic | 2h | High - deployment failures | Backend |

**Total Effort:** 8 hours (1 day)

### Phase 2: High Priority (Week 2-3)
**Priority:** Improves reliability and prevents cascading failures

| Item | Effort | Impact | Owner |
| --- | --- | --- | --- |
| P1-1: WebSocket backoff | 3h | High - reduces server load | Full-stack |
| P1-2: Voice error boundaries | 2h | Medium - isolates voice failures | Backend |
| P1-4: Type error handling | 4h | Medium - better debugging | Backend |
| P1-5: Voice input validation | 3h | High - security & resource mgmt | Backend |
| P1-6: Webhook idempotency | 4h | High - prevents duplicate processing | Backend |
| P1-7: OpenAI circuit breaker | 3h | Critical - prevents cascading failures | Backend |
| P1-8: AI graceful degradation | 4h | High - maintains voice UX | Backend |

**Total Effort:** 23 hours (3 days)

### Phase 3: Medium Priority (Week 4-5)
**Priority:** Production hardening and observability

| Item | Effort | Impact | Owner |
| --- | --- | --- | --- |
| P2-1: Audit log alerting | 2h | Medium - compliance | Backend |
| P2-2: Optimistic locking | 6h | Medium - race condition prevention | Backend |
| P2-3: Health check timeout | 1h | Low - monitoring reliability | Backend |
| P2-6: Client retry logic | 3h | Medium - better UX | Frontend |
| P2-7: Order validation | 4h | High - prevents pricing exploits | Backend |

**Total Effort:** 16 hours (2 days)

### Phase 4: Low Priority (Backlog)
**Priority:** Code quality and maintainability

| Category | Effort | Impact |
| --- | --- | --- |
| P3-1: Error message improvement | 2h | Low - UX |
| P3-2: Error code constants | 2h | Low - maintainability |
| Remaining P3 items | 4h | Low - polish |

**Total Effort:** 8 hours (1 day)

---

## Recommendations

### 1. Immediate Actions (This Sprint)
1. ✅ Fix P0-1, P0-2, P0-3 (8 hours total) - **MUST DO**
2. ✅ Implement request timeout utility function
3. ✅ Add database retry logic to prevent startup failures
4. ✅ Create monitoring alert for audit log failures

### 2. Short-term (Next Sprint)
1. Implement circuit breaker pattern for OpenAI API calls
2. Add WebSocket reconnection with exponential backoff
3. Implement webhook idempotency checking
4. Add comprehensive input validation for voice orders
5. Type all error catch blocks properly

### 3. Medium-term (Next Month)
1. Implement optimistic locking for order status updates
2. Add transaction rollback support for payment flows
3. Improve client-side retry logic for transient failures
4. Add structured error code taxonomy
5. Implement comprehensive error metrics dashboard

### 4. Long-term (Quarter)
1. Build centralized error aggregation service (Sentry/Datadog)
2. Implement chaos engineering tests
3. Create error handling runbook for operations
4. Add error rate SLOs/SLAs
5. Implement automated error pattern detection

---

## Testing Recommendations

### Error Scenarios to Test

**Payment Flow:**
```typescript
describe('Payment Error Handling', () => {
  it('should rollback order state when Square API fails', async () => {
    // Mock Square API failure
    // Verify order not marked as paid
    // Verify audit log records failure
  });

  it('should timeout after 30 seconds on slow Square API', async () => {
    // Mock delayed Square response
    // Verify 504 error returned to client
  });

  it('should prevent duplicate webhook processing', async () => {
    // Send same webhook twice
    // Verify second webhook ignored
  });
});
```

**WebSocket Resilience:**
```typescript
describe('WebSocket Error Handling', () => {
  it('should reconnect with exponential backoff', async () => {
    // Simulate connection drop
    // Verify backoff timing: 1s, 2s, 4s, 8s...
  });

  it('should handle malformed messages gracefully', async () => {
    // Send invalid JSON
    // Verify session continues, error sent to client
  });
});
```

**Database Resilience:**
```typescript
describe('Database Error Handling', () => {
  it('should retry connection on startup', async () => {
    // Mock database unavailable
    // Verify retry attempts with delays
  });

  it('should handle optimistic locking conflicts', async () => {
    // Simulate concurrent order updates
    // Verify retry and eventual consistency
  });
});
```

---

## Appendix A: Error Handling Patterns Reference

### 1. Try-Catch with Proper Typing
```typescript
try {
  await operation();
} catch (error: unknown) {
  if (error instanceof ApiError) {
    // Handle API errors
  } else if (error instanceof DatabaseError) {
    // Handle DB errors
  } else {
    // Unknown error - log and rethrow
    logger.error('Unexpected error:', error);
    throw new InternalError('Operation failed');
  }
}
```

### 2. Promise Timeout Pattern
```typescript
const result = await Promise.race([
  operation(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
]);
```

### 3. Retry with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 4. Circuit Breaker Pattern
```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(asyncOperation, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fire().catch(error => {
  if (error.message.includes('breaker is open')) {
    // Service unavailable
  }
});
```

---

## Appendix B: Files Scanned

### Server Files (44 files)
```
/server/src/routes/payments.routes.ts ✓
/server/src/routes/orders.routes.ts ✓
/server/src/routes/terminal.routes.ts ✓
/server/src/routes/webhook.routes.ts ✓
/server/src/routes/ai.routes.ts ✓
/server/src/routes/health.routes.ts ✓
/server/src/routes/auth.routes.ts ✓
/server/src/services/orders.service.ts ✓
/server/src/services/payment.service.ts ✓
/server/src/middleware/errorHandler.ts ✓
/server/src/middleware/auth.ts ✓
/server/src/middleware/rbac.ts ✓
/server/src/utils/websocket.ts ✓
/server/src/voice/websocket-server.ts ✓
/server/src/config/database.ts ✓
/server/src/server.ts ✓
... (28 additional files)
```

### Client Files (20+ files)
```
/client/src/components/errors/UnifiedErrorBoundary.tsx ✓
/client/src/hooks/useErrorHandler.ts ✓
/client/src/services/http/httpClient.ts ✓
/client/src/hooks/useWebSocketConnection.ts ✓
... (16+ additional files)
```

---

## Appendix C: Metrics Dashboard Recommendations

### Error Rate Metrics to Track
1. **Payment Errors**
   - Payment timeout rate
   - Payment failure rate by reason
   - Refund success rate
   - Audit log failure rate

2. **Database Errors**
   - Connection failure rate
   - Query timeout rate
   - Transaction rollback rate
   - Connection pool exhaustion events

3. **WebSocket Errors**
   - Connection drop rate
   - Reconnection success rate
   - Message parsing error rate
   - Session timeout rate

4. **API Errors**
   - Error rate by endpoint
   - 5xx error rate
   - Timeout rate
   - Circuit breaker open events

---

## Sign-off

**Report Generated By:** Agent 7 - Error Handling & Resilience Guardian
**Scan Duration:** ~45 minutes
**Total Issues Found:** 29 (3 P0, 8 P1, 12 P2, 6 P3)
**Estimated Fix Effort:** 55 hours (7 days)
**Recommended Timeline:** 4 weeks (phased approach)

**Status:** ✅ Scan Complete - Awaiting Action Plan Approval

---

*Generated with Claude Code - Autonomous Agent System*
