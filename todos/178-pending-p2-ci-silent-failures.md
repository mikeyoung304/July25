# TODO-178: CI/CD workflows have silent failure modes

## Status: pending
## Priority: P2 (Important - quality gates bypassed)
## Category: build-errors
## Tags: ci, github-actions, testing, deployment

## Problem Statement

Multiple GitHub Actions workflows use `continue-on-error: true` or `|| true` patterns that silently bypass quality gates.

**Critical Issues:**

1. **Linting/Type checks ignored** (deploy-with-validation.yml:32-37):
   ```yaml
   - name: Run linter
     run: npm run lint || echo "Linting issues found"
     continue-on-error: true
   ```

2. **npm audit failures ignored** (security.yml:154-159):
   ```yaml
   - name: Run npm audit
     run: npm audit --audit-level=high
     continue-on-error: true
   ```

3. **Webhook security tests can fail** (security.yml:85):
   ```yaml
   run: npm test tests/security/webhook.proof.test.ts || true
   ```

4. **Workflow validation always passes** (package.json:24):
   ```json
   "validate:workflows": "actionlint .github/workflows/*.yml || exit 0"
   ```

**Impact:**
- Code with type errors can be deployed
- Known security vulnerabilities pass through
- Webhook signature bugs go undetected
- Invalid workflow configurations not caught

## Proposed Solution

### Phase 1: Make critical checks blocking

```yaml
# deploy-with-validation.yml
- name: Run linter
  run: npm run lint

- name: Run type check
  run: npm run type-check
```

### Phase 2: Fix package.json

```json
"validate:workflows": "actionlint .github/workflows/*.yml"
```

### Phase 3: Security audit handling

```yaml
- name: Run npm audit
  run: npm audit --audit-level=critical  # Only fail on critical
```

## Acceptance Criteria

- [ ] Linting failures block deployment
- [ ] Type check failures block deployment
- [ ] Critical npm audit issues block deployment
- [ ] Webhook security tests are required to pass
- [ ] Workflow validation catches errors

## Files to Update

1. `.github/workflows/deploy-with-validation.yml`
2. `.github/workflows/security.yml`
3. `package.json`

## Related

- Security review findings
