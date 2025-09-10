import { useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/useToast'
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser'
import { OrderModification } from '@/modules/voice/contexts/types'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'
import type { Table } from '@/modules/floor-plan/types'
import { logger } from '@/services/monitoring/logger'
import { useAuth } from '@/contexts/auth.hooks'

// Helper to resolve absolute API URLs for production
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
}

export function useVoiceOrderWebRTC() {
  const { toast } = useToast()
  const { items: menuItems } = useMenuItems()
  const { session, restaurantId } = useAuth()
  const [showVoiceOrder, setShowVoiceOrder] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const orderParserRef = useRef<OrderParser | null>(null)

  // Initialize order parser when menu items are loaded
  if (menuItems.length > 0 && !orderParserRef.current) {
    orderParserRef.current = new OrderParser(menuItems)
  }

  // Process parsed menu items and add to order
  const processParsedItems = useCallback((parsedItems: ParsedOrderItem[]) => {
    const newItems: OrderItem[] = []
    
    parsedItems.forEach(parsed => {
      if (parsed.menuItem) {
        switch (parsed.action) {
          case 'add':
            newItems.push({
              id: `voice-${Date.now()}-${Math.random()}`,
              menuItemId: parsed.menuItem.id,
              name: parsed.menuItem.name,
              quantity: parsed.quantity,
              modifications: parsed.modifications
            })
            break
          case 'remove': {
            // Handle remove in the parent component
            const itemToRemove = orderItems.find(item => 
              item.menuItemId === parsed.menuItem?.id
            )
            if (itemToRemove) {
              setOrderItems(prev => prev.filter(item => item.id !== itemToRemove.id))
            }
            break
          }
          case 'update': {
            // Handle update in the parent component
            const itemToUpdate = orderItems.find(item => 
              item.menuItemId === parsed.menuItem?.id
            )
            if (itemToUpdate) {
              setOrderItems(prev => prev.map(item => 
                item.id === itemToUpdate.id 
                  ? { ...item, quantity: parsed.quantity, modifications: parsed.modifications }
                  : item
              ))
            }
            break
          }
        }
      }
    })

    if (newItems.length > 0) {
      setOrderItems(prev => [...prev, ...newItems])
      toast.success(`Added ${newItems.length} item${newItems.length > 1 ? 's' : ''} to order`)
    }
  }, [orderItems, toast])

  // Handle transcript from WebRTC voice - accepts both string and event object
  const handleVoiceTranscript = useCallback((textOrEvent: string | { text: string; isFinal: boolean }) => {
    // Normalize input to handle both signatures
    const text = typeof textOrEvent === 'string' ? textOrEvent : textOrEvent.text
    const isFinal = typeof textOrEvent === 'string' ? true : textOrEvent.isFinal
    
    logger.info('[useVoiceOrderWebRTC] Voice transcript', { text, isFinal })
    
    if (isFinal) {
      setCurrentTranscript('')
      
      // Parse order locally if we have the parser
      if (orderParserRef.current) {
        const parsedItems = orderParserRef.current.parseUserTranscript(text)
        if (parsedItems.length > 0) {
          processParsedItems(parsedItems)
        } else {
          // If no items parsed, add as raw text for manual processing
          const rawItem: OrderItem = {
            id: `voice-${Date.now()}-${Math.random()}`,
            name: text,
            quantity: 1
          }
          setOrderItems(prev => [...prev, rawItem])
        }
      } else {
        // No parser available, add as raw text
        const rawItem: OrderItem = {
          id: `voice-${Date.now()}-${Math.random()}`,
          name: text,
          quantity: 1
        }
        setOrderItems(prev => [...prev, rawItem])
      }
    } else {
      // Update current transcript for live display
      setCurrentTranscript(text)
    }
  }, [processParsedItems])

  // Handle order data from server (if server-side parsing is enabled)
  const handleOrderData = useCallback((orderData: any) => {
    logger.info('[useVoiceOrderWebRTC] Order data from server', { orderData })
    
    if (orderData?.success && orderData?.items?.length > 0) {
      const newItems: OrderItem[] = orderData.items.map((item: any) => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId)
        return {
          id: `voice-${Date.now()}-${Math.random()}`,
          menuItemId: item.menuItemId,
          name: menuItem?.name || item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          modifications: item.modifications || []
        }
      })
      
      setOrderItems(prev => [...prev, ...newItems])
      toast.success(`Added ${newItems.length} item${newItems.length > 1 ? 's' : ''} from server`)
    }
  }, [menuItems, toast])

  // Remove an item from the order
  const removeOrderItem = useCallback((itemId: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  // Submit order to backend and initiate payment
  const submitOrder = useCallback(async (selectedTable: Table | null, selectedSeat: number | null) => {
    if (orderItems.length === 0 || !selectedTable || !selectedSeat || !session?.accessToken) {
      toast.error('No order items to submit or user not authenticated')
      return false
    }
    
    try {
      // Step 1: Create the order
      const response = await fetch(apiUrl('/api/v1/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Restaurant-ID': restaurantId || import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
        },
        body: JSON.stringify({
          table_number: selectedTable.label,
          seat_number: selectedSeat,
          items: orderItems.map(item => ({
            id: item.id,
            menu_item_id: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            modifications: item.modifications?.map(mod => mod.name) || []
          })),
          notes: `Voice order from ${selectedTable.label}, Seat ${selectedSeat}`,
          total_amount: orderItems.reduce((sum, item) => {
            const menuItem = menuItems.find(m => m.id === item.menuItemId)
            return sum + (menuItem?.price || 12.99) * item.quantity
          }, 0),
          customer_name: `Table ${selectedTable.label} - Seat ${selectedSeat}`,
          order_type: 'dine-in'
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Order submission failed:', errorText)
        throw new Error('Failed to submit order')
      }

      const orderData = await response.json()
      logger.info('[useVoiceOrderWebRTC] Order created', { orderId: orderData.id, orderNumber: orderData.order_number })
      
      // Step 2: Initiate Square Terminal checkout if device is configured
      const deviceId = localStorage.getItem('square_terminal_device_id') || import.meta.env.VITE_SQUARE_TERMINAL_DEVICE_ID
      
      if (deviceId) {
        try {
          const checkoutResponse = await fetch(apiUrl('/api/v1/terminal/checkout'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.accessToken}`,
              'X-Restaurant-ID': restaurantId || import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
            },
            body: JSON.stringify({
              orderId: orderData.id,
              deviceId: deviceId
            })
          })

          if (checkoutResponse.ok) {
            const checkoutData = await checkoutResponse.json()
            logger.info('[useVoiceOrderWebRTC] Terminal checkout initiated', { checkoutId: checkoutData.checkout?.id })
            toast.success(`Payment initiated on terminal for ${selectedTable.label}, Seat ${selectedSeat}`)
            
            // Step 3: Update order status to confirmed after payment initiation
            await fetch(apiUrl(`/api/v1/orders/${orderData.id}/status`), {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.accessToken}`,
                'X-Restaurant-ID': restaurantId || import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
              },
              body: JSON.stringify({
                status: 'confirmed',
                notes: 'Payment processing via Square Terminal'
              })
            })
          } else {
            // Payment initiation failed but order exists
            logger.warn('[useVoiceOrderWebRTC] Terminal checkout failed, order remains pending', { orderId: orderData.id })
            toast.error(`Order created but payment pending for ${selectedTable.label}`)
          }
        } catch (paymentError) {
          logger.error('[useVoiceOrderWebRTC] Payment processing error', { error: paymentError })
          toast.error('Order created, please process payment manually')
        }
      } else {
        // No terminal configured - order created but needs manual payment
        toast.success(`Order created for ${selectedTable.label}, Seat ${selectedSeat}. Process payment at POS.`)
      }
      
      return true
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order. Please try again.')
      return false
    }
  }, [orderItems, menuItems, toast, session?.accessToken, restaurantId])

  // Reset voice order state
  const resetVoiceOrder = useCallback(() => {
    setShowVoiceOrder(false)
    setCurrentTranscript('')
    setOrderItems([])
    setIsVoiceActive(false)
    setIsProcessing(false)
  }, [])

  return {
    // State
    showVoiceOrder,
    setShowVoiceOrder,
    currentTranscript,
    orderItems,
    setOrderItems,
    isVoiceActive,
    isProcessing,
    setIsProcessing,
    
    // Handlers
    handleVoiceTranscript,
    handleOrderData,
    removeOrderItem,
    submitOrder,
    resetVoiceOrder
  }
}