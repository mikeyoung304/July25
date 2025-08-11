"use strict";
/**
 * Shared Utilities Export
 * Centralized export for all shared utility modules
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMemoryProfiling = exports.useMemoryProfile = exports.MemoryMonitor = exports.LegacyMemoryMonitor = exports.ManagedService = exports.CleanupManager = void 0;
// Cleanup and resource management
__exportStar(require("./cleanup-manager"), exports);
// Memory monitoring and leak detection
__exportStar(require("./memory-monitoring"), exports);
// Re-export commonly used utilities
var cleanup_manager_1 = require("./cleanup-manager");
Object.defineProperty(exports, "CleanupManager", { enumerable: true, get: function () { return cleanup_manager_1.CleanupManager; } });
Object.defineProperty(exports, "ManagedService", { enumerable: true, get: function () { return cleanup_manager_1.ManagedService; } });
Object.defineProperty(exports, "LegacyMemoryMonitor", { enumerable: true, get: function () { return cleanup_manager_1.MemoryMonitor; } });
var memory_monitoring_1 = require("./memory-monitoring");
Object.defineProperty(exports, "MemoryMonitor", { enumerable: true, get: function () { return memory_monitoring_1.MemoryMonitor; } });
Object.defineProperty(exports, "useMemoryProfile", { enumerable: true, get: function () { return memory_monitoring_1.useMemoryProfile; } });
Object.defineProperty(exports, "withMemoryProfiling", { enumerable: true, get: function () { return memory_monitoring_1.withMemoryProfiling; } });
