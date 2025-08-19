import React from 'react';
import { Order } from '@rebuild/shared';
import { OrderHeader } from '@/components/shared/order/OrderHeaders';
import { OrderItemsList } from '@/components/shared/order/OrderItemsList';
import { OrderActions } from '@/components/shared/order/OrderActions';
import { useOrderUrgency } from './useOrderUrgency';
import { Clock } from 'lucide-react';
import { cn } from '@/utils';

export interface BaseOrderCardProps {
  order: Order;
  variant?: 'standard' | 'kds' | 'compact';
  layout?: 'card' | 'list';
  showOrderType?: boolean;
  showTimer?: boolean;
  showActions?: boolean;
  showItemGroups?: boolean;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
  onCardClick?: (order: Order) => void;
  className?: string;
  animated?: boolean;
}

export const BaseOrderCard: React.FC<BaseOrderCardProps> = ({
  order,
  variant = 'standard',
  layout = 'card',
  showOrderType = false,
  showTimer = true,
  showActions = true,
  showItemGroups = false,
  onStatusChange,
  onCardClick,
  className,
  animated: _animated = false,
}) => {
  const { urgencyLevel, waitTime, isOverdue, urgencyColor, urgencyBgColor } = 
    useOrderUrgency(order, variant);

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(order);
    }
  };

  const containerClasses = cn(
    'order-card relative transition-all duration-200',
    {
      // Layout styles
      'rounded-lg shadow-sm p-4': layout === 'card',
      'border-l-4 pl-4 py-2': layout === 'list',
      
      // Variant-specific styles
      'hover:shadow-md': variant === 'standard',
      'hover:shadow-lg transform hover:scale-[1.02]': variant === 'kds',
      
      // Urgency styles
      [urgencyBgColor]: true,
      'animate-pulse': isOverdue && variant === 'kds',
      
      // Custom classes
      [className || '']: !!className,
    }
  );

  const headerContainerClasses = cn(
    'flex justify-between items-start mb-3',
    {
      'mb-2': layout === 'list',
    }
  );

  // Group items by station if requested
  const itemGroups = showItemGroups 
    ? groupItemsByStation(order.items)
    : [{ station: 'all', items: order.items }];

  return (
    <div
      className={containerClasses}
      onClick={handleCardClick}
      data-testid={`order-card-${order.id}`}
      data-urgency={urgencyLevel}
    >
      {/* Order Type Badge (KDS variant) */}
      {showOrderType && variant === 'kds' && (
        <div className="absolute -top-2 -right-2">
          <OrderTypeBadge type={order.type} />
        </div>
      )}

      {/* Header Section */}
      <div className={headerContainerClasses}>
        <OrderHeader
          orderNumber={(order as any).order_number || (order as any).orderNumber}
          status={order.status as 'new' | 'preparing' | 'ready'}
        />
        
        {/* Timer */}
        {showTimer && (
          <div className={cn('flex items-center gap-1', urgencyColor)}>
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{waitTime}m</span>
          </div>
        )}
      </div>

      {/* Items Section */}
      {layout === 'card' ? (
        <div className="space-y-2">
          {itemGroups.map((group, index) => (
            <div key={index}>
              {showItemGroups && group.station !== 'all' && (
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                  {group.station}
                </h4>
              )}
              <OrderItemsList
                items={group.items}
                variant={variant === 'compact' ? 'compact' : 'default'}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {order.items.length} items • ${order.total.toFixed(2)}
          </div>
        </div>
      )}

      {/* Actions Section */}
      {showActions && layout === 'card' && onStatusChange && (
        <div className="mt-3">
          <OrderActions
            status={order.status as 'new' | 'preparing' | 'ready'}
            onStatusChange={(newStatus) => onStatusChange?.(order.id, newStatus as Order['status'])}
            orderNumber={(order as any).order_number || (order as any).orderNumber}
          />
        </div>
      )}
    </div>
  );
};

// Helper component for order type badges
const OrderTypeBadge: React.FC<{ type: Order['type'] }> = ({ type }) => {
  const config: Record<string, { bg: string; text: string }> = {
    'dine-in': { bg: 'bg-blue-500', text: 'Dine In' },
    'takeout': { bg: 'bg-green-500', text: 'Takeout' },
    'delivery': { bg: 'bg-purple-500', text: 'Delivery' },
    'online': { bg: 'bg-indigo-500', text: 'Online' },
  };

  const { bg, text } = config[type] || config['dine-in'];

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white',
      bg
    )}>
      {text}
    </span>
  );
};

// Helper function to group items by station
function groupItemsByStation(items: Order['items']) {
  const groups = items.reduce((acc, item) => {
    // This would use actual station data from items
    const station = 'Kitchen'; // Placeholder - would come from item data
    if (!acc[station]) {
      acc[station] = [];
    }
    acc[station].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return Object.entries(groups).map(([station, items]) => ({
    station,
    items,
  }));
}