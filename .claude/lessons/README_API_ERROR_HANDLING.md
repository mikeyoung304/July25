# API Error Handling Security - Documentation Index

**Complete prevention strategy for security and architecture issues fixed in enterprise audit remediation**

---

## What Was Fixed?

In the enterprise audit remediation session (Dec 2025), four critical issues were identified and fixed:

| # | Issue | Severity | What Happened | How We Fixed It |
|---|-------|----------|---------------|-----------------|
| 1 | **API error disclosure** | HIGH | Raw error messages leaked internal details (database URLs, service names, file paths) | Created `safeApiError()` utility for safe error responses |
| 2 | **Test endpoints without auth** | MEDIUM | Unauthenticated access to expensive APIs (OpenAI calls incurred costs) | Added `NODE_ENV === 'development'` guards |
| 3 | **Inconsistent error patterns** | MEDIUM | 36+ different ways to extract errors from exceptions | Implemented `getErrorMessage()` utility to standardize |
| 4 | **Redundant fallback code** | LOW | Multiple error extraction patterns doing the same thing | Consolidated into shared utilities |

---

## How Do I...?

### I'm writing a new API endpoint
**→ Read:** [`API_ERROR_HANDLING_QUICK_REFERENCE.md`](./API_ERROR_HANDLING_QUICK_REFERENCE.md)
- Copy-paste template for new endpoints
- Common mistakes vs. correct patterns
- Checklist before committing

### I'm reviewing a PR with API changes
**→ Read:** [`API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md`](./API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md)
- Pre-review file scanning
- Security checklist (blocking issues)
- Copy-paste review comments

### I'm understanding the full strategy
**→ Read:** [`CL-SEC-001-error-handling-security.md`](./CL-SEC-001-error-handling-security.md)
- Deep-dive into each issue
- Prevention strategies
- Best practices
- Automation opportunities

### I'm setting up automation
**→ Read:** [`API_ERROR_HANDLING_ESLINT_RULES.md`](./API_ERROR_HANDLING_ESLINT_RULES.md)
- 5 recommended ESLint rules
- Full implementation code
- Bash script helpers
- CI/CD integration

### I need the executive summary
**→ Read:** [`PREVENTION_STRATEGIES_API_ERROR_HANDLING.md`](./PREVENTION_STRATEGIES_API_ERROR_HANDLING.md)
- Overview of all strategies
- Implementation roadmap
- Key utilities reference
- Success metrics

---

## The Pattern You Need to Remember

### Before (Vulnerable)
```typescript
try {
  await saveOrder(data);
} catch (error) {
  // Exposes internal details ✗
  res.status(500).json({
    error: error.message,  // "Connection failed: postgres://user@db.internal"
    stack: error.stack     // Stack trace visible to attacker
  });
}
```

### After (Secure)
```typescript
try {
  await saveOrder(data);
} catch (error) {
  // Log details server-side ✓
  logger.error('Failed to save order', {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
    restaurantId: req.restaurantId,
    userId: req.user?.id
  });

  // Return generic message to client ✓
  res.status(500).json({
    error: safeApiError(error, 'Unable to save order', logger)
  });
}
```

**Key differences:**
1. Details logged server-side, not sent to client
2. Generic message for users ("Unable to save order")
3. Full context for debugging (restaurantId, userId)
4. No stack traces or internal system details exposed

---

## One-Minute Checklist

Before every API endpoint commit:

```
[ ] No error.message in responses
[ ] No stack traces visible to clients
[ ] Full error details logged server-side
[ ] Using safeApiError() for responses
[ ] Using getErrorMessage() for extraction
[ ] Authentication on protected endpoints
[ ] Test endpoints development-only
```

---

## Utilities You Need to Know

### `getErrorMessage(error: unknown): string`
Safely extract message from any error type
```typescript
import { getErrorMessage } from '@rebuild/shared';

getErrorMessage(new Error('Test'));      // 'Test'
getErrorMessage('String error');         // 'String error'
getErrorMessage(null);                   // 'null'
```

### `getErrorStack(error: unknown): string | undefined`
Extract stack trace (undefined if not Error)
```typescript
import { getErrorStack } from '@rebuild/shared';

getErrorStack(new Error('Test'));  // 'Error: Test\n    at ...'
getErrorStack('String');           // undefined
```

### `safeApiError(error, message, logger?): string`
All-in-one for API responses
```typescript
import { safeApiError } from '@rebuild/shared';

const clientMessage = safeApiError(
  error,
  'Failed to process order',  // What client sees
  logger                       // Server-side logging
);
// Returns: 'Failed to process order'
// Logs: { error: '...', stack: '...', errorType: '...' }
```

---

## Authentication Pattern

### What Needs Authentication?
- All endpoints accessing external APIs (OpenAI, Stripe, etc.)
- All endpoints accessing user/restaurant data
- Admin operations
- Debug/test endpoints

### How to Add It
```typescript
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

// Protect endpoint
router.post('/api/orders',
  authenticate,               // Check user is logged in
  requireRole(['admin']),      // Check user has required role
  async (req, res) => {
    // Implementation
  }
);

// Development-only endpoint
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/test',
    authenticate,
    async (req, res) => { /* ... */ }
  );
}
```

---

## Code Review Quick Comments

### If you see raw error.message
```
"Please use safeApiError() to avoid exposing internal details.

Instead of:
res.json({ error: error.message });

Use:
res.json({ error: safeApiError(error, 'Operation failed', logger) });
```

### If you see unauthenticated external service
```
"This endpoint calls external APIs. Add authentication:

router.post('/api/endpoint',
  authenticate,
  requireRole(['admin']),
  async (req, res) => { ... }
);
```

### If you see test endpoint without guard
```
"Test endpoints should be development-only:

if (process.env.NODE_ENV === 'development') {
  router.post('/test-endpoint', authenticate, ...);
}
```

---

## Team Training

### Quick Training (15 minutes)
Share this overview with your team, focusing on:
1. Why this matters (prevent attacks, protect architecture)
2. The pattern (use safeApiError, authenticate endpoints, log context)
3. The checklist (verify before committing)

### Hands-On Training (30 minutes)
1. Write sample endpoint using template
2. Have team review using checklist
3. Discuss common mistakes
4. Q&A

### Ongoing
- Reviewers use checklist on all PRs
- Share good examples in retrospectives
- Track metrics (ESLint violations, test coverage)

---

## Real-World Examples

These are all from the codebase - see how each is implemented:

### Example 1: Secure Error Response
**Location:** `server/src/routes/ai.routes.ts:53`
```typescript
res.status(500).json({
  error: safeApiError(error, 'Failed to load menu for AI processing', aiLogger)
});
```

### Example 2: Authentication on External Service
**Location:** `server/src/routes/ai.routes.ts:35` (after fix)
```typescript
router.post('/process',
  aiServiceLimiter,
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const result = await aiService.process(req.body);
      res.json(result);
    } catch (error) {
      logger.error('Processing failed', { error: getErrorMessage(error) });
      res.status(500).json({
        error: safeApiError(error, 'Processing failed', aiLogger)
      });
    }
  }
);
```

### Example 3: Development-Only Endpoint
**Location:** `server/src/routes/ai.routes.ts` (after fix)
```typescript
if (process.env.NODE_ENV === 'development') {
  router.post('/test-tts',
    authenticate,
    trackAIMetrics('test-tts'),
    async (req, res) => {
      // Test endpoint - development only
    }
  );
}
```

---

## What Gets Automated?

We're implementing automation to catch these issues automatically:

### ESLint Rules (Prevents Bad Code)
- ✓ Detect raw `error.message` in responses
- ✓ Flag missing authentication on external services
- ✓ Require `NODE_ENV` guard on test endpoints
- ✓ Flag duplicate error extraction patterns

### Tests (Verify Safety)
- ✓ Error responses don't leak internal details
- ✓ Stack traces not exposed to clients
- ✓ Authentication enforced on protected endpoints
- ✓ Error logging includes required context

### CI/CD Checks (Prevent Merging Bad Code)
- ✓ No raw error messages detected
- ✓ All test endpoints properly guarded
- ✓ Authentication coverage on external APIs

---

## Success Metrics

We'll track these to ensure prevention is working:

| Metric | Target | How We Check |
|--------|--------|-------------|
| Error message leakage | 0 in production | Grep logs for technical errors |
| Unauth external APIs | 0 unprotected | Script checks auth middleware |
| Inconsistent patterns | 100% using utilities | Lint report shows 0 violations |
| Test coverage | > 80% error paths | Coverage report from npm test |
| ESLint violations | 0 in CI/CD | Pre-commit hook blocks violations |

---

## Key Takeaways

1. **Never send raw errors to clients**
   - Log details server-side, return generic messages

2. **Always authenticate external service endpoints**
   - Prevents API abuse and cost overruns

3. **Use standard utilities consistently**
   - `getErrorMessage()`, `getErrorStack()`, `safeApiError()`

4. **Gate development endpoints explicitly**
   - `if (NODE_ENV === 'development')` guard

5. **Log with context**
   - Include user ID, restaurant ID, resource IDs for debugging

---

## Document Map

```
README_API_ERROR_HANDLING.md (you are here)
│
├─→ API_ERROR_HANDLING_QUICK_REFERENCE.md
│   └─ For developers building endpoints
│
├─→ API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md
│   └─ For code reviewers
│
├─→ CL-SEC-001-error-handling-security.md
│   └─ For understanding full strategy
│
├─→ API_ERROR_HANDLING_ESLINT_RULES.md
│   └─ For DevOps/automation teams
│
└─→ PREVENTION_STRATEGIES_API_ERROR_HANDLING.md
    └─ For project managers/leads
```

---

## Next Steps

1. **This week:** Share this overview with your team
2. **Next sprint:** Implement ESLint rules
3. **Ongoing:** Use checklist on all PRs with API/error handling changes

---

## Questions?

- **About patterns?** Check `API_ERROR_HANDLING_QUICK_REFERENCE.md`
- **About code review?** Check `API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md`
- **About automation?** Check `API_ERROR_HANDLING_ESLINT_RULES.md`
- **About strategy?** Check `CL-SEC-001-error-handling-security.md`

---

**Created:** 2025-12-26
**Status:** Documentation Complete
**Next Review:** Q1 2026

---

## Last Important Reminder

The pattern that prevents all these issues is simple:

```typescript
// 1. Try the operation
try {
  await operation();

// 2. Catch and log FULL details server-side
} catch (error) {
  logger.error('Operation failed', {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
    context: { restaurantId, userId }
  });

  // 3. Return GENERIC message to client
  res.status(500).json({
    error: safeApiError(error, 'Operation failed', logger)
  });
}
```

Do this for every endpoint and you'll prevent all four issues that were fixed in this session.
