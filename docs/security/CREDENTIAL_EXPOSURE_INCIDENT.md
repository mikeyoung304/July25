# Security Incident: Credential Exposure in Git History

**Status**: 🔴 CRITICAL - Active remediation required
**Discovered**: 2025-11-10
**Severity**: P0 - Immediate action required
**Incident Lead**: Technical Lead / Co-founder

## Executive Summary

Production credentials (Vercel OIDC token) were committed to git history in `.env.production` file in September 2025, creating a security exposure window of approximately 60+ days.

## Exposed Credentials

### Confirmed Exposures

1. **Vercel OIDC Token** (CRITICAL)
   - **File**: `.env.production`
   - **First exposure**: Commit `43334589` (Sept 25, 2025)
   - **Latest exposure**: Commit `7cecc248` (Sept 29, 2025)
   - **Token expiration**: October 5, 2025 (based on JWT `exp` claim: 1759740336)
   - **Scope**: Development environment access to `july25-client` project
   - **Status**: Token likely expired, but still requires revocation

2. **Supabase Anon Key** (LOW RISK)
   - **Assessment**: Public anon keys are designed to be client-facing
   - **Mitigation**: No action required (RLS policies provide protection)

## Git History Analysis

### Affected Commits

```bash
7cecc248 - chore: sync local changes (Sept 29, 2025)
305647a7 - chore: sync local changes (Sept 29, 2025)
43334589 - docs: major documentation cleanup and consolidation (Sept 25, 2025)
2b6ac6c2 - docs: major documentation cleanup and consolidation (Sept 25, 2025)
```

### Search Pattern
```bash
git log --all --full-history -S "VERCEL_OIDC_TOKEN" --source --all
```

## Current Status

✅ **Good News**:
- `.env.production` is currently in `.gitignore` (line 33)
- File is NOT currently tracked by git (`git ls-files` returns empty)
- Token has likely expired (exp: Oct 5, 2025)

🔴 **Action Required**:
- Token remains in git history (accessible via `git log`)
- Repository may have been pushed to remote origins
- Any collaborator with repo access has historical access

## Remediation Plan

### Phase 1: Immediate Actions (Next 2 hours)

#### 1. Revoke Vercel OIDC Token
```bash
# Access Vercel dashboard
# Navigate to: Settings > Tokens > Vercel CLI
# Revoke all tokens for mikeyoung304-gmailcoms-projects
```

**Verification**:
```bash
vercel whoami  # Should fail with current token
```

#### 2. Document Exposure Window
- [x] Identify all commits containing credentials
- [x] Calculate exposure duration (Sept 25 - Nov 10 = 46 days)
- [ ] Review access logs for suspicious activity

#### 3. Audit for Other Exposures
```bash
# Search for other potential secrets
git log --all --full-history -S "SECRET" --source --all
git log --all --full-history -S "KEY" --source --all
git log --all --full-history -S "TOKEN" --source --all
```

### Phase 2: Git History Cleanup (Next 8 hours)

⚠️ **WARNING**: Rewriting git history is destructive and requires coordination with all team members.

#### Option A: git-filter-repo (Recommended)
```bash
# Install git-filter-repo
pip3 install git-filter-repo

# Create backup
git clone --mirror . ../rebuild-6.0-backup

# Remove sensitive file from history
git filter-repo --invert-paths --path .env.production --force

# Force push to all remotes (requires team coordination)
git push origin --force --all
git push origin --force --tags
```

#### Option B: BFG Repo-Cleaner (Alternative)
```bash
# Install BFG
brew install bfg

# Create backup
git clone --mirror . ../rebuild-6.0-backup.git

# Remove sensitive file
bfg --delete-files .env.production ../rebuild-6.0-backup.git

# Clean up
cd ../rebuild-6.0-backup.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force
```

#### Option C: Rotate and Document (Safest)
If the token has expired and there's no evidence of compromise:
1. Revoke the token
2. Document the incident
3. Monitor for suspicious activity
4. Do NOT rewrite history (preserves collaboration simplicity)

**Recommendation**: Use Option C since token has expired.

### Phase 3: Enhanced Validation (Next 24 hours)

#### 1. Improve Startup Validation

**File**: `server/src/config/environment.ts`

Current gaps:
- No validation for Square credentials
- Dangerous fallback to empty JWT secret in `getConfig()`
- No fail-fast for auth secrets (PIN_PEPPER, etc.)

Required improvements:
```typescript
// Add to validateEnvironment()
if (!env.SQUARE_ACCESS_TOKEN) {
  throw new Error('SQUARE_ACCESS_TOKEN is required for payment processing');
}

if (!env.PIN_PEPPER || !env.DEVICE_FINGERPRINT_SALT) {
  throw new Error('Authentication secrets (PIN_PEPPER, DEVICE_FINGERPRINT_SALT) are required');
}

// Remove dangerous fallback in getConfig()
jwtSecret: env.SUPABASE_JWT_SECRET,  // No fallback to empty string
```

#### 2. Add Pre-commit Hooks

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env bash

# Prevent committing .env files
if git diff --cached --name-only | grep -E "^\.env(\.|$)"; then
  echo "🚨 ERROR: Attempting to commit .env file(s)"
  echo "Blocked files:"
  git diff --cached --name-only | grep -E "^\.env(\.|$)"
  exit 1
fi

# Check for hardcoded secrets (basic pattern matching)
if git diff --cached -U0 | grep -iE "(api[_-]?key|secret[_-]?key|password|token)" | grep -vE "^[+-]\s*//"; then
  echo "⚠️  WARNING: Potential secrets detected in staged changes"
  echo "Review carefully before committing"
  # Don't block, just warn
fi
```

#### 3. Add Secret Scanning

Install and configure GitHub secret scanning (if using GitHub):
- Enable Dependabot alerts
- Configure custom secret patterns
- Set up security advisories

## Prevention Strategy

### 1. Policy Updates

**New Rules**:
- ❌ NEVER commit files matching `.env*` patterns
- ❌ NEVER commit files containing `SECRET`, `KEY`, `TOKEN` in variable names
- ✅ ALWAYS use environment variable injection (Vercel, render.com, etc.)
- ✅ ALWAYS validate environment on startup
- ✅ ALWAYS use pre-commit hooks to block secrets

### 2. Development Practices

**Environment Variable Management**:
```bash
# Local development
cp .env.example .env
# Edit .env with local credentials (NEVER commit)

# Production deployment
# Use Vercel dashboard or `vercel env` CLI
vercel env add SUPABASE_JWT_SECRET production
```

**Git Configuration**:
```bash
# Add to .gitignore (already present)
.env
.env.*
!.env.example

# Verify before commit
git status --ignored
```

### 3. Monitoring

**Set up alerts for**:
- Vercel token usage from unexpected IPs
- Supabase auth attempts from unexpected regions
- Database connection attempts outside Vercel infrastructure
- Unusual API usage patterns

## Testing Verification

### Environment Validation Test

**File**: `server/tests/config/environment.test.ts` (create)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from '../../src/config/environment';

describe('Environment Validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should throw if SUPABASE_JWT_SECRET is missing', () => {
    delete process.env.SUPABASE_JWT_SECRET;
    expect(() => validateEnvironment()).toThrow('SUPABASE_JWT_SECRET is required');
  });

  it('should throw if SQUARE_ACCESS_TOKEN is missing', () => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    expect(() => validateEnvironment()).toThrow('SQUARE_ACCESS_TOKEN is required');
  });

  it('should throw if JWT_SECRET is too short', () => {
    process.env.SUPABASE_JWT_SECRET = 'short';
    expect(() => validateEnvironment()).toThrow('too short');
  });
});
```

## Incident Timeline

| Date | Event |
|------|-------|
| 2025-09-25 | First credential commit (43334589) |
| 2025-09-29 | Latest credential commit (7cecc248) |
| 2025-10-05 | Vercel OIDC token expired (based on JWT exp) |
| 2025-11-10 | Issue discovered during security audit |
| 2025-11-10 | Incident response initiated |

## Lessons Learned

1. **Gap**: `.gitignore` was present but credentials were committed anyway
   - **Fix**: Add pre-commit hooks to actively block

2. **Gap**: No automated secret scanning in CI/CD
   - **Fix**: Enable GitHub secret scanning or equivalent

3. **Gap**: Environment validation incomplete
   - **Fix**: Comprehensive startup validation for all secrets

4. **Gap**: No monitoring for credential usage
   - **Fix**: Set up alerts for unusual access patterns

## Sign-off

**Incident Status**: 🟡 In Progress
**Next Review**: After Phase 1 completion (2 hours)
**Responsible**: Technical Lead
**Reviewed By**: (Pending founder approval)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-10
**Classification**: Internal - Security Incident
