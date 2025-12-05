# Claude Lessons Index

Codified lessons from $1.3M+ in prevented issues. These are the 6 most impactful patterns extracted from 50 incidents and 600+ hours of debugging.

## Quick Reference

| ID | Category | Problem | Detection Signal |
|----|----------|---------|------------------|
| [CL-AUTH-001](./CL-AUTH-001-strict-auth-drift.md) | Auth | STRICT_AUTH drift | "Authentication Required" loop |
| [CL-AUTH-002](./CL-AUTH-002-websocket-dual-auth-prevention.md) | Auth (Prevention) | Missing dual-auth in services | KDS/WebSocket 401 errors |
| [CL-BUILD-001](./CL-BUILD-001-vercel-production-flag.md) | Build | Vercel devDeps | "command not found" in Vercel |
| [CL-BUILD-002](./CL-BUILD-002-misleading-syntax-errors.md) | Build | Misleading syntax errors | "Expected ';'" on valid code |
| [CL-BUILD-003](./CL-BUILD-003-xargs-empty-input.md) | Build | BSD xargs false positive | Hook fails with no JS files |
| [CL-DB-001](./CL-DB-001-migration-sync.md) | Database | Migration drift | ERROR 42703/42804 |
| [CL-DB-002](./CL-DB-002-constraint-drift-prevention.md) | Database | Constraint drift | ERROR 23514 |
| [CL-WS-001](./CL-WS-001-handler-timing-race.md) | WebSocket | Handler timing | No transcription events |
| [CL-MEM-001](./CL-MEM-001-interval-leaks.md) | Memory | Untracked intervals | Memory growth 1-20 MB/day |
| [CL-API-001](./CL-API-001-model-deprecation.md) | API | Silent deprecation | Feature works but output missing |
| [CL-TEST-001](./CL-TEST-001-mock-drift-prevention.md) | Testing | Test mock drift from interfaces | Tests pass but code fails at runtime |
| [CL-TEST-002](./CL-TEST-002-npm-test-hang.md) | Testing | npm test hangs with memory options | npm test takes 20+ minutes |
| [CL-MAINT-001](./CL-MAINT-001-worktree-system-hygiene.md) | Maintenance | Stale worktrees causing test pollution | 300+ test failures from .worktrees/ |

## When to Reference

**Before writing auth code:** Read CL-AUTH-001
**Before creating new authenticated services:** Read CL-AUTH-002 (Quick Ref: [AUTH_PATTERN_QUICK_REFERENCE.md](./AUTH_PATTERN_QUICK_REFERENCE.md))
**Before Vercel deploy:** Read CL-BUILD-001, CL-BUILD-002
**Before writing shell scripts:** Read CL-BUILD-003
**Before database changes:** Read CL-DB-001, CL-DB-002
**Before WebSocket/WebRTC code:** Read CL-WS-001
**Before adding setInterval:** Read CL-MEM-001
**When API feature stops working:** Read CL-API-001
**Before modifying shared/types or writing tests:** Read CL-TEST-001
**When tests fail mysteriously:** Read CL-MAINT-001
**When npm test hangs:** Read CL-TEST-002
**Before creating development worktrees:** Read CL-MAINT-001

## Format

Each lesson follows a standard structure:
- **Problem** - What went wrong
- **Bug Pattern** - Code that causes the issue
- **Fix Pattern** - Correct implementation
- **Prevention Checklist** - Items to verify
- **Detection** - How to identify this issue

## Maintenance

When you encounter a new incident:
1. Run `/workflows:codify` to document it
2. If it's a recurring pattern, add to this index
3. Keep lessons under 60 lines for quick reference
