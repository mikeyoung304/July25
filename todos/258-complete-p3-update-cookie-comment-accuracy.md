---
status: done
priority: p3
issue_id: 258
tags: [code-review, documentation, accuracy]
dependencies: []
---

# Update Comment About HTTPOnly Cookie Behavior

## Problem Statement

The comment in auth.routes.ts states:
> "HTTPOnly cookies don't work across different domains"

This is imprecise. HTTPOnly cookies CAN work cross-origin with `SameSite=None; Secure` and CORS `credentials: include`. The real issue is that the code uses `SameSite=strict`, which prevents cross-origin cookie transmission.

## Findings

**Agent:** code-quality-reviewer

**Location:** `/server/src/routes/auth.routes.ts:151-153`

**Current:**
```typescript
// Cross-origin deployments (Vercel → Render) need the token in response body
// because HTTPOnly cookies don't work across different domains
```

**Issue:** The comment is technically inaccurate. The cookie configuration at line 24 uses `sameSite: 'strict'` which is the real reason cookies aren't sent cross-origin.

## Proposed Solutions

### Solution 1: Update comment for accuracy

```typescript
// Cross-origin deployments (Vercel → Render) need the token in response body
// because SameSite=strict cookies are not sent with cross-origin requests
```

**Effort:** Small (5 min)
**Risk:** None

## Recommended Action

Update comment to accurately describe SameSite behavior.

## Technical Details

**Affected Files:**
- `server/src/routes/auth.routes.ts`

## Acceptance Criteria

- [ ] Comment accurately describes the cookie behavior
- [ ] References the SameSite setting as the reason

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-31 | Identified during code review | Technical accuracy in comments matters |
