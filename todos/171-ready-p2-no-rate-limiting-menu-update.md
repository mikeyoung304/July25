---
status: ready
priority: p2
issue_id: "171"
tags: [code-review, security, performance, rate-limiting, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# No Rate Limiting on Menu Update Endpoint

## Problem Statement

The PATCH endpoint has no specific rate limiting. While general API limiter applies, menu updates should have stricter limits as they clear cache on each call.

## Findings

### Agent Discovery

**Security Sentinel:** Identified abuse potential
**Performance Oracle:** Each update clears restaurant cache (CPU overhead)
**Data Integrity Guardian:** Could be abused for cache thrashing

### Evidence

```typescript
// server/src/routes/menu.routes.ts:119
router.patch('/items/:id', authenticate, requireScopes(ApiScope.MENU_MANAGE), async (req, res, next) => {
  // No specific rate limiter
});
```

### Risk

- Potential abuse by toggling items rapidly (cache thrashing)
- Each update clears entire restaurant's menu cache
- Could be used for resource exhaustion attacks
- General limiter (1000 req/15min) too permissive for state-changing ops

## Proposed Solutions

### Solution A: Add Menu-Specific Rate Limiter (Recommended)

**Effort:** Small (30 min) | **Risk:** Low

```typescript
// In rateLimiter.ts
export const menuUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 100 : 30, // 30 updates per minute max
  keyGenerator: getUserRateLimitKey,
  message: 'Too many menu updates. Please wait before making more changes.',
});

// In menu.routes.ts
router.patch('/items/:id',
  authenticate,
  menuUpdateLimiter,
  requireScopes(ApiScope.MENU_MANAGE),
  async (req, res, next) => { ... }
);
```

## Recommended Action

Implement Solution A - simple middleware addition.

## Technical Details

**Affected Files:**
- `server/src/middleware/rateLimiter.ts`
- `server/src/routes/menu.routes.ts:119`

## Acceptance Criteria

- [ ] Menu update rate limiter created
- [ ] Applied to PATCH endpoint
- [ ] 30 updates/minute limit in production
- [ ] Appropriate error message for rate limit exceeded

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- Rate limiter middleware: `server/src/middleware/rateLimiter.ts`
- PR #152: feat(menu): implement 86-item management
