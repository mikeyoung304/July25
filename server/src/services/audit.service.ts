/**
 * Audit Service - Security and Configuration Change Tracking
 *
 * Provides audit logging for security events and configuration changes.
 * Uses the existing security_audit_logs table in Supabase.
 *
 * Reference: ADR-003 (Database Architecture Audit)
 */

import { supabase } from '../config/database';
import { logger } from '../utils/logger';

const auditLogger = logger.child({ service: 'AuditService' });

/**
 * Security event types
 */
export type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_BLOCKED'
  | 'CROSS_TENANT_ACCESS_ATTEMPT'
  | 'HEADER_SPOOF_ATTEMPT'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SESSION_CREATED'
  | 'SESSION_TERMINATED'
  | 'MENU_ITEM_AVAILABILITY_CHANGED'
  | 'MENU_ITEM_86ED'
  | 'MENU_ITEM_RESTORED';

/**
 * Severity levels for security events
 */
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Input for logging security events
 */
export interface LogSecurityEventInput {
  eventType: SecurityEventType;
  userId: string;
  authenticatedRestaurantId: string;
  attemptedRestaurantId: string;
  severity: SecuritySeverity;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown>;
}

/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
  id: string;
  event_type: string;
  user_id: string;
  authenticated_restaurant_id: string;
  attempted_restaurant_id: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  severity: string;
  created_at: string;
}

export class AuditService {
  /**
   * Log a security event to the audit trail
   *
   * @example
   * await AuditService.logSecurityEvent({
   *   eventType: 'CROSS_TENANT_ACCESS_ATTEMPT',
   *   userId: 'user_123',
   *   authenticatedRestaurantId: '11111111-1111-1111-1111-111111111111',
   *   attemptedRestaurantId: '22222222-2222-2222-2222-222222222222',
   *   severity: 'HIGH',
   *   ipAddress: req.ip,
   *   userAgent: req.get('user-agent'),
   * });
   */
  static async logSecurityEvent(input: LogSecurityEventInput): Promise<void> {
    try {
      const { error } = await supabase.from('security_audit_logs').insert({
        event_type: input.eventType,
        user_id: input.userId,
        authenticated_restaurant_id: input.authenticatedRestaurantId,
        attempted_restaurant_id: input.attemptedRestaurantId,
        severity: input.severity,
        session_id: input.sessionId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
      });

      if (error) {
        auditLogger.error('Failed to log security event to database', { error, input });
        // Don't throw - audit logging should not break the request flow
        return;
      }

      // Also log to application logger for immediate visibility
      if (input.severity === 'HIGH' || input.severity === 'CRITICAL') {
        auditLogger.warn(`Security event: ${input.eventType}`, {
          eventType: input.eventType,
          userId: input.userId,
          authenticatedRestaurantId: input.authenticatedRestaurantId,
          attemptedRestaurantId: input.attemptedRestaurantId,
          ipAddress: input.ipAddress,
        });
      } else {
        auditLogger.info(`Security event: ${input.eventType}`, {
          eventType: input.eventType,
          userId: input.userId,
        });
      }
    } catch (error) {
      auditLogger.error('Exception logging security event', { error, input });
      // Swallow error - audit logging should not break the request flow
    }
  }

  /**
   * Get security audit log for a restaurant
   *
   * @param restaurantId - Restaurant to get audit logs for
   * @param options - Optional filters
   * @returns Array of security audit entries
   */
  static async getSecurityAuditLog(
    restaurantId: string,
    options?: {
      eventType?: SecurityEventType;
      severity?: SecuritySeverity;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<SecurityAuditEntry[]> {
    let query = supabase
      .from('security_audit_logs')
      .select('*')
      .eq('authenticated_restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (options?.eventType) {
      query = query.eq('event_type', options.eventType);
    }

    if (options?.severity) {
      query = query.eq('severity', options.severity);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options?.limit || 50)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      auditLogger.error('Failed to fetch security audit log', { error, restaurantId });
      throw error;
    }

    return data || [];
  }

  /**
   * Get cross-tenant access attempts for monitoring
   * Returns all attempts where authenticated restaurant != attempted restaurant
   *
   * @param restaurantId - Restaurant to get attempts for
   * @param options - Optional filters
   * @returns Array of cross-tenant access attempts
   */
  static async getCrossTenantAttempts(
    restaurantId: string,
    options?: {
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<SecurityAuditEntry[]> {
    let query = supabase
      .from('security_audit_logs')
      .select('*')
      .eq('authenticated_restaurant_id', restaurantId)
      .neq('attempted_restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      auditLogger.error('Failed to fetch cross-tenant attempts', { error, restaurantId });
      throw error;
    }

    return data || [];
  }

  /**
   * Log authentication success
   */
  static async logAuthSuccess(
    userId: string,
    restaurantId: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'AUTH_SUCCESS',
      userId,
      authenticatedRestaurantId: restaurantId,
      attemptedRestaurantId: restaurantId,
      severity: 'LOW',
      sessionId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log authentication failure
   */
  static async logAuthFailure(
    userId: string,
    attemptedRestaurantId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      userId,
      authenticatedRestaurantId: attemptedRestaurantId, // Use attempted as authenticated for failures
      attemptedRestaurantId,
      severity: 'MEDIUM',
      ipAddress,
      userAgent,
      metadata: { reason },
    });
  }

  /**
   * Log cross-tenant access attempt (CL-AUTH-002)
   * This is logged when a user tries to access a different restaurant
   */
  static async logCrossTenantAttempt(
    userId: string,
    authenticatedRestaurantId: string,
    attemptedRestaurantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    return this.logSecurityEvent({
      eventType: 'CROSS_TENANT_ACCESS_ATTEMPT',
      userId,
      authenticatedRestaurantId,
      attemptedRestaurantId,
      severity: 'HIGH',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log menu item availability change (Todo #169)
   * Creates audit trail for compliance and dispute resolution
   *
   * @param userId - User who made the change
   * @param restaurantId - Restaurant the item belongs to
   * @param itemId - Menu item that was changed
   * @param itemName - Name of the item (for readability in logs)
   * @param oldValue - Previous availability state
   * @param newValue - New availability state
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  static async logMenuItemAvailabilityChange(
    userId: string,
    restaurantId: string,
    itemId: string,
    itemName: string,
    oldValue: boolean,
    newValue: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Determine specific event type
    const eventType: SecurityEventType = newValue
      ? 'MENU_ITEM_RESTORED'
      : 'MENU_ITEM_86ED';

    return this.logSecurityEvent({
      eventType,
      userId,
      authenticatedRestaurantId: restaurantId,
      attemptedRestaurantId: restaurantId,
      severity: 'LOW',
      ipAddress,
      userAgent,
      metadata: {
        item_id: itemId,
        item_name: itemName,
        old_value: oldValue,
        new_value: newValue,
        change_type: newValue ? 'restored' : '86ed',
      },
    });
  }
}
