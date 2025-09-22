import type { Order } from '@rebuild/shared';

export function getSafeOrderStatus(order: Order): string {
  return order.status || 'pending';
}

export function isStatusInGroup(status: string, group: 'ACTIVE' | 'READY' | 'COMPLETED'): boolean {
  const statusGroups = {
    ACTIVE: ['pending', 'preparing', 'in_progress'],
    READY: ['ready', 'ready_for_pickup'],
    COMPLETED: ['completed', 'delivered', 'cancelled']
  };

  return statusGroups[group]?.includes(status.toLowerCase()) || false;
}