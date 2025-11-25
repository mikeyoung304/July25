# TODO-004: Add Rate Limiting to Realtime Session Endpoint

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 004
- **Tags**: security, backend, rate-limiting, voice
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Backend Analyst Agent

---

## Problem Statement

The `/api/v1/realtime/session` endpoint creates ephemeral OpenAI tokens but has NO rate limiting. This is a high-cost operation that could be abused for:

1. **DoS attacks** - Flood endpoint to exhaust server resources
2. **Cost attacks** - Generate expensive OpenAI API calls
3. **Token enumeration** - Harvest ephemeral tokens

---

## Findings

### Current Code
```typescript
// server/src/routes/realtime.routes.ts:190
router.post('/session', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // No rate limiting middleware!
  // Each call generates OpenAI API request
});
```

### Available Middleware
The codebase already has `aiServiceLimiter` middleware used elsewhere:
```typescript
// Other routes use it:
router.post('/transcribe', aiServiceLimiter, ...);
```

### Risk Assessment
- **Likelihood**: High (endpoint is public via optionalAuth)
- **Impact**: High (direct cost to OpenAI API billing)
- **Effort to Exploit**: Low (simple curl loop)

---

## Proposed Solutions

### Option A: Apply aiServiceLimiter (Recommended)
Add existing rate limiter to the route.

**Pros**: Minimal code change, uses proven middleware
**Cons**: May need tuning for voice use case
**Effort**: Very Low (1 line)
**Risk**: Very Low

### Option B: Custom Voice Rate Limiter
Create voice-specific rate limiter with different thresholds.

**Pros**: Optimized for voice sessions
**Cons**: More code to maintain
**Effort**: Low (30 min)
**Risk**: Low

### Option C: Token Bucket with Redis
Implement proper distributed rate limiting.

**Pros**: Scalable, accurate across instances
**Cons**: Requires Redis setup
**Effort**: Medium (2-3 hours)
**Risk**: Low

---

## Recommended Action

**Option A** - Immediate fix:

```typescript
// server/src/routes/realtime.routes.ts:190
router.post('/session', aiServiceLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Now rate limited!
});
```

Then follow up with Option B for production tuning:
```typescript
// Suggested limits for voice sessions
const voiceSessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 sessions per minute per IP
  message: { error: 'Too many voice session requests', code: 'RATE_LIMITED' }
});
```

---

## Technical Details

### Affected Files
- `server/src/routes/realtime.routes.ts:190`

### Existing Rate Limiter Location
- `server/src/middleware/rateLimiter.ts`

---

## Acceptance Criteria

- [ ] Rate limiting middleware applied to POST /session
- [ ] Appropriate limits set (suggest 5/minute for unauthenticated)
- [ ] Rate limit response includes helpful error message
- [ ] Authenticated users may have higher limits
- [ ] Logging added for rate limit events

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From backend security review |

---

## Resources

- [Rate Limiter Middleware](server/src/middleware/rateLimiter.ts)
- [Realtime Routes](server/src/routes/realtime.routes.ts)
