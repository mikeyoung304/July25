// Order-specific types
export { Order, OrderFilters } from '@/services/types'
export { OrderItem } from '@/modules/kitchen/KDSOrderCard'

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid'

export interface OrderEventCallback {
  (event: OrderEvent): void
}

export interface OrderEvent {
  type: 'created' | 'updated' | 'statusChanged' | 'deleted'
  orderId: string
  order?: Order
  previousStatus?: OrderStatus
  newStatus?: OrderStatus
  timestamp: Date
}

export interface OrderValidation {
  isValid: boolean
  errors: string[]
}

export interface OrderSummary {
  id: string
  orderNumber: string
  tableNumber: string
  itemCount: number
  totalAmount: number
  status: OrderStatus
  orderTime: Date
}