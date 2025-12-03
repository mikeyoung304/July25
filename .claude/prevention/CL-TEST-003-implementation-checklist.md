# CL-TEST-003: Implementation Checklist

Complete implementation of test environment isolation prevention strategies.

---

## Phase 1: Foundation (Day 1)

### 1.1 Verify Current State

- [ ] Check that `.env.test` is committed to Git
  ```bash
  git ls-files | grep ".env.test"
  ```

- [ ] Verify `.env.test` has correct test values
  ```bash
  cat .env.test | head -20
  ```

- [ ] Confirm no production URLs in `.env.test`
  ```bash
  grep -i "production\|onrender\|july25" .env.test
  ```

- [ ] Check that `DATABASE_URL` is set in server bootstrap
  ```bash
  grep "DATABASE_URL" server/tests/bootstrap.ts
  ```

- [ ] Verify `.gitignore` has proper rules
  ```bash
  cat .gitignore | grep -A5 "Environment"
  ```

### 1.2 Document Current Environment Configuration

- [ ] Create `docs/ENVIRONMENT.md` if it doesn't exist
  - [ ] Section: "Test Environment (.env.test)"
  - [ ] Section: "Tool Pollution Prevention"
  - [ ] Section: "Verification Steps"
  - [ ] Section: "Common Mistakes"

- [ ] Add to project README
  ```markdown
  ## Environment Configuration

  Test environment is configured in `.env.test` (committed to Git).
  See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for setup instructions.
  ```

### 1.3 Bootstrap Validation

- [ ] Server bootstrap (`server/tests/bootstrap.ts`) validates:
  - [ ] `NODE_ENV === 'test'`
  - [ ] `DATABASE_URL` is set
  - [ ] No production URLs in env
  - [ ] Fails fast with clear error message

  ```typescript
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Tests must run with NODE_ENV=test. ' +
      'Check .env.test or your environment configuration.'
    );
  }
  ```

- [ ] Client test setup (`client/test/setup.ts`) validates:
  - [ ] `VITE_API_BASE_URL` is set
  - [ ] `VITE_DEFAULT_RESTAURANT_ID` format is correct
  - [ ] Fails with clear error message

### 1.4 Gitignore Rules

- [ ] Root `.gitignore` has these rules:
  ```bash
  # Environment files
  .env              # Ignored
  .env.*            # Ignored by default
  !.env.test        # EXCEPTION: Test env (track in Git)
  !.env.example     # EXCEPTION: Template (track in Git)

  # Tool-generated files (do not commit)
  .env.vercel.*
  .env.aws-*
  .env.docker-*
  ```

- [ ] Test locally:
  ```bash
  git check-ignore -v .env.test        # Should NOT ignore
  git check-ignore -v .env.local       # Should ignore
  git check-ignore -v .env.vercel.*    # Should ignore
  ```

---

## Phase 2: CI/CD Integration (Day 2)

### 2.1 Pre-Flight Checks Script

- [ ] Create `ci/preflight-checks.sh` with:
  - [ ] Verify `.env.test` exists
  - [ ] Verify `NODE_ENV=test`
  - [ ] Verify no production URLs
  - [ ] Verify no unexpected `.env` files
  - [ ] Clear error messages

  ```bash
  #!/bin/bash
  set -e
  echo "=== Pre-Flight Checks ==="
  test -f .env.test || { echo "Missing .env.test"; exit 1; }
  grep "NODE_ENV=test" .env.test || { echo "Wrong NODE_ENV"; exit 1; }
  # ... more checks
  ```

- [ ] Make script executable:
  ```bash
  chmod +x ci/preflight-checks.sh
  ```

- [ ] Test locally:
  ```bash
  bash ci/preflight-checks.sh
  ```

### 2.2 CI Pipeline Integration

- [ ] GitHub Actions (`.github/workflows/test.yml`):
  - [ ] Add preflight job before tests
  - [ ] Mark tests as dependent on preflight
  - [ ] Display clear error messages on failure

  ```yaml
  jobs:
    preflight:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Pre-flight environment checks
          run: bash ci/preflight-checks.sh

    test:
      needs: preflight  # Must pass preflight first
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Run tests
          run: npm test
  ```

- [ ] Other CI systems (Render, Vercel, etc.):
  - [ ] Add preflight checks to build script
  - [ ] Ensure checks run before tests
  - [ ] Verify in deployment logs

### 2.3 Environment Validation Script

- [ ] Create `scripts/validate-env.ts`:
  - [ ] Define critical variables
  - [ ] Check existence
  - [ ] Check format (regex)
  - [ ] Check for forbidden values
  - [ ] Distinguish critical vs warning issues

- [ ] Add to package.json:
  ```json
  {
    "scripts": {
      "validate:env": "ts-node scripts/validate-env.ts"
    }
  }
  ```

- [ ] Test locally:
  ```bash
  npm run validate:env
  ```

- [ ] Add to CI pipeline:
  ```bash
  npm run validate:env
  npm test
  ```

---

## Phase 3: Developer Tools (Day 3)

### 3.1 Setup Script

- [ ] Create `scripts/setup-test-env.sh`:
  - [ ] Check if `.env.test` is corrupted
  - [ ] Restore from Git if needed
  - [ ] Verify critical variables
  - [ ] Provide clear instructions

  ```bash
  #!/bin/bash

  if grep -q "production" .env.test 2>/dev/null; then
    echo "Restoring test environment from Git..."
    git checkout .env.test
  fi

  # ... verification
  ```

- [ ] Make executable:
  ```bash
  chmod +x scripts/setup-test-env.sh
  ```

- [ ] Add to onboarding documentation:
  ```bash
  # New developer setup:
  bash scripts/setup-test-env.sh
  npm install
  npm test
  ```

### 3.2 Pre-Commit Hook

- [ ] Ensure Husky pre-commit hook checks `.env.test`:
  ```bash
  #!/bin/bash
  # .husky/pre-commit

  if git diff --cached --name-only | grep -q ".env.test"; then
    echo "Validating .env.test..."

    # Check NODE_ENV
    grep -q "NODE_ENV=test" .env.test || {
      echo "ERROR: NODE_ENV not 'test' in .env.test"
      exit 1
    }

    # Check no production URLs
    grep -q "production\|onrender" .env.test && {
      echo "ERROR: Production URLs found in .env.test"
      exit 1
    }
  fi
  ```

### 3.3 VS Code/IDE Configuration

- [ ] Create `.vscode/settings.json` hints:
  ```json
  {
    "files.associations": {
      ".env.test": "properties"
    },
    "search.exclude": {
      ".env.local": true,
      ".env.*.local": true
    }
  }
  ```

- [ ] Optional: Create `.vscode/tasks.json` for quick actions:
  ```json
  {
    "tasks": [
      {
        "label": "Validate Test Environment",
        "type": "shell",
        "command": "npm run validate:env",
        "presentation": {
          "echo": true,
          "reveal": "always"
        }
      }
    ]
  }
  ```

---

## Phase 4: Documentation & Training (Day 4)

### 4.1 Documentation

- [ ] Create/update `docs/ENVIRONMENT.md`:
  - [ ] Overview of environment setup
  - [ ] Test environment requirements
  - [ ] Common mistakes
  - [ ] Troubleshooting guide
  - [ ] Link to full lesson CL-TEST-003

- [ ] Update README.md:
  - [ ] Add environment section
  - [ ] Quick setup instructions
  - [ ] Link to ENVIRONMENT.md

- [ ] Update PR template (`.github/pull_request_template.md`):
  - [ ] Checklist item: "I have not modified `.env.test` with production values"
  - [ ] Checklist item: "Tests pass locally with `npm test`"

- [ ] Add to CONTRIBUTING.md:
  - [ ] Environment setup instructions
  - [ ] How to handle tool-generated `.env` files
  - [ ] Verification steps before commit

### 4.2 Team Training Materials

- [ ] Create internal doc/wiki entry:
  - [ ] Problem statement (why this matters)
  - [ ] Quick reference (5-minute fix)
  - [ ] Prevention strategies (8 detailed ones)
  - [ ] Common pitfalls

- [ ] Prepare team sync presentation:
  - [ ] 5-minute overview of the issue
  - [ ] 10-minute walkthrough of fixes
  - [ ] Q&A for team's specific concerns

- [ ] Record short video walkthrough (optional):
  - [ ] How to restore `.env.test` from Git
  - [ ] How to recognize tool pollution
  - [ ] How to run preflight checks locally

### 4.3 Onboarding Integration

- [ ] Add to new developer checklist:
  - [ ] [ ] Run `bash scripts/setup-test-env.sh`
  - [ ] [ ] Read `docs/ENVIRONMENT.md`
  - [ ] [ ] Run `npm test` to verify setup
  - [ ] [ ] Understand why tests use different env than dev

- [ ] Create "Quick Setup" doc for new devs:
  ```markdown
  # Quick Setup (New Developer)

  1. Clone repo
  2. `npm install`
  3. `bash scripts/setup-test-env.sh` (sets up test environment)
  4. `npm test` (verify it works)
  5. Read `docs/ENVIRONMENT.md` for details
  ```

---

## Phase 5: Monitoring & Ongoing (Week 2+)

### 5.1 Metric Tracking

- [ ] Set up monitoring for:
  - [ ] CI test pass rate (should be 100%)
  - [ ] Environment validation failures (should be 0)
  - [ ] Unexpected `.env` files created (should be 0)
  - [ ] Time to fix environment issues (should be <5 min)

- [ ] Add to dashboard:
  ```
  Weekly Report:
  - % of CI runs passing env validation: ___
  - Number of unexpected .env files: ___
  - "Tests fail in CI only" incidents: ___
  - Avg time to resolve env issues: ___
  ```

### 5.2 Regular Audits

- [ ] Monthly check (add to calendar):
  - [ ] Review if any tool created unexpected `.env` files
  - [ ] Check that all developers understand the setup
  - [ ] Review git history for `.env.test` changes
  - [ ] Update documentation if needed

- [ ] Script for monthly audit:
  ```bash
  #!/bin/bash
  # scripts/monthly-env-audit.sh

  echo "=== Monthly Environment Audit ==="

  # Check git history
  echo "Recent .env.test changes:"
  git log --oneline .env.test | head -5

  # List any tool files that were created
  echo "Tool-created files (should be 0):"
  find . -name ".env.vercel.*" -o -name ".env.aws-*"

  # Check team understanding
  echo "Team training completion: $(date +%Y-%m-%d)"
  ```

### 5.3 Continuous Improvement

- [ ] Review incidents from team:
  - [ ] Did anyone get confused about `.env.test`?
  - [ ] Did tests fail due to environment issue?
  - [ ] What could we document better?

- [ ] Update prevention strategies if needed:
  - [ ] Add new tool patterns to `.gitignore`
  - [ ] Add new validation rules if issues found
  - [ ] Improve documentation based on questions

- [ ] Update this checklist:
  - [ ] Mark completed phases
  - [ ] Note any adaptations made
  - [ ] Update timeline based on actual progress

---

## Verification Checklist

### Before Declaring Success

- [ ] `.env.test` is committed to Git
  ```bash
  git ls-files | grep ".env.test"  # Should output .env.test
  ```

- [ ] `.env.test` has only test values
  ```bash
  grep "NODE_ENV=test" .env.test
  grep -v "production\|onrender" .env.test  # Should output nothing
  ```

- [ ] Bootstrap validates environment
  ```bash
  npm run test:server -- --reporter=verbose  # Should show validation pass
  ```

- [ ] Pre-flight checks run in CI
  ```bash
  # Check build logs for "Pre-flight checks" output
  ```

- [ ] CI tests pass
  ```bash
  # Check that test workflow completes successfully
  ```

- [ ] Documentation is complete
  - [ ] docs/ENVIRONMENT.md exists
  - [ ] README references environment setup
  - [ ] PR template has environment checklist

- [ ] Team trained
  - [ ] All devs understand the setup
  - [ ] Onboarding script exists
  - [ ] No environment-related questions in standup

- [ ] Monitoring in place
  - [ ] CI passes consistently
  - [ ] No "tests pass locally, fail in CI" tickets
  - [ ] Environment validation always passes

---

## Rollback Plan (If Needed)

If the prevention strategies cause issues:

1. **Revert CI changes:**
   ```bash
   git revert <commit-with-preflight-checks>
   ```

2. **Keep `.env.test` improvements:**
   - The `.env.test` file and gitignore changes are safe
   - Bootstrap validation can be disabled if needed

3. **Gradual reintroduction:**
   - Re-enable one prevention layer at a time
   - Get team feedback after each layer
   - Adjust based on feedback

4. **Root cause analysis:**
   - If rollback needed, investigate why
   - Update prevention strategies based on findings
   - Document lessons learned

---

## Timeline

| Phase | Days | Key Deliverables |
|-------|------|------------------|
| Foundation | Day 1 | .env.test validated, bootstrap updated, docs created |
| CI Integration | Day 2 | Preflight checks added, CI pipeline updated |
| Developer Tools | Day 3 | Setup scripts, pre-commit hooks, IDE config |
| Documentation | Day 4 | ENVIRONMENT.md, PR template, training materials |
| Monitoring | Week 2+ | Metrics tracking, monthly audits, improvements |

**Total Implementation Time:** 4-5 days + ongoing monitoring

---

## Success Criteria

**Implementation is successful when:**

1. ✅ `.env.test` is committed to Git with test values only
2. ✅ All developers have identical test configuration
3. ✅ CI tests pass without environment-related failures
4. ✅ Pre-flight checks run and pass before test suite
5. ✅ Tool pollution (`.env.vercel.*`, etc.) is automatically handled
6. ✅ New developers can run `npm test` without setup
7. ✅ Zero "tests pass locally, fail in CI" incidents due to environment
8. ✅ Team understands why environment configuration matters

**Ongoing success metrics:**

- 100% CI test pass rate
- 0 environment validation failures
- 0 tool-created `.env` files in git
- <5 minutes to fix environment issues when they occur
- 0 questions about environment setup in standups

---

## Maintenance

**Monthly:**
- Review CI logs for any environment issues
- Run audit script: `bash scripts/monthly-env-audit.sh`
- Update documentation if needed

**When adding new environment variables:**
1. Add to `.env.test` with TEST value
2. Add to `.env.example` with placeholder
3. Add validation to bootstrap
4. Update `docs/ENVIRONMENT.md`
5. Commit `.env.test` and docs

**When tools create `.env` files:**
1. Rename to `.env.[tool].*` pattern
2. Add pattern to `.gitignore`
3. Document in ENVIRONMENT.md
4. Restore proper `.env.test` from Git

---

## Questions & Answers

**Q: What if we need different .env.test values for different features?**
A: Use `.env.local` for personal overrides (not committed). `.env.test` must be identical for all developers and CI.

**Q: What if a tool keeps overwriting .env.test?**
A: Add tool-created pattern to `.gitignore` and restore `.env.test` from Git in setup script.

**Q: How do we handle database credentials in .env.test?**
A: Use test/local database credentials only. Never commit production DB credentials. For test infrastructure, use temporary containers.

**Q: Should .env.test be the same in all environments?**
A: Yes. `.env.test` is for running tests. Different environment configs (dev/staging/prod) use different machines and different .env files.

**Q: What if someone commits .env.test with production values by mistake?**
A: CI pre-flight checks will catch it. If merged, either:
   1. Revert commit with `git revert`
   2. Or manually restore: `git show HEAD~1:.env.test > .env.test && git add .env.test`

---

## Contact & Support

- **Questions about prevention strategies:** See CL-TEST-003-env-isolation-prevention.md
- **Quick 5-minute fix:** See CL-TEST-003-quick-reference.md
- **Specific errors:** See "Warning Signs" section in main lesson
- **Team training:** Use materials from Phase 4: Documentation & Training

---

**Lesson:** CL-TEST-003
**Checklist Version:** 1.0
**Last Updated:** 2025-12-03
**Next Review:** Monthly (or after any environment-related incident)

