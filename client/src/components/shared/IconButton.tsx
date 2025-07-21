import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'solid' | 'danger';
  isLoading?: boolean;
  label: string; // For accessibility
}

const sizeConfig = {
  xs: { button: 'h-6 w-6', icon: 'h-3 w-3' },
  sm: { button: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { button: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { button: 'h-12 w-12', icon: 'h-6 w-6' },
};

const variantStyles = {
  ghost: cn(
    'hover:bg-accent hover:text-accent-foreground',
    'focus:bg-accent focus:text-accent-foreground',
    'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
  ),
  outline: cn(
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    'focus:bg-accent focus:text-accent-foreground'
  ),
  solid: cn(
    'bg-primary text-primary-foreground hover:bg-primary/90',
    'focus:bg-primary/90'
  ),
  danger: cn(
    'text-red-600 hover:bg-red-50 hover:text-red-700',
    'focus:bg-red-50 focus:text-red-700'
  ),
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  isLoading = false,
  label,
  className,
  disabled,
  ...props
}, ref) => {
  const { button: buttonSize, icon: iconSize } = sizeConfig[size];

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium',
        'ring-offset-background transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        buttonSize,
        variantStyles[variant],
        className
      )}
      aria-label={label}
      {...props}
    >
      {isLoading ? (
        <div className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', iconSize)} />
      ) : (
        <Icon className={iconSize} />
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';