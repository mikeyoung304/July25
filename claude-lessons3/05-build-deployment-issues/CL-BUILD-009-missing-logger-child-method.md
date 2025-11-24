# CL-BUILD-009: Missing Logger .child() Method in Client Bundle

## Category
Build & Deployment Issues

## Problem Statement
Production Vercel deployment crashes with "u.child is not a function" error in minified bundle. The client-side Logger class is missing the `.child()` method that server-style logging patterns expect.

## Error Signatures
```
# Browser Console (minified):
TypeError: u.child is not a function
    at https://july25-client.vercel.app/js/index-index.html-COOdjg_X.js:190:3926

# Non-minified equivalent:
TypeError: logger.child is not a function

# Error context (from localStorage error_logs):
{
  "message": "Uncaught TypeError: u.child is not a function",
  "filename": "index-*.js",
  "lineno": 190,
  "colno": 3926
}
```

## Root Cause Analysis

### Primary Issue
Code was written using server-side logging patterns (Pino/Bunyan style) but the client-side Logger class didn't implement the `.child()` method.

**The Problem Code** (`client/src/hooks/useRestaurantConfig.ts:32`):
```typescript
import { logger } from '@/services/logger';

// This line crashes because Logger has no .child() method
const configLogger = logger.child({ hook: 'useRestaurantConfig' });
```

**The Client Logger** (`client/src/services/logger.ts`):
```typescript
class Logger {
  // Only had: debug(), info(), warn(), error(), getRecentLogs(), clearLogs()
  // MISSING: child() method
}
```

### Why It Worked Locally But Failed in Production
1. **Development mode**: JavaScript may handle undefined function calls differently, or the code path wasn't executed
2. **Minification**: In production, the error becomes cryptic: "u.child is not a function" where 'u' is the minified logger variable
3. **No TypeScript guard**: The Logger class didn't define `.child()`, but TypeScript wasn't configured to catch the missing method

### Contributing Factors
- Server and client logger implementations diverged
- Server uses Pino/Winston with native `.child()` support
- Client has custom lightweight Logger class without child loggers
- No shared interface enforcing method parity

## Solution Pattern

### 1. Add .child() Method to Client Logger
```typescript
// client/src/services/logger.ts

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   * Follows Pino/Bunyan pattern for structured logging
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger({ ...this.context, ...additionalContext });
    childLogger.logBuffer = this.logBuffer; // Share buffer with parent
    return childLogger;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): void {
    // Merge context with data
    const mergedData = Object.keys(this.context).length > 0
      ? { ...this.context, ...(typeof data === 'object' && data !== null ? data : { value: data }) }
      : data;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: mergedData,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
    };
    // ... rest of logging logic
  }
}

// Export singleton
export const logger = new Logger();
```

### 2. Usage Pattern (Child Loggers with Context)
```typescript
// ✅ CORRECT - Child logger with context
import { logger } from '@/services/logger';

const configLogger = logger.child({ hook: 'useRestaurantConfig' });
configLogger.info('Fetching config', { restaurantId });
// Output includes: { hook: 'useRestaurantConfig', restaurantId: '...' }

// ✅ ALSO CORRECT - Direct logger use
logger.info('Message', { context: 'inline' });
```

## Prevention Strategies

### 1. Create Shared Logger Interface
```typescript
// shared/types/logger.types.ts
export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error | unknown, data?: unknown): void;
  child(context: Record<string, unknown>): ILogger;
}
```

### 2. TypeScript Enforcement
```typescript
// client/src/services/logger.ts
import type { ILogger } from 'shared/types/logger.types';

class Logger implements ILogger {
  // TypeScript will error if .child() is missing
}
```

### 3. Pre-Deployment Testing
```bash
# Build and verify client bundle locally
npm run build:client
npm run preview  # Test production build locally
```

### 4. Error Boundary Pattern
```typescript
// Wrap components using child loggers in error boundaries
// to catch and report missing method errors gracefully
```

## Detection Commands
```bash
# Search for .child() usage in client code
grep -r "logger\.child" client/src/

# Check if Logger class has child method
grep -A 5 "child(" client/src/services/logger.ts

# Test production build locally
npm run build:client && npm run preview
```

## Quick Fix Checklist
- [ ] Add `child()` method to `client/src/services/logger.ts`
- [ ] Add `LogContext` interface for type safety
- [ ] Update `formatMessage()` to merge context into log data
- [ ] Update `error()` method to include context
- [ ] Test locally with `npm run build:client && npm run preview`
- [ ] Deploy to Vercel and verify app loads

## Related Patterns
- [CL-BUILD-008: ESM/CommonJS Incompatibility](./CL-BUILD-008-esm-commonjs-incompatibility.md) - Similar bundling issues
- [CL-AUTH-001: Environment Drift](../01-auth-authorization-issues/LESSONS.md#cl-auth-001) - Pattern of local/prod differences

## Diagnostic Pattern
**Zero-information crash in production**: When you see a minified error like "u.something is not a function":
1. Check if `u` could be a commonly-used singleton (logger, config, etc.)
2. Search for `.something()` calls in the codebase
3. Verify the class/object actually defines that method
4. Test production bundle locally before deploying

## Lesson Metadata
- **Date Created**: 2025-11-24
- **Last Updated**: 2025-11-24
- **Severity**: P0 Critical - App completely non-functional
- **Frequency**: First occurrence
- **Impact**: Production deployment blocked
- **Time to Fix**: 15 minutes (once identified)
- **Time to Identify**: 30 minutes (with subagent analysis)
- **Commit**: c373aaa0 - fix(client): add child() method to logger class
