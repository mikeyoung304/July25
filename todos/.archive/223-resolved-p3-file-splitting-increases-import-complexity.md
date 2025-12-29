# TODO-223: File Splitting Increases Import Complexity

**Priority:** P3 (Minor - Code Organization)
**Category:** Architecture
**Source:** Code Review - Code Simplicity Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Observation

The god file splitting creates re-export facades that add indirection:

```typescript
// shared/utils/error-handling.ts (facade)
export * from './error-types';
export * from './error-reporter';
export * from './error-recovery';
export * from './error-pattern-tracker';
```

## Trade-offs

**Pros:**
- Backwards compatibility maintained
- Smaller, focused modules
- Easier to test individual pieces

**Cons:**
- Additional import resolution
- Barrel file anti-pattern concerns
- IDE "go to definition" lands on re-export

## Current State

This is an acceptable trade-off for the transition period. The re-exports ensure existing imports continue working:

```typescript
// This still works
import { AppError, handleError } from '@rebuild/shared/utils/error-handling';
```

## Future Consideration

After 2-3 releases, consider:
1. Updating imports to use direct paths
2. Adding deprecation warnings to facade
3. Eventually removing re-exports

## Files Affected

- `shared/utils/error-handling.ts`
- `server/src/services/orders/index.ts`
- `server/src/ai/functions/menu-tools/index.ts`

## Impact

- Minor complexity increase
- Acceptable for backwards compatibility
- No action needed short-term
