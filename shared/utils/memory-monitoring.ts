/**
 * Enterprise Memory Monitoring System
 * Provides comprehensive memory leak detection, monitoring, and reporting
 * for production restaurant kiosk deployments
 */

export interface MemorySnapshot {
  timestamp: number;
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

export interface MemoryTrend {
  current: MemorySnapshot;
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  rate: number; // MB per minute
  leakWarning: boolean;
  criticalWarning: boolean;
}

export interface ComponentMemoryProfile {
  componentName: string;
  renderCount: number;
  lastRender: number;
  memoryAtLastRender: number;
  suspectedLeak: boolean;
}

export interface ServiceMemoryProfile {
  serviceName: string;
  instanceCount: number;
  listeners: number;
  timers: number;
  connections: number;
  memoryFootprint: number;
  suspectedLeak: boolean;
}

export interface MemoryAlert {
  type: 'leak' | 'critical' | 'growth' | 'threshold';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component?: string;
  service?: string;
  recommendations: string[];
  timestamp: number;
}

class MemoryMonitoringSystem {
  private snapshots: MemorySnapshot[] = [];
  private componentProfiles = new Map<string, ComponentMemoryProfile>();
  private serviceProfiles = new Map<string, ServiceMemoryProfile>();
  private alerts: MemoryAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCallbacks: ((alert: MemoryAlert) => void)[] = [];
  
  // Configuration
  private readonly maxSnapshots = 300; // 5 minutes at 1-second intervals
  private readonly maxAlerts = 100;
  private readonly criticalThreshold = 0.85; // 85% of available memory
  private readonly leakThreshold = 0.15; // 15% growth trend
  private readonly monitoringIntervalMs = 1000; // 1 second
  
  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }
    
    console.log('MemoryMonitoringSystem: Starting memory monitoring...');
    this.isMonitoring = true;
    
    // Take initial snapshot
    this.takeSnapshot();
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemoryTrend();
      this.detectLeaks();
    }, this.monitoringIntervalMs);
    
    // Monitor for visibility changes to pause/resume monitoring
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }
  
  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }
    
    console.log('MemoryMonitoringSystem: Stopping memory monitoring...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }
  
  /**
   * Take memory snapshot
   */
  private takeSnapshot(): MemorySnapshot | null {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return null;
    }
    
    const memory = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
    
    return snapshot;
  }
  
  /**
   * Analyze memory trend
   */
  private analyzeMemoryTrend(): MemoryTrend | null {
    if (this.snapshots.length < 10) {
      return null;
    }
    
    const current = this.snapshots[this.snapshots.length - 1];
    const recent = this.snapshots.slice(-60); // Last minute
    const older = this.snapshots.slice(-120, -60); // Previous minute
    
    if (older.length === 0) {
      return null;
    }
    
    const recentAvg = recent.reduce((sum, s) => sum + s.used, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.used, 0) / older.length;
    
    const bytesPerMinute = recentAvg - olderAvg;
    const mbPerMinute = bytesPerMinute / (1024 * 1024);
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(mbPerMinute) > 1) {
      trend = mbPerMinute > 0 ? 'increasing' : 'decreasing';
    }
    
    const leakWarning = trend === 'increasing' && mbPerMinute > 5; // > 5MB/min growth
    const criticalWarning = current.percentage > this.criticalThreshold * 100;
    
    const memoryTrend: MemoryTrend = {
      current,
      trend,
      rate: mbPerMinute,
      leakWarning,
      criticalWarning
    };
    
    // Generate alerts if needed
    if (criticalWarning) {
      this.addAlert({
        type: 'critical',
        severity: 'critical',
        message: `Memory usage critical: ${current.percentage.toFixed(1)}% of available heap`,
        recommendations: [
          'Close unused browser tabs',
          'Refresh the application',
          'Clear browser cache',
          'Check for memory leaks in components'
        ],
        timestamp: Date.now()
      });
    } else if (leakWarning) {
      this.addAlert({
        type: 'leak',
        severity: 'high',
        message: `Potential memory leak detected: ${mbPerMinute.toFixed(1)}MB/min growth`,
        recommendations: [
          'Check for unremoved event listeners',
          'Verify component cleanup on unmount',
          'Look for accumulating state in services',
          'Check for unclosed WebSocket connections'
        ],
        timestamp: Date.now()
      });
    }
    
    return memoryTrend;
  }
  
  /**
   * Register a React component for memory profiling
   */
  profileComponent(componentName: string): void {
    const snapshot = this.takeSnapshot();
    if (!snapshot) return;
    
    const existing = this.componentProfiles.get(componentName);
    
    this.componentProfiles.set(componentName, {
      componentName,
      renderCount: existing ? existing.renderCount + 1 : 1,
      lastRender: Date.now(),
      memoryAtLastRender: snapshot.used,
      suspectedLeak: existing ? this.detectComponentLeak(existing, snapshot) : false
    });
  }
  
  /**
   * Register a service for memory profiling
   */
  profileService(
    serviceName: string,
    metrics: {
      instanceCount?: number;
      listeners?: number;
      timers?: number;
      connections?: number;
    }
  ): void {
    const snapshot = this.takeSnapshot();
    if (!snapshot) return;
    
    const existing = this.serviceProfiles.get(serviceName);
    
    this.serviceProfiles.set(serviceName, {
      serviceName,
      instanceCount: metrics.instanceCount || 1,
      listeners: metrics.listeners || 0,
      timers: metrics.timers || 0,
      connections: metrics.connections || 0,
      memoryFootprint: snapshot.used - (existing?.memoryFootprint || 0),
      suspectedLeak: existing ? this.detectServiceLeak(existing, metrics) : false
    });
  }
  
  /**
   * Detect component memory leak
   */
  private detectComponentLeak(
    profile: ComponentMemoryProfile,
    currentSnapshot: MemorySnapshot
  ): boolean {
    const timeSinceLastRender = Date.now() - profile.lastRender;
    const memoryGrowth = currentSnapshot.used - profile.memoryAtLastRender;
    
    // Suspect leak if memory grew significantly since last render (more than 5 minutes ago)
    return timeSinceLastRender > 300000 && memoryGrowth > 10 * 1024 * 1024; // 10MB
  }
  
  /**
   * Detect service memory leak
   */
  private detectServiceLeak(
    profile: ServiceMemoryProfile,
    currentMetrics: { listeners?: number; timers?: number; connections?: number }
  ): boolean {
    // Suspect leak if counts are growing significantly
    const listenerGrowth = (currentMetrics.listeners || 0) - profile.listeners;
    const timerGrowth = (currentMetrics.timers || 0) - profile.timers;
    const connectionGrowth = (currentMetrics.connections || 0) - profile.connections;
    
    return listenerGrowth > 10 || timerGrowth > 5 || connectionGrowth > 3;
  }
  
  /**
   * Detect various types of memory leaks
   */
  private detectLeaks(): void {
    // Check component profiles for leaks
    for (const [name, profile] of this.componentProfiles) {
      if (profile.suspectedLeak) {
        this.addAlert({
          type: 'leak',
          severity: 'medium',
          message: `Component memory leak suspected: ${name}`,
          component: name,
          recommendations: [
            'Check useEffect cleanup functions',
            'Verify event listener removal',
            'Look for uncancelled subscriptions',
            'Check for circular references'
          ],
          timestamp: Date.now()
        });
      }
    }
    
    // Check service profiles for leaks
    for (const [name, profile] of this.serviceProfiles) {
      if (profile.suspectedLeak) {
        this.addAlert({
          type: 'leak',
          severity: 'high',
          message: `Service memory leak suspected: ${name}`,
          service: name,
          recommendations: [
            'Check service cleanup methods',
            'Verify timer/interval cleanup',
            'Look for accumulating listeners',
            'Check connection pooling'
          ],
          timestamp: Date.now()
        });
      }
    }
  }
  
  /**
   * Add alert to the alerting system
   */
  private addAlert(alert: MemoryAlert): void {
    // Prevent duplicate alerts within 1 minute
    const recentAlerts = this.alerts.filter(a => 
      Date.now() - a.timestamp < 60000 && 
      a.type === alert.type && 
      a.component === alert.component &&
      a.service === alert.service
    );
    
    if (recentAlerts.length > 0) {
      return;
    }
    
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
    
    // Notify alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Memory alert callback failed:', error);
      }
    });
    
    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error('CRITICAL MEMORY ALERT:', alert);
    } else if (alert.severity === 'high') {
      console.warn('HIGH MEMORY ALERT:', alert);
    }
  }
  
  /**
   * Subscribe to memory alerts
   */
  onAlert(callback: (alert: MemoryAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index >= 0) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Handle visibility change to pause/resume monitoring
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      // Reduce monitoring frequency when app is backgrounded
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = setInterval(() => {
          this.takeSnapshot();
        }, 10000); // 10 seconds
      }
    } else {
      // Resume normal monitoring when app is visible
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = setInterval(() => {
          this.takeSnapshot();
          this.analyzeMemoryTrend();
          this.detectLeaks();
        }, this.monitoringIntervalMs);
      }
    }
  }
  
  /**
   * Get current memory status
   */
  getMemoryStatus(): {
    current: MemorySnapshot | null;
    trend: MemoryTrend | null;
    components: ComponentMemoryProfile[];
    services: ServiceMemoryProfile[];
    alerts: MemoryAlert[];
    isMonitoring: boolean;
  } {
    const current = this.snapshots[this.snapshots.length - 1] || null;
    const trend = this.analyzeMemoryTrend();
    
    return {
      current,
      trend,
      components: Array.from(this.componentProfiles.values()),
      services: Array.from(this.serviceProfiles.values()),
      alerts: this.alerts.slice(-20), // Last 20 alerts
      isMonitoring: this.isMonitoring
    };
  }
  
  /**
   * Get memory history for debugging
   */
  getMemoryHistory(minutes: number = 5): MemorySnapshot[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.snapshots.filter(s => s.timestamp >= cutoff);
  }
  
  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): boolean {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('Forced garbage collection');
        return true;
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    }
    return false;
  }
  
  /**
   * Clear all monitoring data
   */
  clear(): void {
    this.snapshots = [];
    this.componentProfiles.clear();
    this.serviceProfiles.clear();
    this.alerts = [];
  }
  
  /**
   * Generate memory report for debugging
   */
  generateReport(): string {
    const status = this.getMemoryStatus();
    const lines: string[] = [];
    
    lines.push('=== MEMORY MONITORING REPORT ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Monitoring: ${status.isMonitoring ? 'Active' : 'Inactive'}`);
    lines.push('');
    
    if (status.current) {
      lines.push('Current Memory:');
      lines.push(`  Used: ${(status.current.used / 1024 / 1024).toFixed(1)} MB`);
      lines.push(`  Total: ${(status.current.total / 1024 / 1024).toFixed(1)} MB`);
      lines.push(`  Limit: ${(status.current.limit / 1024 / 1024).toFixed(1)} MB`);
      lines.push(`  Usage: ${status.current.percentage.toFixed(1)}%`);
      lines.push('');
    }
    
    if (status.trend) {
      lines.push('Memory Trend:');
      lines.push(`  Direction: ${status.trend.trend}`);
      lines.push(`  Rate: ${status.trend.rate.toFixed(2)} MB/min`);
      lines.push(`  Leak Warning: ${status.trend.leakWarning ? 'YES' : 'No'}`);
      lines.push(`  Critical Warning: ${status.trend.criticalWarning ? 'YES' : 'No'}`);
      lines.push('');
    }
    
    if (status.components.length > 0) {
      lines.push('Component Profiles:');
      status.components.forEach(comp => {
        lines.push(`  ${comp.componentName}:`);
        lines.push(`    Renders: ${comp.renderCount}`);
        lines.push(`    Suspected Leak: ${comp.suspectedLeak ? 'YES' : 'No'}`);
      });
      lines.push('');
    }
    
    if (status.services.length > 0) {
      lines.push('Service Profiles:');
      status.services.forEach(svc => {
        lines.push(`  ${svc.serviceName}:`);
        lines.push(`    Instances: ${svc.instanceCount}`);
        lines.push(`    Listeners: ${svc.listeners}`);
        lines.push(`    Timers: ${svc.timers}`);
        lines.push(`    Connections: ${svc.connections}`);
        lines.push(`    Suspected Leak: ${svc.suspectedLeak ? 'YES' : 'No'}`);
      });
      lines.push('');
    }
    
    if (status.alerts.length > 0) {
      lines.push('Recent Alerts:');
      status.alerts.slice(-5).forEach(alert => {
        lines.push(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
        lines.push(`    Time: ${new Date(alert.timestamp).toISOString()}`);
      });
    }
    
    return lines.join('\n');
  }
}

// Singleton instance
export const MemoryMonitor = new MemoryMonitoringSystem();

// React Hook for component memory profiling
export const useMemoryProfile = (componentName: string) => {
  if (typeof window !== 'undefined') {
    MemoryMonitor.profileComponent(componentName);
  }
};

// Service decorator for automatic memory profiling
export const withMemoryProfiling = <T extends new (...args: any[]) => any>(
  constructor: T,
  serviceName?: string
) => {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      
      const name = serviceName || constructor.name;
      
      // Profile on construction
      MemoryMonitor.profileService(name, {
        instanceCount: 1
      });
      
      // Profile periodically if service has monitoring methods
      if (typeof this.getMemoryMetrics === 'function') {
        const profileInterval = setInterval(() => {
          try {
            const metrics = this.getMemoryMetrics();
            MemoryMonitor.profileService(name, metrics);
          } catch (error) {
            console.warn(`Memory profiling failed for ${name}:`, error);
          }
        }, 30000); // Every 30 seconds
        
        // Cleanup interval when service is destroyed
        const originalDestroy = this.destroy || this.cleanup;
        if (originalDestroy) {
          this.destroy = this.cleanup = () => {
            clearInterval(profileInterval);
            return originalDestroy.call(this);
          };
        }
      }
    }
  };
};