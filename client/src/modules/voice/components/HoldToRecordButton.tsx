import React, { useCallback } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/utils';

interface HoldToRecordButtonProps {
  onMouseDown: () => void;
  onMouseUp: () => void;
  isListening: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  className?: string;
}

export const HoldToRecordButton: React.FC<HoldToRecordButtonProps> = ({
  onMouseDown,
  onMouseUp,
  isListening,
  isProcessing,
  disabled = false,
  className,
}) => {
  const handleMouseDown = useCallback(() => {
    if (!disabled) {
      onMouseDown();
    }
  }, [disabled, onMouseDown]);

  const handleMouseUp = useCallback(() => {
    if (!disabled) {
      onMouseUp();
    }
  }, [disabled, onMouseUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!disabled) {
      onMouseDown();
    }
  }, [disabled, onMouseDown]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!disabled) {
      onMouseUp();
    }
  }, [disabled, onMouseUp]);

  const getAriaLabel = () => {
    if (isListening) return 'Release to stop recording';
    if (isProcessing) return 'Processing your voice order';
    if (disabled) return 'Voice recording unavailable';
    return 'Hold to record your voice order';
  };

  return (
    <button
      className={cn(
        'relative w-48 h-48 rounded-full text-lg font-bold text-white transition-all duration-300',
        'hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-4',
        'focus:outline-none focus:ring-4 focus:ring-offset-2',
        isListening 
          ? 'bg-danger shadow-[0_0_40px_rgba(239,68,68,0.6)] hover:bg-danger-dark focus:ring-danger' 
          : 'bg-primary shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-primary-dark focus:ring-primary',
        isProcessing && 'animate-pulse',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
      aria-label={getAriaLabel()}
      aria-pressed={isListening}
      aria-busy={isProcessing}
      role="button"
    >
      <Mic className="w-10 h-10" />
      <span>
        {isListening ? 'LISTENING...' : 
         isProcessing ? 'PROCESSING...' : 
         'HOLD ME'}
      </span>
    </button>
  );
};