import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'py-6',
    icon: 'h-8 w-8',
    title: 'text-base',
    message: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-lg',
    message: 'text-base',
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-xl',
    message: 'text-lg',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  action,
  size = 'md',
  className,
}) => {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center text-center', config.container, className)}>
      {Icon && (
        <Icon className={cn('text-muted-foreground mb-4', config.icon)} />
      )}
      
      {title && (
        <h3 className={cn('font-semibold text-foreground mb-2', config.title)}>
          {title}
        </h3>
      )}
      
      <p className={cn('text-muted-foreground max-w-md', config.message)}>
        {message}
      </p>
      
      {action && (
        <Button
          variant={action.variant || 'default'}
          onClick={action.onClick}
          className="mt-6"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};