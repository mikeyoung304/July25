import React, { useCallback, useRef } from 'react';
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
  
  const handleStart = useCallback(() => {
    if (disabled || isHoldingRef.current) return;
    
    // Debounce rapid starts
    const now = Date.now();
    if (now - lastActionTimeRef.current < 100) return;
    
    isHoldingRef.current = true;
    lastActionTimeRef.current = now;
    onMouseDown();
  }, [disabled, onMouseDown]);

  const handleStop = useCallback(() => {
    if (!isHoldingRef.current) return;
    
    // Debounce rapid stops
    const now = Date.now();
    if (now - lastActionTimeRef.current < 100) return;
    
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

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleStop();
  }, [handleStop]);

  const getAriaLabel = () => {
    if (isPlayingAudio) return 'AI is speaking';
    if (isListening) return 'Release to stop recording';
    if (isProcessing) return 'Processing your voice order';
    if (disabled) return 'Voice recording unavailable';
    return 'Hold to record your voice order';
  };

  return (
    <button
      className={cn(
        'relative w-32 h-32 rounded-full text-sm font-semibold text-white transition-all duration-300',
        'hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2',
        'focus:outline-none focus:ring-4 focus:ring-offset-2',
        isListening 
          ? 'bg-danger shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-danger-dark focus:ring-danger' 
          : 'bg-primary shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-primary-dark focus:ring-primary',
        isProcessing && 'animate-pulse',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
  );
};