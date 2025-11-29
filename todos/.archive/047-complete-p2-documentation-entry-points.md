---
status: complete
priority: p2
issue_id: "047"
tags: [documentation, navigation, consolidation, code-review]
dependencies: ["043"]
---

# Consolidate Documentation Entry Points

## Problem Statement

The documentation has 7+ competing entry points, creating confusion about where to start:
1. /README.md → Points to index.md
2. /index.md → Primary hub
3. /docs/README.md → Diátaxis framework entry
4. /CLAUDE.md → Claude Code guidance
5. /CODEBASE_INDEX.md → Navigation guide
6. /docs/NAVIGATION.md → Another navigation guide
7. /docs/learning-path/ → Onboarding sequence

**Why it matters:** Developers waste time figuring out which file to consult. Multiple entry points create maintenance burden.

## Findings

### Current State
- **index.md** (18KB): Comprehensive but competes with docs/README.md
- **CODEBASE_INDEX.md** (13KB): Overlaps with index.md
- **docs/NAVIGATION.md** (7.9KB): Third navigation guide
- **docs/README.md** (4KB): Diátaxis entry, doesn't link to CLAUDE.md

### Specific Issues
1. CLAUDE.md not mentioned in /index.md
2. Duplicate navigation: index.md vs CODEBASE_INDEX.md vs docs/NAVIGATION.md
3. docs/README.md doesn't reference CLAUDE.md for Claude Code users
4. Learning path not prominently linked from main entry points

### Missing Cross-Links
- docs/README.md should link to CLAUDE.md
- CLAUDE.md should state its purpose clearly
- index.md should clearly differentiate from docs/README.md

## Proposed Solutions

### Solution 1: Two Entry Points (Recommended)
Consolidate to exactly 2 entry points with clear purposes.

```
/index.md (or /README.md)
└── "Start here" - project overview, quick links

/docs/README.md
└── "Detailed docs" - Diátaxis framework

/CLAUDE.md
└── "Claude Code users" - referenced from both above
```

**Pros:** Clear hierarchy, reduces confusion
**Cons:** Must merge/delete files
**Effort:** Medium (1-2 hours)
**Risk:** Low

### Solution 2: Redirect Strategy
Keep files but add clear redirects/purpose statements at top.

**Pros:** No file deletion
**Cons:** Still multiple files to maintain
**Effort:** Small (30 min)
**Risk:** Low

## Recommended Action

Solution 1 - Consolidate to 2 entry points.

## Technical Details

### Files to Consolidate

**MERGE into index.md:**
- CODEBASE_INDEX.md content → index.md "Project Structure" section
- docs/NAVIGATION.md → Integrate best parts into docs/README.md

**DELETE after merge:**
- CODEBASE_INDEX.md (content merged)
- docs/NAVIGATION.md (content merged)

### Add Cross-Links

**To docs/README.md, add:**
```markdown
## For Claude Code Users
If using Claude Code, see [CLAUDE.md](/CLAUDE.md) for quick reference.
```

**To CLAUDE.md, add header:**
```markdown
# CLAUDE.md: Claude Code Quick Reference

**Purpose**: Rapid access to critical rules for developers using Claude Code
**Detailed docs**: See /docs/README.md
```

## Acceptance Criteria

- [ ] Only 2 main entry points: index.md and docs/README.md
- [ ] CODEBASE_INDEX.md content merged and file deleted
- [ ] docs/NAVIGATION.md content merged and file deleted
- [ ] docs/README.md links to CLAUDE.md
- [ ] CLAUDE.md has clear purpose statement
- [ ] All internal links updated and tested

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review | 7+ entry points cause navigation confusion |

## Resources

- [index.md](/index.md)
- [docs/README.md](/docs/README.md)
- [CODEBASE_INDEX.md](/CODEBASE_INDEX.md)
- [docs/NAVIGATION.md](/docs/NAVIGATION.md)
