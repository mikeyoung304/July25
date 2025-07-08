'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Coffee, Martini, Timer, Wine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderCard } from '../order-card'

interface BarStationProps {
  orders: any[]
  onOrderAction: (action: string, orderId: string) => void
  className?: string
}

// Bar-specific order priorities
const getBarPriority = (items: string[]) => {
  const cocktailItems = ['cocktail', 'martini', 'mojito', 'margarita', 'cosmopolitan']
  const wineItems = ['wine', 'champagne', 'prosecco']
  const beerItems = ['beer', 'lager', 'ale', 'ipa']
  const coffeeItems = ['coffee', 'espresso', 'latte', 'cappuccino']
  
  const hasCocktails = items.some(item => 
    cocktailItems.some(cocktailItem => 
      item.toLowerCase().includes(cocktailItem)
    )
  )
  const hasWine = items.some(item => 
    wineItems.some(wineItem => 
      item.toLowerCase().includes(wineItem)
    )
  )
  const hasBeer = items.some(item => 
    beerItems.some(beerItem => 
      item.toLowerCase().includes(beerItem)
    )
  )
  const hasCoffee = items.some(item => 
    coffeeItems.some(coffeeItem => 
      item.toLowerCase().includes(coffeeItem)
    )
  )
  
  // Cocktails take longest, highest priority
  if (hasCocktails) return 'high'
  if (hasCoffee) return 'medium'
  if (hasWine || hasBeer) return 'low'
  return 'medium'
}

// Estimated prep times for bar items
const getEstimatedBarTime = (items: string[]) => {
  const barTimes: Record<string, number> = {
    cocktail: 5,
    martini: 4,
    mojito: 6,
    margarita: 4,
    cosmopolitan: 4,
    wine: 1,
    champagne: 1,
    beer: 1,
    coffee: 3,
    espresso: 2,
    latte: 4,
    cappuccino: 3,
  }
  
  let maxTime = 2 // default
  items.forEach(item => {
    Object.entries(barTimes).forEach(([drink, time]) => {
      if (item.toLowerCase().includes(drink)) {
        maxTime = Math.max(maxTime, time)
      }
    })
  })
  
  return maxTime
}

// Get drink type icon
const getDrinkIcon = (item: string) => {
  const lowerItem = item.toLowerCase()
  if (['cocktail', 'martini', 'mojito', 'margarita'].some(drink => lowerItem.includes(drink))) {
    return <Martini className="h-3 w-3 text-purple-500" />
  }
  if (['wine', 'champagne', 'prosecco'].some(drink => lowerItem.includes(drink))) {
    return <Wine className="h-3 w-3 text-red-500" />
  }
  if (['coffee', 'espresso', 'latte', 'cappuccino'].some(drink => lowerItem.includes(drink))) {
    return <Coffee className="h-3 w-3 text-amber-600" />
  }
  return <Wine className="h-3 w-3 text-blue-500" /> // Default for other drinks
}

// Bar-specific order card
const BarOrderCard = memo(({ 
  order, 
  onAction 
}: { 
  order: any
  onAction: (action: string, orderId: string) => void 
}) => {
  const estimatedTime = getEstimatedBarTime(order.items || [])
  const priority = getBarPriority(order.items || [])
  const elapsedMinutes = order.elapsed_seconds ? Math.floor(order.elapsed_seconds / 60) : 0
  
  const handleStart = useCallback(() => {
    onAction('start', order.id)
  }, [onAction, order.id])
  
  const handleComplete = useCallback(() => {
    onAction('complete', order.id)
  }, [onAction, order.id])
  
  return (
    <Card className={cn(
      "relative",
      priority === 'high' && "border-purple-500 bg-purple-50/5",
      elapsedMinutes > estimatedTime && "border-red-500 bg-red-50/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wine className="h-4 w-4 text-purple-500" />
            <span className="font-semibold">Table {order.table_label}</span>
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
              {getDrinkIcon(item)}
              <span className={cn(
                getBarPriority([item]) === 'high' 
                  ? "font-medium text-purple-600"
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
        
        {/* Age verification note for alcohol */}
        {(order.items || []).some((item: string) => 
          ['wine', 'beer', 'cocktail', 'martini', 'champagne'].some(alcohol => 
            item.toLowerCase().includes(alcohol)
          )
        ) && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <strong>Note:</strong> Age verification required
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          {order.status === 'new' && (
            <Button 
              onClick={handleStart}
              size="sm" 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Wine className="h-3 w-3 mr-1" />
              Start Mixing
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
BarOrderCard.displayName = 'BarOrderCard'

export const BarStation = memo<BarStationProps>(({ 
  orders, 
  onOrderAction, 
  className 
}) => {
  // Filter orders relevant to bar station
  const barOrders = orders.filter(order => {
    const items = order.items || []
    return items.some((item: string) => 
      ['wine', 'beer', 'cocktail', 'martini', 'mojito', 'margarita', 'coffee', 'espresso', 'latte', 'drink'].some(barItem =>
        item.toLowerCase().includes(barItem)
      )
    )
  })
  
  // Sort by priority and time (cocktails first)
  const sortedOrders = barOrders.sort((a, b) => {
    const aPriority = getBarPriority(a.items || [])
    const bPriority = getBarPriority(b.items || [])
    
    if (aPriority !== bPriority) {
      return aPriority === 'high' ? -1 : 1
    }
    
    return (a.elapsed_seconds || 0) - (b.elapsed_seconds || 0)
  })
  
  const activeOrders = sortedOrders.filter(order => 
    order.status === 'new' || order.status === 'in_progress'
  ).length
  
  const cocktailOrders = sortedOrders.filter(order => 
    (order.items || []).some((item: string) => 
      ['cocktail', 'martini', 'mojito', 'margarita'].some(cocktail => 
        item.toLowerCase().includes(cocktail)
      )
    )
  ).length
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wine className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-white">Bar Station</h2>
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
          
          {cocktailOrders > 0 && (
            <Badge variant="secondary" className="bg-purple-900/40 text-purple-400">
              <Martini className="h-3 w-3 mr-1" />
              {cocktailOrders} cocktails
            </Badge>
          )}
        </div>
      </div>
      
      {sortedOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Wine className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No bar orders</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedOrders.map(order => (
            <BarOrderCard
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

BarStation.displayName = 'BarStation'