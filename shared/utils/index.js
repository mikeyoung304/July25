"use strict";
/**
 * Shared Utilities Export
 * Centralized export for all shared utility modules
 */
const __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    let desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
const __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (const p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryMonitor = void 0;
// Cleanup and resource management
__exportStar(require("./cleanup-manager"), exports);
// Memory monitoring and leak detection - renamed export to avoid conflict
const memory_monitoring_1 = require("./memory-monitoring");
Object.defineProperty(exports, "MemoryMonitor", { enumerable: true, get: function () { return memory_monitoring_1.MemoryMonitor; } });
