# Quick Reference: Prevention Patterns for #204 & #208

Copy-paste ready patterns to avoid both issues.

## Issue #204: Timer Memory Leak

### Pattern 1: Optimistic Update Service

```typescript
// client/src/services/websocket/WebSocketService.ts - FIXED PATTERN
export class OptimisticWebSocketService extends WebSocketService {
  private pendingOptimisticUpdates: Map<string, OptimisticUpdate> = new Map()
  private pendingTimeouts: Map<string, NodeJS.Timeout> = new Map()  // ← NEW

  sendOptimisticUpdate(data: UpdateData): string {
    const updateId = generateId()
    this.pendingOptimisticUpdates.set(updateId, data)

    // CORRECT: Store timeout ID immediately
    const timeoutId = setTimeout(() => {
      this.pendingTimeouts.delete(updateId)  // ← Clean up tracking
      if (this.pendingOptimisticUpdates.has(updateId)) {
        this.rollbackUpdate(updateId)
      }
    }, 5000)

    this.pendingTimeouts.set(updateId, timeoutId)  // ← Track it
    return updateId
  }

  acknowledgeUpdate(updateId: string): void {
    // CORRECT: Clear timeout before removing from map
    const timeoutId = this.pendingTimeouts.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.pendingTimeouts.delete(updateId)
    }
    this.pendingOptimisticUpdates.delete(updateId)
  }

  private rollbackUpdate(updateId: string): void {
    // CORRECT: Clear timeout on rollback too
    const timeoutId = this.pendingTimeouts.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.pendingTimeouts.delete(updateId)
    }

    const update = this.pendingOptimisticUpdates.get(updateId)
    if (update) {
      this.pendingOptimisticUpdates.delete(updateId)
      this.notifyRollback(update)
    }
  }

  private rollbackAllPending(): void {
    // CORRECT: Clear ALL timeouts on disconnect
    this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.pendingTimeouts.clear()

    const updates = Array.from(this.pendingOptimisticUpdates.values())
    this.pendingOptimisticUpdates.clear()
    updates.forEach(update => this.notifyRollback(update))
  }
}
```

### Pattern 2: React Component with Timeouts

```typescript
// ✅ CORRECT: Cleanup on unmount
export function MyComponent() {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleClick = () => {
      // Store timeout ID
      timeoutId = setTimeout(() => {
        console.log('Timeout fired')
      }, 1000)
    }

    window.addEventListener('click', handleClick)

    // Cleanup function: clear timeout and listener
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('click', handleClick)
    }
  }, [])

  return <div>Component</div>
}
```

### Pattern 3: Service with Intervals

```typescript
// ✅ CORRECT: Store intervals in class properties
class ConnectionMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null
  private cacheCleanupInterval: NodeJS.Timeout | null = null

  connect(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth()
    }, 30000)

    this.cacheCleanupInterval = setInterval(() => {
      this.pruneCache()
    }, 60000)
  }

  disconnect(): void {
    this.cleanup()
  }

  private cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = null
    }
  }
}
```

### Test Case Template

```typescript
describe('Timeout Management', () => {
  it('should clear timeout on acknowledge', () => {
    const service = new OptimisticWebSocketService()
    const updateId = service.sendOptimisticUpdate({ /* ... */ })

    expect(service.getPendingTimeoutCount()).toBe(1)

    service.acknowledgeUpdate(updateId)

    expect(service.getPendingTimeoutCount()).toBe(0)  // Timeout cleared
  })

  it('should not accumulate timeouts', async () => {
    const service = new OptimisticWebSocketService()

    for (let i = 0; i < 100; i++) {
      const id = service.sendOptimisticUpdate({ /* ... */ })
      service.acknowledgeUpdate(id)
    }

    expect(service.getPendingTimeoutCount()).toBe(0)
  })
})
```

---

## Issue #208: Command Exit Codes

### Pattern 1: npm audit (Most Common)

```javascript
// ✅ CORRECT: Handle npm audit properly
/**
 * Check npm vulnerabilities
 *
 * npm audit exits with:
 * - 0: No vulnerabilities
 * - 1: Vulnerabilities found (NOT an error, data is valid)
 * - 2+: Actual error
 *
 * Use || true to continue even with vulnerabilities.
 */
function checkSecurityAudit() {
  try {
    // || true allows exit code 1 (vulnerabilities) to not throw
    const auditResult = execSync('npm audit --json 2>&1 || true', {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true  // Required for || true
    })

    const auditData = JSON.parse(auditResult)

    // Handle both metadata and vulnerabilities structures
    let vulnCount = 0
    if (auditData.metadata?.vulnerabilities) {
      vulnCount = auditData.metadata.vulnerabilities.total || 0
    } else if (auditData.vulnerabilities) {
      vulnCount = Object.keys(auditData.vulnerabilities).length
    }

    // Single output - no duplication
    console.log(vulnCount === 0
      ? 'Security: No known vulnerabilities'
      : `Security: ${vulnCount} vulnerabilities - run npm audit for details`)

  } catch (error) {
    // This catch is for ACTUAL errors:
    // - JSON.parse failure (malformed output)
    // - Command not found
    // - Permission denied
    // NOT for vulnerabilities (exit 1)
    console.log('Security: Could not check (run npm audit manually)')
  }
}
```

### Pattern 2: grep (Finding Patterns)

```bash
# ✅ CORRECT: Handle grep exit codes
# grep exits:
# - 0: Matches found (success)
# - 1: No matches (NOT an error)
# - 2: Error (file not found, permission denied)

# Find console.log in staged files
JS_FILES=$(git diff --cached --name-only | grep -E '\.(js|ts)$' || true)

if [ -n "$JS_FILES" ]; then
  if echo "$JS_FILES" | xargs grep -l 'console\.\(log\|debug\)' 2>/dev/null; then
    echo "ERROR: console.log found in staged files"
    exit 1  # Actual failure
  fi
fi

exit 0  # Success (no console.log found)
```

### Pattern 3: Tool Exit Code Reference

```javascript
// ✅ CORRECT: Document exit codes in your code

const TOOL_EXIT_CODES = {
  npm: {
    audit: { 0: 'No vulnerabilities', 1: 'Vulnerabilities found', '2+': 'Error' },
    test: { 0: 'All pass', 1: 'Tests failed', '2+': 'Error' }
  },
  grep: { 0: 'Matches found', 1: 'No matches', 2: 'Error' },
  git: { 0: 'Success', 1: 'Conflict/error', 128: 'Fatal error' },
  curl: { 0: 'Success', 6: 'Host error', 7: 'Connection error', 28: 'Timeout' }
}

// Use this when writing new integrations
function executeCommand(cmd, tool) {
  try {
    const result = execSync(cmd, { encoding: 'utf8', shell: true })
    return { success: true, data: result }
  } catch (error) {
    // Check tool-specific exit codes
    const toolCodes = TOOL_EXIT_CODES[tool]
    if (toolCodes && error.status in toolCodes && error.status !== 0) {
      // Exit code is "normal" for this tool, parse output anyway
      return { success: true, data: error.stdout }
    }
    // Exit code is an actual error
    return { success: false, error: error.message }
  }
}
```

### Test Case Template

```typescript
describe('npm audit integration', () => {
  it('should handle vulnerabilities without duplicating logic', async () => {
    const mockExec = vi.fn().mockReturnValue(JSON.stringify({
      metadata: { vulnerabilities: { total: 3 } }
    }))

    const result = checkSecurityAudit(mockExec)

    // Should execute only once
    expect(mockExec).toHaveBeenCalledTimes(1)

    // Should output correct message
    expect(result).toContain('3 vulnerabilities')

    // Should use || true
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('|| true'),
      expect.objectContaining({ shell: true })
    )
  })

  it('should not duplicate code in error handling', () => {
    const source = fs.readFileSync('scripts/system-health.js', 'utf8')
    const parseCount = (source.match(/JSON\.parse\(auditResult\)/g) || []).length

    // Should only appear once, not in try and catch
    expect(parseCount).toBe(1)
  })
})
```

---

## ESLint Rules (Add to .eslintrc.js)

### Rule 1: No Untracked Timeouts

```javascript
{
  rules: {
    'no-untracked-timeout': {
      meta: {
        type: 'problem',
        docs: {
          description: 'setTimeout/setInterval return values must be stored'
        }
      },
      create(context) {
        return {
          CallExpression(node) {
            const callee = node.callee
            const isTiming = (
              (callee.type === 'Identifier' &&
               ['setTimeout', 'setInterval'].includes(callee.name))
            )

            if (!isTiming) return

            const parent = node.parent
            const isStored = (
              parent.type === 'VariableDeclarator' ||
              parent.type === 'AssignmentExpression'
            )

            if (!isStored) {
              context.report({
                node,
                message: 'setTimeout/setInterval return value must be stored'
              })
            }
          }
        }
      }
    }
  }
}
```

---

## Code Review Checklist

### For Issue #204 (Timeouts)

```markdown
## Timeout/Interval Review

- [ ] Every setTimeout() has `const id =` assignment
- [ ] Every setInterval() stored in class property
- [ ] Timeout IDs tracked in Map or object
- [ ] clearTimeout() called in success path
- [ ] clearTimeout() called in rollback path
- [ ] clearTimeout() called in cleanup/disconnect
- [ ] All exit points clear their timeouts
- [ ] No orphaned timeouts in error handlers
```

### For Issue #208 (Exit Codes)

```markdown
## External Command Review

- [ ] Tool exit code semantics documented in comment
- [ ] All exit codes 0, 1, 2, ... understood
- [ ] Non-zero exits don't assume error
- [ ] || true used for expected non-zero exits
- [ ] No code duplication in try/catch blocks
- [ ] Single parsing path (not duplicated)
- [ ] maxBuffer set if output > 200KB
- [ ] Comments explain non-obvious exit codes
```

---

## Memory Leak Detection (Copy & Run)

```bash
#!/bin/bash

echo "Finding potential memory leaks..."

echo ""
echo "=== setTimeout without storage ==="
grep -r "setTimeout(" client/src server/src --include="*.ts" --include="*.tsx" | \
  grep -v "const\|let\|var\|=" | \
  head -20

echo ""
echo "=== setInterval without storage ==="
grep -r "setInterval(" client/src server/src --include="*.ts" --include="*.tsx" | \
  grep -v "this\." | \
  grep -v "const\|let\|var" | \
  head -20

echo ""
echo "=== Potential exit code issues ==="
grep -r "execSync.*audit" client/src server/src --include="*.js" --include="*.ts" | \
  grep -v "|| true" | \
  head -10
```

---

## Summary

These patterns prevent both major issue classes:

**Issue #204 (Timeouts):** Store ID immediately, clear in all paths
**Issue #208 (Exit Codes):** Document expected codes, use || true, single code path

Both follow the principle: **Understand the tool/API before writing error handling.**

---

**Last Updated:** 2025-12-24
**Use in:** Code reviews, new feature development, refactoring
**Cross-Reference:** CL-TIMER-001, CL-TOOL-EXIT-001, PREVENTION_STRATEGIES_SUMMARY.md
