# Claude Lessons System v3.3.0

A memory augmentation system for Claude Code to prevent repeated debugging sessions.

## How It Works

1. **Uncle Claude Agent**: Invoke with `@uncle-claude <problem>`
2. **Automatic Tracking**: Git hooks track debugging sessions automatically
3. **Knowledge Retrieval**: Single JSON knowledge base for quick lookup
4. **Learning System**: Unresolved problems get documented for future reference

## Quick Start

```bash
# When you have a problem, invoke Uncle Claude:
@uncle-claude Getting 401 errors with JWT authentication

# Uncle Claude will:
# 1. Sign into the tracking sheet
# 2. Search knowledge base for existing solutions
# 3. Apply known patterns OR mark as unresolved
# 4. Sign out with resolution status
```

## System Structure

```
claude-lessons3/
├── knowledge-base.json           # Single source of truth (all patterns)
├── SIGN_IN_SHEET.md              # Tracking and audit trail
├── 01-auth-authorization-issues/
│   ├── README.md                 # Category overview
│   └── LESSONS.md                # Combined incidents & patterns
├── 02-database-supabase-issues/
│   ├── README.md
│   └── LESSONS.md
└── ... (8 more categories)
```

## Categories

| ID | Category | Key Problems | Time Impact |
|----|----------|--------------|-------------|
| 01 | Authentication | JWT fields, STRICT_AUTH | 48 days |
| 02 | Database | Schema drift, migrations | 30 days |
| 03 | React UI | Hydration, render loops | 5 days |
| 04 | WebSocket | Memory leaks, timers | 7 days |
| 05 | Build/Deploy | Env vars, Node version | 10 days |
| 06 | Testing | Quarantine, flaky tests | 3 days |
| 07 | API Integration | Timeouts, retry logic | 14 days |
| 08 | Performance | Memory, bundle size | 5 days |
| 09 | Security | Multi-tenancy, RLS | 60 days |
| 10 | Documentation | Broken links, drift | 8 days |

## ESLint Rules (Automatic Prevention)

Active rules that catch problems before they happen:

- `custom/require-jwt-fields` - Enforces JWT structure
- `custom/require-multi-tenant-filter` - Enforces restaurant_id filtering
- `custom/no-uncleared-timers` - Prevents memory leaks
- `custom/require-api-timeout` - Enforces API timeouts
- `custom/no-skip-without-quarantine` - Tracks test skipping

## CLI Tools (Manual Search)

```bash
# Find lessons for a specific file
npm run lessons:find server/src/middleware/auth.ts

# Search by keyword
npm run lessons:search "JWT"

# View specific category
npm run lessons:category 01
```

## Git Hooks (Automatic Tracking)

- **post-commit**: Auto-tracks lesson-related commits
- **pre-debug**: Uncle Claude signs in automatically

## The Promise

Every debugging session either:
1. **Retrieves** a known solution (saves time)
2. **Documents** a new problem (prevents future time loss)

No problem goes untracked. The system learns from every interaction.

## Files

- `knowledge-base.json` - Complete knowledge in one file
- `SIGN_IN_SHEET.md` - Session tracking
- `scripts/lessons-cli-simple.cjs` - Simplified CLI tool
- `.claude/agents/uncle-claude.md` - Agent configuration

---

**Remember**: When you encounter a problem, invoke `@uncle-claude` first. Either the solution already exists, or we'll document it so it never happens again.