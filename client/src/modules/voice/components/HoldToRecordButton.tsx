import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/utils';
import { logger } from '@/services/logger';

interface HoldToRecordButtonProps {
  onMouseDown: () => void;
  onMouseUp: () => void;
  isListening: boolean;
  isProcessing: boolean;
  isPlayingAudio?: boolean;
  isPendingStart?: boolean; // True when user tapped but connection isn't ready yet
  isConnected?: boolean; // True when WebRTC connection is established
  isSessionReady?: boolean; // True when session is configured and ready for recording
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'error'; // Current connection state
  disabled?: boolean;
  className?: string;
  mode?: 'hold' | 'toggle' | 'vad'; // Interaction mode: hold to talk, tap to toggle, or VAD (tap to start only)
  showDebounceWarning?: boolean; // Show debounce warning to users (default: false)
  size?: 'normal' | 'large'; // Button size: normal (128px) or large (160px for kiosk)
  debounceMs?: number; // Custom debounce delay in milliseconds (default: 300ms for toggle/vad, 100ms for hold)
}

export const HoldToRecordButton: React.FC<HoldToRecordButtonProps> = ({
  onMouseDown,
  onMouseUp,
  isListening,
  isProcessing,
  isPlayingAudio = false,
  isPendingStart = false,
  isConnected = true, // Default to true for backwards compatibility
  isSessionReady = true, // Default to true for backwards compatibility
  connectionState = 'connected', // Default to connected for backwards compatibility
  disabled = false,
  className,
  mode = 'hold',
  showDebounceWarning: showDebounceWarningProp = false,
  size = 'normal',
  debounceMs,
}) => {
  const isHoldingRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  const [debounceWarning, setDebounceWarning] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Calculate effective debounce: 300ms for toggle/vad mode, 100ms for hold mode
  const effectiveDebounce = debounceMs ?? (mode === 'hold' ? 100 : 300);

  // Derive active state from props instead of relying on local isToggled for visual display
  // This prevents flicker where button shows "Listening..." when not actually recording
  const isActive = (mode === 'toggle' || mode === 'vad')
    ? (isListening || isPendingStart)
    : isHoldingRef.current;

  const handleStart = useCallback(() => {
    if (disabled || (mode === 'hold' && isHoldingRef.current)) return;

    // Debounce rapid starts
    const now = Date.now();
    if (now - lastActionTimeRef.current < effectiveDebounce) {
      // Show feedback when debounce blocks action (if enabled)
      setDebounceWarning(true);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => setDebounceWarning(false), 1000);
      return;
    }

    isHoldingRef.current = true;
    lastActionTimeRef.current = now;
    onMouseDown();
  }, [disabled, mode, onMouseDown, effectiveDebounce]);

  const handleStop = useCallback(() => {
    if (!isHoldingRef.current) return;

    // Debounce rapid stops
    const now = Date.now();
    if (now - lastActionTimeRef.current < effectiveDebounce) {
      // Show feedback when debounce blocks action (if enabled)
      setDebounceWarning(true);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => setDebounceWarning(false), 1000);
      return;
    }

    isHoldingRef.current = false;
    lastActionTimeRef.current = now;
    onMouseUp();
  }, [onMouseUp, effectiveDebounce]);

  // Toggle/VAD mode: click to start (and optionally stop in toggle mode)
  // VAD mode: tap to start only - VAD auto-detects end of speech
  // Toggle mode: tap to start, tap again to stop
  // FIXED: Derive recording state from props (isListening, isPendingStart) instead of local state
  const handleToggleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    if (disabled) return;

    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastActionTimeRef.current < effectiveDebounce) {
      setDebounceWarning(true);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => setDebounceWarning(false), 1000);
      return;
    }

    lastActionTimeRef.current = now;

    // VAD mode: only start recording, never stop (VAD handles stop)
    if (mode === 'vad') {
      if (!isActive) {
        // Start recording - VAD will auto-stop when speech ends
        isHoldingRef.current = true;
        onMouseDown();
      }
      // In VAD mode, tapping while listening does nothing (VAD auto-stops)
      return;
    }

    // Toggle mode: tap to start/stop
    if (isActive) {
      // Stop recording
      isHoldingRef.current = false;
      onMouseUp();
    } else {
      // Start recording
      isHoldingRef.current = true;
      onMouseDown();
    }
  }, [disabled, isActive, mode, onMouseDown, onMouseUp, effectiveDebounce]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (mode === 'toggle' || mode === 'vad') {
      handleToggleClick(e);
    } else {
      handleStart();
    }
  }, [mode, handleToggleClick, handleStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (mode === 'hold') {
      handleStop();
    }
    // In toggle/vad mode, mouseUp doesn't stop recording
  }, [mode, handleStop]);
  
  const handleMouseLeave = useCallback(() => {
    // Release if mouse leaves while holding
    if (isHoldingRef.current) {
      handleStop();
    }
  }, [handleStop]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    // Reject multi-touch in toggle/vad mode (kiosk)
    if (e.touches.length > 1) {
      if (showDebounceWarningProp) {
        logger.warn('[HoldToRecordButton] Multi-touch rejected');
      }
      return;
    }

    if (mode === 'toggle' || mode === 'vad') {
      handleToggleClick(e);
    } else {
      handleStart();
    }
  }, [mode, handleToggleClick, handleStart, showDebounceWarningProp]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isHoldingRef.current) return;

    // Get button element bounds
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    // Get touch coordinates
    const touch = e.touches[0];
    if (!touch) return;

    // Check if touch is still within button bounds (with some padding for comfort)
    const padding = 20; // 20px tolerance outside button
    const isWithinBounds =
      touch.clientX >= rect.left - padding &&
      touch.clientX <= rect.right + padding &&
      touch.clientY >= rect.top - padding &&
      touch.clientY <= rect.bottom + padding;

    // Stop recording if touch moved outside bounds
    if (!isWithinBounds) {
      handleStop();
    }
  }, [handleStop]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (mode === 'hold') {
      handleStop();
    }
    // In toggle mode, touchEnd doesn't stop recording
  }, [mode, handleStop]);

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    // FIXED: Use isActive (derived from props) instead of local isToggled
    if (mode === 'toggle' && isActive) {
      // Reset state on system touch cancel
      isHoldingRef.current = false;
      onMouseUp();

      if (showDebounceWarningProp) {
        logger.info('[HoldToRecordButton] Touch cancelled by system, stopping recording');
      }
    } else if (mode === 'hold') {
      handleStop();
    }
  }, [mode, isActive, onMouseUp, handleStop, showDebounceWarningProp]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Prevent context menu (long-press menu) on mobile
    e.preventDefault();
  }, []);

  // REMOVED: Sync effect was necessary for isToggled state
  // Now that we derive state from props (isListening, isPendingStart),
  // no sync is needed - button state always reflects reality

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getAriaLabel = () => {
    // Connection states first
    if (connectionState === 'disconnected') return 'Tap to connect to voice service';
    if (connectionState === 'connecting' || isPendingStart) return 'Connecting to voice service...';
    if (connectionState === 'error') return 'Voice connection error - tap to retry';
    if (isConnected && !isSessionReady) return 'Initializing voice session...';

    // Ready states
    if (isPlayingAudio) return 'AI is speaking';
    if (mode === 'vad') {
      if (isListening) return 'Listening - speak naturally, I will detect when you finish';
      if (isProcessing) return 'Processing your voice order';
      if (disabled) return 'Voice recording unavailable';
      return 'Tap to start speaking your order';
    } else if (mode === 'toggle') {
      if (isListening) return 'Tap to stop recording';
      if (isProcessing) return 'Processing your voice order';
      if (disabled) return 'Voice recording unavailable';
      return 'Tap to start recording your voice order';
    } else {
      if (isListening) return 'Release to stop recording';
      if (isProcessing) return 'Processing your voice order';
      if (disabled) return 'Voice recording unavailable';
      return 'Hold to record your voice order';
    }
  };

  // Calculate aria-pressed based on active state
  const ariaPressed = isActive;

  // Determine button color based on state
  const getButtonColorClass = () => {
    // Error state - red with error styling
    if (connectionState === 'error') {
      return 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:bg-red-700 focus:ring-red-500';
    }
    // Disconnected - blue/teal to indicate "ready to connect"
    if (connectionState === 'disconnected') {
      return 'bg-teal-600 shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-teal-700 focus:ring-teal-500';
    }
    // Connecting or initializing - gray/muted with pulse
    if (connectionState === 'connecting' || (isConnected && !isSessionReady)) {
      return 'bg-gray-500 shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-gray-600 focus:ring-gray-400 animate-pulse';
    }
    // Active/recording - red
    if (isActive) {
      return 'bg-danger shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-danger-dark focus:ring-danger';
    }
    // Ready to record - primary green
    return 'bg-primary shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-primary-dark focus:ring-primary';
  };

  return (
    <div className="relative inline-block">
      <button
        className={cn(
          'relative rounded-full text-sm font-semibold text-white transition-all duration-200',
          'hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2',
          'focus:outline-none focus:ring-4 focus:ring-offset-2',
          'select-none', // Prevent text selection on long press
          size === 'large' ? 'w-40 h-40' : 'w-32 h-32', // Larger for kiosk (160px vs 128px)
          getButtonColorClass(),
          isProcessing && !connectionState.includes('connect') && 'animate-pulse',
          debounceWarning && showDebounceWarningProp && 'ring-4 ring-yellow-400',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        style={{
          WebkitTouchCallout: 'none', // Prevent iOS callout menu
          WebkitUserSelect: 'none',   // Prevent text selection on iOS
          userSelect: 'none',          // Prevent text selection
          touchAction: 'none'          // Prevent default touch behaviors
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onContextMenu={handleContextMenu}
        disabled={disabled}
        aria-label={getAriaLabel()}
        aria-pressed={ariaPressed}
        aria-busy={isProcessing}
        role="button"
      >
        <Mic className={cn("w-8 h-8", isActive && "animate-pulse", connectionState === 'connecting' && "animate-spin")} />
        <span className="text-center leading-tight">
          {/* Connection states first */}
          {connectionState === 'disconnected' && !isPendingStart ? 'Tap to Connect' :
           connectionState === 'connecting' || isPendingStart ? 'Connecting...' :
           connectionState === 'error' ? 'Connection Error' :
           /* Connected but session not ready */
           isConnected && !isSessionReady ? 'Initializing...' :
           /* Ready states */
           isPlayingAudio ? 'AI Speaking...' :
           isActive ? (mode === 'vad' ? 'Listening...' : 'Listening...') :
           isProcessing ? 'Processing...' :
           mode === 'vad' ? 'Tap to Speak' :
           mode === 'toggle' ? 'Tap to Start' : 'Hold to Speak'}
        </span>
      </button>

      {/* Debounce Warning Tooltip - Only shown if explicitly enabled */}
      {debounceWarning && showDebounceWarningProp && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-1 rounded-md text-xs font-medium shadow-lg animate-bounce">
            Too fast! Wait a moment
          </div>
        </div>
      )}
    </div>
  );
};