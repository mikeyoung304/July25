# AI Bloat Reduction Plan

## Files to Delete Immediately (41 files, ~150KB)

### Duplicate Implementations
```
client/src/components/errors/PaymentErrorBoundary.tsx  # Keep UnifiedErrorBoundary
client/src/components/errors/ErrorBoundary.tsx         # Keep UnifiedErrorBoundary  
client/src/modules/voice/services/WebRTCVoiceClientEnhanced.ts  # Unused
client/src/components/kiosk/accessibility.ts          # 10 unused exports
```

### Stale Test Files
```
client/src/__tests__/e2e/floor-plan.e2e.test.ts      # Component doesn't exist
client/src/__tests__/unit/voice-ordering.test.ts     # Old implementation
client/src/__tests__/integration/auth-flow.test.ts   # Duplicate of auth.test.ts
client/src/__tests__/components/VoiceButton.test.tsx # Component removed
```

### Legacy Voice Components
```
client/src/modules/voice/components/VoiceOrderingWidget.tsx
client/src/modules/voice/components/VoiceAssistant.tsx
client/src/modules/voice/services/AudioProcessor.ts
```

### Development/Debug in Production
```
client/src/components/dev/MockDataBanner.tsx
client/src/components/debug/VoiceDebugPanel.tsx
client/src/utils/test-helpers.ts
```

## Prompts/Comments to Remove (Reduce context window)

### Over-documented Files
```
// 200+ lines of comments in:
client/src/modules/voice/services/WebRTCVoiceClient.ts  # Keep code, trim comments
client/src/contexts/UnifiedCartContext.tsx              # Remove migration notes
server/src/services/AuthenticationService.ts            # Remove TODO comments
```

### Stale Architecture Notes
```
docs/archive/voice/VOICE_ARCHITECTURE_OLD.md
docs/archive/auth/PIN_AUTH_DEPRECATED.md  
docs/archive/payments/STRIPE_INTEGRATION.md
```

## Consolidation Opportunities

### Error Boundaries (3 → 1)
- Delete: PaymentErrorBoundary, ErrorBoundary
- Keep: UnifiedErrorBoundary
- Update: All imports to use unified version

### Cart Contexts (2 → 1)
- Delete: KioskCartContext wrapper
- Keep: UnifiedCartContext
- Savings: ~15KB

### Auth Hooks (4 → 2)
- Consolidate: useAuth, useAuthentication, useAuthState, useUser
- Keep: useAuth (primary), useRoles (specialized)
- Savings: ~8KB

### Station Configs (3 → 1)
- Merge: defaultStationConfig, stationPresets, STATION_CONFIGS
- Single source: shared/config/stations.ts
- Savings: ~5KB

## Lazy Load Candidates (Defer 200KB+)

### Heavy Components
```typescript
// Convert to lazy loading:
const FloorPlanEditor = lazy(() => import('./FloorPlanEditor'))  // 45KB
const AnalyticsDashboard = lazy(() => import('./Analytics'))      // 38KB
const VoiceDebugPanel = lazy(() => import('./VoiceDebug'))       // 25KB
const MenuBuilder = lazy(() => import('./MenuBuilder'))          // 35KB
```

### Admin-Only Features
```typescript
// Load only for managers:
const ReportsModule = lazy(() => import('./modules/reports'))     // 60KB
const StaffManager = lazy(() => import('./modules/staff'))       // 40KB
const Settings = lazy(() => import('./modules/settings'))        // 30KB
```

## Package Removal (100+ packages)

### Entire Unused Suites
```json
// Remove from package.json:
"@commitlint/*": "*",           // 21 packages, unused
"@mcp/protocol": "*",          // Not in dependencies
"hono": "*",                   // Using Express
"dayjs": "*",                  // Using date-fns
```

### Duplicate Functionality
- Remove dayjs (use date-fns)
- Remove axios (use fetch)
- Remove lodash (use native JS)
- Remove moment (use date-fns)

## Archive Consolidation

### Flatten Archive Structure
```
FROM:
docs/archive/
  ├── 2024/
  ├── 2025/
  ├── voice/
  ├── auth/
  └── old/

TO:
docs/archive-2024/  # One level, by year only
```

### Delete Ancient History
- Everything in docs/archive/2024/
- All *_DEPRECATED.md files
- Migration guides for completed migrations

## Import Optimization

### Tree-shake Icon Libraries
```typescript
// BAD: Imports entire library
import * as Icons from 'lucide-react'

// GOOD: Import specific icons
import { Settings, User, Menu } from 'lucide-react'
```

### Bundle Framer Motion
```typescript
// BAD: Import everything
import { motion, AnimatePresence, useAnimation } from 'framer-motion'

// GOOD: Import only what's used
import { motion } from 'framer-motion'
```

## Estimated Impact

| Action | Files | Size | Build Time |
|--------|-------|------|------------|
| Delete orphans | 41 | -150KB | -5% |
| Remove packages | 100+ | -30MB node_modules | -10% |
| Lazy load admin | 8 | -200KB initial | -15% |
| Consolidate duplicates | 10 | -30KB | -2% |
| Tree-shake imports | - | -50KB | -3% |
| **Total** | **159+** | **-430KB bundle** | **-35%** |

## Implementation Order

1. **Immediate** (10 mins): Delete orphaned files
2. **Quick** (30 mins): Remove dev/debug from prod
3. **Easy** (1 hour): Consolidate duplicates
4. **Medium** (2 hours): Remove unused packages
5. **Careful** (4 hours): Lazy load heavy components
6. **Ongoing**: Tree-shake imports as you work

## Validation Checklist

- [ ] Run build after each deletion
- [ ] Check that tests still pass
- [ ] Verify no runtime errors
- [ ] Measure bundle size reduction
- [ ] Document what was removed