import { useCallback } from 'react'
import { Order, getErrorMessage } from '@rebuild/shared'
import { orderService } from '@/services/orders/OrderService'
import { useToast } from '@/hooks/useToast'

export interface UseOrderActionsReturn {
  submitOrder: (orderData: Partial<Order>) => Promise<{ success: boolean; orderId?: string }>
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>
  cancelOrder: (orderId: string) => Promise<boolean>
}

export const useOrderActions = (): UseOrderActionsReturn => {
  const { toast } = useToast()
  
  const submitOrder = useCallback(async (orderData: Partial<Order>) => {
    try {
      const result = await orderService.submitOrder(orderData)
      if (result && result.id) {
        toast.success('Order submitted successfully')
        return { success: true, orderId: result.id }
      }
      return { success: false }
    } catch (error) {
      const message = getErrorMessage(error)
      toast.error(message)
      return { success: false }
    }
  }, [toast])
  
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      const result = await orderService.updateOrderStatus(orderId, status)
      if (result) {
        toast.success(`Order status updated to ${status}`)
        return true
      }
      return false
    } catch (error) {
      const message = getErrorMessage(error)
      toast.error(message)
      return false
    }
  }, [toast])
  
  const cancelOrder = useCallback(async (orderId: string) => {
    return updateOrderStatus(orderId, 'cancelled')
  }, [updateOrderStatus])
  
  return {
    submitOrder,
    updateOrderStatus,
    cancelOrder
  }
}