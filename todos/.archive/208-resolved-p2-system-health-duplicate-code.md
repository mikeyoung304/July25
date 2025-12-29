# TODO: Duplicate npm Audit Parsing in system-health.js

**Priority:** P2 - Important
**Category:** Code Quality
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, code-quality, scripts

## Problem Statement

The npm audit JSON parsing logic is duplicated verbatim between lines 103-116 and lines 127-140 in `system-health.js`. This creates maintenance burden and risk of drift.

## Findings

### From Simplicity Review Agent:
- **File:** `scripts/system-health.js:97-143`
- Same parsing block appears twice
- Root cause: npm audit exits non-zero when vulnerabilities exist
- Outer try handles success, catch retries with `|| true`

### Duplicated Code:
```javascript
// Appears at lines 103-116 AND 127-140
let vulnCount = 0;
if (auditData.metadata && auditData.metadata.vulnerabilities) {
  vulnCount = auditData.metadata.vulnerabilities.total || 0;
} else if (auditData.vulnerabilities) {
  vulnCount = Object.keys(auditData.vulnerabilities).length;
}

if (vulnCount === 0) {
  console.log('Security: No known vulnerabilities');
} else {
  console.log(`Security: ${vulnCount} vulnerabilities - run npm audit for details`);
}
```

## Proposed Solutions

### Option A: Single Try with || true (Recommended)
**Pros:** Simplest, removes ~15 lines
**Cons:** None
**Effort:** Small
**Risk:** Low

```javascript
try {
  // Use || true to always get JSON output (npm audit exits non-zero on vulns)
  const auditResult = execSync('npm audit --json 2>&1 || true', {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true
  });
  const auditData = JSON.parse(auditResult);

  let vulnCount = 0;
  if (auditData.metadata && auditData.metadata.vulnerabilities) {
    vulnCount = auditData.metadata.vulnerabilities.total || 0;
  } else if (auditData.vulnerabilities) {
    vulnCount = Object.keys(auditData.vulnerabilities).length;
  }

  console.log(vulnCount === 0
    ? 'Security: No known vulnerabilities'
    : `Security: ${vulnCount} vulnerabilities - run npm audit for details`);
} catch {
  console.log('Security: Could not check (run npm audit manually)');
}
```

### Option B: Extract Helper Function
**Pros:** Reusable, clear intent
**Cons:** More code for single use
**Effort:** Small
**Risk:** Low

## Technical Details

**Affected Files:**
- `scripts/system-health.js` (lines 97-143)

## Acceptance Criteria

- [ ] Duplicate code removed
- [ ] `npm run health` still works correctly
- [ ] Handles both success and failure cases

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | npm audit always exits non-zero with vulns |

## Resources

- npm audit documentation
