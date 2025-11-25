---
status: complete
priority: p2
issue_id: "046"
tags: [documentation, lessons, consolidation, code-review]
dependencies: []
---

# Lessons System Consolidation - Three Overlapping Systems

## Problem Statement

The project has THREE separate lessons/documentation systems in various states:
1. **claudelessons-v2** (archived, 648KB) - Dead
2. **claude-lessons3** (795KB .zip) - Semi-active but broken
3. **learning-path** (224KB) - Active and well-maintained

The claude-lessons3 system is broken - hooks reference directories that don't exist on disk (only in .zip file).

**Why it matters:** 52 documented incidents are inaccessible due to broken system. Developers can't learn from past mistakes.

## Findings

### System Status

| System | Location | Status | Issue |
|--------|----------|--------|-------|
| claudelessons-v2 | /docs/archive/claudelessons-v2/ | DEAD | Not referenced |
| claude-lessons3 | /claude-lessons3.zip | BROKEN | Not extracted, hooks fail |
| learning-path | /docs/learning-path/ | ACTIVE | Well-maintained |

### Broken Hooks
`.claude/hooks/post-commit` references:
- `claude-lessons3/SIGN_IN_SHEET.md` - File doesn't exist
- `claude-lessons3/incidents/` - Directory doesn't exist

The zip contains these files, but they're never extracted to disk.

### Evidence of Value
Despite being broken, the system has value:
- 52+ incidents documented (CL-BUILD-001 through CL-BUILD-009)
- $1.3M+ in prevented losses (estimated)
- Recent commits reference CL- incidents (Nov 24)
- Clear pattern tracking for multi-tenancy, auth, database issues

### Integration Gap
CLAUDE.md doesn't reference any CL- incidents. Developers reading CLAUDE.md don't know 52 prevention patterns exist.

## Proposed Solutions

### Solution 1: Extract and Fix (Recommended)
Extract claude-lessons3.zip, fix hooks, integrate with CLAUDE.md.

**Pros:** Unlocks 52 incident patterns, fixes broken hooks
**Cons:** Adds files to repo
**Effort:** Small (30 min)
**Risk:** Low

### Solution 2: Implement LESSONS_V4
The root directory has detailed v4 migration plans already created.

**Pros:** 75% faster retrieval, eliminates duplication
**Cons:** Larger effort
**Effort:** Medium-Large (1-2 days)
**Risk:** Medium

### Solution 3: Abandon Lessons System
Delete broken systems, keep only learning-path.

**Pros:** Simplest
**Cons:** Loses 52 documented incidents
**Effort:** Small
**Risk:** Low (but loses institutional knowledge)

## Recommended Action

Solution 1 immediately, then evaluate Solution 2 based on value.

## Technical Details

### Immediate Fix
```bash
# Extract lessons system
cd /Users/mikeyoung/CODING/rebuild-6.0
unzip claude-lessons3.zip -d claude-lessons3

# Verify hooks work
cat .claude/hooks/post-commit
# Should now find claude-lessons3/SIGN_IN_SHEET.md
```

### CLAUDE.md Integration
Add to CLAUDE.md:
```markdown
## Past Incidents
See claude-lessons3/incidents/ for documented issues:
- CL-AUTH-*: Authentication patterns
- CL-BUILD-*: Build/deploy failures
- CL-DATABASE-*: Database issues
- CL-VOICE-*: Voice ordering problems
```

### Cleanup Dead System
```bash
# Remove archived v2 (truly dead)
rm -rf docs/archive/claudelessons-v2/
```

## Acceptance Criteria

- [ ] claude-lessons3.zip extracted to disk
- [ ] .claude/hooks/post-commit works (finds SIGN_IN_SHEET.md)
- [ ] CLAUDE.md references CL- incident patterns
- [ ] Dead v2 system removed from archive
- [ ] learning-path continues working (no changes needed)

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review | Lessons system valuable but broken - 52 incidents inaccessible |

## Resources

- [claude-lessons3.zip](/claude-lessons3.zip)
- [LESSONS_V4_PROPOSAL.md](/CLAUDE_LESSONS_V4_PROPOSAL.md)
- [learning-path/](/docs/learning-path/)
- [.claude/hooks/](/claude/hooks/)
