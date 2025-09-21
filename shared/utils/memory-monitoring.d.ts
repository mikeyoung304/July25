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
    rate: number;
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
declare class MemoryMonitoringSystem {
    private snapshots;
    private componentProfiles;
    private serviceProfiles;
    private alerts;
    private isMonitoring;
    private monitoringInterval;
    private alertCallbacks;
    private readonly maxSnapshots;
    private readonly maxAlerts;
    private readonly criticalThreshold;
    private readonly _leakThreshold;
    private readonly monitoringIntervalMs;
    /**
     * Start memory monitoring
     */
    start(): void;
    /**
     * Stop memory monitoring
     */
    stop(): void;
    /**
     * Take memory snapshot
     */
    private takeSnapshot;
    /**
     * Analyze memory trend
     */
    private analyzeMemoryTrend;
    /**
     * Register a React component for memory profiling
     */
    profileComponent(componentName: string): void;
    /**
     * Register a service for memory profiling
     */
    profileService(serviceName: string, metrics: {
        instanceCount?: number;
        listeners?: number;
        timers?: number;
        connections?: number;
    }): void;
    /**
     * Detect component memory leak
     */
    private detectComponentLeak;
    /**
     * Detect service memory leak
     */
    private detectServiceLeak;
    /**
     * Detect various types of memory leaks
     */
    private detectLeaks;
    /**
     * Add alert to the alerting system
     */
    private addAlert;
    /**
     * Subscribe to memory alerts
     */
    onAlert(callback: (alert: MemoryAlert) => void): () => void;
    /**
     * Handle visibility change to pause/resume monitoring
     */
    private handleVisibilityChange;
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
    };
    /**
     * Get memory history for debugging
     */
    getMemoryHistory(minutes?: number): MemorySnapshot[];
    /**
     * Force garbage collection (if available)
     */
    forceGarbageCollection(): boolean;
    /**
     * Clear all monitoring data
     */
    clear(): void;
    /**
     * Generate memory report for debugging
     */
    generateReport(): string;
}
export declare const MemoryMonitorInstance: MemoryMonitoringSystem;
export declare const MemoryMonitor: MemoryMonitoringSystem;
export declare const useMemoryProfile: (componentName: string) => void;
export declare const withMemoryProfiling: <T extends new (...args: any[]) => any>(constructor: T, serviceName?: string) => {
    new (...args: any[]): {
        [x: string]: any;
    };
} & T;
export {};
//# sourceMappingURL=memory-monitoring.d.ts.map