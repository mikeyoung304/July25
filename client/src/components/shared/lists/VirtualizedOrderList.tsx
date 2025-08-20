/**
 * Virtualized order list component for handling large datasets
 * Uses virtual scrolling to render only visible items
 */

import { memo, useRef, useEffect } from 'react';
import { useVirtualization, VIRTUALIZATION_PRESETS } from '@/hooks/useVirtualization';
import { BaseOrderCard } from '@/components/orders/BaseOrderCard';
import type { Order } from '@rebuild/shared';

interface VirtualizedOrderListProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
  onStatusChange?: (orderId: string, status: string) => void;
  containerHeight?: number;
  className?: string;
}

export const VirtualizedOrderList = memo(function VirtualizedOrderList({
  orders,
  onOrderClick,
  onStatusChange,
  containerHeight = 600,
  className = '',
}: VirtualizedOrderListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    virtualItems,
    containerProps,
    wrapperProps,
    scrollToIndex,
  } = useVirtualization(orders, containerHeight, VIRTUALIZATION_PRESETS.orderList);

  // Auto-scroll to new orders
  useEffect(() => {
    if (orders.length > 0) {
      // Check if the first order is new (created within last 5 seconds)
      const firstOrder = orders[0];
      const isNew = firstOrder.created_at && 
        (Date.now() - new Date(firstOrder.created_at).getTime()) < 5000;
      
      if (isNew) {
        scrollToIndex(0);
      }
    }
  }, [orders, scrollToIndex]);

  return (
    <div 
      ref={containerRef}
      className={`virtualized-order-list ${className}`}
      {...containerProps}
      role="list"
      aria-label="Orders list"
      aria-rowcount={orders.length}
    >
      <div {...wrapperProps}>
        {virtualItems.map(({ index, item: order, offsetTop, height }) => (
          <div
            key={order.id}
            data-index={index}
            style={{
              position: 'absolute',
              top: offsetTop,
              left: 0,
              right: 0,
              height,
            }}
            role="listitem"
            aria-rowindex={index + 1}
            aria-setsize={orders.length}
            aria-posinset={index + 1}
          >
            <BaseOrderCard
              order={order}
              onClick={() => onOrderClick?.(order)}
              onStatusChange={(status) => onStatusChange?.(order.id, status)}
            />
          </div>
        ))}
      </div>
      
      {/* Render count indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 9999,
          }}
        >
          Rendering {virtualItems.length} of {orders.length} orders
        </div>
      )}
    </div>
  );
});

// CSS for the component
const styles = `
.virtualized-order-list {
  /* Ensure smooth scrolling */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.virtualized-order-list::-webkit-scrollbar {
  width: 8px;
}

.virtualized-order-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtualized-order-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.virtualized-order-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Ensure order cards fill their container */
.virtualized-order-list [role="listitem"] > * {
  height: 100%;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'virtualized-order-list-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}