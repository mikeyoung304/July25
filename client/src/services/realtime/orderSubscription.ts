import type { Order, OrderStatus, OrderType, PaymentStatus } from '@rebuild/shared'

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

// Event emitter for broadcasting changes with debouncing
class OrderEventEmitter {
  private eventQueue: OrderEvent[] = []
  private flushTimeout: NodeJS.Timeout | null = null
  
  emit(event: OrderEvent) {
    this.eventQueue.push(event)
    this.scheduleFlush()
  }
  
  private scheduleFlush() {
    if (this.flushTimeout) return
    
    this.flushTimeout = setTimeout(() => {
      this.flush()
    }, 16) // ~60fps, batch events within a frame
  }
  
  private flush() {
    if (this.eventQueue.length === 0) {
      this.flushTimeout = null
      return
    }
    
    const events = [...this.eventQueue]
    this.eventQueue = []
    this.flushTimeout = null
    
    // Batch emit all events
    subscriptions.forEach(callback => {
      // Process all events in a microtask
      queueMicrotask(() => {
        events.forEach(event => callback(event))
      })
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
    { name: 'Georgia Soul Bowl', category: 'grill', basePrice: 14.99, prepTime: 12 },
    { name: 'Teriyaki Chicken Bowl', category: 'grill', basePrice: 13.99, prepTime: 10 },
    { name: 'Jerk Chicken Bowl', category: 'grill', basePrice: 13.99, prepTime: 10 },
    { name: 'Mama\'s Chicken Salad', category: 'cold', basePrice: 11.99, prepTime: 5 },
    { name: 'Pear & Feta Salad', category: 'cold', basePrice: 10.99, prepTime: 4 },
    { name: 'Monte Cristo Sandwich', category: 'grill', basePrice: 11.00, prepTime: 8 },
    { name: 'Boiled Peanuts', category: 'cold', basePrice: 4.99, prepTime: 2 },
    { name: 'Deviled Eggs', category: 'cold', basePrice: 6.99, prepTime: 3 },
    { name: 'Collard Greens', category: 'stovetop', basePrice: 3.99, prepTime: 5 },
    { name: 'Sweet Potato Fries', category: 'fryer', basePrice: 4.99, prepTime: 6 }
  ],
  
  modifiers: [
    'Extra collards', 'No pico', 'Black rice', 'Yellow rice', 
    'Extra pineapple salsa', 'No grapes', 'Extra pecans', 'Blue cheese instead',
    'Side salad', 'Extra broccoli', 'No cranberries'
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
    
    const isDriveThru = Math.random() > 0.5
    const tableNumber = isDriveThru 
      ? `DT-${Math.floor(Math.random() * 5) + 1}` 
      : String(Math.floor(Math.random() * 20) + 1)
    
    return {
      id: `order-${Date.now()}`,
      restaurant_id: 'rest-1',
      order_number: String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
      tableNumber: tableNumber, // Using camelCase for server compatibility
      items,
      status: 'new' as OrderStatus,
      type: (isDriveThru ? 'drive-thru' : 'dine-in') as OrderType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtotal: totalAmount * 0.92, // ~8% tax
      tax: totalAmount * 0.08,
      total: totalAmount,
      payment_status: (isDriveThru ? 'paid' : (Math.random() > 0.3 ? 'paid' : 'pending')) as PaymentStatus
    }
  }
}

// Initialize orderStore with existing orders
export const initializeOrderStore = (orders: Order[]) => {
  orders.forEach(order => {
    orderStore.set(order.id, order)
  })
}

// Auto status progression for demo with batch updates
export const startOrderProgression = () => {
  const progressionInterval = setInterval(() => {
    
    // Collect all status changes before emitting
    const statusChanges: Array<{orderId: string, newStatus: Order['status'], oldStatus: Order['status']}> = []
    
    orderStore.forEach((order, orderId) => {
      const elapsedMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000
      
      if (order.status === 'new' && elapsedMinutes > 2) {
        statusChanges.push({ orderId, newStatus: 'preparing', oldStatus: 'new' })
      } else if (order.status === 'preparing' && elapsedMinutes > 5) {
        statusChanges.push({ orderId, newStatus: 'ready', oldStatus: 'preparing' })
      } else if (order.status === 'ready' && elapsedMinutes > 10) {
        statusChanges.push({ orderId, newStatus: 'completed', oldStatus: 'ready' })
      }
    })
    
    // Emit all changes together
    statusChanges.forEach(({ orderId, newStatus, oldStatus }) => {
      orderSubscription.emitOrderStatusChanged(orderId, newStatus, oldStatus)
    })
  }, 5000) // Check every 5 seconds
  
  return () => clearInterval(progressionInterval)
}