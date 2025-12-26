# ORPHAN_REGISTER.md

**Generated**: 2025-12-26
**Agent**: B1 - Orphaned Code / Dead Paths / Unused Assets
**Codebase Version**: 6.0.14

This register identifies orphaned, dead, or unused code in the rebuild-6.0 codebase. Items are categorized by confidence level and deletion risk.

---

## HIGH CONFIDENCE ORPHANS (Safe to Delete)

### client/src/hooks/useSquareTerminal.refactored.ts
- **Type**: Dead file / duplicate refactored version
- **Confidence**: HIGH
- **Evidence**: Only referenced in docs/archive reports (PHASE_4_COMPLETION_REPORT.md). The main `useSquareTerminal.ts` exists and is actively used. This is a stale refactored copy that was never integrated.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/hooks/terminalStateMachine.ts
- **Type**: Orphaned state machine
- **Confidence**: HIGH
- **Evidence**: Only referenced in the refactored hook file above and documentation. Not imported by any active component or hook in the client/src directory.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/hooks/kiosk/useOrderSubmission.ts
- **Type**: Orphaned hook (superseded)
- **Confidence**: HIGH
- **Evidence**: Only self-referential (file defines itself). The project uses `useKioskOrderSubmission.ts` instead, which is actively imported by VoiceOrderingMode.tsx. This hook appears to be an earlier version that was never deleted.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/routes/LazyRoutes.tsx
- **Type**: Dead module / unused lazy route factory
- **Confidence**: HIGH
- **Evidence**: Not imported anywhere in client/src. The actual routing is handled by `client/src/components/layout/AppRoutes.tsx` which has its own lazy loading. This file was created but never integrated.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/components/shared/MenuItemGrid.example.tsx
- **Type**: Example/demo file
- **Confidence**: HIGH
- **Evidence**: Only referenced in documentation and README files. Not imported anywhere in production code. Example files should not be in production.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/contexts/UnifiedCartContext.refactored.tsx
- **Type**: Dead refactored copy
- **Confidence**: HIGH
- **Evidence**: Referenced only in UNFINISHED_REGISTER.md and archived reports. The main `UnifiedCartContext.tsx` is in active use. Refactored version was never integrated.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/components/shared/lists/VirtualizedOrderList.tsx
- **Type**: Unused component
- **Confidence**: HIGH
- **Evidence**: Only self-referential in the codebase. Never imported by any page, component, or module. Created for performance optimization but never utilized.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/hooks/useFocusManagement.ts
- **Type**: Unused hook
- **Confidence**: HIGH
- **Evidence**: Only self-referential. Never imported by any component. Created for accessibility but never integrated.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/hooks/useWebSocketConnection.ts
- **Type**: Unused hook
- **Confidence**: HIGH
- **Evidence**: Only self-referential. Never imported. WebSocket handling is done through `client/src/services/websocket/` services instead.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/public/logo-animation/
- **Type**: Unused static assets
- **Confidence**: HIGH
- **Evidence**: Directory not referenced anywhere in the codebase except its own files.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

---

## MEDIUM CONFIDENCE ORPHANS (Review Before Deletion)

### scripts/validate-square-credentials.sh
- **Type**: Orphaned script (legacy payment provider)
- **Confidence**: MEDIUM
- **Evidence**: Referenced in package.json (`validate:square`), but the codebase has migrated from Square to Stripe. All active payment code uses Stripe. However, script is still documented for backward compatibility.
- **Deletion Eligible**: NEEDS REVIEW
- **Risk if Deleted**: Low - would break `npm run validate:square` command but no production impact

### scripts/check-orders-kds.ts
- **Type**: Orphaned diagnostic script
- **Confidence**: MEDIUM
- **Evidence**: Not referenced in package.json or any documentation. One-off diagnostic script from development.
- **Deletion Eligible**: YES
- **Risk if Deleted**: Low

### scripts/check-schema.ts
- **Type**: Orphaned diagnostic script
- **Confidence**: MEDIUM
- **Evidence**: Not referenced in package.json. Similar functionality exists in `check-schema-drift.cjs`.
- **Deletion Eligible**: YES
- **Risk if Deleted**: Low

### scripts/check-db-schema.ts
- **Type**: Orphaned diagnostic script
- **Confidence**: MEDIUM
- **Evidence**: Only referenced in archived documentation. Not in package.json.
- **Deletion Eligible**: YES
- **Risk if Deleted**: Low

### scripts/diagnose-demo-auth.ts
- **Type**: Orphaned diagnostic script
- **Confidence**: MEDIUM
- **Evidence**: Not in package.json. Only referenced in archived reports.
- **Deletion Eligible**: YES
- **Risk if Deleted**: Low

### scripts/fix-kitchen-scopes.ts
- **Type**: One-time migration script
- **Confidence**: MEDIUM
- **Evidence**: One-time fix script. Only referenced in archived incident reports.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### scripts/test-kitchen-auth.ts
- **Type**: Orphaned test script
- **Confidence**: MEDIUM
- **Evidence**: Not referenced anywhere in the codebase. One-off testing script.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### scripts/verify_p0_db.sh / scripts/verify_p0_local.sh
- **Type**: One-time verification scripts
- **Confidence**: MEDIUM
- **Evidence**: Only referenced in archived audit documentation.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### scripts/verify_track_a_stabilization.sh / scripts/verify_schema_sync.sh
- **Type**: One-time verification scripts
- **Confidence**: MEDIUM
- **Evidence**: Only referenced in archived tracking documentation.
- **Deletion Eligible**: YES
- **Risk if Deleted**: None

### client/src/services/statistics/OrderStatisticsService.ts
- **Type**: Potentially unused service
- **Confidence**: MEDIUM
- **Evidence**: Exported from `services/index.ts` but only used internally within `useOrderHistory.ts` and test files. Not directly imported by any UI component for statistics display.
- **Deletion Eligible**: NEEDS REVIEW
- **Risk if Deleted**: Medium - could break statistics aggregation logic

### server/src/routes/terminal.routes.ts
- **Type**: Stub routes (not implemented)
- **Confidence**: MEDIUM
- **Evidence**: All endpoints return 501 "Not Implemented". These are placeholder routes for future Stripe Terminal hardware integration. File explicitly documents this.
- **Deletion Eligible**: NO (Intentional placeholder)
- **Risk if Deleted**: Low - but would break API contract for terminal endpoints

---

## LOW CONFIDENCE ORPHANS (Keep / Further Investigation Required)

### client/src/hooks/useVirtualization.ts
- **Type**: Potentially unused hook
- **Confidence**: LOW
- **Evidence**: Only used by `VirtualizedOrderList.tsx` which itself is unused. However, could be intended for future use.
- **Deletion Eligible**: YES (if VirtualizedOrderList deleted)
- **Risk if Deleted**: Low

### client/src/hooks/useIntersectionObserver.ts
- **Type**: Potentially underutilized hook
- **Confidence**: LOW
- **Evidence**: Used by `OptimizedImage.tsx` and shared utilities. May be needed for lazy loading features.
- **Deletion Eligible**: NO
- **Risk if Deleted**: Medium

### client/src/services/secureApi.ts
- **Type**: Legacy API wrapper
- **Confidence**: LOW
- **Evidence**: Only imported by `httpClient.ts`. May be legacy code from before httpClient consolidation, but still actively used.
- **Deletion Eligible**: NO
- **Risk if Deleted**: High - breaks httpClient

### client/src/services/cache/ResponseCache.ts
- **Type**: Active cache system
- **Confidence**: LOW
- **Evidence**: Actively used by httpClient and documented in multiple places.
- **Deletion Eligible**: NO
- **Risk if Deleted**: High

### server/src/services/menu-id-mapper.ts
- **Type**: Active utility
- **Confidence**: LOW
- **Evidence**: Used by `menu.service.ts` and `orders.service.ts` for menu ID resolution.
- **Deletion Eligible**: NO
- **Risk if Deleted**: High

### client/public/ignition-animation/
- **Type**: Unused animation assets
- **Confidence**: LOW
- **Evidence**: Referenced in eslint.config.js (likely for exclusion). May be used for splash/loading animations not yet integrated.
- **Deletion Eligible**: NEEDS REVIEW
- **Risk if Deleted**: Low

---

## ARCHIVED SCRIPTS (Already in archive/)

The following are correctly located in `scripts/archive/2025-09-25/` and should remain there:
- analyze-codebase.cjs
- cleanup-console-logs.js/ts
- create-practice-orders.js
- dump-supabase-schema.sh
- fire.sh
- gen-code-analysis.ts
- optimize-images.cjs
- seed-demo-users.js
- Various testing/deployment scripts

**Status**: CORRECTLY ARCHIVED - No action needed

---

## SUMMARY

| Category | Count | Action |
|----------|-------|--------|
| High Confidence (Delete) | 10 | Safe to delete immediately |
| Medium Confidence (Review) | 12 | Review before deletion |
| Low Confidence (Keep) | 6 | Further investigation needed |
| Already Archived | ~50 | No action needed |

### Recommended Immediate Deletions

```bash
# High confidence deletions - safe to remove
rm client/src/hooks/useSquareTerminal.refactored.ts
rm client/src/hooks/terminalStateMachine.ts
rm client/src/hooks/kiosk/useOrderSubmission.ts
rm client/src/routes/LazyRoutes.tsx
rm client/src/components/shared/MenuItemGrid.example.tsx
rm client/src/contexts/UnifiedCartContext.refactored.tsx
rm client/src/components/shared/lists/VirtualizedOrderList.tsx
rm client/src/hooks/useFocusManagement.ts
rm client/src/hooks/useWebSocketConnection.ts
rm -rf client/public/logo-animation/
```

### Recommended Script Archival

```bash
# Move to scripts/archive/ for historical reference
mv scripts/validate-square-credentials.sh scripts/archive/2025-12/
mv scripts/check-orders-kds.ts scripts/archive/2025-12/
mv scripts/check-schema.ts scripts/archive/2025-12/
mv scripts/check-db-schema.ts scripts/archive/2025-12/
mv scripts/diagnose-demo-auth.ts scripts/archive/2025-12/
mv scripts/fix-kitchen-scopes.ts scripts/archive/2025-12/
mv scripts/test-kitchen-auth.ts scripts/archive/2025-12/
mv scripts/verify_p0_db.sh scripts/archive/2025-12/
mv scripts/verify_p0_local.sh scripts/archive/2025-12/
mv scripts/verify_track_a_stabilization.sh scripts/archive/2025-12/
mv scripts/verify_schema_sync.sh scripts/archive/2025-12/
```

---

## NOTES

1. **Square to Stripe Migration**: The codebase has migrated from Square to Stripe for payment processing. Square-related code should be systematically reviewed and removed or archived.

2. **Refactored Files Pattern**: Several `.refactored.ts(x)` files exist as dead code. This suggests incomplete refactoring cycles. Consider establishing a cleanup step in the refactoring process.

3. **Diagnostic Scripts**: Many one-off diagnostic scripts remain in the main scripts directory. Consider moving all non-production scripts to an archive or tools directory.

4. **Feature Flags**: No obviously orphaned feature flags were detected. The FeatureFlagService appears to be in active use.

5. **Database Migrations**: No abandoned migrations detected. All migrations appear to be applied and current.
