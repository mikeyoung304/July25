---
title: Memory Leaks from Untracked Intervals
category: performance-issues
severity: P0
cost: $2K
duration: 3 weeks silent
symptoms:
  - Memory growth 1-20 MB/day
  - Server restarts every 3-5 days
  - 35+ active handles (should be ~10)
root_cause: 5 different setInterval() calls without stored references
tags: [memory, intervals, cleanup, graceful-shutdown]
created_date: 2025-11-25
affected_files:
  - server/src/voice/websocket-server.ts
  - server/src/middleware/authRateLimiter.ts
  - shared/monitoring/error-tracker.ts
---

# Memory Leaks from Untracked Intervals

## Problem

5 different `setInterval()` calls without stored references. Intervals run forever, prevent clean shutdown, and cause memory growth.

## Bug Pattern

```typescript
// BROKEN: No reference stored, no cleanup path
constructor() {
  setInterval(() => this.cleanupInactiveSessions(), 60000);
  // Runs FOREVER, prevents graceful shutdown
}
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

// Register with graceful shutdown
process.on('SIGTERM', () => {
  voiceWebSocketServer.shutdown();
  rateLimiter.stopCleanup();
});
```

## Detection

```bash
# Check active handles (should be ~10, not 35+)
node -e "process.stdout.write(String(process._getActiveHandles().length))"

# Monitor memory growth
ps aux | grep node | awk '{print $6/1024 " MB"}'
```

## Prevention

- Every `setInterval()` stores reference in class property
- Every interval has `shutdown()` method
- Cleanup methods registered with graceful shutdown
- Window listeners use named functions (not inline)
