import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card } from '@/components/ui/card'
import { useServerView } from './hooks/useServerView'
import { useTableInteraction } from './hooks/useTableInteraction'
import { useVoiceOrderWebRTC } from './hooks/useVoiceOrderWebRTC'
import { ServerFloorPlan } from './components/ServerFloorPlan'
import { SeatSelectionModal } from './components/SeatSelectionModal'
import { VoiceOrderModal } from './components/VoiceOrderModal'
import { ServerStats } from './components/ServerStats'
import { ServerHeader } from './components/ServerHeader'
import { TableCheckPresenter } from '@/modules/payment/components/TableCheckPresenter'
import { Info, CreditCard } from 'lucide-react'

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
  const voiceOrder = useVoiceOrderWebRTC()
  const [showSeatSelection, setShowSeatSelection] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [showPaymentFlow, setShowPaymentFlow] = useState(false)
  const [paymentTableId, setPaymentTableId] = useState<string | null>(null)

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

  const handleProcessPayment = useCallback((tableId: string) => {
    setPaymentTableId(tableId)
    setShowPaymentFlow(true)
  }, [])

  const handlePaymentComplete = useCallback(() => {
    setShowPaymentFlow(false)
    setPaymentTableId(null)
    // Refresh tables to show updated status
    window.location.reload()
  }, [])

  return (
    <RoleGuard suggestedRoles={['server', 'admin']} pageTitle="Server View - Dining Room">
      <div className="min-h-screen bg-macon-background">
        <ServerHeader restaurant={restaurant ? {
          ...restaurant,
          logo_url: undefined,
          tax_rate: 0.08,
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
                label: selectedTable.label,
                capacity: selectedTable.seats,
                status: selectedTable.status === 'unavailable' ? 'cleaning' : selectedTable.status as 'available' | 'occupied' | 'reserved',
                current_order_id: selectedTable.current_order_id,
                created_at: selectedTable.created_at || new Date().toISOString(),
                updated_at: selectedTable.updated_at || new Date().toISOString()
              } : null}
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
              table={selectedTable as any}
              seat={selectedSeat}
              voiceOrder={voiceOrder}
              onSubmit={handleSubmitOrder}
              onClose={handleCloseModals}
            />

            <ServerStats stats={stats} />

            {/* Table Actions for Occupied Tables */}
            {tables.filter(t => t.status === 'occupied').length > 0 && (
              <Card className="mt-6 p-6">
                <h3 className="font-semibold text-lg mb-4">Occupied Tables</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables
                    .filter(t => t.status === 'occupied' && t.current_order_id)
                    .map(table => (
                      <div key={table.id} className="border rounded-lg p-4">
                        <div className="font-semibold text-lg mb-2">
                          Table {table.label}
                        </div>
                        <button
                          onClick={() => handleProcessPayment(table.id)}
                          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Process Payment
                        </button>
                      </div>
                    ))}
                </div>
              </Card>
            )}

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
                    <li>For occupied tables, click "Process Payment" to handle checkout</li>
                  </ol>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Payment Flow Modal */}
      {showPaymentFlow && paymentTableId && (
        <div className="fixed inset-0 z-50 bg-white">
          <TableCheckPresenter
            tableId={paymentTableId}
            onComplete={handlePaymentComplete}
            onCancel={() => {
              setShowPaymentFlow(false)
              setPaymentTableId(null)
            }}
          />
        </div>
      )}
    </RoleGuard>
  )
}