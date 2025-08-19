import React from 'react'
import { StatusActionButton } from '../buttons/StatusActionButton'
import { cn } from '@/utils'
import { useAriaLive } from '@/hooks/keyboard'

export interface OrderActionsProps {
  status: 'new' | 'pending' | 'confirmed' | 'preparing' | 'ready'
  onStatusChange?: (status: 'preparing' | 'ready') => void
  layout?: 'vertical' | 'horizontal'
  className?: string
  orderNumber?: string
}

export const OrderActions: React.FC<OrderActionsProps> = ({
  status,
  onStatusChange,
  layout = 'vertical',
  className,
  orderNumber,
}) => {
  const announce = useAriaLive()
  
  const handleClick = () => {
    if (!onStatusChange) return
    
    if (status === 'new' || status === 'pending' || status === 'confirmed') {
      onStatusChange('preparing')
      announce({
        message: `Order ${orderNumber ? `number ${orderNumber}` : ''} is now being prepared`,
        priority: 'polite'
      })
    } else if (status === 'preparing') {
      onStatusChange('ready')
      announce({
        message: `Order ${orderNumber ? `number ${orderNumber}` : ''} is ready for pickup`,
        priority: 'assertive'
      })
    }
  }

  // Get appropriate button label and description
  const getButtonInfo = () => {
    switch (status) {
      case 'new':
        return {
          label: 'Start Preparing',
          description: 'Begin preparing this order',
          shortcut: 'Alt+S'
        }
      case 'pending':
        return {
          label: 'Start Preparing',
          description: 'Begin preparing this pending order',
          shortcut: 'Alt+S'
        }
      case 'confirmed':
        return {
          label: 'Start Preparing',
          description: 'Begin preparing this confirmed order',
          shortcut: 'Alt+S'
        }
      case 'preparing':
        return {
          label: 'Mark as Ready',
          description: 'Mark this order as ready for pickup',
          shortcut: 'Alt+R'
        }
      case 'ready':
        return {
          label: 'Order Ready',
          description: 'This order is ready for pickup',
          shortcut: undefined
        }
      default:
        return {
          label: 'Start Preparing',
          description: 'Begin preparing this order',
          shortcut: 'Alt+S'
        }
    }
  }

  const buttonInfo = getButtonInfo()

  return (
    <div 
      className={cn(
        'flex gap-2',
        layout === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      role="group"
      aria-label={`Order actions${orderNumber ? ` for order ${orderNumber}` : ''}`}
    >
      <StatusActionButton
        status={status}
        onClick={handleClick}
        aria-label={buttonInfo.label}
        aria-describedby={buttonInfo.description}
        aria-keyshortcuts={buttonInfo.shortcut}
      />
    </div>
  )
}