import { useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/useToast'
import { useApiRequest } from '@/hooks/useApiRequest'
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser'
import { OrderModification } from '@/modules/voice/contexts/types'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'
import type { Table } from '@/modules/floor-plan/types'
// Removed getDemoToken - using centralized API client

// Using centralized API client - no need for manual URL construction

interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
}

export function useVoiceOrderWebRTC() {
  const { toast } = useToast()
  const api = useApiRequest()
  const { items: menuItems } = useMenuItems()
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
          case 'remove':
            // Handle remove in the parent component
            const itemToRemove = orderItems.find(item => 
              item.menuItemId === parsed.menuItem?.id
            )
            if (itemToRemove) {
              setOrderItems(prev => prev.filter(item => item.id !== itemToRemove.id))
            }
            break
          case 'update':
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
    
    console.log('[useVoiceOrderWebRTC] Voice transcript:', text, 'final:', isFinal)
    
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
    console.log('[useVoiceOrderWebRTC] Order data from server:', orderData)
    
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

  // Submit order to backend
  const submitOrder = useCallback(async (selectedTable: Table | null, selectedSeat: number | null) => {
    if (orderItems.length === 0 || !selectedTable || !selectedSeat) {
      toast.error('No order items to submit')
      return false
    }
    
    try {
      // Use centralized API client with proper auth and restaurant context
      const result = await api.post('/api/v1/orders', {
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
      
      // Success - the API client already handles error cases
      toast.success(`Order submitted for ${selectedTable.label}, Seat ${selectedSeat}!`)
      return true
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order. Please try again.')
      return false
    }
  }, [orderItems, menuItems, toast, api])

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