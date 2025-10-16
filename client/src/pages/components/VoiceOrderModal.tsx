import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, ShoppingCart, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import { Badge } from '@/components/ui/badge'
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC'
import { OrderModification } from '@/modules/voice/contexts/types'
import type { Table } from '@/types/table'

interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
}

interface VoiceOrderModalProps {
  show: boolean
  table: Table | null | undefined
  seat: number | null
  voiceOrder: {
    currentTranscript: string
    orderItems: OrderItem[]
    isVoiceActive: boolean
    isProcessing: boolean
    handleVoiceTranscript: (event: { text: string; isFinal: boolean }) => void
    handleOrderData?: (orderData: any) => void
    removeOrderItem: (itemId: string) => void
    setOrderItems: (items: OrderItem[]) => void
    setIsProcessing: (processing: boolean) => void
  }
  onSubmit: () => void
  onClose: () => void
}

export function VoiceOrderModal({
  show,
  table,
  seat,
  voiceOrder,
  onSubmit,
  onClose
}: VoiceOrderModalProps) {
  if (!show || !table || !seat) return null

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-800">
                      Voice Order - {table.label}, Seat {seat}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      Press and hold the microphone to add items
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-neutral-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                <div className="flex justify-center mb-6">
                  <VoiceControlWebRTC
                    onTranscript={(event) => voiceOrder.handleVoiceTranscript(event)}
                    onOrderDetected={voiceOrder.handleOrderData}
                    debug={false}
                    muteAudioOutput={true}
                  />
                </div>

                {voiceOrder.currentTranscript && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-accent/10 rounded-lg border border-accent"
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-accent animate-pulse" />
                      <span className="text-sm font-medium text-accent">Listening...</span>
                    </div>
                    <p className="text-sm text-neutral-700 mt-2">{voiceOrder.currentTranscript}</p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-neutral-800">Order Items</h4>
                    <Badge variant="secondary">
                      {voiceOrder.orderItems.length} items
                    </Badge>
                  </div>

                  {voiceOrder.orderItems.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                      <p className="text-neutral-500">No items added yet</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        Press and hold the microphone to start ordering
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {voiceOrder.orderItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-neutral-500">
                              {item.quantity}x
                            </span>
                            <div className="flex-1">
                              <span className="text-sm text-neutral-700">{item.name}</span>
                              {item.modifications && item.modifications.length > 0 && (
                                <div className="text-xs text-neutral-500 mt-0.5">
                                  {item.modifications.map(mod => mod.name).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => voiceOrder.removeOrderItem(item.id)}
                            className="p-1.5 hover:bg-red-100 rounded-md transition-colors group"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-neutral-400 group-hover:text-red-500" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {voiceOrder.isProcessing && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                      <span className="text-sm text-blue-700">Processing voice input...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-neutral-50">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <ActionButton
                    onClick={onSubmit}
                    disabled={voiceOrder.orderItems.length === 0 || voiceOrder.isProcessing}
                    color="#4CAF50"
                    size="medium"
                    fullWidth
                    icon={<ShoppingCart className="h-5 w-5" />}
                  >
                    Submit Order ({voiceOrder.orderItems.length})
                  </ActionButton>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}