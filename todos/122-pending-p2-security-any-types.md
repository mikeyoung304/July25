---
status: pending
priority: p2
issue_id: "122"
tags: [typescript, type-safety, strict-mode, security]
dependencies: []
created_date: 2025-12-02
source: code-review-pr-151
---

# Any Types in Security Middleware

## Problem

The security middleware uses `any` types in two locations, violating TypeScript strict mode rules and project standards:

```typescript
// server/src/middleware/security.ts:132
async function forwardSecurityEventToMonitoring(event: SecurityEvent) {
  const payload = {
    title: `Security Event: ${event.event_type}`,
    text: JSON.stringify(event.details),
    alert_type: 'warning',
    tags: [`event_type:${event.event_type}`, `restaurant_id:${event.restaurant_id}`],
    details: event.details as any  // ❌ TYPE SAFETY VIOLATION
  };
}

// server/src/middleware/security.ts:388
export const setupSecurityMiddleware = (app: any) => {  // ❌ TYPE SAFETY VIOLATION
  app.use(helmetMiddleware);
  app.use(rateLimitMiddleware);
  // ...
};
```

## Risk Assessment

- **Severity:** IMPORTANT
- **Impact:**
  - Type safety violations in security-critical code
  - Potential runtime errors from incorrect types
  - Cannot catch type mismatches at compile time
  - Violates project TypeScript strict mode rules
  - Sets bad precedent for other code
- **Likelihood:** Medium (currently no known runtime errors)

## Project Standards Violation

From `CLAUDE.md` and `.claude/CLAUDE.md`:
```typescript
// Universal Rules
2. **TypeScript strict**: No `any`, no type assertions without reason
```

From `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

## Required Fix

Replace `any` with proper types:

### Fix 1: SecurityEvent.details Type

```typescript
// server/src/types/security.types.ts
export interface SecurityEvent {
  event_type: string;
  restaurant_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;  // ✅ Use Record instead of any
}

// server/src/middleware/security.ts:132
async function forwardSecurityEventToMonitoring(event: SecurityEvent) {
  const payload = {
    title: `Security Event: ${event.event_type}`,
    text: JSON.stringify(event.details),
    alert_type: 'warning',
    tags: [`event_type:${event.event_type}`, `restaurant_id:${event.restaurant_id}`],
    details: event.details  // ✅ No type assertion needed
  };
}
```

### Fix 2: Express Application Type

```typescript
// server/src/middleware/security.ts:388
import { Application } from 'express';

export const setupSecurityMiddleware = (app: Application) => {  // ✅ Proper Express type
  app.use(helmetMiddleware);
  app.use(rateLimitMiddleware);
  app.use(csrfProtectionMiddleware);
  app.use(createSecurityEventLogger());
};
```

## Alternative Approaches

If `Record<string, unknown>` is too restrictive for `details`:

```typescript
// Option 1: Union of known detail types
type SecurityEventDetails =
  | RateLimitDetails
  | AuthFailureDetails
  | SuspiciousActivityDetails
  | Record<string, unknown>;  // Fallback for unknown events

// Option 2: Generic SecurityEvent
interface SecurityEvent<T = Record<string, unknown>> {
  event_type: string;
  details: T;
  // ... other fields
}

// Usage
const authEvent: SecurityEvent<AuthFailureDetails> = {
  event_type: 'auth_failure',
  details: { attempts: 3, username: 'user@example.com' }
};
```

## Files to Modify

- `server/src/middleware/security.ts` (2 occurrences)
  - Line 132: Change `details: event.details as any` to `details: event.details`
  - Line 388: Change `(app: any)` to `(app: Application)`
- `server/src/types/security.types.ts` - Update SecurityEvent interface if needed

## Verification

- Run `npm run typecheck` to ensure no type errors
- Verify security events still log correctly
- Test monitoring forwarding with various event types
- Ensure no runtime errors in production logs
- Check that Express middleware setup still works

## References

- **TypeScript Handbook:** [Avoid `any` type](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#any)
- **Project Standards:** `CLAUDE.md` - "TypeScript strict: No `any`"
- **Express Types:** `@types/express` - `Application` interface
