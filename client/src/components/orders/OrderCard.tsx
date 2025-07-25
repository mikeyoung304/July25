import React from 'react';
import { BaseOrderCard, BaseOrderCardProps } from './BaseOrderCard';

/**
 * Standard OrderCard component
 * Wrapper around BaseOrderCard for backward compatibility
 */
export type OrderCardProps = Omit<BaseOrderCardProps, 'variant'>

export const OrderCard: React.FC<OrderCardProps> = (props) => {
  return <BaseOrderCard {...props} variant="standard" />;
};