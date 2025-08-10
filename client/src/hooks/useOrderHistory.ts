import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import type { Order } from '@/services/api'

interface OrderStatistics {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  averageOrderValue: number
  averagePreparationTime: number
  ordersByHour: Array<{ hour: number; count: number }>
}

interface UseOrderHistoryReturn {
  orders: Order[]
  statistics: OrderStatistics | null
  isLoading: boolean
  error: string | null
  page: number
  totalPages: number
  searchQuery: string
  startDate: Date
  endDate: Date
  setPage: (page: number) => void
  setSearchQuery: (query: string) => void
  setDateRange: (start: Date, end: Date) => void
  refresh: () => void
  exportToCSV: () => void
}

export const useOrderHistory = (): UseOrderHistoryReturn => {
  // Default to last 30 days
  const defaultEndDate = new Date()
  const defaultStartDate = new Date()
  defaultStartDate.setDate(defaultStartDate.getDate() - 30)

  const [orders, setOrders] = useState<Order[]>([])
  const [statistics, setStatistics] = useState<OrderStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)

  // Fetch order history
  const fetchOrderHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.getOrderHistory({
        page,
        pageSize: 20,
        searchQuery: searchQuery || undefined,
        startDate,
        endDate
      })

      setOrders(response.orders)
      setTotalPages(response.totalPages)
    } catch (err) {
      console.error('Failed to fetch order history:', err)
      setError('Failed to load order history')
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [page, searchQuery, startDate, endDate])

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await api.getOrderStatistics({
        startDate,
        endDate
      })
      setStatistics(stats)
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }, [startDate, endDate])

  // Load data when dependencies change
  useEffect(() => {
    fetchOrderHistory()
    fetchStatistics()
  }, [fetchOrderHistory, fetchStatistics])

  // Set date range
  const setDateRange = useCallback((start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
    setPage(1) // Reset to first page
  }, [])

  // Refresh data
  const refresh = useCallback(() => {
    fetchOrderHistory()
    fetchStatistics()
  }, [fetchOrderHistory, fetchStatistics])

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Order Number', 'Table', 'Items', 'Status', 'Order Time', 'Completed Time', 'Preparation Time (min)', 'Total Amount']
    
    const csvContent = [
      headers.join(','),
      ...orders.map(order => [
        order.order_number,
        order.table_number,
        `"${order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}"`,
        order.status,
        new Date(order.created_at).toLocaleString(),
        order.completed_at ? new Date(order.completed_at).toLocaleString() : '',
        order.estimated_ready_time || '',
        order.total.toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'order-history.csv'
    link.click()
  }, [orders])

  return {
    orders,
    statistics,
    isLoading,
    error,
    page,
    totalPages,
    searchQuery,
    startDate,
    endDate,
    setPage,
    setSearchQuery,
    setDateRange,
    refresh,
    exportToCSV
  }
}