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
import { Info } from 'lucide-react'
import type { OrderInputMode } from '@/components/shared/OrderInputSelector'

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

  return (
    <RoleGuard suggestedRoles={['server', 'admin']} pageTitle="Server View - Dining Room">
      <div className="min-h-screen bg-macon-background">
        <ServerHeader restaurant={restaurant ? {
          ...restaurant,
          logo_url: undefined,
          tax_rate: restaurant.tax_rate ?? 0.08, // Use restaurant-specific tax rate with fallback
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } : null} />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
                created_at: selectedTable.created_at || new Date().toISOString(),
                updated_at: selectedTable.updated_at || new Date().toISOString()
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
                created_at: selectedTable.created_at || new Date().toISOString(),
                updated_at: selectedTable.updated_at || new Date().toISOString()
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
                created_at: selectedTable.created_at || new Date().toISOString(),
                updated_at: selectedTable.updated_at || new Date().toISOString()
              } : null}
              completedSeat={voiceOrder.lastCompletedSeat || 1}
              orderedSeats={voiceOrder.orderedSeats}
              totalSeats={selectedTable?.seats || 4}
              onAddNextSeat={handleAddNextSeat}
              onFinishTable={handleFinishTable}
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