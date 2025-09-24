# PHASE 7: TECH DEBT & REFACTOR QUEUE
## July25 Night Audit - Prioritized Action Items
*Generated: 2025-09-23*

## 📊 Tech Debt Summary

### Total Issues Found: 721
- **Critical (P0)**: 12 issues
- **High (P1)**: 47 issues
- **Medium (P2)**: 183 issues
- **Low (P3)**: 479 issues

### Impact vs Effort Matrix
```
High Impact │ QUICK WINS          │ MAJOR PROJECTS
            │ • Fix lint errors   │ • Naming alignment
            │ • Remove test token │ • Vercel consolidation
            │ • Add error bounds  │ • AI optimization
            │                     │
Low Impact  │ FILL-INS           │ AVOID
            │ • Remove TODOs     │ • Complete rewrite
            │ • Update docs      │ • Premature optimization
            └─────────────────────┴──────────────────────
              Low Effort            High Effort
```

## 🚨 P0 - CRITICAL (Block Production)

### 1. Security: Remove Test Token Backdoor
**File**: `server/src/middleware/auth.ts:47`
```typescript
// DELETE THIS BLOCK
if (process.env['NODE_ENV'] === 'test' && token === 'test-token') {
  req.user = { id: 'test-user-id', role: 'admin' };
}
```
**Impact**: Security breach risk
**Effort**: 5 minutes
**PR Size**: ~10 lines

### 2. Security: Remove Client OpenAI Key
**Files**: `.env`, `.env.local`, client config
```bash
# Remove from all .env files
VITE_OPENAI_API_KEY=xxx
```
**Impact**: API key exposure
**Effort**: 15 minutes
**PR Size**: ~5 files

### 3. Fix CORS Wildcard
**File**: `server/src/server.ts`
```typescript
// Replace wildcard with specific domains
const allowedOrigins = [
  'https://rebuild-60.vercel.app',
  'https://july25-client.vercel.app'
  // Remove: 'https://*.vercel.app'
];
```
**Impact**: Security vulnerability
**Effort**: 10 minutes
**PR Size**: ~20 lines

### 4. Fix 19 ESLint Errors
**Files**: Multiple component files
```bash
npm run lint:fix --workspaces
```
**Impact**: Build stability
**Effort**: 30 minutes
**PR Size**: ~19 files

### 5. Consolidate Vercel Projects
**Action**: Link to single project
```bash
vercel link --yes --project rebuild-6.0
```
**Impact**: Deployment confusion
**Effort**: 1 hour
**PR Size**: Config only

## 🔥 P1 - HIGH PRIORITY (This Week)

### 6. Add Missing Error Boundaries
```typescript
// Wrap critical components
<OrderFlowErrorBoundary>
  <CustomerOrderPage />
</OrderFlowErrorBoundary>
```
**Files**: 8 page components
**Impact**: User experience
**Effort**: 2 hours
**PR Size**: ~8 files

### 7. Fix Unsafe Property Access
**File**: `UnifiedCartContext.tsx:66-79`
```typescript
// Add null checks
const safeItem = {
  name: item?.name || item?.menuItem?.name || 'Unknown',
  price: Number(item?.price || item?.menuItem?.price || 0)
};
```
**Impact**: Runtime errors
**Effort**: 1 hour
**PR Size**: ~100 lines

### 8. Implement Loading States
```typescript
if (loading) return <MenuSkeleton />;
if (error) return <MenuErrorState />;
```
**Files**: All data-fetching components
**Impact**: UX improvement
**Effort**: 3 hours
**PR Size**: ~15 files

### 9. Add WebSocket Reconnection
```typescript
const reconnect = () => {
  setTimeout(() => connectWebSocket(), backoffDelay);
};
```
**Impact**: Connection reliability
**Effort**: 2 hours
**PR Size**: ~200 lines

### 10. Remove BuildPanel References
```bash
find . -name "*.ts" | xargs grep -l "buildpanel" | xargs sed -i '/buildpanel/d'
```
**Impact**: Code cleanup
**Effort**: 30 minutes
**PR Size**: ~5 files

## 📈 P2 - MEDIUM PRIORITY (This Sprint)

### 11. Naming Convention Alignment (150+ mismatches)
- Implement transformation at API boundaries
- Standardize to snake_case in shared types
- Add automated transformation layer
**Effort**: 1 week
**PR Strategy**: Multiple small PRs by module

### 12. Replace 161 'any' Types
- Create proper TypeScript interfaces
- Use generics where appropriate
- Add type guards
**Effort**: 3 days
**PR Size**: ~50 files

### 13. Consolidate Order Type Definitions
- Merge 3 different Order types
- Create single source in shared/types
- Update all imports
**Effort**: 1 day
**PR Size**: ~30 files

### 14. Add E2E Test Suite
```typescript
test('complete order flow', async ({ page }) => {
  await page.goto('/kiosk');
  await page.click('[data-testid="menu-item"]');
  // ... complete flow
});
```
**Effort**: 3 days
**PR Size**: New test files

### 15. Optimize AI Bundle Size
- Lazy load voice components
- Tree-shake unused code
- Remove debug panels in production
**Effort**: 2 days
**PR Size**: ~10 files

### 16. Implement Webhook Signatures
```typescript
function verifyWebhookSignature(req: Request): boolean {
  const signature = req.headers['x-webhook-signature'];
  // ... HMAC verification
}
```
**Effort**: 1 day
**PR Size**: ~3 files

### 17. Add Security Test CI
```json
"test:security": "npm run test:quick -- server/tests/security/*.proof.test.ts"
```
**Effort**: 2 hours
**PR Size**: CI config

### 18. Fix React Hook Warnings
- Add missing dependencies
- Fix Fast Refresh violations
- Extract contexts to separate files
**Effort**: 1 day
**PR Size**: ~8 files

## 💡 P3 - LOW PRIORITY (Next Quarter)

### 19. Remove 143 TODO/FIXME Comments
### 20. Remove 301 ESLint Suppressions
### 21. Add Comprehensive JSDoc
### 22. Implement Feature Flags System
### 23. Add Performance Monitoring
### 24. Create Storybook Components
### 25. Add Visual Regression Tests
### 26. Implement A/B Testing Framework
### 27. Add Internationalization (i18n)
### 28. Create Admin Analytics Dashboard

## 📋 Refactor PR Template

```markdown
## 🎯 Objective
[Brief description of what this PR fixes/improves]

## 📊 Impact
- **User Impact**: [None/Low/Medium/High]
- **Performance**: [No change/Improved by X%]
- **Bundle Size**: [No change/+X KB/-X KB]

## ✅ Changes
- [ ] Fixed [specific issue]
- [ ] Added tests
- [ ] Updated documentation

## 🧪 Testing
```bash
npm run test:affected
npm run lint
npm run typecheck
```

## 📸 Screenshots
[If UI changes]

## 🔄 Rollback
```bash
git revert [commit-hash]
```
```

## 🚀 Quick Win Projects (Do First)

### Project 1: Security Hardening (2 hours)
```bash
# Fix all P0 security issues
- Remove test token backdoor
- Fix CORS wildcard
- Remove client API keys
- Enable STRICT_AUTH
```

### Project 2: Lint & Type Cleanup (4 hours)
```bash
# Fix all errors, top 50 'any' types
npm run lint:fix --workspaces
npx typescript-strict-plugin
```

### Project 3: Error Boundaries Sprint (1 day)
```typescript
// Add to all page components
- OrderFlowErrorBoundary
- KitchenErrorBoundary
- PaymentErrorBoundary
```

### Project 4: Vercel Stabilization (2 hours)
```bash
# Single project setup
vercel link --project rebuild-6.0
vercel env pull
vercel deploy --prod
```

## 📊 Metrics to Track

### Code Quality Metrics
```typescript
interface QualityMetrics {
  lintErrors: number;        // Target: 0
  typeErrors: number;        // Target: 0
  anyCounts: number;         // Target: <50
  testCoverage: number;      // Target: >70%
  bundleSize: number;        // Target: <500KB
}
```

### Tracking Dashboard
```bash
# Create quality dashboard
npm run metrics:quality
npm run metrics:bundle
npm run metrics:performance
```

## 🎬 Automation Scripts

### 1. Daily Quality Check
```bash
#!/bin/bash
# quality-check.sh
echo "🔍 Running Quality Checks..."
npm run typecheck --workspaces
npm run lint --workspaces
npm run test:quick
echo "✅ Quality Check Complete"
```

### 2. Pre-Deployment Validation
```bash
#!/bin/bash
# pre-deploy.sh
npm run build --workspaces
npm run test:e2e
npm run lighthouse:ci
```

### 3. Tech Debt Reporter
```bash
#!/bin/bash
# tech-debt-report.sh
echo "📊 Tech Debt Report"
grep -r "TODO\|FIXME" . | wc -l
grep -r "@ts-ignore" . | wc -l
grep -r "any" . --include="*.ts" | wc -l
```

## 📈 Success Metrics

### Week 1 Goals
- ✅ 0 lint errors
- ✅ 0 type errors
- ✅ All P0 issues fixed
- ✅ Single Vercel project

### Sprint 1 Goals
- ✅ <100 'any' types
- ✅ Error boundaries added
- ✅ Loading states implemented
- ✅ E2E tests running

### Quarter Goals
- ✅ 70% test coverage
- ✅ <300KB main bundle
- ✅ 0 TODO comments
- ✅ Full type safety

## 🏁 Definition of Done

Each refactor task is complete when:
1. Code changes implemented
2. Tests added/updated
3. Documentation updated
4. PR approved by reviewer
5. Deployed to staging
6. No regression in metrics
7. Rollback plan documented

## Next Steps
→ Proceeding to generate final reports and PRs
→ Creating PR drafts for P0 issues
→ Setting up automation scripts