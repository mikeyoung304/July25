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
- [ ] Updated `docs/index.md` or `docs/README.md` if adding new documentation
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

DATABASE MIGRATION CHECKLIST (if migrations included)
- [ ] Tested locally: `supabase db push --dry-run`
- [ ] Rollback script created (for destructive changes)
- [ ] RPC types validated: TEXT (not VARCHAR), TIMESTAMPTZ (not TIMESTAMP)
- [ ] RPC dependencies verified (all columns exist)
- [ ] Ran `./scripts/post-migration-sync.sh`
- [ ] `git diff prisma/schema.prisma` shows expected changes only
- [ ] CI checks passing: pr-validation.yml + migration-integration.yml
- [ ] Uses `IF NOT EXISTS` / `IF EXISTS` for idempotency
- [ ] Migration naming: `YYYYMMDDHHMMSS_description.sql`

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
