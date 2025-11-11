# Timer Memory Leak - Quick Fix Guide

## Critical Issues (Fix Today)

### 1. VoiceWebSocketServer (server/src/voice/websocket-server.ts:32)

**Current:**
```typescript
constructor() {
  setInterval(() => this.cleanupInactiveSessions(), 60000);
}
```

**Fixed:**
```typescript
private inactiveSessionCleanupInterval: NodeJS.Timeout | null = null;

constructor() {
  this.inactiveSessionCleanupInterval = setInterval(
    () => this.cleanupInactiveSessions(), 
    60000
  );
}

async cleanup(): Promise<void> {
  if (this.inactiveSessionCleanupInterval) {
    clearInterval(this.inactiveSessionCleanupInterval);
    this.inactiveSessionCleanupInterval = null;
  }
  // ... rest of cleanup
}
```

---

### 2. TwilioBridge (server/src/voice/twilio-bridge.ts)

**Current:**
```typescript
// Periodic cleanup of stale sessions
setInterval(() => {
  const now = Date.now();
  const maxInactivity = 5 * 60 * 1000;
  // ... cleanup logic
}, 60000);
```

**Fixed:**
```typescript
class TwilioBridgeSessionManager {
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 60000);
  }

  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanupStaleSessions() {
    const now = Date.now();
    const maxInactivity = 5 * 60 * 1000;
    // ... cleanup logic
  }
}
```

---

### 3. RealTimeMenuTools (server/src/ai/functions/realtime-menu-tools.ts)

**Current:**
```typescript
// Run cleanup every 5 minutes
setInterval(cleanupExpiredCarts, 5 * 60 * 1000);
```

**Fixed:**
```typescript
class CartCleanupManager {
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredCarts(),
      5 * 60 * 1000
    );
  }

  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async cleanupExpiredCarts() {
    // ... cleanup logic
  }
}

// Export singleton
export const cartCleanupManager = new CartCleanupManager();
```

---

## High Priority Issues (Fix This Week)

### 4. useVoiceOrderWebRTC (client/src/pages/hooks/useVoiceOrderWebRTC.ts)

**Current:**
```typescript
if (isFinal) {
  setTimeout(() => setCurrentTranscript(''), 3000)
}
```

**Fixed:**
```typescript
useEffect(() => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  if (isFinal) {
    timeoutId = setTimeout(() => setCurrentTranscript(''), 3000);
  }
  
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [isFinal]);
```

---

### 5. Debug Dashboard (server/src/voice/debug-dashboard.ts)

**Current:**
```typescript
setInterval(refreshData, 2000);
```

**Fixed:**
```typescript
let refreshInterval: number | null = null;

function initializeDashboard() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(refreshData, 2000);
}

function cleanup() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Call cleanup on page unload
window.addEventListener('beforeunload', cleanup);
```

---

## Verification Checklist

For each fix, verify:

- [ ] Interval/timeout reference is stored in a property or variable
- [ ] Reference is cleared before creating a new one (prevents accumulation)
- [ ] cleanup() or destroy() method properly clears the interval
- [ ] null check prevents clearing undefined
- [ ] Reference is set to null after clearing
- [ ] Error handlers call cleanup method
- [ ] Service is registered with CleanupManager (if server-side)

---

## Testing Fix

```typescript
// Test that cleanup works
describe('Timer Cleanup', () => {
  test('VoiceWebSocketServer clears interval on cleanup', async () => {
    const server = new VoiceWebSocketServer();
    
    // Get interval reference somehow (expose in test)
    const intervalBefore = (server as any).inactiveSessionCleanupInterval;
    expect(intervalBefore).toBeDefined();
    
    await server.cleanup();
    
    const intervalAfter = (server as any).inactiveSessionCleanupInterval;
    expect(intervalAfter).toBeNull();
  });
});
```

---

## CleanupManager Integration (Optional but Recommended)

After fixing, register with CleanupManager:

```typescript
import { CleanupManager } from '@shared/utils/cleanup-manager';

class VoiceWebSocketServer {
  private inactiveSessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    CleanupManager.registerService('voice-websocket-server', this);
  }

  async initialize() {
    this.inactiveSessionCleanupInterval = setInterval(
      () => this.cleanupInactiveSessions(),
      60000
    );
  }

  async cleanup(): Promise<void> {
    if (this.inactiveSessionCleanupInterval) {
      clearInterval(this.inactiveSessionCleanupInterval);
      this.inactiveSessionCleanupInterval = null;
    }
  }

  getStatus() {
    return 'ready'; // For ServiceLifecycle interface
  }

  isHealthy() {
    return true;
  }
}
```

---

## Quick Command to Find Similar Issues

```bash
# Find all unmanaged setInterval calls
grep -rn "setInterval" server/src/ client/src/ --include="*.ts" | grep -v "clearInterval" | grep -v "private" | grep -v "//"
```

---

## Reference: Good Pattern

See these files for excellent examples:
- `shared/utils/websocket-pool.browser.ts` (excellent cleanup)
- `client/src/services/websocket/WebSocketService.ts` (excellent guards)
- `shared/monitoring/performance-monitor.ts` (excellent global cleanup)

---

## Timeline

- **Today:** Fix 3 critical issues
- **This Week:** Fix 2 high-priority issues
- **Next Week:** Monitor and test
- **Follow-up:** Memory profiling to confirm fix

---

## Expected Outcome

After fixes:
- All timers properly cleaned up on shutdown
- No memory growth from orphaned intervals
- Consistent pattern across codebase
- Better memory efficiency: 1-2 MB/day vs 10-20 MB/day

---

**Total Estimated Effort:** 2-4 hours to fix all issues
**Testing Effort:** 1-2 hours to verify fixes

