'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Leaf, Snowflake, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderCard } from '../order-card'

interface SaladStationProps {
  orders: any[]
  onOrderAction: (action: string, orderId: string) => void
  className?: string
}

// Salad-specific order priorities
const getSaladPriority = (items: string[]) => {
  const coldItems = ['salad', 'cold', 'gazpacho', 'ceviche']
  const warmItems = ['soup', 'warm', 'hot']
  
  const hasColdItems = items.some(item => 
    coldItems.some(coldItem => 
      item.toLowerCase().includes(coldItem)
    )
  )
  const hasWarmItems = items.some(item => 
    warmItems.some(warmItem => 
      item.toLowerCase().includes(warmItem)
    )
  )
  
  // Cold items have higher priority (need to stay fresh)
  if (hasColdItems) return 'high'
  if (hasWarmItems) return 'medium'
  return 'low'
}

// Estimated prep times for salad station
const getEstimatedPrepTime = (items: string[]) => {
  const prepTimes: Record<string, number> = {
    salad: 3,
    soup: 2,
    gazpacho: 1,
    ceviche: 5,
    appetizer: 4,
  }
  
  let maxTime = 2 // default
  items.forEach(item => {
    Object.entries(prepTimes).forEach(([food, time]) => {
      if (item.toLowerCase().includes(food)) {
        maxTime = Math.max(maxTime, time)
      }
    })
  })
  
  return maxTime
}

// Check if item needs to stay cold
const needsColdStorage = (item: string) => {
  const coldItems = ['salad', 'gazpacho', 'ceviche', 'cold']
  return coldItems.some(coldItem => 
    item.toLowerCase().includes(coldItem)
  )
}

// Salad-specific order card
const SaladOrderCard = memo(({ 
  order, 
  onAction 
}: { 
  order: any
  onAction: (action: string, orderId: string) => void 
}) => {
  const estimatedTime = getEstimatedPrepTime(order.items || [])
  const priority = getSaladPriority(order.items || [])
  const elapsedMinutes = order.elapsed_seconds ? Math.floor(order.elapsed_seconds / 60) : 0
  const hasColdItems = (order.items || []).some(needsColdStorage)
  
  const handleStart = useCallback(() => {
    onAction('start', order.id)
  }, [onAction, order.id])
  
  const handleComplete = useCallback(() => {
    onAction('complete', order.id)
  }, [onAction, order.id])
  
  return (
    <Card className={cn(
      "relative",
      priority === 'high' && "border-green-500 bg-green-50/5",
      elapsedMinutes > estimatedTime && "border-red-500 bg-red-50/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-500" />
            <span className="font-semibold">Table {order.table_label}</span>
            {hasColdItems && (
              <div title="Contains cold items">
                <Snowflake className="h-3 w-3 text-blue-400" />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={priority === 'high' ? 'destructive' : 'secondary'}>
              {priority}
            </Badge>
            
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Timer className="h-3 w-3" />
              <span>{elapsedMinutes}m / {estimatedTime}m</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {(order.items || []).map((item: string, index: number) => (
            <div key={index} className="text-sm flex items-center gap-2">
              {needsColdStorage(item) && (
                <Snowflake className="h-3 w-3 text-blue-400" />
              )}
              <span className={cn(
                getSaladPriority([item]) === 'high' 
                  ? "font-medium text-green-600"
                  : "text-gray-700"
              )}>
                {item}
              </span>
            </div>
          ))}
        </div>
        
        {order.special_requests && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <strong>Special:</strong> {order.special_requests}
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          {order.status === 'new' && (
            <Button 
              onClick={handleStart}
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Leaf className="h-3 w-3 mr-1" />
              Start Prep
            </Button>
          )}
          
          {order.status === 'in_progress' && (
            <Button 
              onClick={handleComplete}
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
SaladOrderCard.displayName = 'SaladOrderCard'

export const SaladStation = memo<SaladStationProps>(({ 
  orders, 
  onOrderAction, 
  className 
}) => {
  // Filter orders relevant to salad station
  const saladOrders = orders.filter(order => {
    const items = order.items || []
    return items.some((item: string) => 
      ['salad', 'soup', 'gazpacho', 'ceviche', 'appetizer', 'cold'].some(saladItem =>
        item.toLowerCase().includes(saladItem)
      )
    )
  })
  
  // Sort by priority and time (cold items first)
  const sortedOrders = saladOrders.sort((a, b) => {
    const aPriority = getSaladPriority(a.items || [])
    const bPriority = getSaladPriority(b.items || [])
    
    if (aPriority !== bPriority) {
      return aPriority === 'high' ? -1 : 1
    }
    
    return (a.elapsed_seconds || 0) - (b.elapsed_seconds || 0)
  })
  
  const activeOrders = sortedOrders.filter(order => 
    order.status === 'new' || order.status === 'in_progress'
  ).length
  
  const coldOrders = sortedOrders.filter(order => 
    (order.items || []).some(needsColdStorage)
  ).length
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold text-white">Salad Station</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn(
            activeOrders > 6 
              ? "bg-red-900/40 text-red-400" 
              : activeOrders > 3 
                ? "bg-yellow-900/40 text-yellow-400"
                : "bg-green-900/40 text-green-400"
          )}>
            {activeOrders} active
          </Badge>
          
          {coldOrders > 0 && (
            <Badge variant="secondary" className="bg-blue-900/40 text-blue-400">
              <Snowflake className="h-3 w-3 mr-1" />
              {coldOrders} cold
            </Badge>
          )}
        </div>
      </div>
      
      {sortedOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No salad orders</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedOrders.map(order => (
            <SaladOrderCard
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

SaladStation.displayName = 'SaladStation'