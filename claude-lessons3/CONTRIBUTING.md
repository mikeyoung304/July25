---
version: "3.0.0"
last_updated: "2025-11-19"
document_type: CONTRIBUTING
tags: [governance, maintenance, guidelines]
---

# Contributing to Claude Lessons 3.0

This guide explains how to maintain and update the Claude Lessons 3.0 knowledge system.

## 🎯 Our Goal

Keep this knowledge system **accurate, up-to-date, and actionable** by documenting every significant production incident, anti-pattern, and lesson learned.

---

## 📝 When to Add or Update Lessons

### Add a New Incident When:
- A bug took >2 hours to debug
- The same pattern could affect future work
- Cost was >$1K in engineering time
- Production was impacted

### Update Existing Lessons When:
- New incidents match existing patterns
- Solutions improve or change
- Code architecture evolves
- Anti-patterns are discovered

### DO NOT Add:
- Trivial bugs (<30 min to fix)
- One-off mistakes unlikely to repeat
- Issues already documented

---

## 📁 File Structure

Each category (01-10) contains exactly **6 files**:

```
<category-name>/
├── README.md              # Executive summary & quick navigation
├── INCIDENTS.md           # Detailed incident reports
├── PATTERNS.md            # Reusable solution patterns
├── PREVENTION.md          # Proactive prevention strategies
├── QUICK-REFERENCE.md     # Emergency debugging guide
└── AI-AGENT-GUIDE.md      # AI-specific instructions & anti-patterns
```

**DO NOT** add extra files without updating this guide.

---

## ✍️ How to Add a New Incident

### 1. Choose the Right Category

| Category | Use When |
|----------|----------|
| 01-auth | JWT, RBAC, sessions, authentication bugs |
| 02-database | Schema drift, migrations, Prisma, RPC functions |
| 03-react | React components, hooks, hydration, UI bugs |
| 04-websocket | Real-time, WebSocket, memory leaks, race conditions |
| 05-build | CI/CD, Vercel, build failures, deployment issues |
| 06-testing | Test failures, quarantine, test quality |
| 07-api | External API integration, timeouts, OpenAI, Square |
| 08-performance | Memory, bundle size, optimization |
| 09-security | Multi-tenancy, credentials, RBAC, RLS |
| 10-documentation | Link rot, drift, freshness, sync |

### 2. Update INCIDENTS.md

Add a new section following this template:

```markdown
## [INCIDENT-ID]: [Title] ([Duration])

**Date**: YYYY-MM-DD to YYYY-MM-DD
**Duration**: X days/hours
**Cost**: $X,XXX engineering time
**Severity**: P0/P1/P2

### The Problem
[What went wrong in plain language]

### Root Cause Analysis
[Technical explanation of WHY it happened]

### The Fix
[What was changed to resolve it]

**Commit**: [commit-hash]
**Files Changed**:
- path/to/file.ts

### Prevention
[How to prevent this in the future]

### Related Incidents
- [Link to similar incidents]
```

### 3. Update PATTERNS.md

If the fix introduces a reusable pattern:

```markdown
## X. [Pattern Name]

### Pattern Overview
[Brief description]

### Implementation
[Code example with ✅ CORRECT and ❌ WRONG examples]

### When to Use
[Specific scenarios]

### Common Bugs
[What can go wrong]
```

### 4. Update PREVENTION.md

Add prevention strategy:

```markdown
## X. [Prevention Strategy Name]

### Implementation
[How to prevent this issue proactively]

**Implementation Time**: X hours
**Impact**: Critical/High/Medium/Low

### Automation Opportunities
[Scripts, linters, pre-commit hooks that could help]
```

### 5. Update QUICK-REFERENCE.md

Add error message and quick fix:

```markdown
### `Error Message Here`

**Cause**: [Why this happens]

**Quick Fix**:
\`\`\`bash
# Commands to run
\`\`\`

**Related Incident**: [INCIDENT-ID]
```

### 6. Update AI-AGENT-GUIDE.md

Add to anti-patterns section:

```markdown
### X. ❌ [Anti-Pattern Name]
\`\`\`typescript
// ❌ WRONG
[bad code]

// ✅ CORRECT
[good code]
\`\`\`
**Cost if missed**: $X,XXX
```

### 7. Update README.md

Update metrics at the top:
- Total cost
- Total commits
- Incident count
- Severity distribution

### 8. Update YAML Frontmatter

Ensure all 6 files have updated frontmatter:

```yaml
---
last_updated: "YYYY-MM-DD"
incident_count: X
total_cost: XXXXX
---
```

### 9. Update index.json

Run:
```bash
node claude-lessons3/scripts/update-index.cjs
```

---

## 🔄 Maintaining Existing Lessons

### Monthly Review Checklist

Run these checks monthly:

```bash
# 1. Validate all links
python scripts/validate_links.py

# 2. Check for stale documentation
python scripts/update_stale_docs.py

# 3. Verify frontmatter consistency
node claude-lessons3/scripts/validate-frontmatter.cjs

# 4. Update index.json
node claude-lessons3/scripts/update-index.cjs
```

### Updating Cost Estimates

When new data is available:
1. Update `total_cost` in category README.md
2. Update `total_cost` in index.json
3. Update incident-specific costs in INCIDENTS.md frontmatter

### Deprecating Outdated Lessons

When code architecture changes significantly:

1. Add deprecation notice to the lesson:
   ```markdown
   > **⚠️ DEPRECATED (YYYY-MM-DD)**: This pattern is no longer relevant as of [reason]. See [new-pattern] instead.
   ```

2. Update CHANGELOG.md with deprecation

3. Remove from index.json active lessons (move to deprecated section)

---

## 📊 Versioning Strategy

### Version Numbers

We use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Complete restructure or >50% of lessons rewritten
- **MINOR**: New category added, significant pattern changes
- **PATCH**: Individual incident updates, typo fixes

### When to Bump Version

**MAJOR (3.0.0 → 4.0.0)**:
- Architecture completely changes
- Lessons no longer apply
- Complete rewrite

**MINOR (3.0.0 → 3.1.0)**:
- New category added (11-new-category)
- >10 new incidents documented
- New automation added

**PATCH (3.0.0 → 3.0.1)**:
- Individual incident added
- Typos fixed
- Costs updated

Update version in:
- All YAML frontmatter
- index.json
- README.md
- CHANGELOG.md

---

## ✅ Quality Checklist

Before committing lesson updates:

- [ ] All 6 files in category updated
- [ ] YAML frontmatter includes `last_updated: "YYYY-MM-DD"`
- [ ] Costs are in USD with no commas (100000 not 100,000)
- [ ] Code examples use ✅ CORRECT and ❌ WRONG annotations
- [ ] Commit hashes are 8 characters
- [ ] File paths are absolute from repo root
- [ ] Links are relative and work
- [ ] Severity is P0, P1, or P2
- [ ] index.json is regenerated
- [ ] CHANGELOG.md is updated

---

## 🚫 Anti-Patterns in Documentation

### ❌ WRONG

```markdown
## Bug with auth

It broke. We fixed it.
```

### ✅ CORRECT

```markdown
## CL-AUTH-001: STRICT_AUTH Environment Drift (48 Days)

**Date**: October 1 - November 18, 2025
**Duration**: 48 days
**Cost**: $20,000 engineering time
**Severity**: P0

### The Problem
Frontend used `supabase.auth.signInWithPassword()` which returned JWTs without `restaurant_id`. Backend with STRICT_AUTH=true rejected these tokens, causing authentication loops.

### Root Cause
Environment drift: local had STRICT_AUTH=false (worked), production had STRICT_AUTH=true (failed).

### The Fix
Switched to custom `/api/v1/auth/login` endpoint that creates JWTs with all required fields including `restaurant_id`.

**Commit**: 9e97f720
**Files Changed**:
- client/src/contexts/AuthContext.tsx
- server/src/routes/auth.routes.ts
```

---

## 📧 Questions?

If you're unsure about:
- Which category to use
- Whether an incident is worth documenting
- How to structure a lesson

Ask in:
- GitHub issue
- Team chat
- Code review

**Remember**: If you spent >2 hours debugging it, document it. Your future self (and teammates) will thank you.

---

**Last Updated**: 2025-11-19
**Maintainer**: Technical Lead
**Version**: 3.0.0
