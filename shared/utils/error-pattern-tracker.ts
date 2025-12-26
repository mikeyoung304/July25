/**
 * Error Pattern Tracker Module
 * Tracks and analyzes error patterns for detecting error storms and anomalies
 */

import type { EnterpriseError, ErrorPatternData } from './error-types';
import { ErrorType, ErrorSeverity } from './error-types';

/**
 * Callback for handling error storm detection
 */
export type ErrorStormCallback = (
  error: Error,
  context: {
    type: ErrorType;
    severity: ErrorSeverity;
    component: string;
    details: { originalPattern: string; occurrences: number };
  }
) => void;

/**
 * ErrorPatternTracker class handles error pattern analysis:
 * - Tracks error patterns by type and component
 * - Detects error storms (frequent occurrences of same error)
 * - Provides pattern statistics
 */
export class ErrorPatternTracker {
  private errorPatterns = new Map<string, ErrorPatternData>();
  private errorStormThreshold = 10;
  private errorStormTimeWindow = 60000; // 1 minute
  private onErrorStorm: ErrorStormCallback | undefined = undefined;

  constructor(onErrorStorm?: ErrorStormCallback) {
    if (onErrorStorm) {
      this.onErrorStorm = onErrorStorm;
    }
  }

  /**
   * Set error storm callback
   */
  setErrorStormCallback(callback: ErrorStormCallback | undefined): void {
    if (callback) {
      this.onErrorStorm = callback;
    } else {
      this.onErrorStorm = undefined;
    }
  }

  /**
   * Configure error storm detection thresholds
   */
  configureStormDetection(threshold: number, timeWindowMs: number): void {
    this.errorStormThreshold = threshold;
    this.errorStormTimeWindow = timeWindowMs;
  }

  /**
   * Track error pattern for analysis
   */
  trackErrorPattern(error: EnterpriseError): void {
    const pattern = `${error.type}:${error.component || 'unknown'}`;
    const existing = this.errorPatterns.get(pattern);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.errorPatterns.set(pattern, {
        count: 1,
        lastSeen: Date.now()
      });
    }

    // Check for error storms (same error type occurring frequently)
    if (existing && existing.count > this.errorStormThreshold) {
      const timeSinceFirst = Date.now() - (existing.lastSeen - (existing.count * 1000));
      if (timeSinceFirst < this.errorStormTimeWindow) {
        // Debug: Error storm detected

        // Notify via callback if provided
        if (this.onErrorStorm) {
          this.onErrorStorm(new Error(`Error storm: ${pattern}`), {
            type: ErrorType.SYSTEM_ERROR,
            severity: ErrorSeverity.CRITICAL,
            component: 'ErrorHandler',
            details: { originalPattern: pattern, occurrences: existing.count }
          });
        }
      }
    }
  }

  /**
   * Get all tracked patterns
   */
  getPatterns(): Array<{ pattern: string; count: number; lastSeen: number }> {
    return Array.from(this.errorPatterns.entries()).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      lastSeen: data.lastSeen
    }));
  }

  /**
   * Get pattern data for a specific pattern key
   */
  getPatternData(pattern: string): ErrorPatternData | undefined {
    return this.errorPatterns.get(pattern);
  }

  /**
   * Clear all tracked patterns
   */
  clear(): void {
    this.errorPatterns.clear();
  }

  /**
   * Get the most frequent error patterns
   */
  getTopPatterns(limit: number = 10): Array<{ pattern: string; count: number; lastSeen: number }> {
    return this.getPatterns()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get patterns that occurred within a time window
   */
  getRecentPatterns(timeWindowMs: number): Array<{ pattern: string; count: number; lastSeen: number }> {
    const cutoff = Date.now() - timeWindowMs;
    return this.getPatterns().filter(p => p.lastSeen >= cutoff);
  }

  /**
   * Check if a pattern indicates an error storm
   */
  isErrorStorm(pattern: string): boolean {
    const data = this.errorPatterns.get(pattern);
    if (!data || data.count <= this.errorStormThreshold) {
      return false;
    }

    const timeSinceFirst = Date.now() - (data.lastSeen - (data.count * 1000));
    return timeSinceFirst < this.errorStormTimeWindow;
  }
}
