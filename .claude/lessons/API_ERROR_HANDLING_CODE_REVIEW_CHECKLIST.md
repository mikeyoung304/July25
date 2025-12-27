# API Error Handling - Code Review Checklist

**Use this checklist when reviewing PRs that touch API routes or error handling**

---

## Pre-Review: File Scanning

Before detailed review, quickly scan the files:

```bash
# Check what's changed
git diff HEAD -- '*.routes.ts' '*.ts' | grep -E '(error|catch|throw|res\.)'

# Find new endpoints
git diff HEAD -- 'server/src/routes/*.ts' | grep -E 'router\.(post|get|put|delete)'

# Identify error handling changes
git diff HEAD -- 'server/src' | grep -E '(try|catch|error|Error)'
```

---

## Security Checklist (CRITICAL)

### Error Response Safety
```
[ ] No raw error.message in responses
    ✗ res.json({ error: error.message })
    ✓ res.json({ error: safeApiError(error, 'Generic message', logger) })

[ ] No stack traces exposed to clients
    ✗ res.json({ error: error.message, stack: error.stack })
    ✓ (stack logged server-side only)

[ ] No getErrorMessage() called directly in responses
    ✗ res.json({ error: getErrorMessage(error) })
    ✓ res.json({ error: safeApiError(error, 'Generic message', logger) })

[ ] No database URLs, API keys, or service names in error messages
    ✗ "Connection to postgres://user@internal-db:5432 failed"
    ✓ "Unable to save data"

[ ] Generic messages are user-friendly
    ✗ "ECONNREFUSED" (too technical)
    ✓ "Service temporarily unavailable" (clear)
```

**If any fail:** Request changes before approval.

### Authentication Coverage
```
[ ] All endpoints accessing external APIs require authentication
    Check for: openai, stripe, twilio, sendgrid, aws calls
    ✗ router.post('/ai/transcribe', async (req, res) => { ... })
    ✓ router.post('/ai/transcribe', authenticate, requireRole(['admin']), ...)

[ ] All endpoints accessing user/restaurant data require authentication
    ✓ router.post('/orders', authenticate, ...)

[ ] Test/debug endpoints are development-only
    ✗ router.post('/test-connection', ...)
    ✓ if (process.env.NODE_ENV === 'development') {
        router.post('/test-connection', authenticate, ...)
      }

[ ] Public endpoints (health, status) are explicitly marked
    ✓ // Public endpoint - no auth required
      router.get('/health', ...)

[ ] Role restrictions match operation sensitivity
    ✗ requireRole(['user'])  // For admin operation
    ✓ requireRole(['admin'])  // For admin operation
```

**If any fail:** Request changes before approval.

### Error Logging
```
[ ] Full error details logged server-side
    ✓ logger.error('Operation failed', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        restaurantId: req.restaurantId,
        userId: req.user?.id
      });

[ ] Error logging includes context (user, restaurant, resource ID)
    ✗ logger.error('Failed', { error });
    ✓ logger.error('Failed', { error, restaurantId, userId, orderId });

[ ] No sensitive data in client error messages
    ✗ "Database: postgres://host:5432" // Config exposed
    ✓ "Unable to load data" // Generic

[ ] Proper HTTP status codes used
    ✗ res.status(200).json({ error: 'Something failed' })
    ✓ res.status(500).json({ error: safeApiError(...) })
```

**If any fail:** Request changes before approval.

---

## Architectural Checklist (IMPORTANT)

### Consistency
```
[ ] Uses safeApiError() utility (not custom error wrapping)
    ✗ res.json({ error: customErrorFormatter(error) })
    ✓ res.json({ error: safeApiError(error, 'Generic message', logger) })

[ ] Uses getErrorMessage() for message extraction
    ✗ const msg = error?.message || error;
    ✓ const msg = getErrorMessage(error);

[ ] Uses getErrorStack() for stack extraction
    ✗ const stack = error.stack;
    ✓ const stack = getErrorStack(error);

[ ] Consistent error response structure
    ✗ Sometimes { error: '...' }, sometimes { message: '...' }
    ✓ Always uses same structure (check existing routes)

[ ] No custom error handling that duplicates utilities
    ✗ Defines own extractError() function
    ✓ Uses shared utilities
```

**If any fail:** Request refactoring before approval.

### Code Quality
```
[ ] Error handling doesn't hide programming errors
    ✓ try {
        await operation();
      } catch (error) {
        logger.error('Operation failed', { error, context });
        res.status(500).json({ error: safeApiError(...) });
      }

    ✗ try {
        await operation();
      } catch {
        // Silent failure - bug hidden
      }

[ ] Generic messages are at the right granularity
    ✗ "Error" (too generic)
    ✓ "Failed to process order" (specific operation)

[ ] No commented-out error handling code
    ✗ // res.json({ error: 'Too verbose' });
    ✓ (removed entirely)

[ ] No TODO/FIXME comments about error handling
    ✗ // TODO: add error logging here
    ✓ (proper error handling implemented)
```

**If any fail:** Request cleanup before approval.

---

## Best Practices Checklist (RECOMMENDED)

### Documentation
```
[ ] Public endpoints are documented with security requirements
    ✓ /**
       * Get user orders (authenticated)
       * Requires: valid JWT token
       * Roles: any authenticated user
       */
      router.get('/orders', authenticate, ...);

[ ] Error scenarios documented in comments
    ✓ // Returns 404 if order not found or belongs to different restaurant
      router.get('/orders/:id', ...);

[ ] External service calls documented
    ✓ // Calls OpenAI API - requires authentication to prevent abuse
      router.post('/ai/process', authenticate, ...);

[ ] Test endpoints marked clearly
    ✓ // Development only - test endpoint
      if (NODE_ENV === 'development') { ... }
```

**Status:** Nice-to-have, but improves maintainability.

### Performance
```
[ ] No unnecessary error detail processing
    ✓ logger.error(msg, { error: getErrorMessage(error) });
    ✗ logger.error(msg, { error: getErrorMessage(error), fullError: error });

[ ] No expensive operations in error handling
    ✓ res.status(500).json({ error: 'Failed' });
    ✗ res.status(500).json({
        error: 'Failed',
        debug: await expensiveDiagnostics()
      });

[ ] No database queries in catch blocks (unless necessary)
    ✓ logger.error('Failed', { error });
    ✗ await db.log_error(error); // Extra I/O
```

**Status:** Review-level recommendation.

---

## Test Coverage Checklist (IMPORTANT)

```
[ ] Error response tests included
    ✓ it('should not expose error details', async () => {
        const res = await request(app).post('/api/endpoint');
        expect(res.body.error).not.toMatch(/postgres|ECONNREFUSED/);
      });

[ ] Authentication tests for protected endpoints
    ✓ it('should require authentication', async () => {
        const res = await request(app).post('/api/protected');
        expect(res.status).toBe(401);
      });

[ ] Role-based access control tests
    ✓ it('should require admin role', async () => {
        const token = createToken({ role: 'user' });
        const res = await request(app)
          .post('/api/admin-endpoint')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      });

[ ] Test endpoints marked as development-only in tests
    ✓ describe('Development endpoints', () => {
        it.skip('should skip in production', ...);
      });
```

**If not present:** Request test additions before approval.

---

## Post-Review Actions

### If Approved
```
1. Confirm all checklist items are green
2. Verify CI/CD tests pass
3. Check lint warnings about error patterns
4. Approve and merge
```

### If Issues Found (Blocking)
```
1. Document specific checklist items that failed
2. Link to this document
3. Request changes
4. Example comment:

"Please address these security issues before approval:
- [x] Remove raw error.message from response (line 45)
- [x] Add authentication to /ai/test endpoint (line 78)
- [x] Use safeApiError() instead of getErrorMessage() (line 52)

See: API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md"
```

### If Issues Found (Non-Blocking)
```
1. Note as "best practice" suggestion
2. Can be fixed in follow-up PR
3. Example comment:

"Minor suggestions for improved security:
- Consider adding request context to error logging (see checklist)
- Restaurant ID validation would be good here

Not blocking, but nice improvements."
```

---

## Quick Reference: Red Flags

**Immediate rejection required for:**
- Raw `error.message` in API responses
- Unauthenticated access to external service endpoints
- Stack traces visible to clients
- Database URLs in error messages
- No error logging on failures

**Request changes for:**
- Inconsistent error utilities usage
- Missing authentication on protected endpoints
- Test endpoints without NODE_ENV guard
- Generic messages that are too vague

**Nice-to-have improvements:**
- Error scenario documentation
- Enhanced test coverage
- Request context in logs

---

## During Code Review: Questions to Ask

1. **Why might this error occur?**
   - If no good answer: error handling may be insufficient

2. **What internal details could leak here?**
   - If unclear: request review of error messages

3. **Who should be able to call this endpoint?**
   - If unclear: authentication requirements missing

4. **How will we debug this if it fails in production?**
   - If "unclear": request better error logging

5. **Is this a test endpoint?**
   - If yes: verify NODE_ENV guard

6. **Does this access external APIs?**
   - If yes: verify authentication required

---

## Common Review Comments (Copy/Paste)

### Comment 1: Raw Error Message
```
Please use `safeApiError()` here instead of exposing raw error messages:

Instead of:
res.json({ error: error.message });

Use:
res.json({ error: safeApiError(error, 'Failed to save', logger) });

This logs full details server-side while returning a generic message to clients.
```

### Comment 2: Missing Authentication
```
This endpoint calls external services (OpenAI), so it needs authentication:

Current:
router.post('/api/ai/process', ...);

Suggested:
router.post('/api/ai/process', authenticate, requireRole(['admin']), ...);

See: API_ERROR_HANDLING_QUICK_REFERENCE.md for patterns.
```

### Comment 3: Unguarded Test Endpoint
```
Test endpoints should be development-only:

Current:
router.post('/test-api', ...);

Suggested:
if (process.env.NODE_ENV === 'development') {
  router.post('/test-api', authenticate, ...);
}
```

### Comment 4: Inconsistent Error Handling
```
For consistency, use `getErrorMessage()` utility:

Instead of:
const msg = error instanceof Error ? error.message : String(error);

Use:
const msg = getErrorMessage(error);

This is already imported and handles all error types.
```

### Comment 5: Missing Error Logging
```
Please add context to error logging:

Current:
logger.error('Failed');

Better:
logger.error('Operation failed', {
  error: getErrorMessage(error),
  restaurantId: req.restaurantId,
  userId: req.user?.id,
  resourceId: orderId
});
```

---

## Integration with GitHub

Add to PR template (`.github/pull_request_template.md`):

```markdown
## Security Checklist
- [ ] No raw error messages in API responses
- [ ] Stack traces not exposed to clients
- [ ] Authentication on protected endpoints
- [ ] Full errors logged server-side
- [ ] Test endpoints are development-only

See: `.claude/lessons/API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md`
```

---

## Training: Teach Others

When reviewing someone's first API endpoint:

1. **Show the pattern:** "Here's what a secure endpoint looks like"
2. **Point out issues:** "This would leak information because..."
3. **Explain why:** "We don't send details to clients to prevent revealing our architecture"
4. **Share resources:** "Check out the quick reference guide for templates"
5. **Praise good practices:** "Great job logging with context!"

---

**Last Updated:** 2025-12-26
**Use for:** Every PR that touches API routes, error handling, or authentication
**Owner:** Code Review Team
**Severity:** Critical for security items, important for architecture items
