/**
 * Shared order types used across the application
 */

export const ORDER_STATUS = {
  NEW: 'new',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

export interface OrderItem {
  id: string
  name: string
  quantity: number
  modifiers?: string[]
  notes?: string
  price?: number
  category?: string
}

export interface OrderCustomer {
  id?: string
  name?: string
  phone?: string
  email?: string
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded'
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

// Utility functions for type guards
export const isValidOrderStatus = (status: string): status is OrderStatus => {
  return Object.values(ORDER_STATUS).includes(status as OrderStatus)
}

export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return Object.values(PAYMENT_STATUS).includes(status as PaymentStatus)
}