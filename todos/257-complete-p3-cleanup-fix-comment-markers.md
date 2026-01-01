---
status: done
priority: p3
issue_id: 257
tags: [code-review, code-quality, cleanup]
dependencies: []
---

# Remove Development Comment Markers

## Problem Statement

The auth routes file contains development-time comment markers that should be cleaned up before committing:

```typescript
access_token: customToken,  // ✅ FIX: Include JWT for localStorage fallback
token,  // ✅ FIX: Include JWT for localStorage fallback
```

These markers are helpful during development but should be removed or simplified for production code.

## Findings

**Agent:** code-quality-reviewer

**Location:** `/server/src/routes/auth.routes.ts:163, 251`

## Proposed Solutions

### Solution 1: Replace with descriptive comments

```typescript
// Email login
session: {
  access_token: customToken,  // JWT for cross-origin localStorage auth
  refresh_token: authData.session?.refresh_token,
  expires_in: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60
}

// PIN login
res.json({
  user: {...},
  token,  // JWT for cross-origin localStorage auth
  expiresIn: 12 * 60 * 60,
  restaurantId
});
```

**Effort:** Small (5 min)
**Risk:** None

## Recommended Action

Replace `// ✅ FIX:` markers with descriptive comments.

## Technical Details

**Affected Files:**
- `server/src/routes/auth.routes.ts`

## Acceptance Criteria

- [ ] Remove emoji markers
- [ ] Keep descriptive comments explaining purpose

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-31 | Identified during code review | Clean up dev markers before commit |
