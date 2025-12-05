import React, { useState, useCallback, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card } from '@/components/ui/card'
import { useServerView } from './hooks/useServerView'
import { useTableInteraction } from './hooks/useTableInteraction'
import { useVoiceOrderWebRTC } from './hooks/useVoiceOrderWebRTC'
import { useAuth } from '@/contexts/auth.hooks'
import { ServerFloorPlan } from './components/ServerFloorPlan'
import { SeatSelectionModal } from './components/SeatSelectionModal'
import { VoiceOrderModal } from './components/VoiceOrderModal'
import { PostOrderPrompt } from './components/PostOrderPrompt'
import { ServerStats } from './components/ServerStats'
import { ServerHeader } from './components/ServerHeader'
import { PaymentModal } from '@/components/payments'
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary'
import { Info } from 'lucide-react'
import type { OrderInputMode } from '@/components/shared/OrderInputSelector'
import { DEFAULT_TAX_RATE } from '@rebuild/shared/constants/business'
import { useHttpClient } from '@/services/http'
import { useToast } from '@/hooks/useToast'
import { logger } from '@/services/logger'
import type { Order, Table } from '@rebuild/shared/types'

// Payment state for Close Table flow
interface PaymentState {
  show_modal: boolean
  order_id: string | null
  subtotal: number
  tax: number
  table_id: string | null
}

const initialPaymentState: PaymentState = {
  show_modal: false,
  order_id: null,
  subtotal: 0,
  tax: 0,
  table_id: null
}

export const ServerView = memo(() => {
  const {
    tables,
    isLoading,
    selectedTableId,
    setSelectedTableId,
    selectedTable,
    stats,
    restaurant
  } = useServerView()

  const { handleTableClick } = useTableInteraction(tables, setSelectedTableId)
  const voiceOrder = useVoiceOrderWebRTC()
  const { hasScope } = useAuth()
  const canCreateOrders = hasScope('orders:create')
  const [showSeatSelection, setShowSeatSelection] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [initialInputMode, setInitialInputMode] = useState<OrderInputMode>('voice')

  // Payment modal state
  const [paymentState, setPaymentState] = useState<PaymentState>(initialPaymentState)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  const { get, patch } = useHttpClient<Order[]>()
  const { toast } = useToast()

  // Memoize table transformation to avoid duplicate code and stabilize references
  // Transform Table to include table_number alias for component compatibility
  const transformedTable = useMemo(() =>
    selectedTable ? {
      ...selectedTable,
      table_number: selectedTable.label,
      capacity: selectedTable.seats
    } as Table & { table_number: string; capacity: number } : null,
    [selectedTable]
  )

  const handleTableSelection = useCallback((tableId: string) => {
    handleTableClick(tableId)
    setShowSeatSelection(true)
  }, [handleTableClick])

  const handleStartVoiceOrder = useCallback((mode: OrderInputMode) => {
    if (selectedTableId && selectedSeat) {
      setInitialInputMode(mode)
      setShowSeatSelection(false)
      voiceOrder.setShowVoiceOrder(true)
    }
  }, [selectedTableId, selectedSeat, voiceOrder])

  const handleSubmitOrder = useCallback(async () => {
    const success = await voiceOrder.submitOrder(selectedTable, selectedSeat)
    if (success) {
      // Don't clear selectedTableId or selectedSeat - we need them for the post-order prompt
      // The voice order modal will close, and post-order prompt will show
      voiceOrder.setShowVoiceOrder(false)
    }
  }, [voiceOrder, selectedTable, selectedSeat])

  const handleAddNextSeat = useCallback(() => {
    voiceOrder.handleAddNextSeat()
    setSelectedSeat(null)
    setShowSeatSelection(true)
  }, [voiceOrder])

  const handleFinishTable = useCallback(() => {
    voiceOrder.handleFinishTable()
    setSelectedTableId(null)
    setSelectedSeat(null)
    setShowSeatSelection(false)
  }, [voiceOrder, setSelectedTableId])

  const handleCloseModals = useCallback(() => {
    setSelectedTableId(null)
    setSelectedSeat(null)
    setShowSeatSelection(false)
    voiceOrder.resetVoiceOrder()
  }, [setSelectedTableId, voiceOrder])

  const handleCloseSeatSelection = useCallback(() => {
    setShowSeatSelection(false)
    setSelectedTableId(null)
    setSelectedSeat(null)
  }, [setSelectedTableId])

  // Close Table - fetch orders and show payment modal
  const handleCloseTable = useCallback(async () => {
    if (isLoadingPayment) return // Prevent duplicate clicks

    if (!selectedTable) {
      toast.error('No table selected')
      return
    }

    if (!restaurant?.id) {
      toast.error('Restaurant context not available')
      return
    }

    setIsLoadingPayment(true)
    try {
      // Fetch orders for this table that are not yet paid
      const ordersResponse = await get(`/api/v1/orders`, {
        params: {
          restaurant_id: restaurant.id,
          table_number: selectedTable.label,
          payment_status: 'pending'
        }
      });

      if (!Array.isArray(ordersResponse)) {
        throw new Error('Invalid orders response');
      }

      if (!ordersResponse || ordersResponse.length === 0) {
        toast.error('No unpaid orders found for this table')
        return
      }

      // Calculate totals from all orders
      const totals = ordersResponse.reduce(
        (acc, order) => ({
          subtotal: acc.subtotal + (order.subtotal || 0),
          tax: acc.tax + (order.tax || 0)
        }),
        { subtotal: 0, tax: 0 }
      );

      // Round to 2 decimals to prevent floating-point precision errors
      const subtotal = Math.round(totals.subtotal * 100) / 100;
      const tax = Math.round(totals.tax * 100) / 100;

      // Use the first order's ID for payment (MVP - could be improved to handle multi-order payments)
      const primaryOrderId = ordersResponse[0].id

      logger.info('[handleCloseTable] Opening payment modal', {
        tableNumber: selectedTable.label,
        orderCount: ordersResponse.length,
        primaryOrderId,
        subtotal,
        tax
      })

      // Hide post-order prompt and show payment modal
      voiceOrder.setShowPostOrderPrompt(false)

      setPaymentState({
        show_modal: true,
        order_id: primaryOrderId,
        subtotal,
        tax,
        table_id: selectedTable.id
      })

    } catch (error) {
      logger.error('[handleCloseTable] Failed to fetch orders', { error })
      toast.error('Failed to load orders for this table')
    } finally {
      setIsLoadingPayment(false)
    }
  }, [isLoadingPayment, selectedTable, restaurant, get, toast, voiceOrder])

  // Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    logger.info('[handlePaymentSuccess] Payment completed', {
      tableId: paymentState.table_id
    })

    try {
      // Update table status first - critical operation
      if (paymentState.table_id) {
        await patch(`/api/v1/tables/${paymentState.table_id}/status`, {
          status: 'available'
        })
        logger.info('[handlePaymentSuccess] Table status updated to available')
      }

      // Only reset state and show success if table update succeeded
      setPaymentState(initialPaymentState)
      voiceOrder.handleFinishTable()
      setSelectedTableId(null)
      setSelectedSeat(null)
      setShowSeatSelection(false)

      toast.success('Payment complete! Table is now available.')
    } catch (error) {
      logger.error('[handlePaymentSuccess] Failed to complete payment flow', { error })
      toast.error('Payment recorded but table status update failed. Please refresh.')
      // Don't reset state - allow user to retry or see the error state
    }
  }, [paymentState.table_id, patch, voiceOrder, setSelectedTableId, toast])

  // Handle payment modal close (without payment)
  const handlePaymentModalClose = useCallback(() => {
    setPaymentState(initialPaymentState)
    // Re-show post order prompt
    voiceOrder.setShowPostOrderPrompt(true)
  }, [voiceOrder])

  return (
    <RoleGuard suggestedRoles={['server', 'admin']} pageTitle="Server View - Dining Room">
      <div className="min-h-screen bg-macon-background">
        <ServerHeader restaurant={restaurant} />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            suppressHydrationWarning
          >
            <ServerFloorPlan
              tables={tables}
              selectedTableId={selectedTableId}
              onTableClick={handleTableSelection}
              onCanvasClick={handleCloseModals}
              isLoading={isLoading}
            />

            <SeatSelectionModal
              show={showSeatSelection && !!selectedTable}
              table={transformedTable}
              selectedSeat={selectedSeat}
              orderedSeats={voiceOrder.orderedSeats}
              canCreateOrders={canCreateOrders}
              onSeatSelect={setSelectedSeat}
              onStartVoiceOrder={handleStartVoiceOrder}
              onFinishTable={handleFinishTable}
              onClose={handleCloseSeatSelection}
            />

            <VoiceOrderModal
              show={voiceOrder.showVoiceOrder && !!selectedTable}
              table={transformedTable}
              seat={selectedSeat}
              voiceOrder={voiceOrder}
              onSubmit={handleSubmitOrder}
              onClose={handleCloseModals}
              isSubmitting={voiceOrder.isSubmitting}
              initialInputMode={initialInputMode}
            />

            <PostOrderPrompt
              show={voiceOrder.showPostOrderPrompt && !!selectedTable}
              table={transformedTable}
              completedSeat={voiceOrder.lastCompletedSeat || 1}
              orderedSeats={voiceOrder.orderedSeats}
              totalSeats={selectedTable?.seats || 4}
              onAddNextSeat={handleAddNextSeat}
              onFinishTable={handleFinishTable}
              onCloseTable={handleCloseTable}
              isLoadingCloseTable={isLoadingPayment}
            />

            {/* Payment Modal for Close Table */}
            <PaymentErrorBoundary onRetry={() => setPaymentState(initialPaymentState)}>
              <PaymentModal
                show={paymentState.show_modal}
                order_id={paymentState.order_id || ''}
                subtotal={paymentState.subtotal}
                tax={paymentState.tax}
                table_id={paymentState.table_id || undefined}
                onClose={handlePaymentModalClose}
                onSuccess={handlePaymentSuccess}
              />
            </PaymentErrorBoundary>

            <ServerStats stats={stats} />

            <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">How to Use Server View</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Click on any available table (green) to select it</li>
                    <li>Choose a seat number for the order</li>
                    <li>Use voice commands to add items to the order</li>
                    <li>Review and submit the order when complete</li>
                    <li>Add orders for additional seats or finish the entire table</li>
                  </ol>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </RoleGuard>
  )
})

ServerView.displayName = 'ServerView'