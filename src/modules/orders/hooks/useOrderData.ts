import { useEffect, useCallback } from 'react'
import { Order, OrderFilters } from '../types'
import { orderService } from '@/services'
import { useAsyncState } from '@/hooks/useAsyncState'

export interface UseOrderDataReturn {
  orders: Order[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>
}

export const useOrderData = (filters?: OrderFilters): UseOrderDataReturn => {
  const { data, loading, error, execute, setData } = useAsyncState<Order[]>([])
  
  const fetchOrders = useCallback(async () => {
    // Transform complex filters to simple service filters
    const serviceFilters = filters ? {
      status: filters.status && filters.status.length > 0 ? filters.status[0] : undefined,
      tableId: undefined // Not supported in service layer yet
    } : undefined
    
    const result = await orderService.getOrders(serviceFilters)
    return result.orders
  }, [filters])
  
  const refetch = useCallback(async () => {
    try {
      await execute(fetchOrders())
    } catch {
      // Error is already handled by useAsyncState
      // We catch here to prevent unhandled promise rejection
    }
  }, [execute, fetchOrders])
  
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    // Optimistic update - update immediately
    if (data) {
      setData(data.map(order => 
        order.id === orderId ? { ...order, status } : order
      ))
    }
    
    try {
      const result = await orderService.updateOrderStatus(orderId, status)
      if (!result.success && data) {
        // Revert on failure
        await refetch()
      }
    } catch (error) {
      // Revert on error
      if (data) {
        await refetch()
      }
      throw error
    }
  }, [data, setData, refetch])
  
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