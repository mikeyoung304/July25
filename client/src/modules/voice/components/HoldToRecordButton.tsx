import React, { useCallback } from 'react';
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
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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