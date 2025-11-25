# CL-MEM-001: Memory Leaks from Untracked Intervals

**Severity:** P0 | **Cost:** $2K | **Duration:** 3 weeks silent | **Growth:** 1-20 MB/day

## Problem

5 different `setInterval()` calls without stored references. Intervals run forever, prevent clean shutdown, and cause memory growth. Server restarts every 3-5 days.

## Bug Pattern

```typescript
// BROKEN: No reference stored, no cleanup path
constructor() {
  setInterval(() => this.cleanupInactiveSessions(), 60000);
  // Runs FOREVER, prevents graceful shutdown
}

// BROKEN: Module-level interval with unbounded maps
setInterval(() => {
  for (const [clientId] of suspiciousIPs.entries()) {
    // Maps grow indefinitely under attack
  }
}, 60 * 60 * 1000);

// BROKEN: Window listeners never removed
window.addEventListener('error', handler);  // Duplicate on re-mount
```

## Fix Pattern

```typescript
// CORRECT: Track interval and provide cleanup
private cleanupInterval: NodeJS.Timeout | null = null;

constructor() {
  this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
}

public shutdown(): void {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }
}

// CORRECT: Named handlers that can be removed
private errorHandler = (event: ErrorEvent) => { /* ... */ };

attachListeners(): void {
  window.addEventListener('error', this.errorHandler);
}

cleanup(): void {
  window.removeEventListener('error', this.errorHandler);
}

// Register with graceful shutdown
process.on('SIGTERM', () => {
  voiceWebSocketServer.shutdown();
  rateLimiter.stopCleanup();
});
```

## Prevention Checklist

- [ ] Every `setInterval()` stores reference in class property
- [ ] Every interval has `shutdown()` or `cleanup()` method
- [ ] Cleanup methods registered with graceful shutdown
- [ ] Window listeners use named functions (not inline)
- [ ] Maps have size limits or periodic pruning

## Detection

```bash
# Check active handles (should be ~10, not 35+)
node -e "process.stdout.write(String(process._getActiveHandles().length))"

# Monitor memory growth
ps aux | grep node | awk '{print $6/1024 " MB"}'
```

## Affected Files

- `server/src/voice/websocket-server.ts` (60s cleanup)
- `server/src/middleware/authRateLimiter.ts` (hourly cleanup)
- `shared/monitoring/error-tracker.ts` (5 window listeners)
- `server/src/services/twilio-bridge.ts` (60s health check)
- `server/src/ai/functions/realtime-menu-tools.ts` (5min cart cleanup)
