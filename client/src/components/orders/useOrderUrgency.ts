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
      urgencyColor = 'text-red-700';
      urgencyBgColor = 'bg-red-50 border-red-200';
    } else if (waitTime >= config.mediumThreshold) {
      urgencyLevel = 'high';
      urgencyColor = 'text-orange-700';
      urgencyBgColor = 'bg-orange-50 border-orange-200';
    } else if (waitTime >= config.lowThreshold) {
      urgencyLevel = 'medium';
      urgencyColor = 'text-yellow-700';
      urgencyBgColor = 'bg-yellow-50 border-yellow-100';
    } else {
      urgencyLevel = 'low';
      urgencyColor = 'text-gray-600';
      urgencyBgColor = 'bg-white border-gray-200';
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