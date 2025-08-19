import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { webSocketService } from '@/services/websocket'
import { api } from '@/services/api'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/core/supabase'
import { getDemoToken } from '@/services/auth/demoAuth'
import { 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff, 
  Server, 
  Database,
  RefreshCw,
  Plus,
  Key,
  Shield
} from 'lucide-react'

interface DebugEvent {
  id: string
  timestamp: string
  type: string
  message: string
  data?: any
}

export function KDSDebugPanel() {
  const { restaurant } = useRestaurant()
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [orderCount, setOrderCount] = useState(0)
  const [authStatus, setAuthStatus] = useState<{
    type: 'supabase' | 'demo' | 'test' | 'none'
    hasToken: boolean
    expiresAt?: string
  }>({ type: 'none', hasToken: false })

  useEffect(() => {
    // Check WebSocket connection
    const checkConnection = () => {
      setIsConnected(webSocketService.isConnected())
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 2000)
    
    // Monitor WebSocket events
    const originalSend = WebSocket.prototype.send
    WebSocket.prototype.send = function(data) {
      addEvent('ws:send', 'Sending WebSocket message', JSON.parse(data as string))
      return originalSend.call(this, data)
    }
    
    return () => {
      clearInterval(interval)
      WebSocket.prototype.send = originalSend
    }
  }, [])

  useEffect(() => {
    // Check API status
    const checkApiStatus = async () => {
      try {
        const orders = await api.getOrders()
        setApiStatus('online')
        setOrderCount(orders.length)
      } catch (error) {
        setApiStatus('offline')
        console.error('API check failed:', error)
      }
    }
    
    checkApiStatus()
    const interval = setInterval(checkApiStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Check authentication status
    const checkAuthStatus = async () => {
      try {
        // Check Supabase session first
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const exp = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined
          setAuthStatus({ type: 'supabase', hasToken: true, expiresAt: exp })
          return
        }

        // Check for demo token
        try {
          const demoToken = await getDemoToken()
          if (demoToken) {
            // Parse token to get expiration (demo tokens expire in 1 hour)
            const expiresAt = new Date(Date.now() + 3600000).toISOString()
            setAuthStatus({ type: 'demo', hasToken: true, expiresAt })
            return
          }
        } catch {
          // Demo token failed, check for test token
        }

        // In dev mode, we might be using test token
        if (import.meta.env.DEV) {
          setAuthStatus({ type: 'test', hasToken: true })
        } else {
          setAuthStatus({ type: 'none', hasToken: false })
        }
      } catch (error) {
        console.error('Auth status check failed:', error)
        setAuthStatus({ type: 'none', hasToken: false })
      }
    }

    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const addEvent = (type: string, message: string, data?: any) => {
    const event: DebugEvent = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    setEvents(prev => [event, ...prev].slice(0, 20)) // Keep last 20 events
  }

  const createTestOrder = async () => {
    try {
      // First, ensure we have authentication
      addEvent('auth:check', 'Checking authentication...')
      
      const testOrder = {
        type: 'online', // Use valid database type
        items: [{
          id: 'test-item-1',
          menu_item_id: 'test-item-1',
          name: 'Test Burger',
          quantity: 1,
          price: 12.99,
          modifiers: [],
          subtotal: 12.99
        }],
        customer_name: 'KDS Test Customer',
        notes: 'Created from KDS Debug Panel',
        subtotal: 12.99,
        tax: 1.04,
        total: 14.03
      }
      
      console.log('[KDS Debug] Creating test order:', testOrder)
      addEvent('order:submit', 'Submitting order to API...')
      
      // Use submitOrder instead of createOrder for consistency
      const order = await api.submitOrder(testOrder)
      
      console.log('[KDS Debug] Order created successfully:', order)
      addEvent('order:created', `Created test order #${order.order_number || order.orderNumber}`, order)
      toast.success(`Test order #${order.order_number || order.orderNumber} created`)
      
      // Orders will update via WebSocket - no refresh needed
    } catch (error: any) {
      console.error('[KDS Debug] Failed to create test order:', error)
      console.error('[KDS Debug] Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      })
      
      addEvent('order:error', `Error: ${error.message || 'Unknown error'}`, error)
      
      // Provide more helpful error messages
      if (error.message?.includes('validation')) {
        toast.error('Order validation failed - check console for details')
      } else if (error.message?.includes('auth')) {
        toast.error('Authentication failed - please check your authentication')
      } else {
        toast.error(`Failed to create order: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const refreshConnection = () => {
    webSocketService.disconnect()
    setTimeout(() => {
      webSocketService.connect()
      addEvent('ws:reconnect', 'Manually reconnecting WebSocket')
    }, 1000)
  }

  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔧 KDS Debug Panel</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refreshConnection}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
            <Button size="sm" variant="outline" onClick={createTestOrder}>
              <Plus className="h-4 w-4 mr-1" />
              Test Order
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="text-sm">WebSocket Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <span className="text-sm">WebSocket Disconnected</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {apiStatus === 'online' ? (
              <>
                <Server className="h-5 w-5 text-green-500" />
                <span className="text-sm">API Online</span>
              </>
            ) : apiStatus === 'offline' ? (
              <>
                <Server className="h-5 w-5 text-red-500" />
                <span className="text-sm">API Offline</span>
              </>
            ) : (
              <>
                <Server className="h-5 w-5 text-yellow-500" />
                <span className="text-sm">Checking API...</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <span className="text-sm">{orderCount} Orders</span>
          </div>
          
          <div className="flex items-center gap-2">
            {authStatus.hasToken ? (
              <>
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Auth: {authStatus.type === 'supabase' ? 'Supabase' : 
                         authStatus.type === 'demo' ? 'Demo/Kiosk' :
                         authStatus.type === 'test' ? 'Test Mode' : 'Unknown'}
                </span>
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 text-red-500" />
                <span className="text-sm">No Auth</span>
              </>
            )}
          </div>
        </div>

        {/* Restaurant Context */}
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs font-mono">
            <div>Restaurant ID: {restaurant?.id || 'Not set'}</div>
            <div>Restaurant Name: {restaurant?.name || 'Not set'}</div>
            <div>API Base: {import.meta.env.VITE_API_BASE_URL}</div>
            {authStatus.expiresAt && (
              <div>Token Expires: {new Date(authStatus.expiresAt).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Recent Events</h4>
          <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
            {events.length === 0 ? (
              <div className="text-gray-500 italic">No events yet...</div>
            ) : (
              events.map(event => (
                <div key={event.id} className="flex gap-2 font-mono">
                  <span className="text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                  <span className="flex-1">{event.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Green indicators = System operational</div>
          <div>• Click "Test Order" to create a test order</div>
          <div>• Click "Reconnect" if WebSocket is disconnected</div>
          <div>• Check browser console for detailed logs</div>
        </div>
      </CardContent>
    </Card>
  )
}