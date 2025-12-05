# Plan: ADR-001 Completion and Validation

## Context

Multi-agent research on December 4, 2025 revealed:
- ADR-001 (snake_case everywhere) IS the correct decision for our stack
- Supabase has no camelCase support (postgrest-js archived Oct 2025)
- Prisma has no global case transform (would conflict with ADR-010 remote-first)
- Major APIs (Stripe, Twitter, GitHub, OAuth2) use snake_case
- BUT: ADR-001 was written as an emergency fix with inaccurate claims
- AND: Implementation is incomplete (violations remain)

**Decision**: Keep ADR-001, but complete and validate it properly.

---

## Phase 1: Fix Existing Violations (TODO-165)

### 1.1 Revert Partial Changes Made Today

Files partially modified during this session need to be reverted:
- `shared/api-types.ts` - was being converted, revert to assess properly
- `server/src/mappers/menu.mapper.ts` - was being modified
- `server/src/middleware/responseTransform.ts` - was being modified
- `client/src/services/types/index.ts` - was being modified

### 1.2 Audit All Menu-Related Types

The TODO-165 violations are in menu types:
- `shared/api-types.ts` - Has camelCase ApiMenuItem
- `server/src/mappers/menu.mapper.ts` - Has transformation logic
- `client/src/services/menu/MenuService.ts` - Has transformMenuItem method

**Action**: These should use snake_case per ADR-001, matching the canonical
`shared/types/menu.types.ts` which already uses snake_case.

### 1.3 Audit Cart Mapper

Research found `server/src/mappers/cart.mapper.ts` actively transforms to camelCase.
This violates ADR-001.

---

## Phase 2: Remove Dead Code

### 2.1 responseTransform.ts

Currently disabled but still exists. Options:
- **Option A**: Delete entirely (clean)
- **Option B**: Keep but mark clearly as deprecated (safer rollback)

Recommendation: Option B - keep for now, add deprecation warning.

### 2.2 Unused Case Transform Utilities

Check if these are used anywhere:
- `server/src/utils/case.ts` - may be dead code
- `client/src/services/utils/caseTransform.ts` - research says unused in main flow

---

## Phase 3: Update ADR-001 Honestly

### 3.1 Add Errata Section

Acknowledge:
- "95% aligned" was aspirational, not measured
- Decision was an emergency fix (Oct 12, 2025)
- Implementation took 2+ months, not "2 hours"

### 3.2 Add Research Validation

Document the December 4, 2025 research findings:
- Supabase has no camelCase support
- Prisma global transform conflicts with ADR-010
- Industry precedent (Stripe, Twitter, GitHub use snake_case)

### 3.3 Update Status

Change from emergency fix to validated architectural decision.

---

## Phase 4: Create Enforcement

### 4.1 Add ESLint Rule (Optional)

Could add a custom ESLint rule to flag camelCase in type definitions.

### 4.2 Document in CLAUDE.md

Already documented, but ensure it's clear.

### 4.3 Update TODO Files

- Mark TODO-165 as complete after fixing violations
- Mark TODO-173 as complete (type consolidation becomes unnecessary if we use menu.types.ts)

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1 (Fix violations) | 2-3 hours | Medium |
| Phase 2 (Dead code) | 30 min | Low |
| Phase 3 (Update ADR) | 1 hour | None |
| Phase 4 (Enforcement) | 30 min | Low |
| **Total** | **4-5 hours** | **Low-Medium** |

---

## Files to Modify

### Delete (Dead Code Removal)
1. `shared/api-types.ts` - DELETE (redundant with menu.types.ts)
2. `server/src/middleware/responseTransform.ts` - DELETE (disabled dead code)
3. `server/src/utils/case.ts` - DELETE if unused after above removals

### Modify (Fix Violations)
4. `shared/index.ts` - Remove api-types exports, use menu.types.ts
5. `server/src/mappers/menu.mapper.ts` - Simplify to pass-through (no transforms)
6. `server/src/mappers/cart.mapper.ts` - Remove camelCase transformations
7. `server/src/services/menu.service.ts` - Import from menu.types.ts
8. `client/src/services/types/index.ts` - Import from menu.types.ts
9. `client/src/services/menu/MenuService.ts` - Remove transformMenuItem, use snake_case
10. `client/src/components/shared/MenuItemGrid.tsx` - Use snake_case fields
11. `client/src/pages/components/ServerMenuGrid.tsx` - Use snake_case fields

### Update Documentation
12. `docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md` - Add errata + validation

### Update Status
13. `todos/165-pending-p1-snake-case-violation.md` - Mark complete
14. `todos/173-pending-p2-type-system-redundancy.md` - Mark complete

---

## Implementation Order

1. **First**: Revert today's partial changes (git checkout on modified files)
2. **Second**: Delete dead code files (api-types.ts, responseTransform.ts)
3. **Third**: Update shared/index.ts exports
4. **Fourth**: Update server-side code (mappers, services)
5. **Fifth**: Update client-side code (types, services, components)
6. **Sixth**: Run tests, fix any failures
7. **Seventh**: Update ADR-001 with research findings
8. **Eighth**: Mark TODOs complete

---

## Success Criteria

- [ ] `shared/api-types.ts` deleted
- [ ] `server/src/middleware/responseTransform.ts` deleted
- [ ] All menu types use snake_case from `shared/types/menu.types.ts`
- [ ] No transformation logic in mappers (pass-through only)
- [ ] Client components use snake_case field access (is_available, category_id, etc.)
- [ ] ADR-001 updated with honest retrospective and research validation
- [ ] All tests pass
- [ ] TODO-165 and TODO-173 marked complete
