/**
 * Voice Error Classification System
 * Classifies errors for appropriate user feedback and recovery actions
 */

export enum VoiceErrorType {
  CONFIGURATION = 'CONFIGURATION',
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  MICROPHONE_FAILED = 'MICROPHONE_FAILED',
  SDP_FAILED = 'SDP_FAILED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export type SuggestedAction = 'RETRY' | 'REFRESH_PAGE' | 'CHECK_PERMISSIONS' | 'WAIT';

export interface ClassifiedVoiceError extends Error {
  type: VoiceErrorType;
  recoverable: boolean;
  userMessage: string;
  suggestedAction: SuggestedAction;
  retryDelayMs?: number;
}

/**
 * Error classification patterns - order matters (first match wins)
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: VoiceErrorType;
  recoverable: boolean;
  userMessage: string;
  suggestedAction: SuggestedAction;
  retryDelayMs?: number;
}> = [
  // Permission errors
  {
    pattern: /permission|not allowed|denied|NotAllowedError/i,
    type: VoiceErrorType.PERMISSION,
    recoverable: true,
    userMessage: 'Microphone access is required for voice ordering',
    suggestedAction: 'CHECK_PERMISSIONS'
  },
  // Microphone hardware errors
  {
    pattern: /microphone|audio.*input|NotFoundError|media.*device/i,
    type: VoiceErrorType.MICROPHONE_FAILED,
    recoverable: false,
    userMessage: 'Could not access your microphone. Please check your device settings.',
    suggestedAction: 'CHECK_PERMISSIONS'
  },
  // Authentication/Token errors
  {
    pattern: /401|unauthorized|invalid.*token|token.*invalid/i,
    type: VoiceErrorType.AUTHENTICATION,
    recoverable: true,
    userMessage: 'Voice service authentication failed',
    suggestedAction: 'REFRESH_PAGE'
  },
  {
    pattern: /token.*expired|expired.*token|jwt.*expired/i,
    type: VoiceErrorType.TOKEN_EXPIRED,
    recoverable: true,
    userMessage: 'Session expired. Reconnecting...',
    suggestedAction: 'RETRY',
    retryDelayMs: 1000
  },
  // Rate limiting
  {
    pattern: /429|rate.*limit|too.*many.*requests|throttl/i,
    type: VoiceErrorType.RATE_LIMITED,
    recoverable: true,
    userMessage: 'Voice service is busy. Please wait a moment.',
    suggestedAction: 'WAIT',
    retryDelayMs: 5000
  },
  // Configuration errors
  {
    pattern: /configuration|api.*key|missing.*key|invalid.*config|OPENAI_API_KEY/i,
    type: VoiceErrorType.CONFIGURATION,
    recoverable: false,
    userMessage: 'Voice service is not configured correctly. Please contact support.',
    suggestedAction: 'REFRESH_PAGE'
  },
  // WebRTC/SDP errors
  {
    pattern: /sdp|ice.*candidate|rtc|webrtc|peer.*connection|setRemoteDescription/i,
    type: VoiceErrorType.SDP_FAILED,
    recoverable: true,
    userMessage: 'Voice connection failed. Please try again.',
    suggestedAction: 'RETRY',
    retryDelayMs: 2000
  },
  // Network errors
  {
    pattern: /network|fetch|connection.*refused|ECONNREFUSED|timeout|aborted|offline/i,
    type: VoiceErrorType.NETWORK,
    recoverable: true,
    userMessage: 'Network connection issue. Please check your internet.',
    suggestedAction: 'RETRY',
    retryDelayMs: 3000
  },
  // Session timeout
  {
    pattern: /session.*timeout|connection.*timeout|timed.*out/i,
    type: VoiceErrorType.SESSION_TIMEOUT,
    recoverable: true,
    userMessage: 'Voice session timed out. Please try again.',
    suggestedAction: 'RETRY',
    retryDelayMs: 1000
  }
];

/**
 * Classify an error and return structured information for recovery
 */
export function classifyError(error: Error): ClassifiedVoiceError {
  const message = error.message || '';
  const name = error.name || '';
  const combined = `${name} ${message}`;

  // Find matching pattern
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(combined)) {
      const classified = Object.assign(new Error(error.message), error, {
        type: pattern.type,
        recoverable: pattern.recoverable,
        userMessage: pattern.userMessage,
        suggestedAction: pattern.suggestedAction,
        retryDelayMs: pattern.retryDelayMs
      }) as ClassifiedVoiceError;
      return classified;
    }
  }

  // Default to unknown
  return Object.assign(new Error(error.message), error, {
    type: VoiceErrorType.UNKNOWN,
    recoverable: true,
    userMessage: 'An unexpected error occurred. Please try again.',
    suggestedAction: 'RETRY' as SuggestedAction,
    retryDelayMs: 2000
  }) as ClassifiedVoiceError;
}

/**
 * Check if an error is recoverable by automatic retry
 */
export function isAutoRetryable(error: ClassifiedVoiceError): boolean {
  return error.recoverable &&
    error.suggestedAction === 'RETRY' &&
    error.type !== VoiceErrorType.PERMISSION;
}

/**
 * Get display-friendly error type label
 */
export function getErrorTypeLabel(type: VoiceErrorType): string {
  const labels: Record<VoiceErrorType, string> = {
    [VoiceErrorType.CONFIGURATION]: 'Configuration Error',
    [VoiceErrorType.AUTHENTICATION]: 'Authentication Error',
    [VoiceErrorType.NETWORK]: 'Network Error',
    [VoiceErrorType.PERMISSION]: 'Permission Required',
    [VoiceErrorType.TOKEN_EXPIRED]: 'Session Expired',
    [VoiceErrorType.RATE_LIMITED]: 'Rate Limited',
    [VoiceErrorType.MICROPHONE_FAILED]: 'Microphone Error',
    [VoiceErrorType.SDP_FAILED]: 'Connection Error',
    [VoiceErrorType.SESSION_TIMEOUT]: 'Session Timeout',
    [VoiceErrorType.UNKNOWN]: 'Unknown Error'
  };
  return labels[type];
}
