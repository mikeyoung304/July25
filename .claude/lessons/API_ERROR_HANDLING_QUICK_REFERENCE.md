# API Error Handling - Quick Reference

**Quick lookup guide for implementing secure error handling**

## The Golden Rule

> **Never send raw error messages to API clients. Always log details server-side, return generic messages to clients.**

---

## Copy-Paste Template

Use this template for every new API endpoint:

```typescript
import { safeApiError, getErrorMessage } from '@rebuild/shared';
import { logger } from '../utils/logger';

router.post('/your-endpoint',
  authenticate,                    // 1. Require authentication
  requireRole(['admin']),          // 2. Restrict to appropriate role
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Your business logic here
      const result = await yourServiceCall(req.body);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // 3. Log full details server-side
      logger.error('Endpoint failed', {
        error: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
        restaurantId: req.restaurantId,
        userId: req.user?.id,
        requestBody: sanitizeForLogging(req.body)
      });

      // 4. Return generic message to client
      res.status(500).json({
        error: safeApiError(error, 'Operation failed', logger)
      });
    }
  }
);
```

---

## Quick Decision Tree

### Is this endpoint protected?

```
Does it access external APIs (OpenAI, Stripe)?
├─ YES → ALWAYS add authenticate + requireRole(['admin'])
└─ NO  → Continue to next question

Does it access user/restaurant data?
├─ YES → ALWAYS add authenticate + validateRestaurantId()
└─ NO  → Continue to next question

Is it a test/debug endpoint?
├─ YES → Wrap in: if (process.env.NODE_ENV === 'development')
└─ NO  → Public endpoint (health, status, etc)
```

### How should I handle errors?

```
Caught an error in try/catch?
├─ Always log full details server-side:
│  └─ logger.error(message, { error: getErrorMessage(error), ... })
│
├─ In response, use safeApiError():
│  └─ res.status(500).json({ error: safeApiError(error, 'Generic message', logger) })
│
└─ NEVER send to client:
   ├─ error.message
   ├─ error.stack
   ├─ Database connection strings
   ├─ Service names or IPs
   └─ File paths or config details
```

---

## Common Mistakes

### WRONG - Exposing error details
```typescript
try {
  await db.query();
} catch (error) {
  // NEVER DO THIS:
  res.status(500).json({ error: error.message });  // Internal details exposed!
  res.status(500).json({ error: getErrorMessage(error) });  // Still exposed!
}
```

### RIGHT - Safe error response
```typescript
try {
  await db.query();
} catch (error) {
  logger.error('Query failed', { error: getErrorMessage(error) });  // Log details
  res.status(500).json({
    error: safeApiError(error, 'Unable to save data', logger)  // Generic message
  });
}
```

---

### WRONG - Unauthenticated external service
```typescript
router.post('/test-api', async (req, res) => {
  // Anyone can call this - expensive!
  const result = await openai.chat.completions.create({ ... });
  res.json(result);
});
```

### RIGHT - Protected external service
```typescript
router.post('/test-api',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    // Only authenticated admins can call this
    const result = await openai.chat.completions.create({ ... });
    res.json(result);
  }
);

// OR for development-only:
if (process.env.NODE_ENV === 'development') {
  router.post('/test-api',
    authenticate,
    async (req, res) => { /* ... */ }
  );
}
```

---

### WRONG - Inconsistent error extraction
```typescript
// Using different patterns across the code:
const msg1 = error.message;
const msg2 = error instanceof Error ? error.message : String(error);
const msg3 = error?.message || 'Unknown';
const msg4 = getErrorMessage(error);

// All doing the same thing but different! Confusing.
```

### RIGHT - Consistent error extraction
```typescript
// Always use the same utility:
import { getErrorMessage, getErrorStack } from '@rebuild/shared';

const msg = getErrorMessage(error);      // Message extraction
const stack = getErrorStack(error);      // Stack extraction (returns undefined if not Error)
```

---

## Utilities Available

### `getErrorMessage(error: unknown): string`
Safely extracts message from any error type.

```typescript
getErrorMessage(new Error('Test'));      // → 'Test'
getErrorMessage('String error');         // → 'String error'
getErrorMessage({ something: 'object'}); // → '[object Object]'
getErrorMessage(null);                   // → 'null'
```

### `getErrorStack(error: unknown): string | undefined`
Extracts stack trace only if Error instance.

```typescript
getErrorStack(new Error('Test'));  // → Stack trace string
getErrorStack('String error');     // → undefined
getErrorStack(null);               // → undefined
```

### `safeApiError(error, message, logger?): string`
All-in-one for API responses.

```typescript
// Logs full details server-side, returns generic message to client
const clientMessage = safeApiError(
  error,
  'Failed to process order',  // What client sees
  logger                       // Where to log details
);
// Returns: 'Failed to process order'
// Logs: { error: '...', stack: '...', errorType: '...' }
```

---

## Authentication Checklist

Before every API commit, verify:

```
[ ] All endpoints return generic error messages (no raw error.message)
[ ] Stack traces never sent to client
[ ] Full error details logged server-side with context
[ ] safeApiError() used for all error responses
[ ] External service endpoints require authenticate middleware
[ ] Test endpoints are development-only
[ ] No hardcoded sensitive values in error messages
[ ] Restaurant ID validated on protected endpoints
```

---

## Imports You Need

```typescript
// For error utilities
import { getErrorMessage, getErrorStack, safeApiError } from '@rebuild/shared';

// For logging
import { logger } from '../utils/logger';

// For authentication
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
```

---

## Common Error Messages (Good Examples)

Use these as templates for user-friendly error messages:

```typescript
// Generic, user-friendly messages
'Failed to load menu'
'Unable to process order'
'Payment processing failed'
'Could not save settings'
'Operation failed - please try again'
'Service temporarily unavailable'
'Invalid request data'
'Access denied'
'Session expired'
```

NOT these (too technical):

```typescript
'Connection refused'
'ECONNREFUSED'
'TypeError: Cannot read property X of undefined'
'SELECT * FROM orders WHERE...'
'postgres://user:pass@db.internal:5432'
'Stack overflow in recursive call'
```

---

## Testing Your Error Responses

```typescript
describe('Error Response Safety', () => {
  it('should not expose raw error messages', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ invalid: 'data' });

    // Should be generic
    expect(res.body.error).toMatch(/Failed|Unable|Error/i);

    // Should NOT leak internals
    expect(res.body.error).not.toMatch(/postgres/);
    expect(res.body.error).not.toMatch(/ECONNREFUSED/);
    expect(res.body.error).not.toMatch(/at /);
  });

  it('should not expose stack traces', async () => {
    const res = await request(app).get('/api/missing');

    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toMatch(/at /);
  });
});
```

---

## Need Help?

- Full guide: See [CL-SEC-001: API Error Handling & Authentication Security](./CL-SEC-001-error-handling-security.md)
- Code examples: Search for `safeApiError` in `server/src/routes/ai.routes.ts`
- Logger details: `server/src/utils/logger.ts`
- Utilities: `shared/utils/error-utils.ts`

---

**Last Updated:** 2025-12-26
**Use this for:** Every new API endpoint
**Review in:** Code review before merge
