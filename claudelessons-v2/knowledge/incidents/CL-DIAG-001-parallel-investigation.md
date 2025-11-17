# CL-DIAG-001: Parallel Investigation Protocol

## Pattern
Serial debugging wastes time. Deploy parallel investigations.

## What Happened (Nov 16, 2025)
- Spent 105 minutes trying fixes one-by-one
- Should have launched 3 parallel checks immediately:
  1. Clean build reproduction
  2. Error pattern history
  3. Environment differences

## The Fix
```bash
# Launch simultaneously, not sequentially
tmux new-session -d -s diag1 'rm -rf node_modules && npm ci && npm run build'
tmux new-session -d -s diag2 'grep -r "Cannot find" claudelessons-v2/'
tmux new-session -d -s diag3 'git log --grep="build" --oneline'
```

## Prevention
```javascript
// .claudelessons/parallel-diag.js
async function diagnose(error) {
  const investigations = [
    cleanBuildTest(),
    searchHistory(error),
    compareEnvironments(),
    checkAssumptions()
  ];

  const results = await Promise.all(investigations);
  return results.find(r => r.confidence > 0.8);
}
```

## Trigger: After 2 failed attempts OR 15 minutes

## Cost: This pattern alone cost $1,500 in wasted time