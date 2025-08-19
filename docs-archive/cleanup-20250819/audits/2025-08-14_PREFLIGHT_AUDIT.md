# Realtime Voice & Menu Preflight Audit Report
**Date**: 2025-08-14  
**Status**: ⚠️ NOT DEPLOYMENT READY  
**Auditor**: Realtime Voice Preflight Auditor

## Executive Summary
The codebase has correct unified architecture and OpenAI Realtime integration, but critical issues block deployment:
- **131 TypeScript errors** (property mismatches, missing types)
- **Test infrastructure broken** (missing dependencies)
- **Linting configuration broken** (missing eslint-plugin-react)
- Residual AI Gateway references in active code

## 🔴 BLOCKERS (Must Fix Before Deploy)

### 1. TypeScript Errors (131 total)
**Critical Property Mismatches**:
- `client/src/modules/filters/hooks/useOrderFilters.ts:17,50` - `table_number` vs `tableNumber`
- `client/src/modules/order-system/components/CartItem.tsx:29-52` - `image_url` vs `imageUrl`, `special_instructions` vs `specialInstructions`
- `client/src/modules/order-system/components/MenuItemCard.tsx:19,45,66` - `menu_item_id` vs `menuItemId`
- `shared/src/types/cart.ts` vs local types mismatch

**Missing Dependencies**:
- `shared/utils/performance-hooks.ts:7,119,121` - `window`, `IntersectionObserver` not available in Node context
- `shared/utils/websocket-pool.browser.ts:32,161,544` - `WebSocket` not defined

### 2. Test Infrastructure Broken
```bash
Error: Cannot find module '@testing-library/dom'
# All 37 test suites failed
```
**Fix**: `npm install --save-dev @testing-library/dom @testing-library/react`

### 3. Linting Configuration Broken  
```bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'eslint-plugin-react'
```
**Fix**: `npm install --save-dev eslint-plugin-react`

### 4. AI Gateway References in Active Code
`server/src/services/menu.service.ts:224-239`:
```typescript
static async syncToAIGateway(restaurantId: string): Promise<void> {
  // TODO: Implement AI Gateway sync
  this.logger.info('Menu synced to AI Gateway', { restaurantId });
}
```
**Fix**: Remove or rename to `syncToAI` since gateway doesn't exist

## ✅ VALIDATED (Passing Checks)

### 1. Unified Backend Architecture ✓
- Confirmed single backend on port 3001
- No active code references to port 3002
- Archive files properly isolated in `docs/archive/`

### 2. OpenAI Realtime Integration ✓
**Correct Implementation** (`server/src/voice/openai-adapter.ts`):
- Line 55: `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`
- Line 61: Header `'OpenAI-Beta': 'realtime=v1'`
- Line 140-141: `input_audio_format: 'pcm16'`, `output_audio_format: 'pcm16'`
- Line 352-353: 24kHz assertion with warning

### 3. Security Boundaries ✓
- **NO client OpenAI references** - verified clean
- API key only in server environment
- Proper backend-only access pattern

### 4. PCM16 24kHz Audio Pipeline ✓
**Verified Wiring**:
- `server/src/voice/websocket-server.ts:194` - passes 24000 to sendAudio
- `server/src/voice/openai-adapter.ts:352` - validates sampleRate === 24000
- `server/src/voice/types.ts:37` - default sample_rate: 24000

### 5. Health Endpoints ✓
**Available Endpoints**:
- `/health` - Basic health check (server/src/routes/metrics.ts:36)
- `/health/detailed` - Detailed status (server/src/routes/metrics.ts:48)
- `/api/v1/ai/health` - AI service health (server/src/routes/ai.routes.ts:379)
- `/healthz` - Kubernetes-style (server/src/routes/health.routes.ts:190)

## 🟡 TECH DEBT (Non-Blocking)

### TODO Comments (6 in server)
- `server/src/services/menu.service.ts:230` - AI Gateway sync stub
- `server/src/routes/metrics.ts:21,56` - Monitoring service integration
- `server/src/routes/orders.routes.ts:66` - Voice order parsing

### Archive Bloat
- `docs/archive/` contains 100+ old migration files
- Consider moving to separate archive repo

### Shared Module Issues  
- 43 TypeScript errors in `shared/` directory
- Browser-specific code mixed with Node code
- Missing proper environment detection

## 📋 MINIMAL FIX PLAN

### Phase 1: Critical Fixes (2 hours)
```bash
# 1. Install missing dependencies
npm install --save-dev @testing-library/dom @testing-library/react eslint-plugin-react

# 2. Fix property name mismatches (use batch rename)
# snake_case → camelCase for:
# - table_number → tableNumber
# - image_url → imageUrl  
# - special_instructions → specialInstructions
# - menu_item_id → menuItemId
```

### Phase 2: Type Alignment (1 hour)
1. Align `shared/src/types/cart.ts` with component expectations
2. Add missing `MenuCategory` string conversion
3. Fix `CartItem` interface consistency

### Phase 3: Clean Tech Debt (30 min)
1. Remove `syncToAIGateway` method from menu.service.ts
2. Add browser detection to shared utils:
```typescript
const isBrowser = typeof window !== 'undefined';
```

### Phase 4: Validate (30 min)
```bash
npm run typecheck  # Should pass
npm run lint:fix   # Should pass
npm test          # Should run (may not all pass)
```

## 🚀 Deployment Checklist

### Pre-Deploy Requirements
- [ ] Fix all 131 TypeScript errors
- [ ] Install missing test/lint dependencies  
- [ ] Remove AI Gateway references
- [ ] Verify `npm run typecheck` passes
- [ ] Verify `npm run lint:fix` runs

### Environment Variables (Render)
```env
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_KEY=eyJ...
VITE_API_BASE_URL=https://july25.onrender.com
VITE_USE_MOCK_DATA=false
```

### Post-Deploy Validation
```bash
# 1. Health check
curl https://july25.onrender.com/api/v1/ai/health

# 2. Menu upload
cd server && npm run upload:menu

# 3. Voice test (loopback mode)
wscat -c wss://july25.onrender.com \
  -x '{"type":"session.start","session_config":{"restaurant_id":"11111111-1111-1111-1111-111111111111","loopback":true}}'
```

## Recommendation
**DO NOT DEPLOY** until TypeScript errors are resolved. The type mismatches will cause runtime failures in production. Estimated 4 hours to fix all blockers and achieve deployment readiness.

---
**Report Generated**: 2025-08-14 10:19 PST  
**Next Review**: After Phase 1 fixes complete