import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/services/types'

interface OrderHistoryTableProps {
  orders: Order[]
  isLoading: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const OrderHistoryTable: React.FC<OrderHistoryTableProps> = ({
  orders,
  isLoading,
  page,
  totalPages,
  onPageChange
}) => {
  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      completed: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'destructive' as const, className: '' },
      delivered: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'outline' as const, className: '' }

    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading order history...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No orders found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Table</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Items</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Order Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Completed</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Prep Time</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/25 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">{order.order_number}</td>
                <td className="px-4 py-3 text-sm">{order.table_number}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="max-w-xs">
                    {order.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="truncate">
                        {item.quantity}x {item.name}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="text-muted-foreground">
                        +{order.items.length - 2} more
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-4 py-3 text-sm">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3 text-sm">
                  {order.completed_at ? formatDate(order.completed_at) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {order.estimated_ready_time ? `${order.estimated_ready_time} min` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}