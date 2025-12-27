# TODO-237: HNSW Index Migration May Skip if IVFFlat Exists

**Priority:** P3 (Nice-to-Have - Database)
**Category:** Database / Migration
**Source:** Code Review - Data Integrity Agent (2025-12-27)
**Commit:** 66773b6d (fix: resolve TODO items from enterprise audit review)

## Problem Statement

The migration uses `CREATE INDEX IF NOT EXISTS` with the same index name (`idx_menu_items_embedding`) as the previous IVFFlat migration. If IVFFlat was already deployed to production, the HNSW migration will silently skip.

## Findings

### Evidence

```sql
-- Previous migration created IVFFlat
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
ON menu_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- New migration tries HNSW with same name
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
ON menu_items USING hnsw (embedding vector_cosine_ops);
```

### Impact

- If IVFFlat exists, HNSW won't be created
- Production continues using suboptimal index type
- No error raised (silent skip)

## Proposed Solutions

### Option 1: Check and Report
- Before deploying, check if IVFFlat index exists
- If so, manually drop and recreate
- **Pros:** Safe, explicit
- **Cons:** Manual step
- **Effort:** Small
- **Risk:** Low

### Option 2: New Migration with DROP
- Create migration that drops old index first
- Then creates HNSW index
- **Pros:** Automated
- **Cons:** Brief period without index
- **Effort:** Small
- **Risk:** Low-Medium

## Recommended Action

**Option 1** - Check production before deployment. If IVFFlat exists, create a cleanup migration.

## Technical Details

**Verification Query:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_menu_items_embedding';
```

**If IVFFlat found:**
```sql
-- Create new migration: 20251228_fix_hnsw_index.sql
DROP INDEX IF EXISTS idx_menu_items_embedding;
CREATE INDEX idx_menu_items_embedding
ON menu_items USING hnsw (embedding vector_cosine_ops);
```

## Acceptance Criteria

- [ ] Verify current index type in production
- [ ] If IVFFlat, create cleanup migration
- [ ] Confirm HNSW index is active after deployment

## Work Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-27 | Created from code review | Identified by Data Integrity agent |
| 2025-12-27 | Triage: APPROVED | Status: pending → ready |

## Resources

- Related: #218 (IVFFlat to HNSW switch)
