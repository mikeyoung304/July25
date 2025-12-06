---
status: complete
priority: p2
issue_id: "194"
tags: [ci-cd, github-actions, security, code-review]
dependencies: ["189"]
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# Third-Party GitHub Actions Not Pinned to SHA

## Problem Statement

GitHub Actions in `.github/workflows/e2e-tests.yml` use version tags instead of commit SHAs, which is a security vulnerability allowing supply chain attacks if upstream actions are compromised.

## Findings

### Security Agent Discovery

**Current Usage:**
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-artifact@v4
```

**Security Risk:**
- Tag `@v4` can be moved to point to different commits
- Compromised maintainer could inject malicious code
- SLSA supply chain compliance requires SHA pinning

## Proposed Solution

**Effort:** 30 minutes | **Risk:** Low

Pin all actions to specific commit SHAs:

```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
- uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
```

**Get current SHAs:**
```bash
gh api repos/actions/checkout/commits/v4 --jq '.sha'
gh api repos/actions/setup-node/commits/v4 --jq '.sha'
gh api repos/actions/upload-artifact/commits/v4 --jq '.sha'
```

## Technical Details

**Affected Files:**
- `.github/workflows/e2e-tests.yml`
- Any other workflow files using third-party actions

## Acceptance Criteria

- [x] All GitHub Actions pinned to full commit SHAs
- [x] Version comment added next to each SHA for readability
- [x] Dependabot configured to update action SHAs

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |
| 2025-12-05 | Completed | Pinned 17 workflow files, added dependabot.yml |

## Resources

- Security agent findings
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
