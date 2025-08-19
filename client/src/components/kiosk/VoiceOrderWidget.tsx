/**
 * Voice Order Widget for Kiosk Interface
 * Clean, simple voice ordering UI under 150 LOC
 */

import React, { useEffect, useCallback, useState } from 'react';
import { Mic, MicOff, Volume2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useVoiceOrder } from '../../voice/useVoiceOrder';
import styles from './VoiceOrderWidget.module.css';

export interface VoiceOrderWidgetProps {
  restaurantId?: string;
  onOrderComplete?: (transcript: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const VoiceOrderWidget: React.FC<VoiceOrderWidgetProps> = ({
  restaurantId: _restaurantId,
  onOrderComplete,
  onError,
  className = '',
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const {
    isRecording,
    connectionState,
    currentTranscript,
    finalTranscripts,
    currentResponse,
    isPlayingResponse,
    error,
    permissionGranted,
    startRecording,
    stopRecording,
    clearTranscripts,
    requestPermissions,
    connect,
    unlockAutoplay,
  } = useVoiceOrder({
    autoplayUnlockRequired: true,
  });

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      connect();
      setIsInitialized(true);
    };
    init();
  }, [requestPermissions, connect]);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Handle completed orders
  useEffect(() => {
    if (finalTranscripts.length > 0 && !isRecording) {
      const fullTranscript = finalTranscripts.join(' ');
      onOrderComplete?.(fullTranscript);
    }
  }, [finalTranscripts, isRecording, onOrderComplete]);

  // Handle microphone button press/release
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!userInteracted) {
      // First interaction - unlock autoplay
      await unlockAutoplay();
      setUserInteracted(true);
    }

    if (!permissionGranted) {
      await requestPermissions();
      return;
    }

    await startRecording();
  }, [userInteracted, unlockAutoplay, permissionGranted, requestPermissions, startRecording]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    stopRecording();
  }, [stopRecording]);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown(e as any);
  }, [handleMouseDown]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  }, [stopRecording]);

  // Clear all transcripts
  const handleClear = useCallback(() => {
    clearTranscripts();
  }, [clearTranscripts]);

  // Get connection status display
  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected': return { icon: CheckCircle2, text: 'Connected', color: 'success' };
      case 'connecting': return { icon: Loader2, text: 'Connecting...', color: 'warning' };
      case 'reconnecting': return { icon: Loader2, text: 'Reconnecting...', color: 'warning' };
      case 'error': return { icon: AlertCircle, text: 'Connection Error', color: 'error' };
      default: return { icon: AlertCircle, text: 'Disconnected', color: 'error' };
    }
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Voice Ordering</h3>
        <div className={`${styles.status} ${styles[connectionStatus.color]}`}>
          <ConnectionIcon className={styles.statusIcon} />
          <span>{connectionStatus.text}</span>
        </div>
      </div>

      {/* Microphone Button */}
      <div className={styles.micContainer}>
        <button
          className={`${styles.micButton} ${isRecording ? styles.recording : ''} ${!permissionGranted ? styles.disabled : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={!isInitialized || connectionState !== 'connected'}
          aria-label={isRecording ? 'Release to stop recording' : 'Hold to start voice order'}
        >
          {isRecording ? (
            <Mic className={styles.micIcon} />
          ) : (
            <MicOff className={styles.micIcon} />
          )}
          {isRecording && <div className={styles.recordingIndicator} />}
        </button>
        
        <p className={styles.micInstructions}>
          {isRecording ? 'Release to stop' : 'Hold to speak your order'}
        </p>
      </div>

      {/* Transcript Display */}
      {(currentTranscript || finalTranscripts.length > 0) && (
        <div className={styles.transcriptContainer}>
          <div className={styles.transcriptHeader}>
            <span>Your Order</span>
            {finalTranscripts.length > 0 && (
              <button className={styles.clearButton} onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
          
          <div className={styles.transcript}>
            {finalTranscripts.map((transcript, index) => (
              <div key={index} className={styles.finalTranscript}>
                {transcript}
              </div>
            ))}
            {currentTranscript && (
              <div className={styles.partialTranscript}>
                {currentTranscript}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Response */}
      {currentResponse && (
        <div className={styles.responseContainer}>
          <div className={styles.responseHeader}>
            <span>Assistant</span>
            {isPlayingResponse && (
              <div className={styles.audioIndicator}>
                <Volume2 className={styles.audioIcon} />
                <span>Speaking</span>
              </div>
            )}
          </div>
          <div className={styles.response}>
            {currentResponse}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={styles.errorContainer}>
          <AlertCircle className={styles.errorIcon} />
          <span className={styles.errorText}>{error}</span>
        </div>
      )}
    </div>
  );
};