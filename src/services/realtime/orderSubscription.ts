import type { Order } from '@/services/api'

export type OrderEvent = 
  | { type: 'ORDER_CREATED'; order: Order }
  | { type: 'ORDER_UPDATED'; order: Order }
  | { type: 'ORDER_STATUS_CHANGED'; orderId: string; status: Order['status']; previousStatus: Order['status'] }
  | { type: 'ORDER_DELETED'; orderId: string }

export type OrderEventCallback = (event: OrderEvent) => void

// Store active subscriptions
const subscriptions = new Map<string, OrderEventCallback>()

// Store orders for real-time updates
const orderStore = new Map<string, Order>()

// Event emitter for broadcasting changes
class OrderEventEmitter {
  emit(event: OrderEvent) {
    subscriptions.forEach(callback => {
      // Use setTimeout to simulate async nature of real events
      setTimeout(() => callback(event), 0)
    })
  }
}

const eventEmitter = new OrderEventEmitter()

// Subscription management
export const orderSubscription = {
  subscribe(id: string, callback: OrderEventCallback): () => void {
    subscriptions.set(id, callback)
    
    // Return unsubscribe function
    return () => {
      subscriptions.delete(id)
    }
  },
  
  // Emit events (used by mock API)
  emitOrderCreated(order: Order) {
    orderStore.set(order.id, order)
    eventEmitter.emit({ type: 'ORDER_CREATED', order })
  },
  
  emitOrderUpdated(order: Order) {
    orderStore.set(order.id, order)
    eventEmitter.emit({ type: 'ORDER_UPDATED', order })
  },
  
  emitOrderStatusChanged(orderId: string, newStatus: Order['status'], previousStatus: Order['status']) {
    const order = orderStore.get(orderId)
    if (order) {
      order.status = newStatus
      eventEmitter.emit({ type: 'ORDER_STATUS_CHANGED', orderId, status: newStatus, previousStatus })
    }
  },
  
  emitOrderDeleted(orderId: string) {
    orderStore.delete(orderId)
    eventEmitter.emit({ type: 'ORDER_DELETED', orderId })
  }
}

// Mock data generator for realistic order simulation
export const mockOrderGenerator = {
  menuItems: [
    { name: 'Grilled Burger', category: 'grill', basePrice: 12.99, prepTime: 12 },
    { name: 'Cheese Pizza', category: 'pizza', basePrice: 18.99, prepTime: 15 },
    { name: 'Caesar Salad', category: 'cold', basePrice: 9.99, prepTime: 5 },
    { name: 'Pasta Carbonara', category: 'pasta', basePrice: 16.99, prepTime: 10 },
    { name: 'French Fries', category: 'fryer', basePrice: 4.99, prepTime: 6 },
    { name: 'Chicken Wings', category: 'fryer', basePrice: 11.99, prepTime: 8 },
    { name: 'Fish Tacos', category: 'grill', basePrice: 13.99, prepTime: 10 },
    { name: 'Veggie Wrap', category: 'cold', basePrice: 8.99, prepTime: 4 }
  ],
  
  modifiers: [
    'Extra cheese', 'No onions', 'Gluten free', 'Extra spicy', 
    'Well done', 'Medium rare', 'No sauce', 'Extra sauce'
  ],
  
  generateOrder(): Order {
    const numItems = Math.floor(Math.random() * 4) + 1
    const items = []
    
    for (let i = 0; i < numItems; i++) {
      const menuItem = this.menuItems[Math.floor(Math.random() * this.menuItems.length)]
      const quantity = Math.floor(Math.random() * 3) + 1
      const hasModifiers = Math.random() > 0.6
      
      items.push({
        id: `item-${Date.now()}-${i}`,
        name: menuItem.name,
        quantity,
        modifiers: hasModifiers 
          ? [this.modifiers[Math.floor(Math.random() * this.modifiers.length)]]
          : undefined,
        notes: Math.random() > 0.8 ? 'Special request' : undefined
      })
    }
    
    const totalAmount = items.reduce((sum, item) => {
      const menuItem = this.menuItems.find(m => m.name === item.name)
      return sum + (menuItem?.basePrice || 10) * item.quantity
    }, 0)
    
    return {
      id: `order-${Date.now()}`,
      orderNumber: String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
      tableNumber: Math.random() > 0.7 ? 'K1' : String(Math.floor(Math.random() * 20) + 1),
      items,
      status: 'new',
      orderTime: new Date(),
      totalAmount,
      paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending'
    }
  }
}

// Auto status progression for demo
export const startOrderProgression = () => {
  const progressionInterval = setInterval(() => {
    orderStore.forEach((order, orderId) => {
      if (order.status === 'new' && Date.now() - order.orderTime.getTime() > 30000) {
        orderSubscription.emitOrderStatusChanged(orderId, 'preparing', 'new')
      } else if (order.status === 'preparing' && Date.now() - order.orderTime.getTime() > 120000) {
        orderSubscription.emitOrderStatusChanged(orderId, 'ready', 'preparing')
      }
    })
  }, 10000) // Check every 10 seconds
  
  return () => clearInterval(progressionInterval)
}