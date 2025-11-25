import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, Mic, Clock, ExternalLink } from 'lucide-react';
import {
  ClassifiedVoiceError,
  VoiceErrorType,
  getErrorTypeLabel
} from '../services/VoiceErrorClassifier';

interface VoiceErrorDisplayProps {
  error: ClassifiedVoiceError;
  onRetry?: () => void;
  onRequestPermission?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Display voice errors with context-aware recovery options
 */
export const VoiceErrorDisplay: React.FC<VoiceErrorDisplayProps> = ({
  error,
  onRetry,
  onRequestPermission,
  onDismiss,
  className = ''
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Rate limit countdown
  useEffect(() => {
    if (error.type === VoiceErrorType.RATE_LIMITED && error.retryDelayMs) {
      const seconds = Math.ceil(error.retryDelayMs / 1000);
      setCountdown(seconds);

      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [error.type, error.retryDelayMs]);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Brief delay before allowing another retry
      setTimeout(() => setIsRetrying(false), 1000);
    }
  }, [onRetry, isRetrying]);

  // Get appropriate icon based on error type
  const getIcon = () => {
    switch (error.type) {
      case VoiceErrorType.PERMISSION:
      case VoiceErrorType.MICROPHONE_FAILED:
        return <Mic className="w-5 h-5" />;
      case VoiceErrorType.RATE_LIMITED:
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Get background color based on error type
  const getBackgroundClass = () => {
    if (!error.recoverable) {
      return 'bg-red-50 border-red-200';
    }
    switch (error.type) {
      case VoiceErrorType.RATE_LIMITED:
        return 'bg-yellow-50 border-yellow-200';
      case VoiceErrorType.TOKEN_EXPIRED:
      case VoiceErrorType.SESSION_TIMEOUT:
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  // Get text color based on error type
  const getTextColorClass = () => {
    if (!error.recoverable) {
      return 'text-red-600';
    }
    switch (error.type) {
      case VoiceErrorType.RATE_LIMITED:
        return 'text-yellow-700';
      case VoiceErrorType.TOKEN_EXPIRED:
      case VoiceErrorType.SESSION_TIMEOUT:
        return 'text-blue-700';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundClass()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className={getTextColorClass()}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-medium ${getTextColorClass()}`}>
              {getErrorTypeLabel(error.type)}
            </p>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 text-xs"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>

          <p className={`text-sm mt-1 ${getTextColorClass()} opacity-90`}>
            {error.userMessage}
          </p>

          {/* Recovery Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Permission Request Button */}
            {error.suggestedAction === 'CHECK_PERMISSIONS' && onRequestPermission && (
              <button
                onClick={onRequestPermission}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <Mic className="w-4 h-4" />
                Grant Permission
              </button>
            )}

            {/* Rate Limit Countdown */}
            {error.type === VoiceErrorType.RATE_LIMITED && countdown !== null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-md">
                <Clock className="w-4 h-4" />
                Retry in {countdown}s
              </div>
            )}

            {/* Retry Button */}
            {error.suggestedAction === 'RETRY' && onRetry && countdown === null && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}

            {/* Refresh Page Suggestion */}
            {error.suggestedAction === 'REFRESH_PAGE' && (
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            )}

            {/* Wait Message */}
            {error.suggestedAction === 'WAIT' && countdown === null && (
              <span className="text-sm text-gray-500">
                Please wait a moment before trying again
              </span>
            )}
          </div>

          {/* Auto-retry indicator for token expiry */}
          {error.type === VoiceErrorType.TOKEN_EXPIRED && error.recoverable && (
            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Automatically reconnecting...
            </p>
          )}

          {/* Contact support for non-recoverable errors */}
          {!error.recoverable && (
            <p className="text-xs text-red-500 mt-2 italic">
              If this problem persists, please contact support.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
