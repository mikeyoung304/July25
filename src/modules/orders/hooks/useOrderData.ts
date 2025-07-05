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
    const result = await orderService.getOrders(filters)
    return result.orders
  }, [filters])
  
  const refetch = useCallback(async () => {
    await execute(fetchOrders())
  }, [execute, fetchOrders])
  
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    const result = await orderService.updateOrderStatus(orderId, status)
    if (result.success && data) {
      // Update local state optimistically
      setData(data.map(order => 
        order.id === orderId ? { ...order, status } : order
      ))
    }
  }, [data, setData])
  
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