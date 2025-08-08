import React from 'react';
import { BaseOrderCard, BaseOrderCardProps } from './BaseOrderCard';
import { cn } from '@/utils';

/**
 * Kitchen Display System OrderCard component
 * Wrapper around BaseOrderCard with KDS-specific defaults
 */
export interface KDSOrderCardProps extends Omit<BaseOrderCardProps, 'variant'> {
  isAnimated?: boolean;
}

export const KDSOrderCard: React.FC<KDSOrderCardProps> = ({ 
  isAnimated = true,
  className,
  ...props 
}) => {
  return (
    <BaseOrderCard 
      {...props} 
      variant="kds"
      showOrderType={true}
      showTimer={true}
      animated={isAnimated}
      className={cn('kds-order-card', className)}
    />
  );
};