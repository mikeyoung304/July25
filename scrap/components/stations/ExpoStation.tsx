'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Clock, Eye, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderCard } from '../order-card'

interface ExpoStationProps {
  orders: any[]
  onOrderAction: (action: string, orderId: string) => void
  className?: string
}

// Expo station handles order completion and quality control
const getExpoPriority = (order: any) => {
  const elapsedMinutes = order.elapsed_seconds ? Math.floor(order.elapsed_seconds / 60) : 0
  const isOverdue = elapsedMinutes > 15 // Orders over 15 minutes are critical
  const isLate = elapsedMinutes > 10 // Orders over 10 minutes are urgent
  
  if (isOverdue) return 'critical'
  if (isLate) return 'high'
  if (order.status === 'ready') return 'medium'
  return 'low'
}

// Check order completeness
const getOrderCompleteness = (order: any) => {
  const totalItems = order.items?.length || 0
  const completedItems = order.completed_items?.length || 0
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  
  return {
    completed: completedItems,
    total: totalItems,
    percentage,
    isComplete: percentage === 100
  }
}

// Expo-specific order card
const ExpoOrderCard = memo(({ 
  order, 
  onAction 
}: { 
  order: any
  onAction: (action: string, orderId: string) => void 
}) => {
  const priority = getExpoPriority(order)
  const completeness = getOrderCompleteness(order)
  const elapsedMinutes = order.elapsed_seconds ? Math.floor(order.elapsed_seconds / 60) : 0
  
  const handleQualityCheck = useCallback(() => {
    onAction('quality_check', order.id)
  }, [onAction, order.id])
  
  const handleComplete = useCallback(() => {
    onAction('complete', order.id)
  }, [onAction, order.id])
  
  const handleRecall = useCallback(() => {
    onAction('recall', order.id)
  }, [onAction, order.id])
  
  return (
    <Card className={cn(
      "relative",
      priority === 'critical' && "border-red-500 bg-red-50/5",
      priority === 'high' && "border-orange-500 bg-orange-50/5",
      order.status === 'ready' && "border-green-500 bg-green-50/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-500" />
            <span className="font-semibold">Table {order.table_label}</span>
            {order.server_name && (
              <Badge variant="outline" className="text-xs">
                {order.server_name}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={
              priority === 'critical' ? 'destructive' : 
              priority === 'high' ? 'destructive' : 'secondary'
            }>
              {priority}
            </Badge>
            
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{elapsedMinutes}m</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Order completeness indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Order Progress</span>
            <span className={cn(
              "font-medium",
              completeness.isComplete ? "text-green-600" : "text-orange-600"
            )}>
              {completeness.completed}/{completeness.total} items
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all",
                completeness.isComplete ? "bg-green-500" : "bg-orange-500"
              )}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          {(order.items || []).map((item: string, index: number) => {
            const isCompleted = order.completed_items?.includes(item)
            return (
              <div key={index} className="text-sm flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isCompleted ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className={cn(
                  isCompleted ? "text-gray-500 line-through" : "text-gray-700"
                )}>
                  {item}
                </span>
              </div>
            )
          })}
        </div>
        
        {order.special_requests && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <strong>Special:</strong> {order.special_requests}
          </div>
        )}
        
        {/* Quality issues */}
        {order.quality_issues && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <strong>Issues:</strong> {order.quality_issues}
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          {order.status === 'ready' && !completeness.isComplete && (
            <Button 
              onClick={handleRecall}
              size="sm" 
              variant="outline"
              className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Recall
            </Button>
          )}
          
          {order.status === 'ready' && completeness.isComplete && (
            <>
              <Button 
                onClick={handleQualityCheck}
                size="sm" 
                variant="outline"
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                QC
              </Button>
              
              <Button 
                onClick={handleComplete}
                size="sm" 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Serve
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
ExpoOrderCard.displayName = 'ExpoOrderCard'

export const ExpoStation = memo<ExpoStationProps>(({ 
  orders, 
  onOrderAction, 
  className 
}) => {
  // Filter orders ready for expo (completed or nearly completed)
  const expoOrders = orders.filter(order => {
    const completeness = getOrderCompleteness(order)
    return order.status === 'ready' || completeness.percentage >= 80
  })
  
  // Sort by priority (critical orders first)
  const sortedOrders = expoOrders.sort((a, b) => {
    const aPriority = getExpoPriority(a)
    const bPriority = getExpoPriority(b)
    
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    
    if (aPriority !== bPriority) {
      return priorityOrder[aPriority] - priorityOrder[bPriority]
    }
    
    return (b.elapsed_seconds || 0) - (a.elapsed_seconds || 0)
  })
  
  const criticalOrders = sortedOrders.filter(order => 
    getExpoPriority(order) === 'critical'
  ).length
  
  const readyOrders = sortedOrders.filter(order => 
    order.status === 'ready'
  ).length
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-white">Expo Station</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn(
            readyOrders > 8 
              ? "bg-red-900/40 text-red-400" 
              : readyOrders > 4 
                ? "bg-yellow-900/40 text-yellow-400"
                : "bg-green-900/40 text-green-400"
          )}>
            {readyOrders} ready
          </Badge>
          
          {criticalOrders > 0 && (
            <Badge variant="secondary" className="bg-red-900/40 text-red-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalOrders} critical
            </Badge>
          )}
        </div>
      </div>
      
      {sortedOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No orders ready for expo</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedOrders.map(order => (
            <ExpoOrderCard
              key={order.id}
              order={order}
              onAction={onOrderAction}
            />
          ))}
        </div>
      )}
    </div>
  )
})

ExpoStation.displayName = 'ExpoStation'