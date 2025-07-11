import { useCallback } from 'react'
import { Order } from '@/services/types'
import { orderService } from '@/services/orders/OrderService'
import { useToast } from '@/hooks/useToast'
import { useRestaurant } from '@/core/restaurant-hooks'

export interface UseOrderActionsReturn {
  submitOrder: (orderData: Partial<Order>) => Promise<{ success: boolean; orderId?: string }>
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>
  cancelOrder: (orderId: string) => Promise<boolean>
}

export const useOrderActions = (): UseOrderActionsReturn => {
  const { toast } = useToast()
  const { restaurant } = useRestaurant()
  
  const submitOrder = useCallback(async (orderData: Partial<Order>) => {
    try {
      const result = await orderService.submitOrder(restaurant?.id || 'rest-1', orderData)
      if (result.success) {
        toast.success('Order submitted successfully')
      }
      return { success: result.success, orderId: result.orderId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit order'
      toast.error(message)
      return { success: false }
    }
  }, [toast, restaurant?.id])
  
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      const result = await orderService.updateOrderStatus(restaurant?.id || 'rest-1', orderId, status)
      if (result.success) {
        toast.success(`Order status updated to ${status}`)
      }
      return result.success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status'
      toast.error(message)
      return false
    }
  }, [toast, restaurant?.id])
  
  const cancelOrder = useCallback(async (orderId: string) => {
    return updateOrderStatus(orderId, 'cancelled')
  }, [updateOrderStatus])
  
  return {
    submitOrder,
    updateOrderStatus,
    cancelOrder
  }
}