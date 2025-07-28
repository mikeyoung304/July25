import { useMemo } from 'react';
import type { Order } from '@rebuild/shared';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface UrgencyConfig {
  lowThreshold: number;    // minutes
  mediumThreshold: number; // minutes
  highThreshold: number;   // minutes
}

const DEFAULT_CONFIG: UrgencyConfig = {
  lowThreshold: 5,
  mediumThreshold: 10,
  highThreshold: 15,
};

const KDS_CONFIG: UrgencyConfig = {
  lowThreshold: 7,
  mediumThreshold: 12,
  highThreshold: 18,
};

export function useOrderUrgency(
  order: Order,
  variant: 'standard' | 'kds' = 'standard'
): {
  urgencyLevel: UrgencyLevel;
  waitTime: number;
  isOverdue: boolean;
  urgencyColor: string;
  urgencyBgColor: string;
} {
  const config = variant === 'kds' ? KDS_CONFIG : DEFAULT_CONFIG;

  return useMemo(() => {
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const waitTime = Math.floor((now - createdAt) / 60000); // minutes

    let urgencyLevel: UrgencyLevel;
    let urgencyColor: string;
    let urgencyBgColor: string;

    if (waitTime >= config.highThreshold) {
      urgencyLevel = 'critical';
      urgencyColor = 'text-danger-700';
      urgencyBgColor = 'bg-danger-50 border-danger-200';
    } else if (waitTime >= config.mediumThreshold) {
      urgencyLevel = 'high';
      urgencyColor = 'text-warning-700';
      urgencyBgColor = 'bg-warning-50 border-warning-200';
    } else if (waitTime >= config.lowThreshold) {
      urgencyLevel = 'medium';
      urgencyColor = 'text-warning-600';
      urgencyBgColor = 'bg-warning-50 border-warning-100';
    } else {
      urgencyLevel = 'low';
      urgencyColor = 'text-neutral-600';
      urgencyBgColor = 'bg-white border-neutral-200';
    }

    // Check if order is overdue based on estimated ready time
    const isOverdue = order.estimated_ready_time
      ? new Date() > new Date(order.estimated_ready_time)
      : waitTime > config.highThreshold;

    return {
      urgencyLevel,
      waitTime,
      isOverdue,
      urgencyColor,
      urgencyBgColor,
    };
  }, [order, config]);
}