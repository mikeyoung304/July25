import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Check, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import type { Table } from '@/types/table'

interface SeatSelectionModalProps {
  show: boolean
  table: Table | null | undefined
  selectedSeat: number | null
  orderedSeats?: number[]
  onSeatSelect: (seat: number) => void
  onStartVoiceOrder: () => void
  onFinishTable?: () => void
  onClose: () => void
}

export function SeatSelectionModal({
  show,
  table,
  selectedSeat,
  orderedSeats = [],
  onSeatSelect,
  onStartVoiceOrder,
  onFinishTable,
  onClose
}: SeatSelectionModalProps) {
  if (!show || !table) return null

  const seats = Array.from({ length: table.capacity }, (_, i) => i + 1)
  const hasOrderedSeats = orderedSeats.length > 0

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
            <Card className="w-full max-w-lg p-6 bg-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-800">
                    Select Seat - {table.label}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Choose a seat number to continue with the order
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

              <div className="grid grid-cols-3 gap-3 mb-6">
                {seats.map((seat) => {
                  const isOrdered = orderedSeats.includes(seat)
                  const isSelected = selectedSeat === seat

                  return (
                    <motion.button
                      key={seat}
                      whileHover={{ scale: isOrdered ? 1.02 : 1.05 }}
                      whileTap={{ scale: isOrdered ? 0.98 : 0.95 }}
                      onClick={() => onSeatSelect(seat)}
                      className={`
                        p-4 rounded-xl border-2 transition-all duration-200 relative
                        ${isSelected && !isOrdered
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                          : isOrdered
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50'
                        }
                      `}
                      title={isOrdered ? `Seat ${seat} - Order already placed` : `Select Seat ${seat}`}
                    >
                      {isOrdered && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
                        >
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Seat {seat}</span>
                      {isOrdered && (
                        <span className="text-xs text-green-600 block mt-1">Ordered</span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Show progress if there are ordered seats */}
              {hasOrderedSeats && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      {orderedSeats.length} of {seats.length} seats ordered
                    </span>
                  </div>
                </motion.div>
              )}

              <div className="flex flex-col gap-3">
                {/* Primary Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <ActionButton
                    onClick={onStartVoiceOrder}
                    disabled={!selectedSeat}
                    color="#4ECDC4"
                    size="medium"
                    fullWidth
                  >
                    Start Voice Order
                  </ActionButton>
                </div>

                {/* Finish Table Button - shown when there are ordered seats */}
                {hasOrderedSeats && onFinishTable && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ActionButton
                      onClick={onFinishTable}
                      color="#4CAF50"
                      size="medium"
                      fullWidth
                      icon={<CheckCircle2 className="h-5 w-5" />}
                    >
                      Finish Table ({orderedSeats.length} orders)
                    </ActionButton>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}