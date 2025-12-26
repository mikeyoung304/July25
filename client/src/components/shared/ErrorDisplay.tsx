import React from 'react';
import { AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { getErrorMessage } from '@rebuild/shared';

export interface ErrorDisplayProps {
  error: Error | string | null;
  title?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'banner' | 'fullPage';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  inline: 'text-red-600',
  card: 'p-4 bg-red-50 border border-red-200 rounded-lg',
  banner: 'p-4 bg-red-50 border-l-4 border-red-500',
  fullPage: 'py-12 text-center',
};

const sizeConfig = {
  sm: {
    icon: 'h-4 w-4',
    title: 'text-sm font-medium',
    message: 'text-sm',
    container: 'gap-2',
  },
  md: {
    icon: 'h-5 w-5',
    title: 'text-base font-semibold',
    message: 'text-base',
    container: 'gap-3',
  },
  lg: {
    icon: 'h-6 w-6',
    title: 'text-lg font-semibold',
    message: 'text-lg',
    container: 'gap-4',
  },
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  onRetry,
  variant = 'card',
  size = 'md',
  className,
}) => {
  if (!error) return null;

  const errorMessage = getErrorMessage(error);
  const config = sizeConfig[size];
  const Icon = variant === 'fullPage' ? XCircle : AlertCircle;

  const content = (
    <>
      <div className={cn('flex items-start', config.container)}>
        <Icon className={cn('text-red-500 flex-shrink-0 mt-0.5', config.icon)} />
        <div className="flex-1">
          {title && (
            <h3 className={cn('text-red-800 mb-1', config.title)}>
              {title}
            </h3>
          )}
          <p className={cn('text-red-700', config.message)}>
            {errorMessage}
          </p>
        </div>
      </div>
      
      {onRetry && (
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
          onClick={onRetry}
          className={cn(
            'mt-4',
            variant === 'fullPage' && 'mx-auto'
          )}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </>
  );

  if (variant === 'fullPage') {
    return (
      <div className={cn('flex flex-col items-center', variantStyles[variant], className)}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn(variantStyles[variant], className)}>
      {content}
    </div>
  );
};