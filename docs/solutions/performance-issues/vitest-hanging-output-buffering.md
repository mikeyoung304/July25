# Test Execution Hang: npm test with Heavy Memory Options

**Status:** Documented
**Severity:** Medium
**Component:** Testing Infrastructure
**Created:** 2025-11-29

## Symptoms

- `npm test` from root directory hangs for 20+ minutes
- Individual test suites (`npm run test:client`, `npm run test:server`) complete in ~6 seconds
- Total expected runtime is ~6.5 seconds for 1,300 tests
- Appears related to output buffering combined with NODE_OPTIONS memory settings

## Root Cause

The root `npm test` script chains client and server tests sequentially with aggressive memory options:

```json
"test": "NODE_OPTIONS='--max-old-space-size=3072 --expose-gc' npm run test:client && npm run test:server"
```

**Contributing Factors:**

1. **Memory Allocation Overhead** - 3GB memory allocation with `--expose-gc` creates significant initialization time
2. **Sequential Test Chaining** - Client tests must complete before server tests start
3. **Verbose Output Buffering** - Security tests intentionally log errors; webhook tests generate warnings. Large stderr/stdout buffers with the default verbose reporter interact poorly with garbage collection cycles
4. **Configuration Multiplier Effect** - Heavy memory + sequential execution + verbose reporting = slow startup and execution

## Working Solution

### Option 1: Run Individual Test Suites (Recommended)

```bash
# Fast - completes in ~6 seconds each
npm run test:client   # 905 tests in ~5.73s
npm run test:server   # 395 tests in ~0.7s
```

**Why this works:**
- Each test suite runs in isolation
- Memory allocated per suite, released between runs
- No output buffering across both suites

### Option 2: Use Minimal Reporter

```bash
# Dot reporter reduces output overhead
npm test -- --reporter=dot

# Basic reporter with minimal formatting
npm test -- --reporter=basic
```

### Option 3: Use Quick Test Script

```bash
# Already configured with dot reporter
npm run test:quick
```

## Performance Comparison

| Command | Duration | Best For |
|---------|----------|----------|
| `npm test` | 20-30 min | Rarely useful |
| `npm run test:client` | ~6 sec | Development |
| `npm run test:server` | ~1 sec | Development |
| `npm run test:quick` | ~2 sec | Pre-commit |
| `npm test -- --reporter=dot` | 15-20 min | Still slow |

## Prevention

1. **Default to individual suites** - Use `npm run test:client` and `npm run test:server` for development
2. **CI/CD timeouts** - Always set explicit timeouts on test runs
3. **Pre-commit hooks** - Use fast `test:quick` variant
4. **Document in CLAUDE.md** - Link developers to this solution

## Files Involved

- `package.json` (test scripts, lines 42-44)
- `vitest.config.ts` (root config)
- `client/vitest.config.ts`
- `server/vitest.config.ts`

## Tags

`testing` `performance` `vitest` `npm-scripts` `memory-management` `output-buffering`

## Related

- [CLAUDE.md Testing Section](/CLAUDE.md#testing)
- [CL-MEM-001: Interval Memory Leaks](/.claude/lessons/CL-MEM-001-interval-leaks.md)
