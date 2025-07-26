import { useContext, useCallback } from 'react';
import { LiveRegionContext } from './LiveRegion.context';

export const useLiveRegion = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
};

// Utility hook for order status announcements
export const useOrderStatusAnnouncement = () => {
  const { announce } = useLiveRegion();

  const announceOrderStatus = useCallback((orderNumber: string, status: string) => {
    const statusMessages: Record<string, string> = {
      'new': `New order ${orderNumber} received`,
      'preparing': `Order ${orderNumber} is now being prepared`,
      'ready': `Order ${orderNumber} is ready for pickup`,
      'completed': `Order ${orderNumber} has been completed`,
      'cancelled': `Order ${orderNumber} has been cancelled`,
    };

    const message = statusMessages[status] || `Order ${orderNumber} status changed to ${status}`;
    announce(message, { priority: status === 'ready' ? 'assertive' : 'polite' });
  }, [announce]);

  return { announceOrderStatus };
};