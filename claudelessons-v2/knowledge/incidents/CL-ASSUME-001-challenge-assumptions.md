# CL-ASSUME-001: Challenge Assumptions First

## Pattern
Assuming error messages are accurate leads to wrong fixes.

## What Happened
**Assumption**: "Cannot find declaration file" = missing @types package
**Reality**: TypeScript couldn't compile because of browser code, threw misleading error

## The Test
```bash
# Before assuming, TEST the assumption
echo "ASSUMPTION: Missing @types/cookie-parser"
npm ls @types/cookie-parser  # Already installed!
echo "ASSUMPTION WRONG"

# Now find REAL error
npm run build 2>&1 | grep -E "TS[0-9]+:" | head -5
# Shows: Cannot find namespace 'React'
```

## Framework
```javascript
function challengeAssumption(assumption) {
  const test = {
    claim: assumption,
    verification: getVerificationCommand(assumption),
    expected: getPredictedResult(),
    actual: runCommand(),
    conclusion: expected === actual ? 'VALID' : 'INVALID'
  };

  if (test.conclusion === 'INVALID') {
    return investigateDeeper();
  }
}
```

## Detection Script
```bash
#!/bin/bash
# detect-assumptions.sh
grep -n "I think\|probably\|should\|might\|assume" *.md | wc -l
# If > 3, stop and test assumptions
```

## Cost: 10 days on JWT bug, 105 minutes on build failure