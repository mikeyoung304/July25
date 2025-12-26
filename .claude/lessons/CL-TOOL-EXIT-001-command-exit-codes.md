# CL-TOOL-EXIT-001: Understanding Command Exit Codes Before Error Handling

**Severity:** P2 | **Cost:** $1-2K | **Duration:** Ongoing until fixed | **Impact:** Code duplication, maintenance burden

## Problem

Misunderstanding how tools report success/failure leads to incorrect error handling patterns. Common tools like `npm audit`, `grep`, and deployment tools have specific exit code semantics that must be understood BEFORE writing error handling.

### Real Example from Codebase

```javascript
// BROKEN: Assumes npm audit exit code means error
try {
  const auditResult = execSync('npm audit --json 2>/dev/null', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const auditData = JSON.parse(auditResult);
  // ... process audit data ...

} catch {
  // Fallback that DUPLICATES the exact same logic
  try {
    const auditResult = execSync('npm audit --json 2>&1 || true', {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true
    });
    const auditData = JSON.parse(auditResult);
    // ... DUPLICATE parsing logic ...
  } catch {
    console.log('Could not check');
  }
}
```

**What happened:**
1. Developer assumes `npm audit` returns error code 0 on success
2. Actually: `npm audit` returns non-zero when vulnerabilities exist (this is not an error!)
3. First try/catch fails, falls back to identical code
4. Code duplication: 48 lines becomes 24 lines with proper understanding
5. Maintenance nightmare: fix exists in two places

## Exit Code Semantics

### Common Tool Exit Codes

```bash
# npm audit
# Exit 0: No vulnerabilities found
# Exit 1: Vulnerabilities found (NOT an error condition!)
npm audit --json  # Returns data even with exit 1

# grep
# Exit 0: Matches found
# Exit 1: No matches found (NOT an error, just no results)
# Exit 2: Actual error (file not found, permission denied, etc.)
grep pattern file.txt

# git
# Exit 0: Success
# Exit 1: Invalid usage, merge conflict, etc.
# Exit 128: Fatal error (bad repository, permission denied)
git status  # Always 0
git merge conflicted-branch  # 1 on conflict (not a failure!)

# curl
# Exit 0: Success (even if HTTP 404)
# Exit 6: Couldn't resolve host
# Exit 7: Failed to connect
# Exit 28: Operation timeout
curl https://example.com  # 0 even if site returns 500

# node/npm scripts
# Exit 0: Success
# Exit 1: Generic error
# Exit code > 1: Specific error code
npm test  # Non-zero if tests fail
```

## Bug Pattern

```javascript
// PATTERN 1: Assume non-zero exit = error
try {
  // Tool that returns non-zero for "normal" failure states
  const result = execSync('npm audit --json', { encoding: 'utf8' });
  process.stdout.write(result);
} catch (error) {
  // This catches the normal "vulnerabilities found" case!
  console.log('Audit failed:', error.message);
}

// PATTERN 2: Ignore stderr output, miss actual errors
try {
  const result = execSync('command 2>/dev/null', { encoding: 'utf8' });
  // If command failed silently, we won't know
} catch {
  // Never reached because stderr was discarded
}

// PATTERN 3: Code duplication to handle exit code inconsistency
try {
  const r1 = execSync('npm audit --json 2>/dev/null', { ... });
} catch {
  // Exact same code, just different shell settings
  const r2 = execSync('npm audit --json 2>&1 || true', { shell: true });
  // Now we have identical logic in two places
}

// PATTERN 4: Not checking exit code when we should
const result = execSync('curl https://api.example.com/data', {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'ignore']  // Ignoring stderr!
});
// If curl failed with exit code, we don't see it

// PATTERN 5: Misunderstanding grep exit codes
function findConsoleLog(files) {
  try {
    const result = execSync(`echo "${files}" | xargs grep 'console.log'`, {
      encoding: 'utf8'
    });
    return result.split('\n');  // Success: matches found
  } catch {
    return [];  // When actually: grep returned 1 because NO MATCHES (not error!)
  }
}
```

## Fix Pattern

### Step 1: Document Tool Behavior

```javascript
/**
 * npm audit returns non-zero when vulnerabilities exist
 * This is not an error condition - it's the normal "warning" state
 * We must handle non-zero exit codes without throwing
 */

// CORRECT: Use || true to ignore exit code, then parse output
const auditResult = execSync('npm audit --json 2>&1 || true', {
  cwd: ROOT,
  encoding: 'utf8',
  shell: true  // Required for || true
});

const auditData = JSON.parse(auditResult);
const vulnCount = auditData.metadata?.vulnerabilities?.total || 0;

console.log(vulnCount === 0
  ? 'Security: No known vulnerabilities'
  : `Security: ${vulnCount} vulnerabilities - run npm audit for details`);
```

### Step 2: Handle exit codes explicitly

```javascript
// CORRECT: Check exit code and handle it appropriately
const { execSync } = require('child_process');

function runAudit() {
  try {
    const result = execSync('npm audit --json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    // Exit code 0: No vulnerabilities
    return JSON.parse(result);
  } catch (error) {
    if (error.status === 1) {
      // Exit 1 is EXPECTED when vulnerabilities exist
      // Parse the output anyway - it's still valid JSON
      try {
        return JSON.parse(error.stdout);
      } catch {
        throw new Error('Could not parse audit output');
      }
    } else if (error.status === 2) {
      // Exit 2 is actual error (command not found, etc.)
      throw new Error('npm audit command failed');
    }
    throw error;
  }
}
```

### Step 3: Use maxBuffer for large output

```javascript
// CORRECT: Handle large JSON output from commands
const auditResult = execSync('npm audit --json 2>&1 || true', {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,  // 1MB buffer instead of 200KB default
  stdio: 'pipe',
  shell: true
});

// Also works for grep on large codebases
const matches = execSync('grep -r "console.log" . 2>/dev/null || true', {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,  // 10MB for large results
  cwd: srcDir
});
```

### Step 4: Distinguish between exit codes

```javascript
// CORRECT: Handle grep exit codes properly
/**
 * grep exit codes:
 * 0: Matches found (success)
 * 1: No matches (not an error!)
 * 2: File not found or read error (actual error)
 */

function findPattern(pattern, files) {
  try {
    const result = execSync(
      `grep -l "${pattern}" ${files.join(' ')} 2>/dev/null || true`,
      { encoding: 'utf8', shell: true }
    );
    return result.split('\n').filter(Boolean);  // Empty result = no matches
  } catch (error) {
    if (error.status === 2) {
      throw new Error('grep error (file not found, permission denied)');
    }
    throw error;
  }
}
```

### Step 5: Document in comments

```javascript
/**
 * Check npm vulnerabilities with proper exit code handling
 *
 * IMPORTANT: npm audit exits with code 1 when vulnerabilities exist.
 * This is EXPECTED behavior, not an error. The JSON output is still valid.
 *
 * We use `|| true` to ensure script continues even if vulnerabilities exist.
 */
function checkSecurity() {
  try {
    // || true prevents non-zero exit code from throwing
    const auditResult = execSync('npm audit --json 2>&1 || true', {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true
    });

    const auditData = JSON.parse(auditResult);

    // Process vulnerability count
    let vulnCount = 0;
    if (auditData.metadata?.vulnerabilities) {
      vulnCount = auditData.metadata.vulnerabilities.total || 0;
    } else if (auditData.vulnerabilities) {
      vulnCount = Object.keys(auditData.vulnerabilities).length;
    }

    // Single log line, no duplication
    console.log(vulnCount === 0
      ? 'Security: No known vulnerabilities'
      : `Security: ${vulnCount} vulnerabilities - run npm audit for details`);

  } catch (error) {
    // This catch is for ACTUAL errors (parsing failure, command not found)
    console.log('Security: Could not check (run npm audit manually)');
  }
}
```

## Prevention Checklist

### Before Writing Error Handling

- [ ] Read the tool's documentation for exit code semantics
- [ ] Check if non-zero exit means error or just different output state
- [ ] List out all possible exit codes: 0 (success), 1 (warning), 2+ (error)
- [ ] Test the tool with both success and "failure" states
- [ ] Verify that output is still valid even with non-zero exit code

### For Tool Integration

- [ ] Document the expected exit codes in a comment
- [ ] Use `|| true` to prevent throwing on expected non-zero exits
- [ ] Only handle actual errors in catch block
- [ ] Set `maxBuffer` if output could be large
- [ ] Use `shell: true` if using shell operators like `||`, `&&`, pipes

### Code Review Checklist

- [ ] No duplicated error handling blocks
- [ ] Exit code expectations documented
- [ ] Output parsed in single place (not in try and catch)
- [ ] Distinguish between "no results" and "error"
- [ ] All exit codes from 0-255 are considered

## Common Exit Code Patterns

### npm audit Pattern

```javascript
// BEFORE: Duplicated logic
let vulnCount = 0;
try {
  const r1 = execSync('npm audit --json 2>/dev/null', { ... });
  vulnCount = parseAudit(r1);
} catch {
  const r2 = execSync('npm audit --json 2>&1 || true', { shell: true });
  vulnCount = parseAudit(r2);  // DUPLICATE!
}

// AFTER: Single path
const auditResult = execSync('npm audit --json 2>&1 || true', {
  shell: true,
  encoding: 'utf8'
});
const vulnCount = parseAudit(auditResult);
```

### grep Pattern

```javascript
// BEFORE: Confusing exit codes
const result = execSync('grep pattern file.txt');  // Throws if no match

// AFTER: Handle properly
const result = execSync('grep pattern file.txt 2>/dev/null || true', {
  encoding: 'utf8',
  shell: true
});
const hasMatch = result.trim().length > 0;  // Check output, not exit code
```

### curl/HTTP Pattern

```javascript
// BEFORE: Ignores actual errors
const data = execSync('curl https://api.example.com/data 2>/dev/null');

// AFTER: Check for connection errors
const data = execSync('curl -f https://api.example.com/data 2>&1 || true', {
  encoding: 'utf8',
  shell: true,
  maxBuffer: 10 * 1024 * 1024
});
```

## Testing Exit Code Handling

```javascript
describe('command exit code handling', () => {
  it('should handle npm audit with vulnerabilities', () => {
    // npm audit exits 1 when vulnerabilities exist
    const mockExecSync = vi.fn()
      .mockReturnValue(JSON.stringify({
        metadata: { vulnerabilities: { total: 3 } }
      }));

    const result = checkSecurity(mockExecSync);

    expect(result).toContain('3 vulnerabilities');
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('|| true'),  // Must use || true
      expect.objectContaining({ shell: true })
    );
  });

  it('should handle grep with no matches', () => {
    // grep returns 1 when no matches found (not an error)
    const mockExecSync = vi.fn()
      .mockReturnValue('');  // Empty output

    const result = findPattern('missing-pattern', ['file.txt'], mockExecSync);

    expect(result).toEqual([]);  // No results, not an error
    expect(result).not.toThrow();
  });

  it('should handle actual command errors', () => {
    // grep returns 2 when file not found (actual error)
    const error = new Error('Command failed');
    error.status = 2;
    error.stdout = '';
    const mockExecSync = vi.fn().mockThrow(error);

    expect(() => findPattern('pattern', ['nonexistent.txt'], mockExecSync))
      .toThrow('grep error');
  });
});
```

## Real Impact from rebuild-6.0 Fix

**Before (Commit 022bd3fe):**
```javascript
// 48 lines of code
try {
  const auditResult = execSync('npm audit --json 2>/dev/null', { ... });
  // Process result
  if (vulnCount === 0) {
    console.log('No vulnerabilities');
  } else {
    console.log(`${vulnCount} vulnerabilities`);
  }
} catch {
  // EXACT SAME LOGIC REPEATED (27 lines)
  try {
    const auditResult = execSync('npm audit --json 2>&1 || true', { ... });
    // Process result (DUPLICATE)
    if (vulnCount === 0) {
      console.log('No vulnerabilities');  // DUPLICATE
    } else {
      console.log(`${vulnCount} vulnerabilities`);  // DUPLICATE
    }
  } catch {
    console.log('Could not check');
  }
}
```

**After (Commit daa27568):**
```javascript
// 24 lines of code (50% reduction)
try {
  const auditResult = execSync('npm audit --json 2>&1 || true', {
    shell: true,
    encoding: 'utf8'
  });
  const auditData = JSON.parse(auditResult);
  let vulnCount = 0;
  // ... parse vulnerabilities ...
  console.log(vulnCount === 0
    ? 'Security: No known vulnerabilities'
    : `Security: ${vulnCount} vulnerabilities`);
} catch {
  console.log('Security: Could not check');
}
```

## Reference: Tool Exit Codes

Create a reference document for your team:

```markdown
# Tool Exit Code Reference

## npm
- 0: Success
- 1: Vulnerabilities found (expected, data is valid)
- >1: Actual error (command not found, invalid syntax)

## grep
- 0: Matches found (success)
- 1: No matches (expected, not an error)
- 2: Error (file not found, permission denied)

## git
- 0: Success
- 1: Usage error or merge conflict
- 128: Fatal error (bad repository)

## curl
- 0: Success (even if HTTP 404)
- 6: Could not resolve host
- 7: Failed to connect to host
- 28: Operation timeout
- 35: SSL error

## node
- 0: Success
- 1: Generic error
- >1: Specific error code

## Lesson
- Exit code 0 = success
- Exit code 1 = often not an error (check docs!)
- Exit code 2+ = usually actual errors
- ALWAYS check documentation before assuming
```

## ESLint Rule

Create a rule to catch duplicated error handling:

```javascript
// Rule: no-duplicated-error-handling
// Warns when same operation appears in try and catch blocks
```

## Common Mistakes

```javascript
// MISTAKE 1: Assuming non-zero exit = error
if (exitCode !== 0) {
  throw new Error('Command failed');  // Wrong! Exit 1 is sometimes OK
}

// MISTAKE 2: Not documenting expected exit codes
try {
  const result = execSync('npm audit --json');  // Why does this fail?
} catch {
  // Developer looking at this has no idea why
}

// MISTAKE 3: Duplicating logic in try/catch
try {
  // Logic A
} catch {
  // Logic A again (same code)
}

// MISTAKE 4: Ignoring stderr when it contains useful output
execSync('command 2>/dev/null')  // Hides error messages

// MISTAKE 5: Not setting maxBuffer for commands with large output
execSync('grep -r "pattern" .')  // Crashes if output > 200KB
```

## Key Insight

**Before writing error handling for a command, research its exit code semantics.** Many tools use non-zero exits to indicate "warning" states that are normal and expected. Treating all non-zero exits as errors leads to incorrect error handling and code duplication.

The pattern is:
1. Read tool documentation
2. Understand all exit codes (0, 1, 2, ...)
3. Handle expected non-zero exits with `|| true`
4. Only trap actual errors in catch block
5. Single code path, no duplication

---

**Last Updated:** 2025-12-24
**Maintainer:** Architecture Team
**Status:** Active Prevention Pattern
**Related Issue:** #208
**Related Lesson:** CL-BUILD-003 (shell scripting patterns)
