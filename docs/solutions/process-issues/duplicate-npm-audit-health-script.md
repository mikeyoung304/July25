---
title: "Duplicate npm Audit Parsing in system-health.js"
date_solved: 2025-12-24
category: process-issues
severity: P2
status: resolved
tags:
  - code-quality
  - scripts
  - npm
  - dry-principle
components:
  - scripts/system-health.js
related_todos:
  - "208"
commit: daa27568
---

# Duplicate npm Audit Parsing in system-health.js

## Problem Summary

The npm audit JSON parsing logic was duplicated verbatim (lines 103-116 AND 127-140), creating 48 lines of code that could be 24 lines.

**Symptoms:**
- Same parsing block appears twice
- Maintenance burden: any fix must be applied twice
- Risk of drift: lines may diverge over time

## Root Cause

`npm audit` exits with non-zero status when vulnerabilities are found (this is by design, not an error). The original implementation:

```javascript
// BEFORE: Misunderstood npm audit exit codes
try {
  const auditResult = execSync('npm audit --json 2>/dev/null', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const auditData = JSON.parse(auditResult);
  // ... parsing logic (14 lines)
} catch {
  // npm audit exits with non-zero when vulnerabilities exist
  try {
    const auditResult = execSync('npm audit --json 2>&1 || true', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    const auditData = JSON.parse(auditResult);
    // ... IDENTICAL parsing logic (14 lines)
  } catch {
    console.log('Security: Could not check');
  }
}
```

The developer assumed non-zero exit = error, leading to duplicated handling in the catch block.

## Solution

Use `|| true` from the start so a single try block handles both cases:

```javascript
// AFTER: Understand tool semantics, single code path
try {
  // npm audit exits non-zero on vulnerabilities, so use || true
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

## Tool Exit Code Reference

| Command | Exit 0 | Exit 1 | Exit 2+ |
|---------|--------|--------|---------|
| `npm audit` | No vulnerabilities | Vulnerabilities found | Error |
| `grep` | Match found | No match | Error |
| `git diff` | No changes | Changes found | Error |
| `test` / `[` | Condition true | Condition false | Error |

## Prevention Checklist

When handling shell commands with `execSync`:

- [ ] Research the tool's exit code semantics first
- [ ] Document expected non-zero exits in comments
- [ ] Use `|| true` for commands where non-zero is expected/valid
- [ ] Use `shell: true` when using shell operators (`||`, `&&`, `|`)
- [ ] Write parsing logic once, not in both try and catch
- [ ] Use `2>&1` to capture both stdout and stderr

## Impact

- **Lines changed:** 48 → 24 (50% reduction)
- **Risk:** Low (no functional changes)
- **Benefit:** Single source of truth for parsing logic

## Related Documentation

- [TODO #208](../../todos/archive/208-resolved-p2-system-health-duplicate-code.md) - Original issue
- [CL-BUILD-003: xargs Empty Input](/.claude/lessons/CL-BUILD-003-xargs-empty-input.md) - Similar shell command semantics issue
