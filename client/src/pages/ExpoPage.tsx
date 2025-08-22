import React, { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ActionButton } from '@/components/ui/ActionButton'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { useOrderData } from '@/modules/orders/hooks'

interface ExpoOrder {
  id: string
  order_number: string
  items: Array<{
    name: string
    quantity: number
  }>
  status: 'pending' | 'in_progress' | 'ready' | 'completed'
  created_at: Date
  table?: string
}

function ExpoPage() {
  const [orders, setOrders] = useState<ExpoOrder[]>([])
  const { orders: ordersData } = useOrderData()

  useEffect(() => {
    if (ordersData) {
      const expoOrders: ExpoOrder[] = ordersData.map((order: any) => ({
        id: order.id,
        order_number: order.order_number || `#${order.id.slice(-4)}`,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity
        })),
        status: order.status === 'completed' ? 'completed' : 
                order.status === 'preparing' ? 'in_progress' : 
                order.status === 'ready' ? 'ready' : 'pending',
        created_at: new Date(order.created_at),
        table: order.table_number
      }))
      setOrders(expoOrders)
    }
  }, [ordersData])

  const activeOrders = orders.filter(o => o.status !== 'completed')

  const handleCompleteOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'completed' }
        : order
    ))
  }


  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackToDashboard />
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Expo Station</h1>
          <p className="text-gray-600">{activeOrders.length} active orders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeOrders.map((order) => (
            <Card key={order.id} className="p-4 bg-white border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                  {order.table && (
                    <p className="text-sm text-gray-600">Table {order.table}</p>
                  )}
                </div>
                {order.status === 'ready' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              <div className="space-y-1 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                  </div>
                ))}
              </div>

              {order.status === 'ready' && (
                <ActionButton
                  size="small"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => handleCompleteOrder(order.id)}
                >
                  Complete Order
                </ActionButton>
              )}
            </Card>
          ))}
        </div>

        {activeOrders.length === 0 && (
          <Card className="p-8 text-center bg-white border border-gray-200">
            <p className="text-gray-600">No active orders</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ExpoPage