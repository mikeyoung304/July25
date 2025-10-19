PLAN
What/why, constraints, risks

FILES CHANGED
Paths

DIFF SUMMARY
Key changes

CHECKS
docs/CHECKS.sh → OK

(optional) typecheck/lint/tests/build if enabled

AUTH CHECKLIST (if auth changes)
- [ ] Introduces/renames any public role names? Link ADR
- [ ] Updated AUTH docs + runbook
- [ ] Server auth tests updated (orders.auth.test.ts)
- [ ] If MIGRATION_STAGE=post, grep gate passes

RISK & ROLLBACK
Risks:

Revert: git revert <commit-sha>

NEXT STEP
One-line follow-up

---

### Audit Hygiene
- [ ] References **Audit finding ID(s)** (e.g., STAB-001)
- [ ] DB operations are **transactional** where appropriate
- [ ] Concurrency: optimistic locking/versioning considered where applicable
- [ ] Tests: added/updated to cover behavior and regressions
