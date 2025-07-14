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

  return (
    <button
      className={cn(
        'relative w-48 h-48 rounded-full text-lg font-bold text-white transition-all duration-300',
        'hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-4',
        'focus:outline-none focus:ring-4 focus:ring-offset-2',
        isListening 
          ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] hover:bg-red-600 focus:ring-red-500' 
          : 'bg-blue-500 shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-blue-600 focus:ring-blue-500',
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