import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import type { Table } from '@/types/table'

interface SeatSelectionModalProps {
  show: boolean
  table: Table | null | undefined
  selectedSeat: number | null
  onSeatSelect: (seat: number) => void
  onStartVoiceOrder: () => void
  onClose: () => void
}

export function SeatSelectionModal({
  show,
  table,
  selectedSeat,
  onSeatSelect,
  onStartVoiceOrder,
  onClose
}: SeatSelectionModalProps) {
  if (!show || !table) return null

  const seats = Array.from({ length: table.capacity }, (_, i) => i + 1)

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
                {seats.map((seat) => (
                  <motion.button
                    key={seat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSeatSelect(seat)}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200
                      ${selectedSeat === seat
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">Seat {seat}</span>
                  </motion.button>
                ))}
              </div>

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
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}