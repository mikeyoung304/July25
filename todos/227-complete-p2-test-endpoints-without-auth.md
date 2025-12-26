---
status: complete
priority: p2
issue_id: 227
tags: [code-review, security, api]
dependencies: []
---

# Test Endpoints Without Authentication

## Problem Statement

Two AI test endpoints are exposed without any authentication, allowing unauthenticated access to OpenAI services which could result in cost abuse and information disclosure.

## Findings

### Security Review Finding

**Location:** `server/src/routes/ai.routes.ts` lines 578-657

**Endpoints affected:**
- `POST /api/ai/test-tts` (line 578)
- `POST /api/ai/test-transcribe` (line 619)

**Issues:**
1. No `authenticate` middleware applied
2. No `requireRole` restriction
3. Endpoints expose detailed error information including stack traces
4. Can be used for AI service abuse (OpenAI API cost implications)

**Code snippet:**
```typescript
// Line 578 - No auth middleware
router.post('/test-tts', trackAIMetrics('test-tts'), async (req: Request, res: Response) => {
  // ...exposes full error details including stack traces
});
```

## Proposed Solutions

### Option A: Add Authentication (Recommended)
**Pros:** Consistent with other AI endpoints, maintains test capability
**Cons:** Requires valid credentials for testing
**Effort:** Small
**Risk:** Low

```typescript
router.post('/test-tts',
  authenticate,
  requireRole(['admin']),
  trackAIMetrics('test-tts'),
  async (req: Request, res: Response) => { ... }
);
```

### Option B: Environment Guard
**Pros:** Simple, no auth changes needed
**Cons:** Still accessible if NODE_ENV not set properly
**Effort:** Small
**Risk:** Low

```typescript
if (process.env.NODE_ENV === 'development') {
  router.post('/test-tts', ...);
  router.post('/test-transcribe', ...);
}
```

### Option C: Remove Endpoints
**Pros:** Eliminates risk entirely
**Cons:** Loses testing capability
**Effort:** Small
**Risk:** Low

## Recommended Action

**IMPLEMENTED**: Option B (Environment Guard) - Test endpoints wrapped in `if (env.NODE_ENV === 'development')` block.

## Technical Details

**Affected files:**
- `server/src/routes/ai.routes.ts`

**Components:** AI routes, authentication middleware

## Acceptance Criteria

- [x] Test endpoints require authentication OR are environment-restricted
- [x] Stack traces are not exposed in production error responses
- [x] Existing test scripts updated if auth is added

## Work Log

| Date       | Action    | Notes                                                      |
| ---------- | --------- | ---------------------------------------------------------- |
| 2025-12-26 | Created   | Found during code review                                   |
| 2025-12-26 | Completed | Wrapped test endpoints in NODE_ENV === 'development' check |

## Resources

- PR: feat/enterprise-audit-remediation branch
- Related: OWASP API Security Top 10 - Broken Authentication
