import React, { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, User, Users, ChefHat, CheckCircle, 
  AlertCircle, Package, ArrowRight, Timer,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'
import type { TableGroup } from '@/hooks/useTableGrouping'
import { StationDots } from './StationStatusBar'

interface TableGroupCardProps {
  tableGroup: TableGroup
  onOrderStatusChange?: (orderId: string, status: 'ready') => void
  onBatchComplete?: (tableNumber: string) => void
  variant?: 'kitchen' | 'expo'
  className?: string
}

// Mini order card for displaying within table group
const MiniOrderCard = ({ 
  order, 
  onStatusChange 
}: { 
  order: Order
  onStatusChange?: (orderId: string, status: 'ready') => void 
}) => {
  const urgencyColor = useMemo(() => {
    const ageMinutes = Math.floor(
      (Date.now() - new Date(order.created_at).getTime()) / 60000
    )
    
    if (ageMinutes >= 20) return 'text-red-600 bg-red-50'
    if (ageMinutes >= 15) return 'text-orange-600 bg-orange-50'
    if (ageMinutes >= 10) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }, [order.created_at])
  
  const statusBadge = useMemo(() => {
    const statusConfig = {
      'new': { color: 'bg-blue-100 text-blue-800', label: 'NEW' },
      'pending': { color: 'bg-blue-100 text-blue-800', label: 'PENDING' },
      'confirmed': { color: 'bg-purple-100 text-purple-800', label: 'CONFIRMED' },
      'preparing': { color: 'bg-yellow-100 text-yellow-800', label: 'PREPARING' },
      'ready': { color: 'bg-green-100 text-green-800', label: 'READY' },
      'completed': { color: 'bg-gray-100 text-gray-800', label: 'COMPLETED' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'CANCELLED' }
    }
    
    return statusConfig[order.status] || statusConfig['pending']
  }, [order.status])
  
  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all hover:shadow-md",
      order.status === 'ready' && "border-green-400 bg-green-50/50",
      order.status === 'preparing' && "border-yellow-400 bg-yellow-50/50"
    )}>
      {/* Order header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">#{order.order_number}</span>
          <Badge className={cn("text-xs", statusBadge.color)}>
            {statusBadge.label}
          </Badge>
        </div>
        <div className={cn("text-xs px-2 py-1 rounded", urgencyColor)}>
          {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)}m
        </div>
      </div>
      
      {/* Compact item list */}
      <div className="space-y-1 text-xs">
        {order.items.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="font-semibold bg-gray-100 px-1 rounded">
              {item.quantity}x
            </span>
            <span className="truncate">{item.name}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="text-gray-500 italic">
            +{order.items.length - 3} more items...
          </div>
        )}
      </div>
      
      {/* Action button for kitchen view */}
      {onStatusChange && order.status !== 'ready' && order.status !== 'completed' && (
        <Button
          size="sm"
          className="w-full mt-2 h-8"
          onClick={() => onStatusChange(order.id, 'ready')}
        >
          Mark Ready
        </Button>
      )}
    </div>
  )
}

// Circular progress indicator
const CircularProgress = ({ 
  value, 
  size = 60, 
  strokeWidth = 4,
  label 
}: { 
  value: number
  size?: number
  strokeWidth?: number
  label?: string 
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (value / 100) * circumference
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-300",
            value === 100 && "text-green-600",
            value >= 75 && value < 100 && "text-blue-600",
            value >= 50 && value < 75 && "text-yellow-600",
            value < 50 && "text-gray-400"
          )}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{label}</span>
        </div>
      )}
    </div>
  )
}

export const TableGroupCard: React.FC<TableGroupCardProps> = ({
  tableGroup,
  onOrderStatusChange,
  onBatchComplete,
  variant = 'kitchen',
  className
}) => {
  // Determine card styling based on urgency and status
  const cardStyling = useMemo(() => {
    const baseClass = "border-2 shadow-xl transition-all"
    
    if (tableGroup.urgencyLevel === 'critical') {
      return cn(baseClass, "border-red-500 shadow-red-200 animate-pulse")
    }
    if (tableGroup.urgencyLevel === 'urgent') {
      return cn(baseClass, "border-orange-500 shadow-orange-200")
    }
    if (tableGroup.status === 'ready') {
      return cn(baseClass, "border-green-500 shadow-green-200")
    }
    if (tableGroup.status === 'partially-ready') {
      return cn(baseClass, "border-blue-500 shadow-blue-200")
    }
    
    return cn(baseClass, "border-gray-300")
  }, [tableGroup.urgencyLevel, tableGroup.status])
  
  // Header gradient based on status
  const headerGradient = useMemo(() => {
    if (tableGroup.status === 'ready') {
      return "bg-gradient-to-r from-green-50 to-green-100"
    }
    if (tableGroup.urgencyLevel === 'critical' || tableGroup.urgencyLevel === 'urgent') {
      return "bg-gradient-to-r from-red-50 to-orange-50"
    }
    return "bg-gradient-to-r from-blue-50 to-blue-100"
  }, [tableGroup.status, tableGroup.urgencyLevel])
  
  const handleBatchComplete = useCallback(() => {
    if (onBatchComplete) {
      onBatchComplete(tableGroup.tableNumber)
    }
  }, [onBatchComplete, tableGroup.tableNumber])
  
  const ageMinutes = useMemo(() => {
    return Math.floor(
      (Date.now() - new Date(tableGroup.oldestOrderTime).getTime()) / 60000
    )
  }, [tableGroup.oldestOrderTime])
  
  return (
    <Card className={cn(cardStyling, className)}>
      <CardHeader className={cn("pb-3", headerGradient)}>
        <div className="flex justify-between items-start">
          {/* Left section: Table info */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-blue-700">
                  Table {tableGroup.tableNumber}
                </span>
                {tableGroup.urgencyLevel === 'critical' && (
                  <AlertCircle className="w-6 h-6 text-red-600 animate-bounce" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="text-xs">
                  {tableGroup.orders.length} {tableGroup.orders.length === 1 ? 'order' : 'orders'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {tableGroup.totalItems} items
                </Badge>
                {tableGroup.serverName && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="w-3 h-3 mr-1" />
                    {tableGroup.serverName}
                  </Badge>
                )}
                {/* Station completion dots */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Stations:</span>
                  <StationDots orders={tableGroup.orders} size="md" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right section: Progress and stats */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span className={cn(
                  ageMinutes >= 20 && "text-red-600",
                  ageMinutes >= 15 && ageMinutes < 20 && "text-orange-600",
                  ageMinutes >= 10 && ageMinutes < 15 && "text-yellow-600",
                  ageMinutes < 10 && "text-green-600"
                )}>
                  {ageMinutes}m ago
                </span>
              </div>
              {tableGroup.estimatedCompletionTime && (
                <div className="text-xs text-gray-600 mt-1">
                  <Timer className="w-3 h-3 inline mr-1" />
                  Est. {new Date(tableGroup.estimatedCompletionTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
            
            <CircularProgress 
              value={tableGroup.completionPercentage}
              label={`${tableGroup.completionPercentage}%`}
            />
          </div>
        </div>
        
        {/* Status bar */}
        {variant === 'expo' && (
          <div className="mt-3 flex gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                style={{ width: `${tableGroup.completionPercentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {tableGroup.readyItems}/{tableGroup.totalItems} ready
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* Orders grid */}
        <div className={cn(
          "grid gap-3",
          tableGroup.orders.length === 1 && "grid-cols-1",
          tableGroup.orders.length === 2 && "grid-cols-2",
          tableGroup.orders.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {tableGroup.orders.map(order => (
            <MiniOrderCard 
              key={order.id}
              order={order}
              onStatusChange={onOrderStatusChange}
            />
          ))}
        </div>
        
        {/* Action buttons */}
        {variant === 'expo' && tableGroup.status === 'ready' && (
          <div className="mt-4 flex gap-2">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleBatchComplete}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Table {tableGroup.tableNumber}
            </Button>
          </div>
        )}
        
        {variant === 'expo' && tableGroup.status === 'partially-ready' && (
          <div className="mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">
                  {tableGroup.readyItems} of {tableGroup.totalItems} items ready
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Waiting for remaining items before table can be served
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}