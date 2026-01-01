---
status: done
priority: p2
issue_id: 256
tags: [code-review, auth, api-contract, consistency]
dependencies: []
---

# Inconsistent Token Field Names Between Auth Endpoints

## Problem Statement

The auth endpoints return tokens using different field names and structures:
- Email login: `session.access_token` (nested)
- PIN login: `token` (top-level)
- Station login: `token` (top-level)
- Refresh: `session.access_token` (nested)

This inconsistency:
- Increases client-side complexity
- Violates API design best practices
- Makes the codebase harder to maintain

## Findings

**Agents:** security-sentinel, code-quality-reviewer, api-contract-reviewer

**Locations:**
- `/server/src/routes/auth.routes.ts:163` - `session.access_token`
- `/server/src/routes/auth.routes.ts:251` - `token`
- `/client/src/contexts/AuthContext.tsx:204-206` - expects both patterns

**Current State:**

| Endpoint | Token Field | Expiry Field | Structure |
|----------|-------------|--------------|-----------|
| `/login` | `session.access_token` | `expires_in` | Nested |
| `/pin-login` | `token` | `expiresIn` | Flat |
| `/station-login` | `token` | `expiresAt` | Flat |
| `/refresh` | `session.access_token` | `expires_in` | Nested |

## Proposed Solutions

### Solution 1: Standardize to session.access_token (Recommended)

**Pros:**
- Matches OAuth 2.0 conventions
- Consistent with email login and refresh endpoints
- Cleaner separation (user data vs session data)

**Cons:**
- Breaking change for PIN/station login clients
- Requires client updates

**Effort:** Medium (2 hours)
**Risk:** Medium (breaking change)

### Solution 2: Standardize to top-level token

**Pros:**
- Simpler response structure
- Matches PIN/station login pattern

**Cons:**
- Deviates from OAuth conventions
- Breaking change for email login clients

**Effort:** Medium (2 hours)
**Risk:** Medium (breaking change)

### Solution 3: Keep current pattern, add types

**Pros:**
- No breaking changes
- Document the intentional difference

**Cons:**
- Technical debt remains
- Increased maintenance burden

**Effort:** Small (30 min)
**Risk:** Low

## Recommended Action

Solution 3 for now (document with types), then Solution 1 as a coordinated breaking change with versioned API.

## Technical Details

**Affected Files:**
- `server/src/routes/auth.routes.ts`
- `client/src/contexts/AuthContext.tsx`
- `shared/types/auth.types.ts` (to create)

## Acceptance Criteria

- [ ] Create shared types for all auth responses
- [ ] Document the intentional differences
- [ ] Plan v2 API with consistent structure

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-31 | Identified during code review | API consistency matters for maintainability |

## Resources

- ADR-001: Snake case convention (violated by `expiresIn`)
- OAuth 2.0 token response spec
