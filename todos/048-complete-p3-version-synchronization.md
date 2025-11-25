---
status: complete
priority: p3
issue_id: "048"
tags: [documentation, version, consistency, code-review]
dependencies: []
---

# Version Synchronization Across Workspaces

## Problem Statement

Version numbers are inconsistent across the monorepo:
- Root package.json: v6.0.14
- Client package.json: v6.0.6
- Server package.json: v6.0.6

CLAUDE.md references v6.0.14, which only applies to the root.

**Why it matters:** Version inconsistency causes confusion about what's actually deployed and can lead to debugging the wrong code.

## Findings

### Current Versions
| Package | Version | Location |
|---------|---------|----------|
| Root | 6.0.14 | /package.json |
| Client | 6.0.6 | /client/package.json |
| Server | 6.0.6 | /server/package.json |
| Shared | (unknown) | /shared/package.json |

### CLAUDE.md Reference
Line 142: "## Current Status (v6.0.14)"

This is technically correct (root version) but misleading since client/server are 6.0.6.

## Proposed Solutions

### Solution 1: Sync All to 6.0.14 (Recommended)
Update client and server package.json to match root.

**Pros:** Consistency, clear versioning
**Cons:** Potential semver semantic issues if breaking changes exist
**Effort:** Small (10 min)
**Risk:** Low

### Solution 2: Document Version Strategy
Keep versions separate but document the strategy.

**Pros:** No code changes
**Cons:** Still confusing
**Effort:** Small (5 min)
**Risk:** Low

### Solution 3: Automated Version Sync
Add npm script to sync versions across workspaces.

**Pros:** Prevents future drift
**Cons:** More tooling
**Effort:** Medium (30 min)
**Risk:** Low

## Recommended Action

Solution 1 + Solution 3: Sync now, add automation to prevent drift.

## Technical Details

### Manual Sync
```bash
# Update client
cd client
npm version 6.0.14 --no-git-tag-version

# Update server
cd ../server
npm version 6.0.14 --no-git-tag-version

# Update shared
cd ../shared
npm version 6.0.14 --no-git-tag-version
```

### Automated Sync Script
Add to root package.json:
```json
{
  "scripts": {
    "version:sync": "npm version $npm_package_version --workspaces --no-git-tag-version"
  }
}
```

## Acceptance Criteria

- [ ] All workspace package.json versions match root
- [ ] CLAUDE.md version reference is accurate
- [ ] Version sync script added to package.json
- [ ] README documents versioning strategy

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review | Workspace versions 8 minor versions behind root |

## Resources

- [Root package.json](/package.json)
- [Client package.json](/client/package.json)
- [Server package.json](/server/package.json)
