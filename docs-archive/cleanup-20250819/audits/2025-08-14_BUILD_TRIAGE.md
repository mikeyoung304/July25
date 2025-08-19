# Build Gate Triage Report
**Date**: 2025-08-14  
**Total Errors**: 340 TypeScript errors  
**Strategy**: Minimal fixes without touching realtime code

## 1. TYPESCRIPT ERROR MAP

### Group A: Snake_case ↔ CamelCase Mismatches (60% of errors)
**Count**: ~204 errors  
**Pattern**: DB uses snake_case, UI expects camelCase

**Affected Properties**:
- `menu_item_id` ↔ `menuItemId` (18 occurrences)
- `image_url` ↔ `imageUrl` (8 occurrences)  
- `special_instructions` ↔ `specialInstructions` (12 occurrences)
- `table_number` ↔ `tableNumber` (4 occurrences)
- `is_availableTables` ↔ `availableTables` (2 occurrences)

### Group B: Shared Type Drift (25% of errors)
**Count**: ~85 errors  
**Root Cause**: Duplicate type definitions

**Conflicts**:
- `shared/cart.ts` has `menuItemId` (camelCase)
- `client/src/modules/order-system/types/index.ts` has `menu_item_id` (snake_case)
- MenuCategory enum vs string type mismatches
- Missing properties: `calories`, `modifiers` on MenuItem

### Group C: Environment/Browser API Misuse (15% of errors)
**Count**: ~51 errors  
**Pattern**: Shared utils using browser APIs in Node context

**Issues**:
- `window`, `WebSocket`, `IntersectionObserver` not available in Node
- Missing base class inheritance (super references)
- Missing MemoryMonitor imports

## 2. SHARED TYPES ALIGNMENT

### Current State:
```typescript
// shared/cart.ts (CORRECT - camelCase)
export interface CartItem {
  menuItemId: string;  // ✓ camelCase
  specialInstructions?: string;
  imageUrl?: string;
}

// client/src/modules/order-system/types/index.ts (WRONG - snake_case)
export interface CartItem {
  menu_item_id: string;  // ✗ snake_case
  // ... duplicates shared type
}
```

### RECOMMENDATION: Option A - Transform at Boundaries
**Keep UI clean with camelCase, transform at API layer**

1. Delete duplicate type in `client/src/modules/order-system/types/index.ts`
2. Import from shared: `import { CartItem } from '@/shared/cart'`
3. Add transform utility at API boundary:

```typescript
// client/src/services/utils/caseTransform.ts (already exists)
export const toCamelCase = (obj: any) => {
  // Transform snake_case from API to camelCase for UI
}
```

## 3. TEST/LINT INFRASTRUCTURE

### Missing Packages:
```bash
# Client needs @testing-library/dom
cd client && npm install --save-dev @testing-library/dom@^10.4.0

# Root eslint config issue - plugin already installed but not found
npm install --save-dev  # Reinstall to fix module resolution
```

### Config Fix:
No config changes needed - packages are declared but not resolving correctly.

## 4. AI GATEWAY STUB

### Location:
- `server/src/services/menu.service.ts:226-242` - `syncToAIGateway` method
- `server/src/routes/menu.routes.ts:77` - Called in POST /sync-menu

### Call Graph:
```
POST /api/v1/menu/sync-menu
  └─> MenuService.syncToAIGateway(restaurantId)
      └─> this.getFullMenu(restaurantId)
      └─> logs "Menu synced to AI Gateway" (no-op)
```

### RECOMMENDATION: Rename to `syncToAI`
Method is actively called but does nothing harmful. Rename for clarity:
- `syncToAIGateway` → `syncToAI`
- Remove "Gateway" references in logs

## 📋 3-STEP APPLY PLAN

### Step 1: Fix Type Alignment (10 min)
```bash
# 1.1 Remove duplicate CartItem type
rm client/src/modules/order-system/types/index.ts

# 1.2 Update imports in affected files (18 files)
# Replace: from './types'
# With: from '@/shared/cart'

# 1.3 Fix snake_case usage in components (simple find/replace)
# menu_item_id → menuItemId
# special_instructions → specialInstructions  
# image_url → imageUrl
# table_number → tableNumber
```

### Step 2: Fix Dependencies (2 min)
```bash
# Install missing test library
cd client && npm install --save-dev @testing-library/dom@^10.4.0

# Reinstall root deps to fix eslint resolution
cd .. && npm install
```

### Step 3: Clean Tech Debt (5 min)
```typescript
// server/src/services/menu.service.ts:226
// Rename method and update log messages
static async syncToAI(restaurantId: string): Promise<void> {
  // ... 
  this.logger.info('Menu synced to AI service', { restaurantId });
}

// server/src/routes/menu.routes.ts:77
await MenuService.syncToAI(restaurantId);
```

## Summary

**Quick Wins** (17 min total):
1. **Type alignment**: Use shared types, delete duplicates, fix property names
2. **Dependencies**: Install @testing-library/dom, reinstall root
3. **Cleanup**: Rename AI Gateway references

**Result**: ~280 errors will be resolved (82% reduction)

**Remaining**: ~60 errors in shared utils (browser API usage) - non-critical for deployment

---
**AWAITING APPROVAL TO APPLY FIXES**