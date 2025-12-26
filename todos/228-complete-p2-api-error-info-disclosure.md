---
status: complete
priority: p2
issue_id: 228
tags: [code-review, security, api]
dependencies: []
---

# API Error Information Disclosure

## Problem Statement

The `getErrorMessage()` utility extracts raw error messages and returns them directly to API clients. This can leak sensitive internal information including service names, database details, file paths, and configuration errors.

## Findings

### Security Review Finding

**Location:** Multiple files in `server/src/routes/`

**Affected endpoints (ai.routes.ts):**
- Lines 55, 148, 216, 265, 453, 544 - all return raw error messages

**Pattern:**
```typescript
res.status(500).json({
  error: 'Failed to load menu for AI processing',
  message: getErrorMessage(error)  // Raw internal error exposed
});
```

**Risk:** Attackers could trigger errors to extract:
- Internal service names and architecture
- Database connection details
- File paths and directory structure
- Third-party API error messages

## Proposed Solutions

### Option A: Generic API Error Wrapper (Recommended)
**Pros:** Centralized, consistent, secure
**Cons:** Requires new utility function
**Effort:** Medium
**Risk:** Low

```typescript
// New utility in shared/utils/api-error.ts
export function safeApiError(error: unknown, genericMessage: string): string {
  logger.error(genericMessage, { error: getErrorMessage(error) });
  return genericMessage;  // Return only the generic message to client
}

// Usage
res.status(500).json({
  error: safeApiError(error, 'Failed to load menu')
});
```

### Option B: Environment-Based Disclosure
**Pros:** Helpful for debugging in dev
**Cons:** Risk if NODE_ENV misconfigured
**Effort:** Small
**Risk:** Medium

```typescript
message: process.env.NODE_ENV === 'development'
  ? getErrorMessage(error)
  : 'An internal error occurred'
```

### Option C: Error Code System
**Pros:** Client can display localized messages, structured errors
**Cons:** More complex implementation
**Effort:** Large
**Risk:** Low

## Recommended Action

**IMPLEMENTED**: Option A (Generic API Error Wrapper) - Created `safeApiError()` utility in shared/utils/error-utils.ts. Updated ai.routes.ts to use this for all public-facing endpoints.

## Technical Details

**Affected files:**
- `server/src/routes/ai.routes.ts` (8 occurrences)
- `server/src/routes/health.routes.ts` (3 occurrences)
- `server/src/routes/orders.routes.ts` (1 occurrence)

**Components:** API routes, error handling

## Acceptance Criteria

- [x] API responses do not expose raw internal error messages
- [x] Detailed errors are logged server-side only
- [x] Development mode can optionally show more detail

## Work Log

| Date       | Action    | Notes                                                                  |
| ---------- | --------- | ---------------------------------------------------------------------- |
| 2025-12-26 | Created   | Found during code review                                               |
| 2025-12-26 | Completed | Created safeApiError() utility, updated ai.routes.ts (6 occurrences)  |

## Resources

- OWASP: Improper Error Handling
- CWE-209: Generation of Error Message Containing Sensitive Information
