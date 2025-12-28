# TODO-233: Missing Environment Variable Documentation

**Priority:** P2 (Important - DevOps)
**Category:** Documentation
**Source:** Code Review - DevOps Harmony Agent (2025-12-27)
**Commit:** 66773b6d (fix: resolve TODO items from enterprise audit review)

## Problem Statement

Three new environment variables were added but are not documented in `.env.example`:
- `ENABLE_SEMANTIC_SEARCH`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_EMBEDDING_DIMENSIONS`

This makes it difficult for developers and operators to know these options exist.

## Findings

### Evidence

```bash
grep -E "ENABLE_SEMANTIC_SEARCH|OPENAI_EMBEDDING" .env.example
# Returns: nothing
```

### Variables Added

| Variable | Default | Location | In Schema |
|----------|---------|----------|-----------|
| `ENABLE_SEMANTIC_SEARCH` | `false` | env.schema.ts | Yes |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | environment.ts | No |
| `OPENAI_EMBEDDING_DIMENSIONS` | `1536` | environment.ts | No |

## Proposed Solutions

### Option 1: Update .env.example + Schema
- Add all three to `.env.example` with documentation
- Add `OPENAI_EMBEDDING_*` to Zod schema for validation
- **Pros:** Complete documentation, validated at startup
- **Cons:** Minor effort
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Option 1** - Add documentation and schema validation.

## Technical Details

**Files to Update:**
- `.env.example`
- `server/src/config/env.schema.ts`

**Suggested .env.example Addition:**
```bash
# === SEMANTIC SEARCH (TIER 3 - OPTIONAL) ===
# Enable vector similarity search for menu items
ENABLE_SEMANTIC_SEARCH=false

# OpenAI embedding model (default: text-embedding-3-small)
# Options: text-embedding-3-small, text-embedding-3-large
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Embedding dimensions (must match database vector column)
# text-embedding-3-small supports up to 1536
OPENAI_EMBEDDING_DIMENSIONS=1536
```

## Acceptance Criteria

- [ ] All three env vars documented in `.env.example`
- [ ] `OPENAI_EMBEDDING_MODEL` added to Zod schema (optional string)
- [ ] `OPENAI_EMBEDDING_DIMENSIONS` added to Zod schema (optional number)
- [ ] CLAUDE.md "Environment Variables" section updated

## Work Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-27 | Created from code review | Identified by DevOps agent |
| 2025-12-27 | Triage: APPROVED | Status: pending → ready |

## Resources

- Related: #222 (configurable embedding model)
