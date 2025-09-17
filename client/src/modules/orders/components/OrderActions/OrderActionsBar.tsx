import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { Order } from '@/modules/orders/types'
import { cn } from '@/utils'

interface OrderActionsBarProps {
  orderId: string
  status: Order['status']
  onStatusChange: (orderId: string, status: Order['status']) => void
  className?: string
}

export const OrderActionsBar = memo<OrderActionsBarProps>(({
  orderId,
  status,
  onStatusChange,
  className
}) => {
  const getNextStatus = (): Order['status'] | null => {
    switch (status) {
      case 'new':
        return 'pending'
      case 'pending':
        return 'confirmed'
      case 'confirmed':
        return 'preparing'
      case 'preparing':
        return 'ready'
      case 'ready':
        return 'completed'
      case 'completed':
        return null // Final state
      case 'cancelled':
        return null // Final state
      default:
        console.warn(`Unexpected order status in OrderActionsBar: ${status}`)
        return null
    }
  }

  const getActionButton = () => {
    const nextStatus = getNextStatus()
    if (!nextStatus) return null

    const buttonConfig = {
      pending: {
        label: 'Accept Order',
        icon: Clock,
        variant: 'default' as const
      },
      confirmed: {
        label: 'Confirm Order',
        icon: CheckCircle,
        variant: 'default' as const
      },
      preparing: {
        label: 'Start Preparing',
        icon: Clock,
        variant: 'default' as const
      },
      ready: {
        label: 'Mark as Ready',
        icon: CheckCircle,
        variant: 'default' as const
      },
      completed: {
        label: 'Complete Order',
        icon: CheckCircle,
        variant: 'default' as const
      }
    }

    // Type guard to ensure nextStatus is a valid key
    if (!nextStatus || !(nextStatus in buttonConfig)) return null
    
    const config = buttonConfig[nextStatus as keyof typeof buttonConfig]

    const Icon = config.icon

    return (
      <Button
        onClick={() => onStatusChange(orderId, nextStatus)}
        variant={config.variant}
        className="flex-1"
      >
        <Icon className="h-4 w-4 mr-2" />
        {config.label}
      </Button>
    )
  }

  const canCancel = status === 'new' || status === 'preparing'

  return (
    <div className={cn('flex gap-2', className)}>
      {getActionButton()}
      {canCancel && (
        <Button
          onClick={() => onStatusChange(orderId, 'cancelled')}
          variant="destructive"
          size="icon"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
})

OrderActionsBar.displayName = 'OrderActionsBar'