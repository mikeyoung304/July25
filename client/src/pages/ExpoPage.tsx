import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, Clock, CheckCircle, AlertCircle, 
  RefreshCw, Zap, Eye, EyeOff 
} from 'lucide-react'
import { PageLayout, PageContent, GridLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { ActionCard } from '@/components/ui/NavigationCard'
import { ActionButton, IconButton } from '@/components/ui/ActionButton'
import { Card } from '@/components/ui/card'
import { SectionTitle, Body } from '@/components/ui/Typography'
import { spacing } from '@/lib/typography'
import { Badge } from '@/components/ui/badge'
import { useOrderData } from '@/modules/orders/hooks'
import { format } from 'date-fns'

interface ExpoOrder {
  id: string
  order_number: string
  items: Array<{
    name: string
    quantity: number
    station: string
    status: 'pending' | 'in_progress' | 'ready'
  }>
  status: 'pending' | 'in_progress' | 'ready' | 'completed'
  created_at: Date
  table?: string
  server?: string
  priority: 'normal' | 'rush'
}

export function ExpoPage() {
  const [orders, setOrders] = useState<ExpoOrder[]>([])
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const { orders: ordersData } = useOrderData()

  useEffect(() => {
    if (ordersData) {
      const expoOrders: ExpoOrder[] = ordersData.map((order: any) => ({
        id: order.id,
        order_number: order.order_number || `#${order.id.slice(-4)}`,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          station: item.category === 'mains' ? 'Grill' : 
                   item.category === 'appetizers' ? 'Cold' : 
                   item.category === 'desserts' ? 'Dessert' : 'Kitchen',
          status: 'pending'
        })),
        status: order.status === 'completed' ? 'completed' : 
                order.status === 'preparing' ? 'in_progress' : 
                order.status === 'ready' ? 'ready' : 'pending',
        created_at: new Date(order.created_at),
        table: order.table_number,
        server: order.customer_name, // Use customer_name as server for now
        priority: 'normal'
      }))
      setOrders(expoOrders)
    }
  }, [ordersData])

  const activeOrders = orders.filter(o => o.status !== 'completed')
  const completedOrders = orders.filter(o => o.status === 'completed')

  const handleRushOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, priority: 'rush' }
        : order
    ))
  }

  const handleRecallOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'in_progress' }
        : order
    ))
  }

  const handleCompleteOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'completed' }
        : order
    ))
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return '#FFA500'
      case 'in_progress': return '#4ECDC4'
      case 'ready': return '#4CAF50'
      case 'completed': return '#88B0A4'
      default: return '#9CA3AF'
    }
  }

  const getTimeSinceOrder = (created_at: Date) => {
    const minutes = Math.floor((Date.now() - orderTime.getTime()) / 60000)
    if (minutes < 5) return { text: `${minutes}m`, color: 'text-green-600' }
    if (minutes < 10) return { text: `${minutes}m`, color: 'text-yellow-600' }
    return { text: `${minutes}m`, color: 'text-red-600' }
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Expo Station"
        subtitle="Manage order flow and quality control"
        actions={
          <div className="flex gap-2">
            <ActionButton
              size="medium"
              variant="outline"
              icon={showCompleted ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? 'Hide' : 'Show'} Completed
            </ActionButton>
            <ActionButton
              size="medium"
              icon={<RefreshCw className="h-5 w-5" />}
              color="#4ECDC4"
              onClick={() => window.location.reload()}
            >
              Refresh
            </ActionButton>
          </div>
        }
      />

      <PageContent maxWidth="6xl">
        <div className={spacing.page.section}>
          <GridLayout columns={4} gap="medium">
            <ActionCard
              title="Active Orders"
              description={`${activeOrders.length} orders`}
              icon={<Package className="h-8 w-8" />}
              color="#2A4B5C"
              compact
            />
            <ActionCard
              title="Rush Orders"
              description={`${orders.filter(o => o.priority === 'rush').length} urgent`}
              icon={<Zap className="h-8 w-8" />}
              color="#FF6B35"
              compact
            />
            <ActionCard
              title="Ready to Serve"
              description={`${orders.filter(o => o.status === 'ready').length} ready`}
              icon={<CheckCircle className="h-8 w-8" />}
              color="#4CAF50"
              compact
            />
            <ActionCard
              title="Avg Wait Time"
              description="7 mins"
              icon={<Clock className="h-8 w-8" />}
              color="#7B68EE"
              compact
            />
          </GridLayout>
        </div>

        <div className={spacing.page.section}>
          <SectionTitle as="h2" className="mb-4">Order Queue</SectionTitle>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {(showCompleted ? [...activeOrders, ...completedOrders] : activeOrders).map((order, index) => {
                const timeInfo = getTimeSinceOrder(order.created_at)
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`p-6 border-2 transition-all duration-200 hover:shadow-elevation-3 ${
                        order.priority === 'rush' ? 'border-red-500 bg-red-50' : 
                        selectedOrder === order.id ? 'border-blue-500' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedOrder(order.id)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{order.order_number}</h3>
                            {order.priority === 'rush' && (
                              <Badge className="bg-red-500 text-white">RUSH</Badge>
                            )}
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-gray-600">
                            {order.table && <span>Table {order.table}</span>}
                            {order.server && <span>{order.server}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${timeInfo.color}`}>
                            {timeInfo.text}
                          </span>
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.quantity}x</span>
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: getStatusColor(item.status),
                                color: getStatusColor(item.status)
                              }}
                            >
                              {item.station}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        {order.status !== 'completed' && (
                          <>
                            {order.priority !== 'rush' && (
                              <ActionButton
                                size="small"
                                variant="outline"
                                color="#FF6B35"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRushOrder(order.id)
                                }}
                              >
                                Rush
                              </ActionButton>
                            )}
                            {order.status === 'ready' && (
                              <ActionButton
                                size="small"
                                color="#4CAF50"
                                fullWidth
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCompleteOrder(order.id)
                                }}
                              >
                                Complete
                              </ActionButton>
                            )}
                          </>
                        )}
                        {order.status === 'completed' && (
                          <ActionButton
                            size="small"
                            variant="outline"
                            color="#88B0A4"
                            fullWidth
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRecallOrder(order.id)
                            }}
                          >
                            Recall
                          </ActionButton>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {activeOrders.length === 0 && !showCompleted && (
            <Card className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <SectionTitle as="h3" className="text-gray-600">No Active Orders</SectionTitle>
              <Body className="text-gray-500 mt-2">Orders will appear here as they come in</Body>
            </Card>
          )}
        </div>

        <div className={`${spacing.page.section} grid grid-cols-1 md:grid-cols-3 gap-4`}>
          <ActionCard
            title="All Day Counts"
            icon={<Eye className="h-8 w-8" />}
            color="#7B68EE"
            onClick={() => console.log('View all day counts')}
          />
          <ActionCard
            title="Station Status"
            icon={<AlertCircle className="h-8 w-8" />}
            color="#4ECDC4"
            onClick={() => console.log('View station status')}
          />
          <ActionCard
            title="Quality Check"
            icon={<CheckCircle className="h-8 w-8" />}
            color="#88B0A4"
            onClick={() => console.log('Perform quality check')}
          />
        </div>
      </PageContent>
    </PageLayout>
  )
}