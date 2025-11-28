import React, { useState, useCallback, memo } from 'react'
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
import { Info } from 'lucide-react'
import type { OrderInputMode } from '@/components/shared/OrderInputSelector'
import { DEFAULT_TAX_RATE } from '@rebuild/shared/constants/business'
import { useHttpClient } from '@/services/http'
import { useToast } from '@/hooks/useToast'
import { logger } from '@/services/logger'

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
  const { get, patch } = useHttpClient()
  const { toast } = useToast()

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

  const handleFinishTableFromSeatModal = useCallback(() => {
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
    if (!selectedTable) {
      toast.error('No table selected')
      return
    }

    try {
      // Fetch orders for this table that are not yet paid
      const ordersResponse = await get(`/api/v1/orders`, {
        params: {
          table_number: selectedTable.label,
          payment_status: 'pending'
        }
      }) as any[]

      if (!ordersResponse || ordersResponse.length === 0) {
        toast.error('No unpaid orders found for this table')
        return
      }

      // Calculate totals from all orders
      const subtotal = ordersResponse.reduce((sum: number, order: any) => {
        return sum + (order.subtotal || 0)
      }, 0)

      const tax = ordersResponse.reduce((sum: number, order: any) => {
        return sum + (order.tax || 0)
      }, 0)

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
    }
  }, [selectedTable, get, toast, voiceOrder])

  // Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    logger.info('[handlePaymentSuccess] Payment completed', {
      tableId: paymentState.table_id
    })

    // Update table status to available
    if (paymentState.table_id) {
      try {
        await patch(`/api/v1/tables/${paymentState.table_id}/status`, {
          status: 'available'
        })
        logger.info('[handlePaymentSuccess] Table status updated to available')
      } catch (error) {
        logger.error('[handlePaymentSuccess] Failed to update table status', { error })
      }
    }

    // Reset payment state
    setPaymentState(initialPaymentState)

    // Finish the table (reset all ordering state)
    voiceOrder.handleFinishTable()
    setSelectedTableId(null)
    setSelectedSeat(null)
    setShowSeatSelection(false)

    toast.success('Payment complete! Table is now available.')
  }, [paymentState.table_id, patch, voiceOrder, setSelectedTableId, toast])

  // Handle payment modal close (without payment)
  const handlePaymentModalClose = useCallback(() => {
    setPaymentState(initialPaymentState)
    // Re-show post order prompt
    voiceOrder.setShowPostOrderPrompt(true)
  }, [voiceOrder])

  // Update table status after payment
  const handleUpdateTableStatus = useCallback(async () => {
    if (paymentState.table_id) {
      await patch(`/api/v1/tables/${paymentState.table_id}/status`, {
        status: 'available'
      })
    }
  }, [paymentState.table_id, patch])

  return (
    <RoleGuard suggestedRoles={['server', 'admin']} pageTitle="Server View - Dining Room">
      <div className="min-h-screen bg-macon-background">
        <ServerHeader restaurant={restaurant ? {
          ...restaurant,
          logo_url: undefined,
          tax_rate: restaurant.tax_rate ?? DEFAULT_TAX_RATE, // ADR-013: Shared constant
          created_at: restaurant.created_at || '',
          updated_at: restaurant.updated_at || ''
        } : null} />
        
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
              table={selectedTable ? {
                id: selectedTable.id,
                restaurant_id: selectedTable.restaurant_id || '',
                table_number: selectedTable.label,
                capacity: selectedTable.seats,
                status: selectedTable.status === 'unavailable' ? 'cleaning' : selectedTable.status as 'available' | 'occupied' | 'reserved',
                current_order_id: selectedTable.current_order_id,
                created_at: selectedTable.created_at || '',
                updated_at: selectedTable.updated_at || ''
              } : null}
              selectedSeat={selectedSeat}
              orderedSeats={voiceOrder.orderedSeats}
              canCreateOrders={canCreateOrders}
              onSeatSelect={setSelectedSeat}
              onStartVoiceOrder={handleStartVoiceOrder}
              onFinishTable={handleFinishTableFromSeatModal}
              onClose={handleCloseSeatSelection}
            />

            <VoiceOrderModal
              show={voiceOrder.showVoiceOrder && !!selectedTable}
              table={selectedTable ? {
                id: selectedTable.id,
                restaurant_id: selectedTable.restaurant_id || '',
                table_number: selectedTable.label,
                capacity: selectedTable.seats,
                status: selectedTable.status === 'unavailable' ? 'cleaning' : selectedTable.status as 'available' | 'occupied' | 'reserved',
                current_order_id: selectedTable.current_order_id,
                created_at: selectedTable.created_at || '',
                updated_at: selectedTable.updated_at || ''
              } : null}
              seat={selectedSeat}
              voiceOrder={voiceOrder}
              onSubmit={handleSubmitOrder}
              onClose={handleCloseModals}
              isSubmitting={voiceOrder.isSubmitting}
              initialInputMode={initialInputMode}
            />

            <PostOrderPrompt
              show={voiceOrder.showPostOrderPrompt && !!selectedTable}
              table={selectedTable ? {
                id: selectedTable.id,
                restaurant_id: selectedTable.restaurant_id || '',
                table_number: selectedTable.label,
                capacity: selectedTable.seats,
                status: selectedTable.status === 'unavailable' ? 'cleaning' : selectedTable.status as 'available' | 'occupied' | 'reserved',
                current_order_id: selectedTable.current_order_id,
                created_at: selectedTable.created_at || '',
                updated_at: selectedTable.updated_at || ''
              } : null}
              completedSeat={voiceOrder.lastCompletedSeat || 1}
              orderedSeats={voiceOrder.orderedSeats}
              totalSeats={selectedTable?.seats || 4}
              onAddNextSeat={handleAddNextSeat}
              onFinishTable={handleFinishTable}
              onCloseTable={handleCloseTable}
            />

            {/* Payment Modal for Close Table */}
            <PaymentModal
              show={paymentState.show_modal}
              order_id={paymentState.order_id || ''}
              subtotal={paymentState.subtotal}
              tax={paymentState.tax}
              table_id={paymentState.table_id || undefined}
              onClose={handlePaymentModalClose}
              onSuccess={handlePaymentSuccess}
              onUpdateTableStatus={handleUpdateTableStatus}
            />

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