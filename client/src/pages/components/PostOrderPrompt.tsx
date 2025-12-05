import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Users, Check, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ActionButton } from '@/components/ui/ActionButton'
import type { Table } from '@rebuild/shared/types'

interface PostOrderPromptProps {
  show: boolean
  table: Table | null | undefined
  completedSeat: number
  orderedSeats: number[]
  totalSeats: number
  onAddNextSeat: () => void
  onFinishTable: () => void
  onCloseTable?: () => void
  isLoadingCloseTable?: boolean
}

export function PostOrderPrompt({
  show,
  table,
  completedSeat,
  orderedSeats,
  totalSeats,
  onAddNextSeat,
  onFinishTable,
  onCloseTable,
  isLoadingCloseTable = false
}: PostOrderPromptProps) {
  if (!show || !table) return null

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-lg p-8 bg-white">
              {/* Success Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute inset-0 bg-green-100 rounded-full blur-xl"
                  />
                  <CheckCircle2
                    className="h-20 w-20 text-green-500 relative z-10"
                    strokeWidth={2.5}
                  />
                </div>
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <h3 className="text-2xl font-bold text-neutral-800 mb-2">
                  Order Submitted!
                </h3>
                <p className="text-neutral-600">
                  Seat {completedSeat} order has been sent to the kitchen
                </p>
              </motion.div>

              {/* Progress Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 p-4 bg-neutral-50 rounded-xl border border-neutral-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-700">
                    {table.label} Progress
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {orderedSeats.length} of {totalSeats} seats ordered
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(orderedSeats.length / totalSeats) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="bg-primary h-2.5 rounded-full"
                  />
                </div>

                {/* Seat Status Grid */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {Array.from({ length: totalSeats }, (_, i) => i + 1).map((seat) => (
                    <motion.div
                      key={seat}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + (seat * 0.05) }}
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-lg
                        text-sm font-semibold transition-all duration-200
                        ${orderedSeats.includes(seat)
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                        }
                      `}
                      title={orderedSeats.includes(seat) ? `Seat ${seat} ordered` : `Seat ${seat} pending`}
                    >
                      {orderedSeats.includes(seat) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        seat
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col gap-3"
              >
                <ActionButton
                  onClick={onAddNextSeat}
                  color="#4ECDC4"
                  size="xl"
                  fullWidth
                  icon={<Users className="h-6 w-6" />}
                  aria-label="Add order for next seat"
                >
                  Add Next Seat
                </ActionButton>

                {onCloseTable && (
                  <ActionButton
                    onClick={onCloseTable}
                    color="#FF6B6B"
                    size="xl"
                    fullWidth
                    icon={<CreditCard className="h-6 w-6" />}
                    aria-label="Close table and process payment"
                    disabled={isLoadingCloseTable}
                  >
                    {isLoadingCloseTable ? 'Loading...' : 'Close Table'}
                  </ActionButton>
                )}

                <ActionButton
                  onClick={onFinishTable}
                  color="#4CAF50"
                  size="xl"
                  fullWidth
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  aria-label="Finish ordering for this table"
                >
                  Finish Table
                </ActionButton>
              </motion.div>

              {/* Helper Text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center text-xs text-neutral-500 mt-4"
              >
                {onCloseTable
                  ? 'Add more seats, close table for payment, or finish without payment'
                  : 'Click "Add Next Seat" to take another order, or "Finish Table" when done'
                }
              </motion.p>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
