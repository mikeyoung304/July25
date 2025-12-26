/**
 * Enterprise Error Handling Types
 * Core types, enums, and interfaces for the error handling system
 */

/**
 * Standard error types for the application
 */
export enum ErrorType {
  // Network & API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TYPE_ERROR = 'TYPE_ERROR',
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR',

  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Business logic errors
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Integration errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',

  // User interface errors
  UI_ERROR = 'UI_ERROR',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  RENDERING_ERROR = 'RENDERING_ERROR',

  // Unknown/unexpected errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  REFRESH = 'refresh',
  RELOAD = 'reload',
  REDIRECT = 'redirect',
  LOGOUT = 'logout'
}

/**
 * Enhanced error interface with enterprise features
 */
export interface EnterpriseError {
  // Basic error info
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;

  // Context information
  component?: string;
  service?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;

  // Technical details
  stack?: string;
  cause?: string;
  details?: Record<string, unknown>;

  // Recovery information
  recoveryStrategy: RecoveryStrategy;
  retryCount?: number;
  maxRetries?: number;
  canRecover: boolean;

  // Metadata
  tags?: string[];
  correlationId?: string;
  requestId?: string;

  // System context
  userAgent?: string;
  url?: string;
  memoryUsage?: number;
  networkStatus?: string;
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  fallbackValue?: unknown;
  fallbackFunction?: () => unknown;
  onRetry?: (error: EnterpriseError, attempt: number) => void;
  onMaxRetriesReached?: (error: EnterpriseError) => void;
}

/**
 * Error reporting configuration
 */
export interface ErrorReportingConfig {
  enableConsoleLogging: boolean;
  enableRemoteReporting: boolean;
  enableUserNotification: boolean;
  reportingEndpoint?: string;
  userNotificationCallback?: (error: EnterpriseError) => void;
  filterSensitiveData?: (error: EnterpriseError) => EnterpriseError;
}

/**
 * Error pattern data for tracking
 */
export interface ErrorPatternData {
  count: number;
  lastSeen: number;
}

/**
 * Error statistics interface
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: EnterpriseError[];
  errorPatterns: Array<{ pattern: string; count: number; lastSeen: number }>;
}
