import React, { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils'
import type { ScheduledOrderGroup } from '@/hooks/useScheduledOrders'

interface ScheduledOrdersSectionProps {
  scheduledGroups: ScheduledOrderGroup[]
  onManualFire?: (orderId: string) => void
}

export const ScheduledOrdersSection: React.FC<ScheduledOrdersSectionProps> = ({
  scheduledGroups,
  onManualFire
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (scheduledGroups.length === 0) return null

  const totalScheduled = scheduledGroups.reduce(
    (sum, group) => sum + group.order_count,
    0
  )

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mt-6">
      {/* Header - clickable to expand/collapse */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-blue-900">Scheduled Orders</h3>
          <Badge variant="secondary">{totalScheduled} {totalScheduled === 1 ? 'order' : 'orders'}</Badge>
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {scheduledGroups.map((group, idx) => {
            const isUrgent = group.minutes_until_fire <= 0
            const isWarning = group.minutes_until_fire > 0 && group.minutes_until_fire <= 5

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg p-3 border-2 transition-all",
                  isUrgent && "bg-red-50 border-red-400",
                  isWarning && "bg-orange-50 border-orange-400",
                  !isUrgent && !isWarning && "bg-white border-blue-300"
                )}
              >
                {/* Group header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>Pickup: {new Date(group.scheduled_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <div className={cn(
                      "text-xs font-medium flex items-center gap-1 mt-1",
                      isUrgent && "text-red-600",
                      isWarning && "text-orange-600",
                      !isUrgent && !isWarning && "text-gray-600"
                    )}>
                      {isUrgent ? (
                        <>
                          <Zap className="w-3 h-3" />
                          <span className="font-bold">FIRE NOW!</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Fire in {group.minutes_until_fire} minutes</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {group.order_count} {group.order_count === 1 ? 'order' : 'orders'}
                    </Badge>
                    {onManualFire && (
                      <Button
                        size="sm"
                        variant={isUrgent ? "destructive" : "outline"}
                        onClick={() => group.orders.forEach(o => onManualFire(o.id))}
                        className="gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        Fire {isUrgent ? 'Now' : 'Early'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order list */}
                <div className="space-y-1 bg-white/50 rounded p-2">
                  {group.orders.map(order => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between text-xs text-gray-700 py-1 border-b border-gray-200 last:border-0"
                    >
                      <span className="font-medium">#{order.order_number}</span>
                      <span>{order.customer_name || 'Guest'}</span>
                      <span className="text-gray-500">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick summary when collapsed */}
      {!isExpanded && scheduledGroups.length > 0 && (
        <div className="mt-2 text-xs text-blue-700">
          Next order fires in {Math.min(...scheduledGroups.map(g => g.minutes_until_fire))} minutes
        </div>
      )}
    </div>
  )
}
