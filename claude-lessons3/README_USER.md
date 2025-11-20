# How to Use Claude Lessons 3.0

## For You (Using Claude Code)

You don't need to run npm commands or manually search files. Just use Uncle Claude.

---

## Quick Start

**Type this in Claude Code**:
```
@uncle-claude I'm getting authentication errors
```

**Uncle Claude will**:
1. Sign you into the tracking sheet
2. Find relevant lessons automatically
3. Show you the exact patterns to fix the issue
4. Explain what went wrong before
5. Give you prevention strategies
6. Sign you out with a summary

---

## What You Get

### Automatic Discovery
Uncle Claude searches 10 categories, 62 documents, 50+ incidents automatically.

### Code Examples
Always shows ✅ CORRECT vs ❌ WRONG patterns.

### Context from History
References real incidents like "CL-AUTH-001: 48-day outage from missing JWT field"

### Prevention Focus
Not just fixes, but "here's how to never hit this again"

### Full Audit Trail
Every session tracked in `SIGN_IN_SHEET.md` with effectiveness ratings

---

## Real-Time Protection

### ESLint Rules (5 rules active)
Your IDE will catch:
- Missing JWT fields
- Missing multi-tenant filters
- API calls without timeouts
- Memory leaks from uncleaned timers
- Test skipping without tracking

### Pre-Commit Hooks
When you commit:
- **Advisory mode**: Suggests relevant lessons
- **STRICT mode**: Blocks critical files unless you acknowledge

---

## Categories Available

1. **Auth/Authorization** - JWT, RBAC, login issues
2. **Database** - Schema drift, migrations
3. **React/UI** - Hydration, infinite loops
4. **WebSocket** - Memory leaks, connections
5. **Build/Deploy** - CI failures, Vercel
6. **Testing** - Test failures, quarantine
7. **API Integration** - Timeouts, external APIs
8. **Performance** - Memory, optimization
9. **Security** - Multi-tenancy, RLS
10. **Documentation** - Link rot, drift

---

## That's It

**Just invoke**: `@uncle-claude <your problem>`

Everything else is automatic.

---

**Full Guide**: `QUICK_START_UNCLE_CLAUDE.md`
**Agent File**: `.claude/agents/uncle-claude.md`
**Version**: 3.2.0
