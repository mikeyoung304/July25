---
status: deferred
priority: p2
issue_id: "242"
tags: [code-review, security, authentication]
dependencies: []
deferred_reason: "Breaking change for security theater - no known XSS vector. Access token already uses HTTPOnly cookie. Revisit post-launch."
---

# P2: Refresh Token Returned in Response Body

## Problem Statement

The login endpoint returns the refresh token in the JSON response body for "backward compatibility." This partially defeats the security benefits of HTTPOnly cookies for the access token.

**Why it matters:** If an XSS vulnerability exists, the attacker can steal the refresh token from the response (even though they can't steal the HTTPOnly access token cookie).

## Findings

**Location:** `server/src/routes/auth.routes.ts:159-162`

**Evidence:**
```typescript
session: {
  refresh_token: authData.session?.refresh_token, // Exposed in response
  expires_in: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60
}
```

The access token is correctly in an HTTPOnly cookie, but the refresh token is exposed.

## Proposed Solutions

### Option A: Move refresh token to HTTPOnly cookie (Recommended)
**Pros:** Consistent security model, fully XSS-protected
**Cons:** Requires client changes to stop reading from response
**Effort:** Medium (requires client migration)
**Risk:** Medium (breaking change for clients)

### Option B: Add dedicated refresh endpoint
**Pros:** Can deprecate response-based token gradually
**Cons:** Two patterns during migration
**Effort:** Medium
**Risk:** Low

### Option C: Document as accepted risk
**Pros:** No code changes
**Cons:** Security gap remains
**Effort:** None
**Risk:** Keeps vulnerability

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/routes/auth.routes.ts`
- `client/src/services/http/httpClient.ts` (client changes needed)

**Components:** Auth routes, HTTP client

## Acceptance Criteria

- [ ] Refresh token not present in login response JSON
- [ ] Refresh token stored in HTTPOnly cookie
- [ ] Client updated to use cookie-based refresh flow
- [ ] Backward compatibility period documented if needed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during security review | Refresh token exposure partially defeats HTTPOnly |

## Resources

- OWASP Session Management Cheat Sheet
