---
title: TypeScript Mismatched Braces Causing Cryptic Vercel Build Failure
category: build-errors
tags: [typescript, syntax-error, vercel, voice-ordering, indentation, build-failure]
severity: critical
component: VoiceEventHandler
file_path: client/src/modules/voice/services/VoiceEventHandler.ts
date_solved: 2025-11-28
symptoms:
  - Vercel production build failing with "Expected ';' but found 'handleResponseCreated'" error
  - TypeScript compilation error pointing to wrong line (method declaration, not actual issue)
  - Build succeeds locally with `npm run typecheck` but fails in Vercel
  - Cryptic error message doesn't indicate the actual problem (mismatched braces)
root_cause: Extra closing brace and incorrect indentation in handleTranscriptCompleted method causing malformed control flow structure
---

# TypeScript Mismatched Braces Causing Cryptic Vercel Build Failure

## Problem

Vercel production build failed with a misleading syntax error:

```
Expected ";" but found "handleResponseCreated"
917|    private handleResponseCreated(event: ResponseCreatedEvent, logPrefix: string): void {
       ^
```

The error pointed to line 917 (a valid method declaration), but the actual issue was 8 lines earlier - an extra closing brace that broke the class structure.

## Root Cause

In `VoiceEventHandler.ts`, the `handleTranscriptCompleted` method had:
1. **Incorrect indentation** on a nested `if` block (extra spaces)
2. **Extra closing brace** on line 909 that didn't match any opening brace

This caused the parser to think the class ended prematurely, making the next method declaration (`handleResponseCreated`) appear outside the class - hence the confusing "Expected ';'" error.

## Bug Pattern

```typescript
// BROKEN - Extra closing brace and wrong indentation
if (entry.role === 'user') {
  entry.text = validatedTranscript;
  entry.final = true;

  const finalTranscript: TranscriptEvent = { ... };
  this.emit('transcript', finalTranscript);

    // Wrong indentation (extra spaces)
    if (event.item_id === this.currentUserItemId) {
      this.sendEvent({ type: 'response.create', ... });
    }
  }  // <-- EXTRA BRACE - closes class prematurely!
}
```

## Fix Pattern

```typescript
// CORRECT - Proper indentation and brace matching
if (entry.role === 'user') {
  entry.text = validatedTranscript;
  entry.final = true;

  const finalTranscript: TranscriptEvent = { ... };
  this.emit('transcript', finalTranscript);

  // Correct indentation (2 spaces from parent)
  if (event.item_id === this.currentUserItemId) {
    this.sendEvent({ type: 'response.create', ... });
  }
}  // <-- Single closing brace for the if block
```

## Investigation Steps

1. **Vercel build failed** - Error message pointed to line 917
2. **Read line 917** - Code looked valid (method declaration)
3. **Realized error is misleading** - "Expected ';'" on a method = class structure broken
4. **Searched backwards** - Found extra `}` on line 909
5. **Verified with `vercel build`** - Local build confirmed the fix

## Key Insight

**When TypeScript says "Expected ';'" on a valid method declaration, the real error is BEFORE that line** - usually a mismatched brace that prematurely closes the class/object.

## Prevention

### 1. Use `vercel build` Locally
```bash
vercel pull --yes    # Get project settings
vercel build         # Build exactly as Vercel does
```

### 2. Editor Configuration
- Enable bracket pair colorization
- Use code folding to verify structure
- Configure auto-formatting (Prettier)

### 3. Pre-commit Verification
The project already has `npm run typecheck:quick` in pre-commit hooks, but esbuild (used by Vercel's vite) may catch issues that `tsc` misses.

### 4. Code Review Focus
When reviewing complex nested blocks:
- Count opening and closing braces
- Check indentation consistency
- Use IDE's "go to matching bracket" feature

## Detection Signals

- "Expected ';'" error on a valid method/function declaration
- Error line number doesn't match the actual problem
- Build works locally with `tsc` but fails in Vercel/esbuild
- The line before the error has unusual indentation

## Related

- [CL-BUILD-001: Vercel --production Flag Cascade](.claude/lessons/CL-BUILD-001-vercel-production-flag.md) - Other Vercel build issues
- Vercel builds from `main` branch by default - fixes on feature branches won't help until merged

## Commits

- `2ca04ab6` - fix(voice): correct brace indentation in voiceeventhandler (main)
- `d34bdb19` - Same fix on feat/pos-payment-workflow-mvp branch
