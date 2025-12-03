---
status: resolved
priority: p3
issue_id: "101"
tags: [simplification, dead-code, cleanup]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-simplicity-agent
resolution: already-fixed
resolved_by: PR #150
---

# P3: Remove Unused RequestBatcher

## Problem

`RequestBatcher` is instantiated but never used:

```typescript
// client/src/services/http/httpClient.ts:58
private batcher: RequestBatcher;

// Constructor initializes it:
this.batcher = new RequestBatcher({
  maxBatchSize: 10,
  maxWaitTime: 50,
  batchEndpoint: '/api/v1/batch'
});

// But it's never called anywhere in the class
```

## Investigation Required

1. Check if `/api/v1/batch` endpoint exists on server
2. Check if `RequestBatcher` is used elsewhere
3. Determine if this was planned feature or abandoned code

## Recommended Action

If unused:
```typescript
// Remove from class
// private batcher: RequestBatcher;  // DELETE

// Remove from constructor
// this.batcher = new RequestBatcher({ ... });  // DELETE
```

If planned for future:
- Add TODO comment explaining intent
- Or remove and re-add when needed (YAGNI)

## Files to Check

- `server/src/routes/` - Look for batch endpoint
- `client/src/services/http/RequestBatcher.ts` - Check if exported/used elsewhere

## Impact

- Remove unused dependency initialization
- Reduce memory footprint
- Cleaner codebase

## References

- YAGNI principle
- Related: TODO 100 (cache simplification)

## Resolution

This issue was already resolved in PR #150 (commit 8a68da8d, 2025-12-02).

The fix included:
1. Deleted the entire `RequestBatcher.ts` file (228 lines removed)
2. Removed the `private batcher: RequestBatcher` property from `HttpClient`
3. Removed the constructor initialization code
4. Removed the import statement

Investigation confirmed:
- No `/api/v1/batch` endpoint exists on the server (only `/api/v1/tables/batch` for table-specific operations)
- `RequestBatcher` was not used anywhere in the codebase
- This was abandoned code from an earlier planned feature

The current `httpClient.ts` is clean and does not contain any references to `RequestBatcher`.
