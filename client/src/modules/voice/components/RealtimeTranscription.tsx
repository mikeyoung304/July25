import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';

interface RealtimeTranscriptionProps {
  /** Current transcription text being built in real-time */
  text: string;
  /** Whether this is the final transcription or still being processed */
  isFinal: boolean;
  /** Whether the system is currently listening for speech */
  isListening: boolean;
  /** Whether audio is currently being processed */
  isProcessing: boolean;
  /** Confidence level of the transcription (0-1) */
  confidence?: number;
  /** Whether to show the typing animation effect */
  showTypingEffect?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Callback when transcription is complete */
  onTranscriptionComplete?: (text: string) => void;
}

export const RealtimeTranscription: React.FC<RealtimeTranscriptionProps> = ({
  text,
  isFinal,
  isListening,
  isProcessing,
  confidence = 1,
  showTypingEffect = true,
  className,
  onTranscriptionComplete
}) => {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const previousTextRef = useRef('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle text changes with typing effect
  useEffect(() => {
    if (!showTypingEffect) {
      setDisplayText(text);
      return;
    }

    // Clear any existing typing animation
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If text is shorter than display (deletion/correction), update immediately
    if (text.length < displayText.length) {
      setDisplayText(text);
      return;
    }

    // If text hasn't changed, don't animate
    if (text === previousTextRef.current) {
      return;
    }

    // Animate new characters
    const newChars = text.slice(displayText.length);
    let charIndex = 0;

    const typeChar = () => {
      if (charIndex < newChars.length) {
        setDisplayText(prev => prev + newChars[charIndex]);
        charIndex++;
        
        // Vary typing speed for more natural effect
        const delay = newChars[charIndex - 1] === ' ' ? 50 : 30;
        typingTimeoutRef.current = setTimeout(typeChar, delay);
      }
    };

    typeChar();
    previousTextRef.current = text;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, showTypingEffect, displayText.length]);

  // Handle cursor blinking
  useEffect(() => {
    if (!isListening && !isProcessing) {
      setShowCursor(false);
      return;
    }

    setShowCursor(true);
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isListening, isProcessing]);

  // Handle final transcription
  useEffect(() => {
    if (isFinal && text && onTranscriptionComplete) {
      onTranscriptionComplete(text);
    }
  }, [isFinal, text, onTranscriptionComplete]);

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-500';
  };

  // Get status indicator
  const getStatusIndicator = () => {
    if (isListening) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Mic className="w-4 h-4" />
          <span className="text-sm font-medium">Listening...</span>
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-blue-600 rounded animate-pulse"></div>
            <div className="w-1 h-2 bg-blue-400 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-4 bg-blue-600 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex items-center gap-2 text-orange-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Processing...</span>
        </div>
      );
    }

    if (isFinal) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Volume2 className="w-4 h-4" />
          <span className="text-sm font-medium">Complete</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-400">
        <MicOff className="w-4 h-4" />
        <span className="text-sm font-medium">Ready</span>
      </div>
    );
  };

  return (
    <div className={cn(
      'relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all duration-200',
      isListening && 'border-blue-300 shadow-blue-100',
      isProcessing && 'border-orange-300 shadow-orange-100',
      isFinal && 'border-green-300 shadow-green-100',
      className
    )}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        {getStatusIndicator()}
        
        {/* Confidence Indicator */}
        {confidence < 1 && text && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence:</span>
            <div className="flex items-center gap-1">
              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn('h-full transition-all duration-300', getConfidenceColor().replace('text-', 'bg-'))}
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className={cn('text-xs font-medium', getConfidenceColor())}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Text */}
      <div className="min-h-[80px] relative">
        {displayText || (!isListening && !isProcessing) ? (
          <div className="text-lg leading-relaxed">
            <span className={cn(
              'transition-all duration-200',
              isFinal ? 'text-gray-900 font-medium' : 'text-gray-700',
              !isFinal && confidence < 0.6 && 'text-opacity-70'
            )}>
              {displayText || (
                <span className="text-gray-400 italic">
                  {isListening ? 'Start speaking...' : 'Press and hold to record'}
                </span>
              )}
            </span>
            
            {/* Typing Cursor */}
            {showCursor && !isFinal && (
              <span className="inline-block w-0.5 h-6 bg-blue-600 ml-1 animate-pulse" />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-base">
                {isListening ? 'Listening for speech...' : 'Initializing...'}
              </span>
            </div>
          </div>
        )}

        {/* Word Highlighting for Real-time Feedback */}
        {!isFinal && displayText && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="text-lg leading-relaxed">
              {displayText.split(' ').map((word, index, words) => {
                const isLastWord = index === words.length - 1;
                const isRecent = index >= Math.max(0, words.length - 3);
                
                return (
                  <span
                    key={`${word}-${index}`}
                    className={cn(
                      'transition-all duration-300',
                      isLastWord && 'bg-blue-100 px-1 rounded',
                      isRecent && !isLastWord && 'bg-blue-50 px-0.5 rounded'
                    )}
                  >
                    {word}{index < words.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Stats (Development/Debug) */}
      {import.meta.env.DEV && text && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div>Length: {text.length} characters</div>
          <div>Words: {text.split(' ').filter(w => w.length > 0).length}</div>
          <div>Status: {isFinal ? 'Final' : 'Interim'}</div>
          {confidence < 1 && <div>Confidence: {(confidence * 100).toFixed(1)}%</div>}
        </div>
      )}
    </div>
  );
};

export default RealtimeTranscription;