import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Order } from '@rebuild/shared'
import type { OrderGroup } from '@/hooks/useOrderGrouping'
import {
  formatOrderNumber,
  getOrderPrimaryLabel
} from '@rebuild/shared/config/kds'
import { ModifierList } from './ModifierList'

interface FocusOverlayProps {
  order?: Order
  orderGroup?: OrderGroup
  onClose: () => void
  onMarkReady?: (orderId: string) => void
}

/**
 * Full-screen focus overlay for detailed order view
 * Large text for easy reading in kitchen environment
 */
export function FocusOverlay({ order, orderGroup, onClose, onMarkReady }: FocusOverlayProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusableElementsRef = useRef<HTMLElement[]>([])

  // Support both Order and OrderGroup interfaces
  const displayOrder = order
  const displayGroup = orderGroup

  // Build the items list from either source
  const items = useMemo(() => {
    return displayOrder?.items ?? displayGroup?.orders.flatMap(o => o.items) ?? []
  }, [displayOrder?.items, displayGroup?.orders])
  const tableNumber = displayOrder?.table_number ?? null
  const orderNumber = displayOrder?.order_number ?? displayGroup?.order_number ?? ''
  const customerName = displayOrder?.customer_name ?? displayGroup?.customer_name
  const orderId = displayOrder?.id ?? displayGroup?.order_id
  const status = displayOrder?.status ?? displayGroup?.status

  // Use shared helper for primary label
  const primaryLabel = getOrderPrimaryLabel(tableNumber, customerName, orderNumber)

  const showMarkReady = onMarkReady && orderId &&
    status !== 'ready' && status !== 'completed' && status !== 'cancelled'

  const handleMarkReady = () => {
    if (onMarkReady && orderId) {
      onMarkReady(orderId)
      onClose()
    }
  }

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    // Focus trap logic
    if (e.key === 'Tab') {
      const focusableElements = focusableElementsRef.current
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [onClose])

  // Setup focus trap and auto-focus on mount
  useEffect(() => {
    // Cache focusable elements
    if (modalRef.current) {
      focusableElementsRef.current = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      )
    }

    // Auto-focus close button on mount
    closeButtonRef.current?.focus()

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6 md:p-8"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-overlay-title"
      >
        {/* Header - Large format */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 id="focus-overlay-title" className="text-4xl font-bold text-gray-900">
              {primaryLabel}
            </h2>
            {tableNumber && (
              <p className="text-xl text-gray-600 mt-1">
                Order #{formatOrderNumber(orderNumber)}
              </p>
            )}
            <p className="text-2xl text-gray-600 mt-2">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Close order details"
          >
            <X className="w-8 h-8" aria-hidden="true" />
          </button>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 mb-6" />

        {/* Items with large text */}
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="text-2xl font-semibold">
                {item.quantity}x {item.name}
              </div>
              {/* Modifiers - using shared component with accessibility */}
              <ModifierList
                modifiers={item.modifiers}
                size="xl"
                className="ml-6 mt-2 space-y-1"
              />
              {/* Special instructions */}
              {item.special_instructions && (
                <div className="text-lg text-gray-600 ml-6 mt-2 italic">
                  Note: {item.special_instructions}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        {showMarkReady && (
          <Button
            className="w-full mt-8 h-16 text-2xl"
            onClick={handleMarkReady}
          >
            Mark Ready
          </Button>
        )}
      </div>
    </div>
  )
}
