# Modular Refinement Plan

## Executive Summary
Current codebase has ~229 files with significant AI-generated bloat and inconsistent patterns. Target: 30-40% reduction in files while improving clarity and performance.

## 🚨 Critical Issues Identified

### 1. Architectural Redundancy
- **Problem**: Both `/features` and `/modules` directories doing the same thing
- **Solution**: Consolidate to single `/modules` pattern
- **Impact**: -20 duplicate structure files

### 2. Over-Atomization
- **Problem**: Components like `OrderNumber.tsx` (10 lines), `TableLabel.tsx` (8 lines)
- **Solution**: Merge into logical units
- **Impact**: -30 micro-component files

### 3. Service Layer Bloat
- **Problem**: ServiceFactory + BaseService + individual services = over-engineering
- **Solution**: Direct service exports, remove factory pattern
- **Impact**: -5 abstraction files

### 4. Hook Proliferation
- **Problem**: useOrderData, useOrderHistory, useOrderFilters all do similar async operations
- **Solution**: Single `useOrders` hook with options
- **Impact**: -10 redundant hooks

## 📋 Refactoring Strategy

### Phase 1: Structural Consolidation
```
src/
├── modules/              # Single module pattern
│   ├── orders/
│   │   ├── domain/      # Business logic & types
│   │   ├── ui/          # Components & hooks  
│   │   ├── api/         # Service layer
│   │   └── index.ts     # Public API
│   ├── kitchen/         # KDS functionality
│   ├── voice/           # Voice ordering
│   └── analytics/       # Reporting & history
├── core/                # Shared kernel
│   ├── ui/             # Design system
│   ├── utils/          # Helpers
│   └── hooks/          # Global hooks
└── pages/              # Route components
```

### Phase 2: Component Consolidation

#### Before (16 files):
```
components/shared/
├── typography/OrderNumber.tsx
├── labels/TableLabel.tsx  
├── timers/ElapsedTimer.tsx
├── lists/ItemQuantityName.tsx
├── lists/ModifierList.tsx
├── buttons/StatusActionButton.tsx
├── badges/StatusBadge.tsx
├── badges/StationBadge.tsx
└── alerts/AlertNote.tsx
```

#### After (4 files):
```
modules/orders/ui/
├── OrderIdentity.tsx    # Order number + table
├── OrderItems.tsx       # Items + modifiers + notes
├── OrderStatus.tsx      # Status + timer + actions
└── StationInfo.tsx      # Station badges
```

### Phase 3: Service Simplification

#### Remove:
- ServiceFactory pattern (unnecessary abstraction)
- BaseService class (YAGNI)
- Mock service inheritance

#### Keep:
- Direct service exports
- Simple async/await patterns
- Type-safe interfaces

### Phase 4: Hook Optimization

#### Consolidate:
```typescript
// Before: 6 different hooks
useOrderData, useOrderHistory, useOrderFilters,
useOrderSubscription, useOrderActions, useAsyncState

// After: 2 focused hooks
useOrders(options?: {
  includeHistory?: boolean
  filters?: OrderFilters
  realtime?: boolean
})

useAsync<T>(asyncFn: () => Promise<T>)
```

## 🎯 Specific Actions

### 1. Merge Micro-Components
- [ ] OrderNumber + TableLabel → OrderIdentity
- [ ] ItemQuantityName + ModifierList + AlertNote → OrderItemDetails  
- [ ] StatusBadge + ElapsedTimer → OrderStatusDisplay
- [ ] All badge variants → Single Badge component

### 2. Flatten Directory Structure
- [ ] Remove unnecessary index.ts files
- [ ] Merge badge-variants.ts into badge.tsx
- [ ] Consolidate restaurant context files
- [ ] Remove empty type files

### 3. Eliminate Dead Code
- [ ] Remove unused KioskDemo components
- [ ] Delete mock OrderHistoryService
- [ ] Remove trivial test files (<20% logic)
- [ ] Clean up unused imports/exports

### 4. Optimize Bundle Size
- [ ] Implement module lazy loading
- [ ] Remove duplicate icon imports
- [ ] Consolidate utility functions
- [ ] Tree-shake unused shadcn components

## 📊 Expected Outcomes

### Metrics
- **File Count**: 229 → ~140 files (-40%)
- **Bundle Size**: ~400KB → ~250KB (-37%)
- **Code Duplication**: -60%
- **Cognitive Load**: Significantly reduced

### Benefits
1. **Clearer Boundaries**: One way to do things
2. **Faster Navigation**: Fewer files to search
3. **Better Performance**: Smaller bundles, lazy loading
4. **Easier Testing**: Consolidated test utilities
5. **Reduced Maintenance**: Less code to maintain

## ⚠️ Anti-Patterns to Avoid

1. **Premature Abstraction**: No base classes until 3+ implementations
2. **Micro-Services**: Keep services at domain level, not entity level
3. **Over-Typing**: Use TypeScript inference where possible
4. **Barrel Export Hell**: Limit index.ts to module roots only
5. **Test Everything**: Only test business logic, not UI details

## 🔄 Migration Path

### Week 1: Structure
- Merge features/ into modules/
- Consolidate shared components
- Remove ServiceFactory

### Week 2: Optimization  
- Merge micro-components
- Consolidate hooks
- Implement lazy loading

### Week 3: Cleanup
- Remove dead code
- Update tests
- Optimize bundles

## 🎬 Next Steps

1. Review and approve this plan
2. Create feature branch for refactoring
3. Execute phase by phase
4. Measure bundle size improvements
5. Update documentation

---

*Remember: Perfect is the enemy of good. Aim for clarity, not cleverness.*