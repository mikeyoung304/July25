import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/utils';

export interface DemoModeBannerProps {
  /** Additional class names */
  className?: string;
  /** Optional custom message (defaults to standard demo mode message) */
  message?: string;
}

/**
 * DemoModeBanner - Consistent demo mode indicator
 *
 * Displays a banner informing users they are in demo mode
 * and no real charges will occur.
 */
export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  className,
  message = 'Demo Mode - No real charges will be made',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'p-3 bg-blue-50 border border-blue-200 rounded-lg',
        className
      )}
    >
      <p className="text-sm text-blue-800 font-medium flex items-center">
        <Info className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
        {message}
      </p>
    </div>
  );
};

DemoModeBanner.displayName = 'DemoModeBanner';
