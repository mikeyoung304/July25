# TODO Status Summary

**Last Updated:** 2025-11-29
**Next Review:** Weekly Friday triage

---

## Quick Stats

| Status | Count | Action |
|--------|-------|--------|
| **Pending** | 1 | Work on these |
| **Deferred** | 4 | Re-evaluate monthly |
| **Accepted Risk** | 1 | Documented trade-off |
| **Archived** | 84 | In `.archive/` |

---

## Pending (1)

| ID | Priority | Title | Notes |
|----|----------|-------|-------|
| 039 | P3 | Extract message queue | Nice-to-have refactoring |

---

## Deferred (4)

| ID | Priority | Title | Reason |
|----|----------|-------|--------|
| 031 | P2 | Multi-seat isolation | High risk, needs test coverage first |
| 078 | P3 | Orders status NOT NULL | Requires production data verification |
| 092 | P2 | Multi-tenant tests | 2-3 days effort, schedule as sprint |

---

## Recent Completions (last 7 days)

All P1 and P2 TODOs resolved as of 2025-11-29:
- Voice ordering fixes (003, 016, 019, 020, 021, 081)
- Error handling (024, 025, 087)
- Performance (028, 090, 091)
- Data integrity (051, 053, 075, 077)
- Configuration (037, 040, 041)

---

## For New Sessions

Start with:
```
ls todos/*pending*.md   # What's truly pending?
ls todos/*deferred*.md  # What's waiting for decisions?
```

Use `/maintain quick` for full health check.

---

## File Naming Convention

```
[ID]-[status]-[priority]-[category].md

Status: pending | in-progress | complete | resolved | deferred
Priority: p0 (critical) | p1 (high) | p2 (medium) | p3 (low)
```

**Always update both filename AND internal status field.**
