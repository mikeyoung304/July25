# Refactoring Action Plan

Based on the code analysis, here's a prioritized action plan for improving the codebase:

## Immediate Actions (Quick Wins)

### 1. Extract Common Loading Pattern
**Problem**: Error and loading state management is duplicated across components
**Solution**: Create a `useAsyncState` hook

```typescript
// hooks/useAsyncState.ts
export function useAsyncState<T>(initialData?: T) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (promise: Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await promise;
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute, setData, setError };
}
```

### 2. Break Down Large Components
**Priority Files**:
- `/App.tsx` (522 lines) - Split into:
  - `KitchenDisplayPage.tsx`
  - `AppRoutes.tsx`
  - `AppProviders.tsx`
- `/services/api.ts` (409 lines) - Split into:
  - `orderService.ts`
  - `tableService.ts`
  - `menuService.ts`

### 3. Reduce Complexity in Key Areas
**High Complexity Components**:
- `useKeyboardNavigation.ts` (complexity: 55) - Split into:
  - `useKeyboardShortcuts.ts`
  - `useFocusTrap.ts`
  - `useAriaLive.ts`
- `services/api.ts` (complexity: 51) - Use service pattern

## Medium-Term Improvements

### 1. Create Module Structure
Transform flat structure into feature modules:

```
src/
├── modules/
│   ├── orders/
│   │   ├── components/
│   │   │   ├── OrderCard/
│   │   │   ├── OrderList/
│   │   │   └── OrderActions/
│   │   ├── hooks/
│   │   │   ├── useOrderData.ts
│   │   │   └── useOrderActions.ts
│   │   ├── services/
│   │   │   └── orderService.ts
│   │   ├── types/
│   │   │   └── order.types.ts
│   │   └── index.ts
│   ├── sound/
│   │   ├── hooks/useSoundEffects.ts
│   │   ├── services/audioService.ts
│   │   └── index.ts
│   └── filters/
│       ├── components/
│       ├── hooks/
│       └── types/
```

### 2. Implement Service Pattern
Replace direct API calls with service interfaces:

```typescript
// modules/orders/services/orderService.ts
export interface IOrderService {
  getOrders(filters?: OrderFilters): Promise<Order[]>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  subscribeToUpdates(callback: OrderEventCallback): Unsubscribe;
}

export class OrderService implements IOrderService {
  constructor(private api: ApiClient) {}
  // Implementation...
}

// Dependency injection
export const orderService = new OrderService(apiClient);
```

### 3. Add Missing Critical Tests
Priority components for testing:
- Core business logic (order management)
- Error boundaries
- Accessibility components
- Custom hooks

## Long-Term Architecture

### 1. State Management Strategy
Evaluate need for global state:
- Consider Zustand for lightweight state management
- Keep local state where possible
- Use React Query for server state

### 2. Component Library Documentation
- Set up Storybook for UI components
- Document component APIs
- Create usage examples

### 3. Performance Optimizations
- Implement code splitting by route
- Lazy load heavy components
- Add virtual scrolling for large lists

## Implementation Schedule

### Week 1: Foundation
- [x] Create `useAsyncState` hook
- [x] Split App.tsx into smaller files
- [x] Extract keyboard navigation hooks
- [ ] Add tests for critical paths

### Week 2: Modularization
- [ ] Create orders module
- [ ] Create sound module
- [ ] Create filters module
- [ ] Update imports throughout codebase

### Week 3: Services & Testing
- [ ] Implement service pattern
- [ ] Add integration tests
- [ ] Set up E2E tests with Playwright
- [ ] Document new architecture

### Week 4: Polish & Optimization
- [ ] Performance audit and optimization
- [ ] Accessibility testing
- [ ] Documentation updates
- [ ] Team training on new patterns

## Success Metrics

1. **Code Quality**
   - No files > 200 lines
   - Complexity < 10 per function
   - Test coverage > 80%

2. **Performance**
   - Bundle size < 400KB
   - LCP < 1.5s
   - No memory leaks

3. **Developer Experience**
   - Clear module boundaries
   - Consistent patterns
   - Comprehensive documentation

## Risk Mitigation

1. **Incremental Changes**: Make small, testable changes
2. **Feature Flags**: Use flags for major refactors
3. **Parallel Development**: Keep old code until new is proven
4. **Continuous Testing**: Run tests after each change
5. **Team Communication**: Daily updates on progress

## Next Steps

1. Review this plan with the team
2. Create feature branches for each module
3. Start with the `useAsyncState` hook as proof of concept
4. Set up automated testing pipeline
5. Begin incremental refactoring