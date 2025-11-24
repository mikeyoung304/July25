/**
 * Shared Utilities Export
 * Centralized export for all shared utility modules
 */

// SAFE FOR ALL ENVIRONMENTS (browser + server)
// Order constants and helpers (NO Joi, pure TypeScript)
export * from './order-constants';

// DISABLED FOR SERVER BUILD - these use browser APIs
// Cleanup and resource management - uses EventListener
// export * from './cleanup-manager';

// Memory monitoring and leak detection - uses window, document
// export {
//   MemoryMonitor,
//   MemoryMonitorInstance,
//   type MemorySnapshot,
//   type MemoryTrend,
//   type ComponentMemoryProfile,
//   type ServiceMemoryProfile
// } from './memory-monitoring';