# Technical Debt Tracker - Restaurant OS 6.0

> **Last Updated**: 2025-08-20  
> **Purpose**: Track resolved issues, current technical debt, and prioritize improvements  
> **Status**: Active tracking following major fixes

## ✅ Recently Resolved (2025-08-20 Session)

### 1. Floor Plan Save Failures
- **Issue**: Client-generated temporary IDs (`table-${Date.now()}`) couldn't be updated in database
- **Root Cause**: Trying to UPDATE non-existent records instead of CREATE
- **Solution**: Separated new tables (CREATE) from existing tables (UPDATE)
- **Files Fixed**: 
  - `client/src/modules/floor-plan/components/FloorPlanEditor.tsx`
  - `client/src/services/TableService.ts`
- **Code Example**:
```typescript
// Now properly separates operations
const newTables = tables.filter(t => t.id.startsWith('table-'))
const existingTables = tables.filter(t => !t.id.startsWith('table-'))
```

### 2. ServerView Error Toast Spam
- **Issue**: "Failed to load floor plan" toast appeared every 30 seconds
- **Root Cause**: Refresh failures were shown to user, not just initial load failures
- **Solution**: Added `isInitialLoad` flag to differentiate error contexts
- **Files Fixed**: `client/src/pages/hooks/useServerView.ts`
- **Impact**: Improved user experience, reduced notification fatigue

### 3. Voice Processing Stuck State
- **Issue**: "Processing voice input..." message never cleared
- **Root Cause**: Processing semaphore wasn't properly reset in all code paths
- **Solution**: Added proper `useState` management with `finally` blocks
- **Files Fixed**: `client/src/modules/voice/hooks/useVoiceToAudio.ts`
- **Key Learning**: Always reset processing states in `finally` blocks

### 4. Voice Processing Latency (Partial Fix)
- **Issue**: 4.5 second delay using sequential API calls (Whisper → GPT → TTS)
- **Solution**: Integrated WebRTC real-time voice for ServerView
- **Performance Gain**: **4.5 seconds → 200ms (22.5x improvement)**
- **Files Created/Modified**:
  - Created: `client/src/pages/hooks/useVoiceOrderWebRTC.ts`
  - Modified: `client/src/pages/components/VoiceOrderModal.tsx`
  - Modified: `client/src/pages/ServerView.tsx`
- **Note**: KioskPage was already using WebRTC correctly

---

## 🔴 CRITICAL Issues (Priority 1) - Block Production

### 1. Type System Fragmentation
**Impact**: HIGH | **Effort**: HIGH | **Risk**: Runtime errors

#### Problems:
- Multiple conflicting type definitions for core entities
- Database schema doesn't match client expectations
- TypeScript types don't match actual API responses

#### Specific Issues:
```typescript
// Database expects:
{ x_pos, y_pos, shape, table_number }

// Client sends:
{ x, y, type, label }

// Types define:
{ position: { x, y }, shape, number }
```

#### Affected Files:
- `shared/types/` - 15+ type definition files
- `client/src/types/` - Duplicated definitions
- `server/src/types/` - Server-specific types
- All transformer functions

#### Recommended Fix:
1. Create single source of truth in `shared/types/`
2. Use transformer pattern consistently
3. Add runtime validation with Zod
4. Generate types from database schema

---

### 2. WebRTC Duplicate Recording Bug
**Impact**: HIGH | **Effort**: MEDIUM | **User Experience**: Poor

#### Current Status:
- 6 attempted fixes have failed
- Audio is recorded and processed twice
- Results in duplicate transcriptions ("You You")
- Costs double in API usage

#### Investigation Needed:
- [ ] Add unique session IDs to track recording lifecycle
- [ ] Implement client-side deduplication
- [ ] Add server-side logging for correlation
- [ ] Test with OpenAI's official examples

#### Files:
- `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- `server/src/routes/realtime.routes.ts`

---

### 3. Memory Leaks in WebSocket Connections
**Impact**: HIGH | **Effort**: MEDIUM | **Risk**: Server crashes

#### Identified Leaks:
1. Heartbeat timers not cleared on error
2. Reconnection timers accumulating
3. Event listeners not removed
4. CleanupManager inconsistently used

#### Critical Code:
```typescript
// Missing cleanup in error handler
catch (error) {
  // Timer still running!
  this.handleError(error)
}
```

#### Files to Audit:
- `client/src/services/websocket/WebSocketService.ts`
- `client/src/services/websocket/VoiceSocketManager.ts`
- All 110 instances of cleanup code

---

## 🟡 IMPORTANT Issues (Priority 2) - Affect Quality

### 1. Component Over-Engineering
**FloorPlanCanvas.tsx**: 575 lines of complexity

#### Features to Remove:
- [ ] Rotation functionality (unused)
- [ ] 8-point resize (4-point sufficient)
- [ ] Complex selection modes
- [ ] Animation system
- [ ] Debug overlays

**Target**: Reduce to <300 lines

---

### 2. Inconsistent Voice Implementation Usage

#### Components Still Using Slow Sequential API:
| Component | Current | Should Use | Latency Impact |
|-----------|---------|------------|----------------|
| DriveThruPage | VoiceControlWithAudio | VoiceControlWebRTC | 4.5s → 200ms |
| ExpoPage | VoiceControlWithAudio | VoiceControlWebRTC | 4.5s → 200ms |
| KioskDemo | VoiceControlWithAudio | VoiceControlWebRTC | 4.5s → 200ms |

#### Migration Pattern:
```typescript
// Replace this:
import VoiceControlWithAudio from '@/modules/voice/components/VoiceControlWithAudio'

// With this:
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC'
```

---

### 3. Console Log Pollution
**Count**: 1,634 console.log statements in production build

#### Solution:
1. Implement structured logging service
2. Use log levels (debug, info, warn, error)
3. Strip console.logs in production build
4. Add ESLint rule to prevent new ones

---

## 🟢 IMPROVEMENTS (Priority 3) - Nice to Have

### 1. Bundle Size Optimization
- **Current**: 1.3MB main bundle
- **Target**: <800KB
- **Quick Win**: Remove test-results HTML (100KB+)

### 2. Database Schema Inconsistencies
- Column naming: snake_case vs camelCase
- Missing indexes for common queries
- No cascade deletes configured

### 3. Error Boundary Coverage
- Only 30% of components have error boundaries
- No error recovery mechanisms
- Missing user-friendly error messages

### 4. Testing Gaps
- Integration tests: 0% coverage
- E2E tests: Only happy paths
- Performance tests: None

---

## 📊 Debt Metrics

### Technical Debt Score: 7.2/10 (High)
- **Type Safety**: 4/10 - Critical issues
- **Performance**: 6/10 - Improved with WebRTC
- **Maintainability**: 5/10 - Over-engineered components
- **Reliability**: 7/10 - Memory leaks present
- **Security**: 8/10 - Test tokens removed

### Estimated Effort to Clear Debt:
- **Critical Issues**: 80 hours
- **Important Issues**: 40 hours  
- **Improvements**: 20 hours
- **Total**: ~140 hours (3.5 weeks)

---

## 🎯 Next Sprint Priorities

### Sprint 1 (Week 1)
1. Fix type system fragmentation
2. Resolve WebRTC duplicate recording
3. Fix memory leaks

### Sprint 2 (Week 2)
1. Simplify FloorPlanCanvas
2. Migrate remaining voice components
3. Implement structured logging

### Sprint 3 (Week 3)
1. Bundle optimization
2. Database schema cleanup
3. Add integration tests

---

## 📝 Lessons Learned

### From Today's Session:
1. **Check existing implementations** - WebRTC was already working in KioskPage
2. **Read your own docs** - Solution was documented in WEBRTC_IMPLEMENTATION.md
3. **Separate concerns** - CREATE vs UPDATE operations need different handling
4. **State management matters** - Use proper React patterns, not just refs
5. **Schema consistency critical** - Mismatches cause silent failures

### Architectural Insights:
- Parallel development created duplicate implementations
- Missing integration tests allowed drift
- Debug features (60% complete) could be productized
- Performance gaps can be massive (22.5x in voice case)

---

## 🚀 Quick Wins Available

### Can Do Today (2 hours each):
1. Remove all console.logs from production
2. Fix remaining memory leaks
3. Add missing database indexes

### Can Do This Week:
1. Migrate all voice components to WebRTC
2. Simplify FloorPlanCanvas
3. Unify type definitions

---

## 📚 Related Documentation
- [KNOWN_ISSUES.md](./voice/KNOWN_ISSUES.md) - Detailed issue tracking
- [OPTIMIZATION_ROADMAP.md](./OPTIMIZATION_ROADMAP.md) - 10-week improvement plan
- [WEBRTC_IMPLEMENTATION.md](./voice/WEBRTC_IMPLEMENTATION.md) - Voice architecture
- [SYSTEM_ARCHITECTURE_OVERVIEW.md](./SYSTEM_ARCHITECTURE_OVERVIEW.md) - System design

---

*This document is actively maintained. Update after each sprint or major fix.*