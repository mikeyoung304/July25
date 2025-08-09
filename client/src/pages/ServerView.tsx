import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card } from '@/components/ui/card'
import { useServerView } from './hooks/useServerView'
import { useTableInteraction } from './hooks/useTableInteraction'
import { useVoiceOrderFlow } from './hooks/useVoiceOrderFlow'
import { ServerFloorPlan } from './components/ServerFloorPlan'
import { SeatSelectionModal } from './components/SeatSelectionModal'
import { VoiceOrderModal } from './components/VoiceOrderModal'
import { ServerStats } from './components/ServerStats'
import { ServerHeader } from './components/ServerHeader'
import { Info } from 'lucide-react'

export function ServerView() {
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
  const voiceOrder = useVoiceOrderFlow()
  const [showSeatSelection, setShowSeatSelection] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)

  const handleTableSelection = useCallback((tableId: string) => {
    handleTableClick(tableId)
    setShowSeatSelection(true)
  }, [handleTableClick])

  const handleStartVoiceOrder = useCallback(() => {
    if (selectedTableId && selectedSeat) {
      setShowSeatSelection(false)
      voiceOrder.setShowVoiceOrder(true)
    }
  }, [selectedTableId, selectedSeat, voiceOrder])

  const handleSubmitOrder = useCallback(async () => {
    const success = await voiceOrder.submitOrder(selectedTable, selectedSeat)
    if (success) {
      setSelectedTableId(null)
      setSelectedSeat(null)
      setShowSeatSelection(false)
      voiceOrder.resetVoiceOrder()
    }
  }, [voiceOrder, selectedTable, selectedSeat, setSelectedTableId])

  const handleCloseModals = useCallback(() => {
    setSelectedTableId(null)
    setSelectedSeat(null)
    setShowSeatSelection(false)
    voiceOrder.resetVoiceOrder()
  }, [setSelectedTableId, voiceOrder])

  return (
    <RoleGuard suggestedRoles={['server', 'admin']} pageTitle="Server View - Dining Room">
      <div className="min-h-screen bg-macon-background">
        <ServerHeader restaurant={restaurant} />
        
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
              table={selectedTable}
              selectedSeat={selectedSeat}
              onSeatSelect={setSelectedSeat}
              onStartVoiceOrder={handleStartVoiceOrder}
              onClose={() => {
                setShowSeatSelection(false)
                setSelectedTableId(null)
                setSelectedSeat(null)
              }}
            />

            <VoiceOrderModal
              show={voiceOrder.showVoiceOrder && !!selectedTable}
              table={selectedTable}
              seat={selectedSeat}
              voiceOrder={voiceOrder}
              onSubmit={handleSubmitOrder}
              onClose={handleCloseModals}
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
                  </ol>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </RoleGuard>
  )
}