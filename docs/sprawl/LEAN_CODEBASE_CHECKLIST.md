# Lean Codebase Checklist

## 🎯 Quick Wins (Do Today)

### 1. Merge Micro-Components (2 hours)
- [ ] Delete OrderNumber.tsx → inline in parent
- [ ] Delete TableLabel.tsx → inline in parent  
- [ ] Delete ItemQuantityName.tsx → merge into OrderItems
- [ ] Merge badge-variants.ts back into badge.tsx
- [ ] Merge button-variants.ts back into button.tsx

### 2. Remove ServiceFactory (1 hour)
- [ ] Delete ServiceFactory.ts
- [ ] Update imports to use services directly
- [ ] Remove BaseService if no real shared logic
- [ ] Simplify service exports

### 3. Consolidate Context Files (30 min)
- [ ] Merge restaurant-context.ts into RestaurantContext.tsx
- [ ] Merge restaurant-hooks.ts into RestaurantContext.tsx
- [ ] Single file, clear exports

## 📦 Module Consolidation (This Week)

### 1. Merge features/ into modules/
```bash
# Move and rename
mv src/features/kds src/modules/kitchen
mv src/features/kiosk-voice-capture src/modules/voice
mv src/features/history src/modules/analytics
mv src/features/performance src/modules/analytics
```

### 2. Standardize Module Structure
Each module should have:
```
modules/orders/
├── index.ts        # Public API only
├── types.ts        # Domain types
├── api.ts          # Service layer  
├── hooks.ts        # React hooks
├── OrderCard.tsx   # Main components
├── OrderList.tsx
└── __tests__/      # Tests
```

### 3. Eliminate Barrel Exports
- Remove intermediate index.ts files
- Only keep at module root
- Direct imports within modules

## 🔍 Code Smell Checklist

### Before Adding Any File, Ask:
1. **Is this <50 lines?** → Consider inlining
2. **Used in one place?** → Don't extract
3. **Just styled HTML?** → Use inline styles/Tailwind
4. **Wrapping a library?** → Use the library directly
5. **"Base" class with 1 impl?** → YAGNI

### Red Flags to Remove:
- 🚩 Files with only type exports
- 🚩 Components that are just styled divs/spans
- 🚩 Hooks that wrap useState/useEffect
- 🚩 Services that only call fetch
- 🚩 Tests that check CSS classes
- 🚩 Multiple files for one feature

## 📊 Metrics to Track

### File Count by Category
```
Current → Target
- Components: 89 → 40 (-55%)
- Hooks: 31 → 10 (-68%)  
- Services: 19 → 8 (-58%)
- Tests: 42 → 20 (-52%)
- Types: 15 → 5 (-67%)
```

### Lines of Code
```
Current → Target
- Business Logic: 3,000 → 2,800 (-7%)
- UI Components: 5,000 → 2,500 (-50%)
- Tests: 4,000 → 1,500 (-63%)
- Types/Interfaces: 1,000 → 400 (-60%)
```

## ✅ Definition of "Lean"

A component/hook/service is lean if:
- It has a single, clear responsibility
- It's used in multiple places OR contains significant logic
- It's >50 lines OR has complex behavior
- It would be awkward to inline
- It makes the code MORE readable, not less

## 🚫 What NOT to Do

1. **Don't create abstractions for future use**
   - Wait until you need it 3 times
   
2. **Don't split by technical layer**
   - Split by domain/feature instead
   
3. **Don't test implementation**
   - Test behavior and integration
   
4. **Don't optimize prematurely**
   - Measure first, optimize second
   
5. **Don't keep dead code**
   - If it's not used, delete it

## 🎬 Implementation Order

### Phase 1: Quick Wins (Day 1)
1. Merge micro-components
2. Remove ServiceFactory
3. Consolidate contexts
4. Delete unused files

### Phase 2: Structure (Day 2-3)
1. Merge features → modules
2. Standardize module structure
3. Update imports
4. Fix tests

### Phase 3: Optimize (Day 4-5)
1. Implement lazy loading
2. Remove duplicate code
3. Consolidate utilities
4. Measure bundle size

## 📈 Success Metrics

### Immediate (Day 1):
- [ ] -30 component files
- [ ] -5 service files
- [ ] All tests passing

### Week 1:
- [ ] -40% total files
- [ ] -35% bundle size
- [ ] <3s test suite

### Ongoing:
- [ ] No file <50 lines unless justified
- [ ] No "Base" classes without 3+ implementations
- [ ] No features split across modules
- [ ] Clear domain boundaries

## 🤝 Team Agreement

Before creating any new file:
1. Can this be inlined? (prefer yes)
2. Will it be reused? (require yes)
3. Does it simplify? (must be yes)
4. Is it testable? (should be yes)

If any answer is "no", don't create the file.

---

*Lean = Less code to maintain = Faster development = Happier team*