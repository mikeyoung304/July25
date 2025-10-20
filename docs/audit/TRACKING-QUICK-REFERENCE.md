# P0 Audit Fixes - Tracking Quick Reference

## 📍 Tracking Locations

### GitHub Milestone
**Primary tracking method** - All 8 fix issues are in this milestone:

🔗 **[P0 Audit Fixes - Oct 2025](https://github.com/mikeyoung304/July25/milestone/2)**

View progress, filter by label, see open/closed counts.

### Documentation
**Detailed roadmap** with implementation timeline and checklists:

📄 **[P0-FIX-ROADMAP.md](./P0-FIX-ROADMAP.md)**

Update status emojis and checkboxes as work progresses.

### Verification Map
**Links finding IDs to GitHub issues**:

📄 **[verification-map-P0.json](./verification-map-P0.json)**

Maps audit finding IDs to verification issues.

---

## 🎯 Fix Issues by Category

### 🚨 Critical Stability (STAB)
| Issue | Title | Priority | Effort |
|-------|-------|----------|--------|
| [#117](https://github.com/mikeyoung304/July25/issues/117) | Transaction wrapping for createOrder | P0 | 2-3h |
| [#118](https://github.com/mikeyoung304/July25/issues/118) | Optimistic locking for updateOrderStatus | P0 | 2-3h |
| [#119](https://github.com/mikeyoung304/July25/issues/119) | **CRITICAL** Hardcoded tax rates | P0 | 3-4h |
| [#120](https://github.com/mikeyoung304/July25/issues/120) | **CRITICAL** Payment audit fail-fast | P0 | 1-2h |

### ⚡ Optimization (OPT)
| Issue | Title | Priority | Effort |
|-------|-------|----------|--------|
| [#121](https://github.com/mikeyoung304/July25/issues/121) | Batch table updates optimization | P0 | 2-3h |
| [#122](https://github.com/mikeyoung304/July25/issues/122) | ElapsedTimer useMemo fix | P0 | 1-2h |

### 🔨 Refactoring (REF)
| Issue | Title | Priority | Effort |
|-------|-------|----------|--------|
| [#123](https://github.com/mikeyoung304/July25/issues/123) | FloorPlanEditor refactor | P0 | 4-6h |
| [#124](https://github.com/mikeyoung304/July25/issues/124) | WebRTCVoiceClient refactor | P0 High | 8-12h |

---

## 🔍 Quick Links

### Verification Issues (Evidence)
- [#111](https://github.com/mikeyoung304/July25/issues/111) - STAB-001 verification
- [#112](https://github.com/mikeyoung304/July25/issues/112) - STAB-002 verification
- [#113](https://github.com/mikeyoung304/July25/issues/113) - STAB-003 verification
- [#114](https://github.com/mikeyoung304/July25/issues/114) - STAB-004 verification
- [#108](https://github.com/mikeyoung304/July25/issues/108) - OPT-002 verification
- [#110](https://github.com/mikeyoung304/July25/issues/110) - OPT-005 verification
- [#105](https://github.com/mikeyoung304/July25/issues/105) - REF-001 verification
- [#106](https://github.com/mikeyoung304/July25/issues/106) - REF-002 verification

### Audit Documentation
- [Audit README](./README.md) - Overview of all audit findings
- [Verification Scripts](../../scripts/) - `verify_p0_local.sh`, `verify_p0_db.sh`

---

## 📊 CLI Commands

### View All Fix Issues
```bash
gh issue list --milestone "P0 Audit Fixes - Oct 2025"
```

### View by Category
```bash
# Stability issues
gh issue list --milestone "P0 Audit Fixes - Oct 2025" --label stability

# Optimization issues
gh issue list --milestone "P0 Audit Fixes - Oct 2025" --label optimization

# Refactoring issues
gh issue list --milestone "P0 Audit Fixes - Oct 2025" --label refactoring
```

### View Milestone Progress
```bash
gh api repos/mikeyoung304/July25/milestones/2 --jq '{title, open_issues, closed_issues, progress: ((.closed_issues / (.open_issues + .closed_issues)) * 100)}'
```

### Check Individual Issue Status
```bash
gh issue view 117  # STAB-001
gh issue view 118  # STAB-002
gh issue view 119  # STAB-003 (CRITICAL)
gh issue view 120  # STAB-004 (CRITICAL)
gh issue view 121  # OPT-002
gh issue view 122  # OPT-005
gh issue view 123  # REF-001
gh issue view 124  # REF-002
```

---

## ✅ Labels Used

All fix issues have these labels:
- `P0` - Priority 0 (highest)
- `fix` - Indicates bug fix or improvement
- `audit-2025-10-19` - Links to this audit cycle
- Category: `stability`, `optimization`, or `refactoring`

### Filter by Labels
```bash
# Critical stability issues
gh issue list --label "P0,stability"

# All audit fixes
gh issue list --label "audit-2025-10-19,fix"
```

---

## 📝 Update Workflow

### When Starting Work on an Issue
1. Assign issue to yourself: `gh issue edit <num> --add-assignee @me`
2. Update [P0-FIX-ROADMAP.md](./P0-FIX-ROADMAP.md) status: 🔴 → 🟡
3. Comment on issue with approach/questions

### When Opening PR
1. Reference issue in PR: "Fixes #117"
2. Reference verification issue: "Closes #111"
3. Use PR checklist from [P0-FIX-ROADMAP.md](./P0-FIX-ROADMAP.md)
4. Update roadmap status: 🟡 → 🟢

### When PR is Merged
1. Issue auto-closes (via "Fixes #117")
2. Update roadmap status: 🟢 → ✅
3. Update progress table in roadmap
4. Update CHANGELOG.md

---

## 🎯 Implementation Priority Order

**Recommended sequence** (see roadmap for details):

1. **#120** (STAB-004) - Payment audit fail-fast (1-2h) ⚠️ COMPLIANCE
2. **#119** (STAB-003) - Tax rates (3-4h) ⚠️ REVENUE IMPACT
3. **#117** (STAB-001) - Transactions (2-3h)
4. **#118** (STAB-002) - Optimistic locking (2-3h)
5. **#122** (OPT-005) - Timer fix (1-2h)
6. **#121** (OPT-002) - Batch optimization (2-3h)
7. **#123** (REF-001) - FloorPlanEditor (4-6h)
8. **#124** (REF-002) - WebRTCVoiceClient (8-12h)

---

**Last Updated**: 2025-10-19
**Total Estimated Effort**: 23-35 hours
**Progress**: 0/8 completed (0%)
