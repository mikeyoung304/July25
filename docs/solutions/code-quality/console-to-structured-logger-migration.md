---
title: "Console to Structured Logger Migration"
category: code-quality
severity: p2
date: 2025-12-24
tags:
  - logging
  - code-quality
  - console-migration
  - structured-logging
  - conventions
components:
  - client/src/services/websocket/WebSocketService.ts
  - client/src/services/logger.ts
related_lessons:
  - CL-LOG-001
---

# Console to Structured Logger Migration

## Problem Description

Direct `console.log`, `console.warn`, and `console.error` calls scattered throughout the codebase create several issues:

1. **No Production Control**: Console statements always execute, cluttering production logs
2. **Missing Context**: No timestamp, component, or structured metadata
3. **Inconsistent Format**: Each developer formats logs differently
4. **No Aggregation**: Cannot search or filter logs effectively
5. **Security Risk**: Sensitive data may be logged without sanitization

### Example: WebSocketService Before Migration

```typescript
// BEFORE - Inconsistent, unstructured logging
console.warn('[WebSocket] Already connected or connecting, skipping...')
console.error('Failed to connect to WebSocket:', error)
console.warn('Scheduling reconnection attempt...')
```

These console calls:
- Use different prefixes (`[WebSocket]` vs none)
- Include raw error objects (potential security issue)
- Provide no structured metadata for debugging

## Why Structured Logging Matters

### 1. Environment-Aware Behavior

The structured logger (`client/src/services/logger.ts`) automatically adjusts based on environment:

```typescript
private shouldLog(level: LogLevel): boolean {
  // In production, only log warnings and errors
  if (!this.isDevelopment) {
    return level === 'warn' || level === 'error';
  }
  return true;
}
```

### 2. Consistent Metadata

Every log entry includes:
- ISO 8601 timestamp
- Log level (debug, info, warn, error)
- Structured data object
- Error stack traces (when applicable)

### 3. Production Error Tracking

Errors are automatically stored for debugging:

```typescript
if (!this.isDevelopment && level === 'error') {
  this.sendToMonitoring(entry);
}
```

### 4. Searchable Context

The `component` field enables log filtering:

```typescript
logger.warn('Connection failed', {
  component: 'WebSocket',
  attempt: 3,
  maxAttempts: 15
});

// Easily filter: component === 'WebSocket'
```

## Migration Pattern

### Step 1: Import the Logger

```typescript
// Client-side (uses @/ path alias)
import { logger } from '@/services/logger';

// Server-side
import { logger } from '../utils/logger';
```

### Step 2: Replace Console Calls

| Console Call | Logger Equivalent |
|--------------|-------------------|
| `console.log(msg)` | `logger.info(msg)` |
| `console.debug(msg)` | `logger.debug(msg)` |
| `console.warn(msg)` | `logger.warn(msg)` |
| `console.error(msg)` | `logger.error(msg)` |

### Step 3: Add Structured Context

```typescript
// BEFORE
console.warn('[WebSocket] Already connected or connecting, skipping...')

// AFTER
logger.warn('Already connected or connecting, skipping...', {
  component: 'WebSocket'
})
```

### Step 4: Handle Errors Properly

```typescript
// BEFORE - Raw error object logged
console.error('Failed to connect to WebSocket:', error)

// AFTER - Safe error extraction
logger.error('Failed to connect to WebSocket', {
  component: 'WebSocket',
  error: error instanceof Error ? error.message : String(error)
})
```

### Step 5: Include Relevant Metadata

```typescript
// BEFORE - No debugging context
console.warn('Scheduling reconnection attempt...')

// AFTER - Full debugging context
logger.warn('Scheduling reconnection attempt', {
  component: 'WebSocket',
  attempt: this.reconnectAttempts,
  maxAttempts: this.config.maxReconnectAttempts,
  delayMs: Math.round(delay),
  strategy: 'exponential backoff with jitter'
})
```

## Complete WebSocketService Migration Example

### Before (14 console calls)

```typescript
console.warn('[WebSocket] Already connected or connecting, skipping...')
console.error('Failed to connect to WebSocket:', error)
console.warn('Scheduling reconnection attempt...')
console.warn('WebSocket closed', code, reason)
console.error('Max reconnection attempts reached')
console.warn('WebSocket heartbeat timeout - connection may be dead')
console.error('Failed to parse WebSocket message', error)
console.warn('Cannot send message - WebSocket not connected')
console.error('Failed to send WebSocket message', error)
console.warn('Reconnection already scheduled, skipping...')
console.error('Reconnection attempt failed', error)
console.info('WebSocket connected')  // Was console.warn - wrong level
```

### After (Structured Logger)

```typescript
import { logger } from '@/services/logger';

// Connection guards
logger.warn('Already connected or connecting, skipping...', { component: 'WebSocket' })

// Error with safe extraction
logger.error('Failed to connect to WebSocket', {
  component: 'WebSocket',
  error: error instanceof Error ? error.message : String(error)
})

// Reconnection with full context
logger.warn('Scheduling reconnection attempt', {
  component: 'WebSocket',
  attempt: this.reconnectAttempts,
  maxAttempts: this.config.maxReconnectAttempts,
  delayMs: Math.round(delay)
})

// Close event with structured data
logger.warn('WebSocket closed', {
  component: 'WebSocket',
  code: event.code,
  reason: event.reason
})

// Success (changed from warn to info - correct level)
logger.info('WebSocket connected', { component: 'WebSocket' })
```

## Best Practices

### 1. Use the Correct Log Level

| Level | Use Case |
|-------|----------|
| `debug` | Development-only debugging (hidden in production) |
| `info` | Successful operations, state changes |
| `warn` | Recoverable issues, fallback behavior |
| `error` | Unrecoverable failures, exceptions |

### 2. Always Include Component Context

```typescript
// Pattern: { component: 'ServiceName' }
logger.info('Order created', { component: 'OrderService', order_id: order.id })
logger.warn('Retry needed', { component: 'PaymentGateway', attempt: 2 })
logger.error('Database timeout', { component: 'Repository', query: 'getOrders' })
```

### 3. Never Log Sensitive Data

```typescript
// WRONG - Logs full token
logger.info('Auth token', { token: user.accessToken })

// RIGHT - Log only metadata
logger.info('Auth successful', {
  component: 'Auth',
  user_id: user.id,
  token_expiry: user.tokenExpiresAt
})
```

### 4. Extract Error Messages Safely

```typescript
// Pattern for error logging
catch (error: unknown) {
  logger.error('Operation failed', {
    component: 'ServiceName',
    error: error instanceof Error ? error.message : String(error),
    // Optional: include stack in development
    ...(import.meta.env.DEV && error instanceof Error ? { stack: error.stack } : {})
  });
}
```

### 5. Use Child Loggers for Context Inheritance

```typescript
// Create child logger with persistent context
const wsLogger = logger.child({ component: 'WebSocket', connection_id: this.id });

// All subsequent logs include component and connection_id
wsLogger.info('Connected');
wsLogger.warn('Reconnecting', { attempt: 1 });
wsLogger.error('Failed', { error: 'timeout' });
```

## Enforcement: Pre-Commit Hook

The project's pre-commit hook (`.husky/pre-commit`) automatically blocks commits containing `console.log` or `console.debug`:

```bash
# Check for console.log statements (Per Technical Roadmap Phase 0)
JS_FILES=$(git diff --cached --name-only | grep -E '\.(js|jsx|ts|tsx)$' | grep -v 'tests/reporters/' || true)
if [ -n "$JS_FILES" ]; then
  if echo "$JS_FILES" | xargs grep -l 'console\.\(log\|debug\)' 2>/dev/null; then
    echo "ERROR: console.log or console.debug found in staged files!"
    echo "Use 'logger' from 'utils/logger' instead"
    exit 1
  fi
fi
```

### Exclusions

The hook excludes `tests/reporters/*` because Playwright reporters require direct console output for terminal display.

### Override (Not Recommended)

```bash
git commit --no-verify -m "Emergency fix"
```

## Finding Remaining Violations

Search for console usage that needs migration:

```bash
# Find all console usage in TypeScript files
grep -rn "console\.\(log\|warn\|error\|info\|debug\)" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  client/src server/src shared/

# Count violations by type
grep -roh "console\.\(log\|warn\|error\|info\|debug\)" \
  --include="*.ts" --include="*.tsx" \
  client/src server/src | sort | uniq -c
```

## Common Migration Mistakes

### Mistake 1: Keeping Prefixes in Message

```typescript
// WRONG - Redundant prefix
logger.warn('[WebSocket] Connection failed', { component: 'WebSocket' })

// RIGHT - Component in metadata only
logger.warn('Connection failed', { component: 'WebSocket' })
```

### Mistake 2: Logging Raw Error Objects

```typescript
// WRONG - May expose internals, hard to serialize
logger.error('Failed', { error })

// RIGHT - Extract message safely
logger.error('Failed', {
  error: error instanceof Error ? error.message : String(error)
})
```

### Mistake 3: Wrong Log Level

```typescript
// WRONG - Success message as warning
logger.warn('Connected successfully')

// RIGHT - Success is info level
logger.info('Connected successfully')
```

### Mistake 4: Missing Context for Debugging

```typescript
// WRONG - No context for debugging
logger.error('Reconnection failed')

// RIGHT - Include debugging context
logger.error('Reconnection failed', {
  component: 'WebSocket',
  attempt: this.reconnectAttempts,
  lastError: lastError?.message
})
```

## Related Documentation

- [CLAUDE.md Logging Convention](../../../CLAUDE.md#logging)
- [Logger Service Implementation](../../../client/src/services/logger.ts)
- [Pre-Commit Hook](../../../.husky/pre-commit)

## Verification

After migration, verify no console calls remain:

```bash
# Should return empty
grep -rn "console\.\(log\|warn\|error\)" client/src/services/websocket/

# Verify pre-commit hook catches violations
echo "console.log('test')" > test-file.ts
git add test-file.ts
git commit -m "test"  # Should fail
rm test-file.ts
```
