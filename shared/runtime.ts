// shared/runtime.ts
// Lightweight runtime helpers used by the client. SSR-safe.

export class ManagedService {
  protected status: 'uninitialized' | 'initializing' | 'ready' | 'disposed' = 'uninitialized';
  private _disposers: Array<() => void> = [];

  constructor(protected serviceName: string = 'ManagedService') {}

  protected registerCleanup(fn: () => void) {
    this._disposers.push(fn);
  }

  async dispose() {
    for (const fn of this._disposers.splice(0)) {
      try { fn(); } catch {
        // Silently ignore cleanup errors
      }
    }
    this.status = 'disposed';
  }
}

export class CleanupManager {
  private _cleanups: Array<() => void> = [];

  add(fn: () => void) {
    this._cleanups.push(fn);
    return () => this.remove(fn);
  }

  remove(fn: () => void) {
    this._cleanups = this._cleanups.filter(f => f !== fn);
  }

  run() {
    for (const fn of this._cleanups.splice(0)) {
      try { fn(); } catch {
        // Silently ignore cleanup errors
      }
    }
  }
}

type MemorySample = { 
  current: number; 
  trend: 'stable' | 'increasing' | 'decreasing';
  leakWarning: boolean;
};

export class RuntimeMemoryMonitor {
  // No-throw polling that works in browser or is a no-op in SSR.
  static getMemoryTrend(): MemorySample {
    // @ts-ignore optional runtime
    const pm = (globalThis as any)?.performance?.memory;
    const used = pm?.usedJSHeapSize ? Math.round(pm.usedJSHeapSize / (1024 * 1024)) : 0;
    
    return {
      current: used,
      trend: 'stable',
      leakWarning: false
    };
  }

  start(callback: (s: MemorySample) => void, ms = 60_000) {
    const tick = () => {
      try { 
        callback(RuntimeMemoryMonitor.getMemoryTrend()); 
      } catch {
        // Ignore callback errors
      }
    };
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }
}