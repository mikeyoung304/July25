# Claude Lessons Index

Codified lessons from $1.3M+ in prevented issues. These are the 6 most impactful patterns extracted from 50 incidents and 600+ hours of debugging.

## Quick Reference

| ID | Category | Problem | Detection Signal |
|----|----------|---------|------------------|
| [CL-AUTH-001](./CL-AUTH-001-strict-auth-drift.md) | Auth | STRICT_AUTH drift | "Authentication Required" loop |
| [CL-BUILD-001](./CL-BUILD-001-vercel-production-flag.md) | Build | Vercel devDeps | "command not found" in Vercel |
| [CL-DB-001](./CL-DB-001-migration-sync.md) | Database | Migration drift | ERROR 42703/42804 |
| [CL-WS-001](./CL-WS-001-handler-timing-race.md) | WebSocket | Handler timing | No transcription events |
| [CL-MEM-001](./CL-MEM-001-interval-leaks.md) | Memory | Untracked intervals | Memory growth 1-20 MB/day |
| [CL-API-001](./CL-API-001-model-deprecation.md) | API | Silent deprecation | Feature works but output missing |

## When to Reference

**Before writing auth code:** Read CL-AUTH-001
**Before Vercel deploy:** Read CL-BUILD-001
**Before database changes:** Read CL-DB-001
**Before WebSocket/WebRTC code:** Read CL-WS-001
**Before adding setInterval:** Read CL-MEM-001
**When API feature stops working:** Read CL-API-001

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
