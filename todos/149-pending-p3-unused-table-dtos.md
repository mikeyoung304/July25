---
status: pending
priority: p3
issue_id: "149"
tags: [code-review, dead-code, cleanup]
dependencies: []
created_date: 2025-12-02
source: workflows-review-commit-0728e1ee
---

# Unused DTO Interfaces in table.types.ts

## Problem Statement

`CreateTableDTO` and `UpdateTableDTO` interfaces are exported but never used. Server uses inline `CreateTableBody` interface instead.

## Findings

- `shared/types/table.types.ts` lines 53-82
- 0 usages found in codebase
- Server defines its own inline interface at `tables.routes.ts:65-74`

## Proposed Solutions

Either use the shared DTOs in the server, or remove them.

## Technical Details

### Affected Files
- `shared/types/table.types.ts` (lines 53-82)
- `server/src/routes/tables.routes.ts` (lines 65-74)

## Acceptance Criteria

- [ ] DTOs either used or removed
