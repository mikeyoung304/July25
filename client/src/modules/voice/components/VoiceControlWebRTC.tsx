import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebRTCVoice } from '../hooks/useWebRTCVoice';
// ConnectionIndicator removed - using inline status
import { HoldToRecordButton } from './HoldToRecordButton';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { VoiceDebugPanel } from './VoiceDebugPanel';
import { AlertCircle, Mic, MicOff, RefreshCw, Settings, ChevronDown, ChevronUp, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { logger } from '../../../services/monitoring/logger';
import { useAuth } from '@/contexts/auth.hooks';
import { detectVoiceAgentMode, getAgentModeConfig, VoiceAgentMode } from '../services/VoiceAgentModeDetector';
import { PaymentSheet } from '../../payments/PaymentSheet';
import { useRestaurantContext } from '@/core/RestaurantContext';

interface VoiceControlWebRTCProps {
  onTranscript?: (text: string) => void;
  onOrderDetected?: (order: any) => void;
  onOrderConfirmation?: (confirmation: { action: string; timestamp: number }) => void;
  onVisualFeedback?: (feedback: { text: string; isFinal: boolean }) => void;
  onPaymentRequired?: (amount: number) => void; // Callback when payment is needed
  onOrderSubmit?: (paymentToken?: string) => void; // Callback when order is ready to submit
  orderAmount?: number; // Total order amount for payment
  debug?: boolean;
  className?: string;
  overrideMode?: VoiceAgentMode; // Optional override for testing
}

/**
 * WebRTC-based voice control component using OpenAI Realtime API
 * Provides low-latency voice transcription with direct browser-to-OpenAI connection
 */
export const VoiceControlWebRTC: React.FC<VoiceControlWebRTCProps> = ({
  onTranscript,
  onOrderDetected,
  onOrderConfirmation,
  onVisualFeedback,
  onPaymentRequired,
  onOrderSubmit,
  orderAmount = 0,
  debug = false,
  className = '',
  overrideMode,
}) => {
  const [showDebug, setShowDebug] = useState(debug);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [visualFeedback, setVisualFeedback] = useState<string>('');
  const [showConnectivityDetails, setShowConnectivityDetails] = useState(false);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [awaitingPaymentForOrder, setAwaitingPaymentForOrder] = useState(false);

  // Get authentication and restaurant context
  const { user, isAuthenticated } = useAuth();
  const { restaurant } = useRestaurantContext();

  // Detect agent mode based on authentication
  const detectedMode = useMemo(() => {
    if (overrideMode) return overrideMode;
    return detectVoiceAgentMode({ user, isAuthenticated });
  }, [user, isAuthenticated, overrideMode]);

  // Get configuration for the detected mode
  const modeConfig = useMemo(() => {
    return getAgentModeConfig(detectedMode);
  }, [detectedMode]);

  logger.info('[VoiceControlWebRTC] Agent mode detected:', {
    mode: detectedMode,
    isAuthenticated,
    userRole: user?.role,
    config: modeConfig
  });
  
  // Stabilize callbacks to prevent hook re-initialization
  const handleTranscript = useCallback((event: any) => {
    onTranscript?.(event.text);
  }, [onTranscript]);

  const handleOrderDetected = useCallback((order: any) => {
    logger.info('[VoiceControlWebRTC] Order detected:', { order, mode: detectedMode });

    // For customer mode, check if payment is needed before processing
    if (detectedMode === VoiceAgentMode.CUSTOMER && modeConfig.requirePayment) {
      logger.info('[VoiceControlWebRTC] Customer mode - payment required before order submission');
      setAwaitingPaymentForOrder(true);

      // Notify parent that payment is required
      if (orderAmount > 0) {
        onPaymentRequired?.(orderAmount);
        setShowPaymentSheet(true);
      } else {
        logger.error('[VoiceControlWebRTC] No order amount provided for payment');
        setToastMessage({
          type: 'error',
          message: 'Cannot process payment: order amount not available'
        });
      }
    } else {
      // Employee mode or payment not required - proceed with order
      onOrderDetected?.(order);
    }
  }, [onOrderDetected, detectedMode, modeConfig.requirePayment, orderAmount, onPaymentRequired]);

  const handleOrderConfirmation = useCallback((confirmation: { action: string; timestamp: number }) => {
    logger.info('[VoiceControlWebRTC] Order confirmation received:', { action: confirmation.action });
    onOrderConfirmation?.(confirmation);
  }, [onOrderConfirmation]);

  const handleVisualFeedback = useCallback((feedback: { text: string; isFinal: boolean }) => {
    setVisualFeedback(feedback.text);
    onVisualFeedback?.(feedback);
  }, [onVisualFeedback]);

  // Toast notification effect
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000); // Auto-dismiss after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const {
    connect,
    disconnect,
    isConnected,
    connectionState,
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    lastTranscript,
    responseText,
    isProcessing,
    error,
    refreshDevices,
    getConnectivityDetails,
  } = useWebRTCVoice({
    autoConnect: false, // We'll connect after permission check
    debug,
    mode: detectedMode,
    enableAudioOutput: modeConfig.enableVoiceOutput,
    visualFeedbackOnly: modeConfig.confirmationStyle === 'visual',
    onTranscript: handleTranscript,
    onOrderDetected: handleOrderDetected,
    onOrderConfirmation: handleOrderConfirmation,
    onVisualFeedback: handleVisualFeedback,
  });
  
  // Check microphone permission
  useEffect(() => {
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((result) => {
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        
        result.addEventListener('change', () => {
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        });
        
        // REMOVED AUTO-CONNECT: User must explicitly click "Connect Voice"
        // This prevents race conditions and gives user control over connection
        if (result.state === 'granted') {
          logger.info('[VoiceControlWebRTC] Microphone permission granted - ready to connect');
        }
      })
      .catch((err) => {
        console.warn('Cannot query microphone permission:', err);
        // Assume prompt state if we can't check
        setPermissionState('prompt');
      });
  }, [connect]);
  
  // Handle initial permission request
  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
      setPermissionState('granted');
      // Don't auto-connect after permission - let user click Connect Voice
      logger.info('[VoiceControlWebRTC] Microphone permission granted - user can now connect');
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setPermissionState('denied');
    }
  };
  
  // Handle recording button - no event params needed
  const handleRecordStart = () => {
    if (isConnected && !isRecording) {
      startRecording();
    }
  };
  
  const handleRecordStop = () => {
    if (isRecording) {
      stopRecording();
    }
  };
  
  // Render permission prompt
  if (permissionState === 'prompt') {
    return (
      <div className={`voice-control-webrtc ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Microphone Permission Required</p>
              <p className="text-xs text-yellow-600 mt-1">
                We need access to your microphone for voice ordering
              </p>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable Microphone
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Handle device refresh
  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    try {
      await refreshDevices();
      setToastMessage({
        type: 'success',
        message: 'Device list refreshed successfully'
      });
    } catch (err) {
      console.error('Failed to refresh devices:', err);
      setToastMessage({
        type: 'error',
        message: 'Failed to refresh devices. Please try again.'
      });
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  // Render permission denied
  if (permissionState === 'denied') {
    return (
      <div className={`voice-control-webrtc ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MicOff className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Microphone Access Denied</p>
              <p className="text-xs text-red-600 mt-1">
                Voice ordering requires microphone access. Please enable it in your browser settings.
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-red-600">To enable microphone access:</p>
                <ol className="text-xs text-red-600 list-decimal list-inside space-y-0.5 ml-2">
                  <li>Click the lock/info icon in your browser's address bar</li>
                  <li>Set microphone permission to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show main interface when permission is granted OR connected
  if (permissionState === 'granted' || isConnected) {
    return (
      <div className={`voice-control-webrtc space-y-4 ${className}`}>
        {/* Toast Notification */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg border max-w-sm ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            toastMessage.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
            toastMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">{toastMessage.message}</p>
              <button
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Connection Status and Mode Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionState === 'connected' ? 'bg-green-500' :
                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionState === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-600 capitalize">
                {connectionState === 'disconnected' && permissionState === 'granted'
                  ? 'Ready to connect'
                  : connectionState}
              </span>
            </div>

            {/* Mode Indicator */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Mode:</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                detectedMode === VoiceAgentMode.EMPLOYEE
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {detectedMode === VoiceAgentMode.EMPLOYEE ? 'Employee' : 'Customer'}
              </span>
            </div>
          </div>
        
        {/* Debug Toggle */}
        {debug && (
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDebug ? 'Hide' : 'Show'} Debug
          </button>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className={`border rounded-lg p-3 ${
          error.type === 'permission_denied'
            ? 'bg-yellow-50 border-yellow-200'
            : error.type === 'device_error'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {error.type === 'permission_denied' ? (
              <MicOff className={`w-4 h-4 mt-0.5 ${
                error.type === 'permission_denied' ? 'text-yellow-600' : 'text-red-600'
              }`} />
            ) : error.type === 'device_error' ? (
              <Settings className="w-4 h-4 text-orange-600 mt-0.5" />
            ) : connectionState === 'reconnecting' ? (
              <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                error.type === 'permission_denied'
                  ? 'text-yellow-800'
                  : error.type === 'device_error'
                  ? 'text-orange-800'
                  : 'text-red-800'
              }`}>
                {error.type === 'permission_denied'
                  ? 'Microphone Permission Required'
                  : error.type === 'device_error'
                  ? 'Microphone Issue'
                  : error.type === 'auth_error'
                  ? 'Authentication Required'
                  : error.type === 'rate_limit'
                  ? 'Service Temporarily Unavailable'
                  : error.type === 'network_error'
                  ? 'Connection Issue'
                  : 'Voice Service Error'}
              </p>
              <p className={`text-xs mt-1 ${
                error.type === 'permission_denied'
                  ? 'text-yellow-600'
                  : error.type === 'device_error'
                  ? 'text-orange-600'
                  : 'text-red-600'
              }`}>
                {error.userFriendlyMessage}
              </p>

              {/* Special handling for permission denied */}
              {error.type === 'permission_denied' && (
                <div className="mt-2">
                  <a
                    href="https://support.google.com/chrome/answer/2693767"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Browser microphone settings
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Device error - offer refresh */}
              {error.type === 'device_error' && (
                <button
                  onClick={handleRefreshDevices}
                  disabled={isRefreshingDevices}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-orange-700 hover:text-orange-800 underline disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingDevices ? 'animate-spin' : ''}`} />
                  Refresh devices
                </button>
              )}

              {/* Retry button for retryable errors */}
              {error.retryable && connectionState !== 'reconnecting' && (
                <button
                  onClick={async () => {
                    logger.info('[VoiceControlWebRTC] Retrying connection after error');
                    try {
                      await connect();
                    } catch (err) {
                      logger.error('[VoiceControlWebRTC] Retry failed:', { error: err });
                    }
                  }}
                  className={`text-xs underline mt-2 ${
                    error.type === 'permission_denied'
                      ? 'text-yellow-700 hover:text-yellow-800'
                      : error.type === 'device_error'
                      ? 'text-orange-700 hover:text-orange-800'
                      : 'text-red-700 hover:text-red-800'
                  }`}
                >
                  Try again
                </button>
              )}

              {/* Reconnecting status */}
              {connectionState === 'reconnecting' && (
                <p className="text-xs text-blue-600 mt-2">
                  Reconnecting automatically...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Voice Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Record Button */}
        <div className="flex flex-col items-center space-y-4">
          <HoldToRecordButton
            onMouseDown={handleRecordStart}
            onMouseUp={handleRecordStop}
            isListening={isRecording}
            isProcessing={isProcessing}
            disabled={!isConnected || connectionState === 'error'}
          />
          
          {/* Status Text */}
          <div className="text-center">
            {!isConnected && connectionState === 'connecting' && (
              <p className="text-sm text-gray-500">Connecting to voice service...</p>
            )}
            {isConnected && !isRecording && !isProcessing && (
              <p className="text-sm text-gray-500">Hold button to speak</p>
            )}
            {isRecording && (
              <p className="text-sm text-red-600 font-medium animate-pulse">Recording...</p>
            )}
            {isProcessing && !isRecording && (
              <p className="text-sm text-blue-600">Processing...</p>
            )}
          </div>
        </div>
        
        {/* Transcription Display */}
        {(transcript || responseText) && (
          <div className="mt-6 space-y-3">
            {transcript && (
              <div>
                <p className="text-xs text-gray-500 mb-1">You said:</p>
                <TranscriptionDisplay 
                  transcription={transcript}
                  isInterim={!lastTranscript?.isFinal}
                  confidence={lastTranscript?.confidence}
                />
              </div>
            )}
            
            {responseText && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Assistant:</p>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-900">{responseText}</p>
                </div>
              </div>
            )}

            {/* Visual feedback for employee mode */}
            {detectedMode === VoiceAgentMode.EMPLOYEE && visualFeedback && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Order Status:</p>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-green-900 font-medium">{visualFeedback}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Connection Controls */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {!isConnected && connectionState !== 'connecting' && connectionState !== 'reconnecting' && (
            <button
              onClick={async () => {
                logger.info('[VoiceControlWebRTC] User clicked Connect Voice button');
                try {
                  await connect();
                  logger.info('[VoiceControlWebRTC] Connection initiated successfully');
                } catch (err) {
                  logger.error('[VoiceControlWebRTC] Connection failed:', { error: err });
                  // Error will be displayed via the error state above
                }
              }}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Connect Voice
            </button>
          )}

          {(connectionState === 'connecting' || connectionState === 'reconnecting') && (
            <div className="flex-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
            </div>
          )}

          {isConnected && (
            <button
              onClick={disconnect}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Connectivity Details Panel (Development Mode) */}
        {debug && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowConnectivityDetails(!showConnectivityDetails)}
              className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600"
            >
              <span className="flex items-center gap-2">
                {connectionState === 'connected' ? (
                  <Wifi className="w-3 h-3 text-green-600" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-600" />
                )}
                Connectivity Details
              </span>
              {showConnectivityDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showConnectivityDetails && (
              <div className="p-3 bg-white text-xs space-y-2">
                {(() => {
                  const details = getConnectivityDetails();
                  return (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">State:</span>
                          <span className={`ml-1 font-mono ${
                            details.connectionState === 'connected' ? 'text-green-600' :
                            details.connectionState === 'reconnecting' ? 'text-blue-600' :
                            details.connectionState === 'connecting' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {details.connectionState}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reconnects:</span>
                          <span className="ml-1 font-mono">
                            {details.reconnectAttempts}/{details.maxReconnectAttempts}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Recording:</span>
                          <span className={`ml-1 font-mono ${details.isRecording ? 'text-green-600' : 'text-gray-400'}`}>
                            {details.isRecording ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Channel:</span>
                          <span className={`ml-1 font-mono ${details.dcReady ? 'text-green-600' : 'text-red-600'}`}>
                            {details.dcReady ? 'READY' : 'NOT_READY'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Media Stream:</span>
                          <span className={`ml-1 font-mono ${details.hasMediaStream ? 'text-green-600' : 'text-red-600'}`}>
                            {details.hasMediaStream ? 'ACTIVE' : 'NONE'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Devices:</span>
                          <span className="ml-1 font-mono">{details.deviceCount}</span>
                        </div>
                      </div>

                      {details.queueSize > 0 && (
                        <div className="pt-1 border-t border-gray-100">
                          <span className="text-gray-500">Queued messages:</span>
                          <span className="ml-1 font-mono text-yellow-600">{details.queueSize}</span>
                        </div>
                      )}

                      {details.lastError && (
                        <div className="pt-1 border-t border-gray-100">
                          <div className="text-gray-500">Last error:</div>
                          <div className="font-mono text-red-600 text-xs bg-red-50 p-1 rounded">
                            {details.lastError.type}: {details.lastError.message}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Debug Panel */}
      {showDebug && (
        <VoiceDebugPanel
          connectionState={connectionState}
          isRecording={isRecording}
          transcript={transcript}
          error={error}
        />
      )}

      {/* Payment Sheet for Customer Mode */}
      {showPaymentSheet && detectedMode === VoiceAgentMode.CUSTOMER && (
        <PaymentSheet
          amount={orderAmount}
          restaurantId={restaurant?.id || ''}
          onSuccess={(paymentToken, method) => {
            logger.info('[VoiceControlWebRTC] Payment successful', { method, tokenLength: paymentToken.length });
            setShowPaymentSheet(false);
            setAwaitingPaymentForOrder(false);

            // Now submit the order with payment token
            onOrderSubmit?.(paymentToken);

            setToastMessage({
              type: 'success',
              message: 'Payment successful! Submitting order...'
            });
          }}
          onCancel={() => {
            logger.info('[VoiceControlWebRTC] Payment cancelled by user');
            setShowPaymentSheet(false);
            setAwaitingPaymentForOrder(false);

            setToastMessage({
              type: 'warning',
              message: 'Payment cancelled. Order not submitted.'
            });
          }}
        />
      )}
    </div>
  );
  }

  // Fallback - should not normally reach here
  return null;
};