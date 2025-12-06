---
status: complete
priority: p1
issue_id: "182"
tags: [testing, dependencies, vitest, monorepo, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# CRITICAL: Vitest Version Mismatch Breaking Test Infrastructure

## Problem Statement

Client and server workspaces use incompatible Vitest versions:
- **Client:** Vitest 3.2.4
- **Server:** Vitest 1.6.1

This causes npm resolution errors, unpredictable test behavior, and potential memory issues when running tests.

## Findings

### Dependency Detective Agent Discovery

**Locations:**
- `/Users/mikeyoung/CODING/rebuild-6.0/client/package.json` line 74: `"vitest": "^3.2.4"`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/package.json` line 81: `"vitest": "^1.6.1"`

**npm Error Output:**
```
npm error invalid: @vitest/ui@1.6.1 /node_modules/@vitest/ui
  - invalid: "3.2.4" from client/node_modules/vitest
```

### Impact Analysis

1. **Resolution Errors:** npm can't resolve shared dependencies cleanly
2. **Behavioral Differences:** Vitest 3.x has breaking changes from 1.x
3. **Memory Issues:** Different pooling strategies cause unpredictable RAM usage
4. **CI Inconsistency:** Tests may pass locally but fail in CI due to version resolution order

## Proposed Solutions

### Solution A: Standardize to Vitest 3.2.4 (Recommended)

**Effort:** 1 hour | **Risk:** Medium (need to verify server tests still pass)

1. Update `server/package.json`:
   ```json
   "vitest": "^3.2.4",
   "@vitest/ui": "^3.2.4"
   ```

2. Run `npm install` at root to regenerate lock file

3. Run `npm run test:server` to verify no regressions

4. Update vitest.config.ts if any API changes needed

### Solution B: Pin Both to Vitest 1.6.x

**Effort:** 30 minutes | **Risk:** Low but loses features

Downgrade client to match server. Not recommended as 3.x has performance improvements.

## Recommended Action

Implement Solution A. Vitest 3.x is the current major version with better performance.

## Technical Details

**Affected Files:**
- `server/package.json` - Update vitest version
- `package-lock.json` - Regenerated after install
- `server/vitest.config.ts` - May need minor API updates

**Migration Notes:**
- Check for deprecated APIs in vitest 3.x changelog
- `@vitest/ui` also needs to match vitest version

## Acceptance Criteria

- [ ] Both workspaces use Vitest 3.2.4
- [ ] `npm install` completes without version resolution errors
- [ ] `npm run test:client` passes (980 tests)
- [ ] `npm run test:server` passes (417 tests)
- [ ] No `npm error invalid` warnings in CI

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- Dependency Detective agent findings
- [Vitest v3 migration guide](https://vitest.dev/guide/migration.html)
