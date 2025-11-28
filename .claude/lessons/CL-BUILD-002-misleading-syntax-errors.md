# CL-BUILD-002: Misleading TypeScript Syntax Errors

**Severity:** P1 | **Cost:** 30 min | **Duration:** 1 hour | **Detection:** Cryptic error location

## Problem

TypeScript/esbuild reports "Expected ';'" on a perfectly valid method declaration. The actual error is BEFORE that line - a mismatched brace that prematurely closes the class.

## Bug Pattern

```typescript
// Line 884 - if block opens
if (entry.role === 'user') {
  // ... code ...

    // Line 897 - nested if with WRONG indentation
    if (event.item_id === this.currentUserItemId) {
      // ... code ...
    }
  }  // Line 909 - EXTRA BRACE closes class!
}

// Line 917 - ERROR REPORTED HERE (but code is valid)
private handleResponseCreated(): void {
//      ^ "Expected ';' but found 'handleResponseCreated'"
```

## Fix Pattern

```typescript
if (entry.role === 'user') {
  // ... code ...

  // Correct indentation
  if (event.item_id === this.currentUserItemId) {
    // ... code ...
  }
}  // Single closing brace

private handleResponseCreated(): void {
  // Now valid - class structure intact
}
```

## Prevention Checklist

- [ ] Run `vercel build` locally before pushing
- [ ] When error points to valid code, search BACKWARDS for mismatched braces
- [ ] Use editor bracket matching/colorization
- [ ] Check indentation consistency in nested blocks

## Detection

- "Expected ';'" on method/function declaration
- Error line looks syntactically correct
- Build works with `tsc --noEmit` but fails with esbuild/vite
- Unusual indentation in lines before the error

## Key Insight

**The error location is WHERE the parser gave up, not WHERE the bug is.** Always search backwards from cryptic syntax errors.
