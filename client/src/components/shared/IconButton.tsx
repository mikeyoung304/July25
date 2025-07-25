import React, { forwardRef } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon;
  isLoading?: boolean;
  label: string; // For accessibility
  iconSize?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon: Icon,
  size = 'icon',
  variant = 'ghost',
  isLoading = false,
  label,
  className,
  iconSize,
  ...props
}, ref) => {
  // Map icon sizes based on button size
  const getIconSize = () => {
    if (iconSize) return iconSize;
    switch (size) {
      case 'sm': return 16;
      case 'lg': return 24;
      case 'icon': return 20;
      default: return 20;
    }
  };

  return (
    <Button
      ref={ref}
      size={size}
      variant={variant}
      className={className}
      aria-label={label}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={getIconSize()} />
      ) : (
        <Icon size={getIconSize()} />
      )}
    </Button>
  );
});

IconButton.displayName = 'IconButton';