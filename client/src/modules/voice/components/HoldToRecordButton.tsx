import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/utils';

interface HoldToRecordButtonProps {
  onMouseDown: () => void;
  onMouseUp: () => void;
  isListening: boolean;
  isProcessing: boolean;
  isPlayingAudio?: boolean;
  disabled?: boolean;
  className?: string;
}

export const HoldToRecordButton: React.FC<HoldToRecordButtonProps> = ({
  onMouseDown,
  onMouseUp,
  isListening,
  isProcessing,
  isPlayingAudio = false,
  disabled = false,
  className,
}) => {
  const isHoldingRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  const [showDebounceWarning, setShowDebounceWarning] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleStart = useCallback(() => {
    if (disabled || isHoldingRef.current) return;

    // Debounce rapid starts
    const now = Date.now();
    if (now - lastActionTimeRef.current < 100) {
      // Show feedback when debounce blocks action
      setShowDebounceWarning(true);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => setShowDebounceWarning(false), 1000);
      return;
    }

    isHoldingRef.current = true;
    lastActionTimeRef.current = now;
    onMouseDown();
  }, [disabled, onMouseDown]);

  const handleStop = useCallback(() => {
    if (!isHoldingRef.current) return;

    // Debounce rapid stops
    const now = Date.now();
    if (now - lastActionTimeRef.current < 100) {
      // Show feedback when debounce blocks action
      setShowDebounceWarning(true);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => setShowDebounceWarning(false), 1000);
      return;
    }

    isHoldingRef.current = false;
    lastActionTimeRef.current = now;
    onMouseUp();
  }, [onMouseUp]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart();
  }, [handleStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStop();
  }, [handleStop]);
  
  const handleMouseLeave = useCallback(() => {
    // Release if mouse leaves while holding
    if (isHoldingRef.current) {
      handleStop();
    }
  }, [handleStop]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleStart();
  }, [handleStart]);

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
    handleStop();
  }, [handleStop]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Prevent context menu (long-press menu) on mobile
    e.preventDefault();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getAriaLabel = () => {
    if (isPlayingAudio) return 'AI is speaking';
    if (isListening) return 'Release to stop recording';
    if (isProcessing) return 'Processing your voice order';
    if (disabled) return 'Voice recording unavailable';
    return 'Hold to record your voice order';
  };

  return (
    <div className="relative inline-block">
      <button
        className={cn(
          'relative w-32 h-32 rounded-full text-sm font-semibold text-white transition-all duration-300',
          'hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2',
          'focus:outline-none focus:ring-4 focus:ring-offset-2',
          'select-none', // Prevent text selection on long press
          isListening
            ? 'bg-danger shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-danger-dark focus:ring-danger'
            : 'bg-primary shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-primary-dark focus:ring-primary',
          isProcessing && 'animate-pulse',
          showDebounceWarning && 'ring-4 ring-yellow-400',
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
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
        disabled={disabled}
        aria-label={getAriaLabel()}
        aria-pressed={isListening}
        aria-busy={isProcessing}
        role="button"
      >
        <Mic className="w-8 h-8" />
        <span>
          {isPlayingAudio ? 'PONTIFICATING...' :
           isListening ? 'EAVESDROPPING...' :
           isProcessing ? 'COGITATING...' :
           'HOLD ME'}
        </span>
      </button>

      {/* Debounce Warning Tooltip */}
      {showDebounceWarning && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-1 rounded-md text-xs font-medium shadow-lg animate-bounce">
            Too fast! Wait a moment
          </div>
        </div>
      )}
    </div>
  );
};