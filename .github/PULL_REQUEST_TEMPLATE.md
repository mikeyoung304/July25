PLAN
What/why, constraints, risks

FILES CHANGED
Paths

DIFF SUMMARY
Key changes

CHECKS
docs/CHECKS.sh → OK

(optional) typecheck/lint/tests/build if enabled

DOCUMENTATION CHECKLIST (if docs changed)
- [ ] Updated `docs/index.md` or `docs/NAVIGATION.md` if adding new documentation
- [ ] Added "Last Updated" date to modified docs (format: **Last Updated:** YYYY-MM-DD)
- [ ] Verified all internal links work (no broken relative links)
- [ ] Updated related documentation cross-references
- [ ] Followed Diátaxis framework (tutorials/how-to/reference/explanation)
- [ ] No hardcoded versions (link to VERSION.md instead)
- [ ] Root directory policy maintained (exactly 4 .md files)

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
