# Order Grouping Implementation Plan
**Date**: 2025-10-14
**Goal**: Group all items from a single online order together (like table groups)

---

## 🎯 **TLDR - What We're Building**

Transform this ❌:
```
Order #1234 - Burger
Order #1234 - Fries
Order #1234 - Drink
```

Into this ✅:
```
┌──────────────────┐
│ Order #1234      │
│ John Doe         │
│ 🚗 Drive-Thru    │
├──────────────────┤
│ • Burger         │
│ • Fries          │
│ • Drink          │
│ [2/3 Ready]      │
│ [Mark Ready] →   │
└──────────────────┘
```

---

## 📋 Phase 1: Order Grouping Hook (2-3 hours)

### File: `client/src/hooks/useOrderGrouping.ts`

```typescript
import { useMemo } from 'react'
import type { Order } from '@rebuild/shared'

export interface OrderGroup {
  orderId: string                  // UUID
  orderNumber: string              // "20251014-0022"
  customerName: string             // "John Doe"
  customerPhone?: string           // For SMS
  orderType: 'online' | 'dine-in' | 'kiosk'
  pickupType: 'drive-thru' | 'counter' | 'curbside' | 'delivery'

  // Items (all from this order)
  orders: Order[]                  // Raw order objects
  totalItems: number               // Count of items
  completedItems: number           // Items ready
  preparingItems: number           // Items in progress

  // Status
  status: 'pending' | 'preparing' | 'ready' | 'picked-up' | 'completed'
  completionPercentage: number     // 0-100

  // Timing
  createdAt: string
  oldestItemTime: string
  newestItemTime: string
  estimatedReady?: string

  // Urgency
  urgencyLevel: 'normal' | 'warning' | 'urgent' | 'critical'
  ageMinutes: number

  // Optional metadata
  specialInstructions?: string
  customerCar?: string             // "Blue Honda"
  notified?: boolean               // SMS sent?
}

/**
 * Groups orders by order_number (single customer order)
 * Similar to table grouping but for online/pickup orders
 */
export const useOrderGrouping = (orders: Order[]) => {
  return useMemo(() => {
    const orderMap = new Map<string, OrderGroup>()

    // Process each order
    orders.forEach(order => {
      // Skip completed/cancelled
      if (['completed', 'cancelled', 'picked-up'].includes(order.status)) {
        return
      }

      const orderNumber = order.order_number

      // Initialize group if not exists
      if (!orderMap.has(orderNumber)) {
        orderMap.set(orderNumber, {
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name || 'Guest',
          customerPhone: order.customer_phone,
          orderType: order.type as any,
          pickupType: determinePickupType(order),

          orders: [],
          totalItems: 0,
          completedItems: 0,
          preparingItems: 0,

          status: 'pending',
          completionPercentage: 0,

          createdAt: order.created_at,
          oldestItemTime: order.created_at,
          newestItemTime: order.created_at,

          urgencyLevel: 'normal',
          ageMinutes: 0,

          specialInstructions: order.special_instructions,
        })
      }

      const group = orderMap.get(orderNumber)!
      group.orders.push(order)

      // Count items by status
      order.items.forEach(() => {
        group.totalItems++

        switch (order.status) {
          case 'ready':
            group.completedItems++
            break
          case 'preparing':
          case 'confirmed':
            group.preparingItems++
            break
        }
      })

      // Update timing
      if (new Date(order.created_at) < new Date(group.oldestItemTime)) {
        group.oldestItemTime = order.created_at
      }
      if (new Date(order.created_at) > new Date(group.newestItemTime)) {
        group.newestItemTime = order.created_at
      }
    })

    // Calculate group statistics
    orderMap.forEach(group => {
      // Completion percentage
      if (group.totalItems > 0) {
        group.completionPercentage = Math.round(
          (group.completedItems / group.totalItems) * 100
        )
      }

      // Overall status
      if (group.completedItems === group.totalItems) {
        group.status = 'ready'
      } else if (group.preparingItems > 0) {
        group.status = 'preparing'
      } else {
        group.status = 'pending'
      }

      // Calculate age and urgency
      const ageMinutes = Math.floor(
        (Date.now() - new Date(group.oldestItemTime).getTime()) / 60000
      )
      group.ageMinutes = ageMinutes

      if (ageMinutes >= 25) {
        group.urgencyLevel = 'critical'
      } else if (ageMinutes >= 18) {
        group.urgencyLevel = 'urgent'
      } else if (ageMinutes >= 12) {
        group.urgencyLevel = 'warning'
      } else {
        group.urgencyLevel = 'normal'
      }

      // Estimated ready time (simple calculation)
      if (group.status !== 'ready') {
        const remainingItems = group.totalItems - group.completedItems
        const estimatedMinutes = Math.max(8, remainingItems * 3) // 3 min per item, min 8
        const estimatedTime = new Date(Date.now() + estimatedMinutes * 60000)
        group.estimatedReady = estimatedTime.toISOString()
      }
    })

    return Array.from(orderMap.values())
  }, [orders])
}

/**
 * Determine pickup type from order metadata
 */
function determinePickupType(order: Order): OrderGroup['pickupType'] {
  // Check metadata or order notes
  const notes = order.special_instructions?.toLowerCase() || ''

  if (notes.includes('drive-thru') || notes.includes('drive thru')) {
    return 'drive-thru'
  }
  if (notes.includes('curbside')) {
    return 'curbside'
  }
  if (notes.includes('delivery')) {
    return 'delivery'
  }

  // Default: assume drive-thru for online orders
  return order.type === 'online' ? 'drive-thru' : 'counter'
}

/**
 * Sort order groups
 */
export const sortOrderGroups = (
  groups: OrderGroup[],
  sortBy: 'urgency' | 'age' | 'completion' | 'orderNumber' = 'urgency'
): OrderGroup[] => {
  switch (sortBy) {
    case 'urgency':
      return [...groups].sort((a, b) => {
        const urgencyOrder = { critical: 0, urgent: 1, warning: 2, normal: 3 }
        const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
        if (urgencyDiff !== 0) return urgencyDiff

        // If same urgency, sort by age
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

    case 'age':
      return [...groups].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

    case 'completion':
      return [...groups].sort((a, b) => a.completionPercentage - b.completionPercentage)

    case 'orderNumber':
      return [...groups].sort((a, b) => a.orderNumber.localeCompare(b.orderNumber))

    default:
      return groups
  }
}
```

---

## 📋 Phase 2: Order Group Card Component (2 hours)

### File: `client/src/components/kitchen/OrderGroupCard.tsx`

```typescript
import React from 'react'
import { Clock, Phone, Car, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OrderGroup } from '@/hooks/useOrderGrouping'
import { cn } from '@/utils'

interface OrderGroupCardProps {
  orderGroup: OrderGroup
  onStatusChange: (orderId: string, status: 'ready' | 'picked-up') => Promise<void>
  onNotifyCustomer?: (orderId: string) => Promise<void>
  variant?: 'kitchen' | 'expo'
}

export function OrderGroupCard({
  orderGroup,
  onStatusChange,
  onNotifyCustomer,
  variant = 'kitchen'
}: OrderGroupCardProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)

  const handleMarkReady = async () => {
    setIsUpdating(true)
    try {
      // Mark all orders in this group as ready
      await Promise.all(
        orderGroup.orders.map(order => onStatusChange(order.id, 'ready'))
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePickedUp = async () => {
    setIsUpdating(true)
    try {
      // Mark all orders as picked up
      await Promise.all(
        orderGroup.orders.map(order => onStatusChange(order.id, 'picked-up'))
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNotify = async () => {
    if (!onNotifyCustomer) return
    setIsUpdating(true)
    try {
      await onNotifyCustomer(orderGroup.orderId)
    } finally {
      setIsUpdating(false)
    }
  }

  // Urgency styling
  const urgencyColors = {
    normal: 'border-gray-200 bg-white',
    warning: 'border-yellow-300 bg-yellow-50',
    urgent: 'border-orange-400 bg-orange-50',
    critical: 'border-red-400 bg-red-50 animate-pulse'
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    'picked-up': 'bg-gray-400 text-white',
    completed: 'bg-gray-300 text-gray-600'
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 shadow-sm transition-all',
        urgencyColors[orderGroup.urgencyLevel]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">Order #{orderGroup.orderNumber}</h3>
            <Badge variant="outline" className={statusColors[orderGroup.status]}>
              {orderGroup.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">{orderGroup.customerName}</span>
              {orderGroup.customerPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {orderGroup.customerPhone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Car className="w-3 h-3" />
              <span className="text-xs uppercase">{orderGroup.pickupType}</span>
            </div>
          </div>
        </div>

        {/* Age indicator */}
        <div className="text-right">
          <div className={cn(
            'flex items-center gap-1 text-sm',
            orderGroup.urgencyLevel === 'critical' && 'text-red-600 font-bold',
            orderGroup.urgencyLevel === 'urgent' && 'text-orange-600 font-semibold',
            orderGroup.urgencyLevel === 'warning' && 'text-yellow-700'
          )}>
            <Clock className="w-4 h-4" />
            <span>{orderGroup.ageMinutes} min ago</span>
          </div>
          {orderGroup.urgencyLevel === 'critical' && (
            <div className="text-xs text-red-600 font-bold mt-1">
              URGENT!
            </div>
          )}
        </div>
      </div>

      {/* Special instructions */}
      {orderGroup.specialInstructions && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
          <strong>Note:</strong> {orderGroup.specialInstructions}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2 mb-3">
        {orderGroup.orders.map(order => (
          <div key={order.id} className="border-l-2 border-gray-300 pl-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  {order.status === 'ready' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                  )}
                  <span className={cn(
                    order.status === 'ready' && 'text-gray-500 line-through'
                  )}>
                    {item.quantity}x {item.name}
                  </span>
                </div>
                {item.modifications && item.modifications.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {item.modifications.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{orderGroup.completedItems}/{orderGroup.totalItems} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all',
              orderGroup.completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${orderGroup.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {orderGroup.status === 'preparing' && (
          <Button
            onClick={handleMarkReady}
            disabled={isUpdating}
            className="flex-1"
            variant="default"
          >
            {isUpdating ? 'Updating...' : 'Mark Ready'}
          </Button>
        )}

        {orderGroup.status === 'ready' && (
          <>
            {onNotifyCustomer && orderGroup.customerPhone && (
              <Button
                onClick={handleNotify}
                disabled={isUpdating}
                variant="outline"
                className="flex-1"
              >
                📱 Notify
              </Button>
            )}
            <Button
              onClick={handlePickedUp}
              disabled={isUpdating}
              className="flex-1"
              variant="default"
            >
              ✅ Picked Up
            </Button>
          </>
        )}

        {orderGroup.status === 'pending' && (
          <Button
            onClick={handleMarkReady}
            disabled={isUpdating}
            className="flex-1"
            variant="secondary"
          >
            Start Preparing
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## 📋 Phase 3: Update KDS to Use Order Groups (1 hour)

### File: `client/src/pages/KitchenDisplayOptimized.tsx`

```typescript
// Add import
import { useOrderGrouping, sortOrderGroups } from '@/hooks/useOrderGrouping'
import { OrderGroupCard } from '@/components/kitchen/OrderGroupCard'

// In component (replace table grouping)
function KitchenDisplayOptimized() {
  const { orders, updateOrderStatus, ... } = useKitchenOrdersOptimized()

  // NEW: Use order grouping instead of table grouping
  const orderGroups = useOrderGrouping(orders)

  // Sort by urgency
  const sortedGroups = useMemo(() => {
    return sortOrderGroups(orderGroups, sortMode as any)
  }, [orderGroups, sortMode])

  // Filter by status
  const filteredGroups = useMemo(() => {
    switch (statusFilter) {
      case 'active':
        return sortedGroups.filter(g => !['ready', 'picked-up', 'completed'].includes(g.status))
      case 'ready':
        return sortedGroups.filter(g => g.status === 'ready')
      case 'urgent':
        return sortedGroups.filter(g => ['urgent', 'critical'].includes(g.urgencyLevel))
      default:
        return sortedGroups
    }
  }, [sortedGroups, statusFilter])

  // Handle status change for entire order
  const handleOrderStatusChange = useCallback(async (orderId: string, status: 'ready' | 'picked-up') => {
    const success = await updateOrderStatus(orderId, status)
    if (!success) {
      console.error('Failed to update order status:', orderId)
    }
  }, [updateOrderStatus])

  // Handle customer notification (TODO: implement SMS)
  const handleNotifyCustomer = useCallback(async (orderId: string) => {
    console.log('Notify customer:', orderId)
    // TODO: Call SMS API
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ... header ... */}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-lg p-16 text-center">
            <div className="text-6xl mb-6">👨‍🍳</div>
            <p className="text-gray-500 text-2xl">No active orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGroups.map(group => (
              <OrderGroupCard
                key={group.orderId}
                orderGroup={group}
                onStatusChange={handleOrderStatusChange}
                onNotifyCustomer={handleNotifyCustomer}
                variant="kitchen"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 📋 Phase 4: Add Pickup Status to Order Flow (30 min)

### File: `server/src/routes/orders.routes.ts`

```typescript
// Add new status: 'picked-up'
// Update status validation to include 'picked-up'

router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body

  // Validate status
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  // ... rest of update logic
})
```

---

## 🚀 Deployment Plan

### Week 1: Core Order Grouping
1. ✅ Create `useOrderGrouping` hook
2. ✅ Create `OrderGroupCard` component
3. ✅ Update `KitchenDisplayOptimized`
4. ✅ Add 'picked-up' status
5. ✅ Test with existing orders
6. ✅ Deploy to production

### Week 2: SMS Notifications (Optional)
1. Integrate Twilio
2. Add notification button
3. Auto-notify on ready
4. Deploy

### Week 3: Polish & Metrics
1. Add performance tracking
2. Optimize rendering
3. Add customer display screen (optional)
4. Deploy

---

## ✅ Testing Checklist

- [ ] Create online order with multiple items
- [ ] Verify all items grouped under one card
- [ ] Test "Mark Ready" updates all items
- [ ] Test urgency color coding (wait 15+ min)
- [ ] Test "Picked Up" removes from display
- [ ] Test real-time updates via WebSocket
- [ ] Test with 20+ concurrent orders
- [ ] Verify performance (no lag)

---

## 🎯 Success Criteria

**After implementation**:
- ✅ Each online order shows as ONE card
- ✅ All items from same order grouped together
- ✅ Clear progress tracking (2/3 items ready)
- ✅ Status flow: Pending → Preparing → Ready → Picked Up
- ✅ Color-coded urgency (normal/warning/urgent/critical)
- ✅ No more scattered individual items

**Matches industry leaders** (Square KDS, Toast KDS) ✅
