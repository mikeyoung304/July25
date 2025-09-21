export declare class ManagedService {
    protected serviceName: string;
    protected status: 'uninitialized' | 'initializing' | 'ready' | 'disposed';
    private _disposers;
    constructor(serviceName?: string);
    protected registerCleanup(fn: () => void): void;
    dispose(): Promise<void>;
}
export declare class CleanupManager {
    private _cleanups;
    add(fn: () => void): () => void;
    remove(fn: () => void): void;
    run(): void;
}
type MemorySample = {
    current: number;
    trend: 'stable' | 'increasing' | 'decreasing';
    leakWarning: boolean;
};
export declare class RuntimeMemoryMonitor {
    static getMemoryTrend(): MemorySample;
    start(callback: (s: MemorySample) => void, ms?: number): () => void;
}
export {};
//# sourceMappingURL=runtime.d.ts.map