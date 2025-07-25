import React from 'react';
import { cn } from '@/lib/utils';

interface SkipNavigationProps {
  mainId?: string;
  className?: string;
}

export const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  mainId = 'main-content',
  className 
}) => {
  return (
    <a
      href={`#${mainId}`}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
        'bg-primary text-white px-4 py-2 rounded-lg z-50',
        'focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2',
        'transition-all duration-200',
        className
      )}
    >
      Skip to main content
    </a>
  );
};