import React from 'react';
import { BaseOrderCard, BaseOrderCardProps } from './BaseOrderCard';

/**
 * Standard OrderCard component
 * Wrapper around BaseOrderCard for backward compatibility
 */
export interface OrderCardProps extends Omit<BaseOrderCardProps, 'variant'> {
  // Any standard-specific props can go here
}

export const OrderCard: React.FC<OrderCardProps> = (props) => {
  return <BaseOrderCard {...props} variant="standard" />;
};