import { useEffect, useCallback } from 'react'
import { Order, OrderFilters } from '@/services/types'
import { orderService } from '@/services'
import { useAsyncState } from '@/hooks/useAsyncState'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useToast } from '@/hooks/useToast'

export interface UseOrderDataReturn {
  orders: Order[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>
}

export const useOrderData = (filters?: OrderFilters): UseOrderDataReturn => {
  const { data, loading, error, execute, setData } = useAsyncState<Order[]>([])
  const { restaurant } = useRestaurant()
  const { toast } = useToast()
  
  const fetchOrders = useCallback(async () => {
    const restaurantId = restaurant?.id || 'rest-1'
    
    // Transform complex filters to simple service filters
    const serviceFilters = filters ? {
      status: filters.status && filters.status.length > 0 ? filters.status[0] : undefined,
      tableId: undefined // Not supported in service layer yet
    } : undefined
    
    const result = await orderService.getOrders(restaurantId, serviceFilters)
    return result.orders
  }, [filters, restaurant?.id])
  
  const refetch = useCallback(async () => {
    try {
      await execute(fetchOrders())
    } catch (error) {
      // Error is already handled by useAsyncState, but notify user
      toast.error('Failed to refresh orders. Please try again.')
      console.error('Failed to fetch orders:', error)
    }
  }, [execute, fetchOrders, toast])
  
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    const restaurantId = restaurant?.id || 'rest-1'
    
    // Optimistic update - update immediately
    if (data) {
      setData(data.map(order => 
        order.id === orderId ? { ...order, status } : order
      ))
    }
    
    try {
      const result = await orderService.updateOrderStatus(restaurantId, orderId, status)
      if (!result.success) {
        toast.error('Failed to update order status')
        // Revert on failure
        if (data) {
          await refetch()
        }
      }
    } catch (error) {
      toast.error('Failed to update order status. Please try again.')
      // Revert on error
      if (data) {
        await refetch()
      }
      throw error
    }
  }, [data, setData, refetch, restaurant?.id, toast])
  
  useEffect(() => {
    refetch()
  }, [filters, refetch])
  
  return {
    orders: data || [],
    loading,
    error,
    refetch,
    updateOrderStatus
  }
}