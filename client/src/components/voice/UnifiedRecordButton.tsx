import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UnifiedRecordButtonProps {
  mode: 'hold-to-talk' | 'tap-to-toggle';
  isRecording: boolean;
  isConnected: boolean;
  isProcessing?: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeConfig = {
  sm: { button: 'w-12 h-12', icon: 'w-5 h-5', pulse: 'w-14 h-14' },
  md: { button: 'w-16 h-16', icon: 'w-6 h-6', pulse: 'w-20 h-20' },
  lg: { button: 'w-20 h-20', icon: 'w-8 h-8', pulse: 'w-24 h-24' },
  xl: { button: 'w-24 h-24', icon: 'w-10 h-10', pulse: 'w-28 h-28' },
};

export const UnifiedRecordButton: React.FC<UnifiedRecordButtonProps> = ({
  mode,
  isRecording,
  isConnected,
  isProcessing = false,
  onStart,
  onStop,
  className,
  size = 'lg',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { button: buttonSize, icon: iconSize, pulse: pulseSize } = sizeConfig[size];

  // Handle hold-to-talk mode
  useEffect(() => {
    if (mode !== 'hold-to-talk') return;

    const button = buttonRef.current;
    if (!button) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      if (isConnected && !isRecording) {
        onStart();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      if (isRecording) {
        onStop();
      }
    };

    const handleMouseLeave = () => {
      if (isRecording) {
        onStop();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (isConnected && !isRecording) {
        onStart();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (isRecording) {
        onStop();
      }
    };

    // Add event listeners
    button.addEventListener('mousedown', handleMouseDown);
    button.addEventListener('mouseup', handleMouseUp);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('touchstart', handleTouchStart, { passive: false });
    button.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Cleanup
    return () => {
      button.removeEventListener('mousedown', handleMouseDown);
      button.removeEventListener('mouseup', handleMouseUp);
      button.removeEventListener('mouseleave', handleMouseLeave);
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode, isConnected, isRecording, onStart, onStop]);

  // Handle tap-to-toggle mode
  const handleClick = () => {
    if (mode !== 'tap-to-toggle') return;
    
    if (!isConnected) return;
    
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  const buttonClasses = cn(
    'relative rounded-full transition-all duration-200 focus:outline-none focus:ring-4',
    buttonSize,
    {
      // State-based styles
      'bg-red-500 hover:bg-red-600 text-white scale-110': isRecording,
      'bg-blue-500 hover:bg-blue-600 text-white': !isRecording && isConnected,
      'bg-gray-300 text-gray-500 cursor-not-allowed': !isConnected,
      
      // Focus styles
      'focus:ring-red-200': isRecording,
      'focus:ring-blue-200': !isRecording && isConnected,
      'focus:ring-gray-200': !isConnected,
      
      // Mode-specific styles
      'active:scale-95': mode === 'hold-to-talk',
    },
    className
  );

  const instructionText = mode === 'hold-to-talk' 
    ? isRecording ? 'Release to stop' : 'Hold to talk'
    : isRecording ? 'Tap to stop' : 'Tap to record';

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Pulsing ring for recording state */}
      {isRecording && (
        <div
          className={cn(
            'absolute rounded-full bg-red-400 animate-ping opacity-25',
            pulseSize
          )}
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      )}

      {/* Main button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={!isConnected || isProcessing}
        className={buttonClasses}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : isRecording ? (
          <MicOff className={iconSize} />
        ) : (
          <Mic className={iconSize} />
        )}
      </button>

      {/* Instruction text */}
      <p className="text-sm text-gray-600 select-none">
        {!isConnected ? 'Connecting...' : instructionText}
      </p>
    </div>
  );
};