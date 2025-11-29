---
status: complete
priority: p1
issue_id: "043"
tags: [documentation, claude-md, optimization, code-review]
dependencies: ["042"]
---

# CLAUDE.md Optimization - Reduce Size and Improve Focus

## Problem Statement

CLAUDE.md at 230 lines (~2,100 tokens) is too long and mixes multiple concerns. It tries to be:
1. Quick development reference
2. Architectural governance
3. Project status tracker
4. Test debugging guide

This scope creep reduces its effectiveness. Critical rules require scrolling past non-essential content.

**Why it matters:** Every Claude Code interaction loads CLAUDE.md. Excessive size increases token costs and reduces signal-to-noise ratio.

## Findings

### Signal-to-Noise Analysis
- **Essential content:** 65-70%
- **Nice-to-have:** 20-25%
- **Redundant/outdated:** 10-15%

### Content Classification

**HIGH VALUE (Keep):**
- Commands section (lines 5-57): Essential, well-organized
- Critical architectural decisions (lines 70-140): Core rules
- Module system warning (CommonJS): Prevents deployment failures

**MEDIUM VALUE (Could be elsewhere):**
- Test debugging gotchas (lines 181-231): ~200 tokens, specific to E2E
- Current Status section (lines 142-159): Duplicates README.md

**LOW VALUE (Move/Remove):**
- Order Status Flow diagram: Single diagram, minimal value
- Environment Variables: Sparse, users should check .env.example
- WebSocket/Voice sections: Too terse to be useful

### Structural Issues
1. Architecture dominates (lines 59-140) but developers want commands first
2. Test debugging (40-50% of reads don't need this)
3. Duplicated CLAUDE.md in /docs/archive/ (v6.0.8) creates maintenance burden

## Proposed Solutions

### Solution 1: Split into Focused Files (Recommended)
```
CLAUDE.md (80-120 lines, ~500 tokens)
├── Critical rules (top)
├── Commands
├── Links to detailed docs

.github/TEST_DEBUGGING.md (new)
├── All E2E gotchas
├── Common test failures
```

**Pros:** Faster reads, lower token cost, better organization
**Cons:** Requires creating new file
**Effort:** Medium (1 hour)
**Risk:** Low

### Solution 2: Aggressive Condensation
Keep everything in one file but compress architecture to links only.

**Pros:** Single file maintained
**Cons:** Still somewhat bloated
**Effort:** Small (30 min)
**Risk:** Low

### Solution 3: Dynamic Section Loading
Use Claude Code's file reading to load sections on-demand.

**Pros:** Minimal base file
**Cons:** More tool calls, complexity
**Effort:** Large
**Risk:** Medium

## Recommended Action

Solution 1 - Split CLAUDE.md into focused file + TEST_DEBUGGING.md

## Technical Details

### Target Structure
```markdown
# CLAUDE.md

Quick reference for Restaurant OS development.

## Critical Rules (6 bullets, 150 tokens)
1. Snake case everywhere (ADR-001)
2. Check restaurant_id in every query
3. Use httpClient only - never fetch()
4. Logger only - never console.log
5. CommonJS in shared/ - no "type": "module"
6. Types from shared/types/ only

## Commands (keep as-is)
[existing commands section]

## Architecture
See docs/explanation/architecture-decisions/ for ADRs.

## Debugging
See .github/TEST_DEBUGGING.md for E2E issues.
```

### Files to Create/Modify
- `/CLAUDE.md` - Reduce to ~100 lines
- `/.github/TEST_DEBUGGING.md` - New file with test gotchas
- `/docs/archive/CLAUDE.md` - DELETE (outdated v6.0.8)

## Acceptance Criteria

- [ ] CLAUDE.md reduced to <120 lines
- [ ] Critical rules condensed to 6-8 bullet points at top
- [ ] Test debugging moved to separate file
- [ ] Current Status section removed (use CHANGELOG)
- [ ] Archived CLAUDE.md deleted
- [ ] All links tested and working

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review analysis | 230 lines is ~60% larger than optimal for Claude Code context |

## Resources

- [Current CLAUDE.md](/CLAUDE.md)
- [Archived CLAUDE.md](/docs/archive/CLAUDE.md)
- [CHANGELOG.md](/docs/CHANGELOG.md)
