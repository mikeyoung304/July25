---
title: "API Error Information Disclosure Remediation"
date: 2025-12-26
severity: medium
status: complete
type: security_fix
category: security-issues
tags:
  - security
  - error-handling
  - api
  - information-disclosure
  - CWE-209
  - OWASP
related_issues:
  - id: 227
    title: "Test Endpoints Without Authentication"
    priority: p2
  - id: 228
    title: "API Error Information Disclosure"
    priority: p2
  - id: 229
    title: "Incomplete Error Pattern Migration"
    priority: p2
  - id: 230
    title: "Redundant Fallback Pattern"
    priority: p3
related_files:
  - shared/utils/error-utils.ts
  - server/src/routes/ai.routes.ts
  - server/src/routes/orders.routes.ts
  - server/src/routes/health.routes.ts
metrics:
  files_modified: 22
  tests_passing: 1686
  patterns_consolidated: 50+
branch: feat/enterprise-audit-remediation
pr: "#163"
---

# API Error Information Disclosure Remediation

## Problem

API endpoints were returning raw error messages to clients, potentially leaking:
- Database connection strings
- Internal service names
- File paths and stack traces
- Third-party API error details

Additionally, test endpoints were accessible without authentication in production.

## Root Cause

Error handling was scattered across the codebase with 50+ duplicate patterns:

```typescript
// BEFORE: Insecure patterns found throughout codebase
res.status(500).json({
  error: error instanceof Error ? error.message : String(error)
});

// Or even worse
res.status(500).json({
  error: getErrorMessage(error),  // Raw internal error exposed
  stack: error.stack              // Stack trace leaked
});
```

## Solution

Created centralized error utilities in `shared/utils/error-utils.ts`:

### 1. safeApiError Utility

```typescript
import { safeApiError } from '@rebuild/shared';

// Logs full error server-side, returns generic message to client
res.status(500).json({
  error: safeApiError(error, 'Failed to process request', logger)
});
// Client sees: "Failed to process request"
// Server logs: Full error details with stack trace
```

### 2. Environment-Guarded Test Endpoints

```typescript
// Test endpoints only exist in development
if (env.NODE_ENV === 'development') {
  router.post('/test-tts', async (req, res) => {
    // Development-only endpoint
  });
}
```

### 3. Flexible Logger Support

```typescript
// Pass logger object directly (recommended)
safeApiError(error, 'Message', aiLogger)

// Or function (backwards compatible)
safeApiError(error, 'Message', (msg, ctx) => logger.error(msg, ctx))
```

## Files Changed

| File | Changes |
| ---- | ------- |
| `shared/utils/error-utils.ts` | Added `safeApiError`, `getErrorMessage`, `getErrorStack` |
| `server/src/routes/ai.routes.ts` | 8 endpoints updated, 6 double-logs removed |
| `server/src/routes/orders.routes.ts` | 1 endpoint updated |
| `shared/types/validation.ts` | Migrated to `getErrorMessage` |
| 11 client files | Removed redundant fallback patterns |

## Verification

- All 440 server tests passing
- All 1246 client tests passing
- TypeScript compilation clean
- No information disclosure in error responses

## Prevention

See [CL-SEC-001: API Error Handling & Authentication Security](/.claude/lessons/CL-SEC-001-error-handling-security.md) for:
- Code review checklists
- ESLint rule suggestions
- Test patterns
- Best practices

## Quick Reference

```typescript
// ALWAYS use for API error responses
import { safeApiError, getErrorMessage } from '@rebuild/shared';

try {
  await operation();
} catch (error) {
  res.status(500).json({
    error: safeApiError(error, 'User-friendly message', logger)
  });
}

// NEVER expose raw error messages
res.json({ error: error.message });        // BAD
res.json({ error: getErrorMessage(error) }); // BAD
res.json({ error: String(error) });        // BAD
```

---

**Last Updated:** 2025-12-26
