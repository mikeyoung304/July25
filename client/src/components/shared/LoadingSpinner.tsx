import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
  variant?: 'spinner' | 'dots' | 'icon';
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeConfig = {
  xs: { spinner: 'h-4 w-4', text: 'text-xs', container: 'p-2' },
  sm: { spinner: 'h-6 w-6', text: 'text-sm', container: 'p-4' },
  md: { spinner: 'h-8 w-8', text: 'text-base', container: 'p-6' },
  lg: { spinner: 'h-12 w-12', text: 'text-lg', container: 'p-8' },
  xl: { spinner: 'h-16 w-16', text: 'text-xl', container: 'p-12' },
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className,
  variant = 'spinner',
  fullScreen = false,
  overlay = false,
}) => {
  const { spinner: spinnerSize, text: textSize, container: containerPadding } = sizeConfig[size];

  const spinnerElement = () => {
    switch (variant) {
      case 'icon':
        return <Loader2 className={cn(spinnerSize, 'animate-spin text-primary')} />;
      
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-primary',
                  size === 'xs' ? 'h-1.5 w-1.5' : 
                  size === 'sm' ? 'h-2 w-2' : 
                  size === 'md' ? 'h-2.5 w-2.5' : 
                  size === 'lg' ? 'h-3 w-3' : 
                  'h-4 w-4',
                  'animate-bounce'
                )}
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        );
      
      case 'spinner':
      default:
        return (
          <div
            className={cn(
              'animate-spin rounded-full border-b-2 border-primary',
              spinnerSize
            )}
          />
        );
    }
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center', containerPadding)}>
      {spinnerElement()}
      {message && (
        <p className={cn('mt-4 text-muted-foreground', textSize)}>{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={cn(
        'fixed inset-0 flex items-center justify-center',
        overlay && 'bg-background/80 backdrop-blur-sm z-50',
        className
      )}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      {content}
    </div>
  );
};