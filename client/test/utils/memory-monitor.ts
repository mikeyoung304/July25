/**
 * Memory monitoring utilities for tests
 * Helps identify memory leaks and usage patterns during test execution
 */

export interface MemorySnapshot {
  rss: number;      // Resident Set Size
  heapUsed: number; // Heap used
  heapTotal: number; // Total heap size
  external: number;  // External memory
  timestamp: number;
  label?: string;
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private enabled = process.env.NODE_ENV === 'test' && typeof process.memoryUsage === 'function';

  /**
   * Take a memory snapshot with optional label
   */
  snapshot(label?: string): MemorySnapshot | null {
    if (!this.enabled || !process.memoryUsage) {
      return null;
    }

    const usage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      timestamp: Date.now(),
      label,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Log memory usage with optional label
   */
  logMemoryUsage(label: string): void {
    const snapshot = this.snapshot(label);
    if (snapshot) {
      console.log(`[MEMORY] ${label}:`, {
        rss: `${snapshot.rss} MB`,
        heapUsed: `${snapshot.heapUsed} MB`,
        heapTotal: `${snapshot.heapTotal} MB`,
        external: `${snapshot.external} MB`,
      });
    }
  }

  /**
   * Compare two snapshots and return memory difference
   */
  compareSnapshots(
    before: MemorySnapshot,
    after: MemorySnapshot
  ): { [K in keyof Omit<MemorySnapshot, 'timestamp' | 'label'>]: number } {
    return {
      rss: after.rss - before.rss,
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external,
    };
  }

  /**
   * Log memory leak detection between two points
   */
  detectLeak(
    beforeLabel: string,
    afterLabel: string,
    threshold = 10 // MB threshold for leak warning
  ): boolean {
    const beforeSnapshot = this.snapshots.find(s => s.label === beforeLabel);
    const afterSnapshot = this.snapshots.find(s => s.label === afterLabel);

    if (!beforeSnapshot || !afterSnapshot) {
      console.warn('[MEMORY] Cannot compare - missing snapshots');
      return false;
    }

    const diff = this.compareSnapshots(beforeSnapshot, afterSnapshot);
    const heapGrowth = diff.heapUsed;

    if (heapGrowth > threshold) {
      console.warn(`[MEMORY LEAK DETECTED] Heap grew by ${heapGrowth}MB between ${beforeLabel} and ${afterLabel}`, {
        before: `${beforeSnapshot.heapUsed}MB`,
        after: `${afterSnapshot.heapUsed}MB`,
        growth: `+${heapGrowth}MB`,
        threshold: `${threshold}MB`,
      });
      return true;
    }

    console.log(`[MEMORY] Clean - heap change: ${heapGrowth > 0 ? '+' : ''}${heapGrowth}MB`);
    return false;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
      console.log('[MEMORY] Forced garbage collection');
    } else {
      console.warn('[MEMORY] GC not available - run with --expose-gc');
    }
  }

  /**
   * Get memory usage summary
   */
  getSummary(): string {
    if (this.snapshots.length === 0) {
      return '[MEMORY] No snapshots taken';
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const diff = this.compareSnapshots(first, last);

    return [
      '[MEMORY SUMMARY]',
      `  Duration: ${Math.round((last.timestamp - first.timestamp) / 1000)}s`,
      `  Heap: ${first.heapUsed}MB → ${last.heapUsed}MB (${diff.heapUsed > 0 ? '+' : ''}${diff.heapUsed}MB)`,
      `  RSS: ${first.rss}MB → ${last.rss}MB (${diff.rss > 0 ? '+' : ''}${diff.rss}MB)`,
      `  Snapshots: ${this.snapshots.length}`,
    ].join('\n');
  }
}

// Singleton instance for global use
export const memoryMonitor = new MemoryMonitor();

// Helper functions for easy usage in tests
export function logMemoryUsage(label: string): void {
  memoryMonitor.logMemoryUsage(label);
}

export function memorySnapshot(label?: string): MemorySnapshot | null {
  return memoryMonitor.snapshot(label);
}

export function detectMemoryLeak(
  beforeLabel: string,
  afterLabel: string,
  threshold?: number
): boolean {
  return memoryMonitor.detectLeak(beforeLabel, afterLabel, threshold);
}

export function forceGC(): void {
  memoryMonitor.forceGC();
}