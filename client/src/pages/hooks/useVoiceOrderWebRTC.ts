import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser'
import { OrderModification } from '@/modules/voice/contexts/types'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'
import type { Table } from '@/modules/floor-plan/types'
import { logger } from '@/services/monitoring/logger'
import { useTaxRate } from '@/hooks/useTaxRate'
import { supabase } from '@/core/supabase'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useFeatureFlag, FEATURE_FLAGS } from '@/services/featureFlags'
import { useVoiceOrderingMetrics } from '@/services/metrics'

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
  const taxRate = useTaxRate()
  const { restaurant } = useRestaurant()
  const useNewCustomerIdFlow = useFeatureFlag(FEATURE_FLAGS.NEW_CUSTOMER_ID_FLOW)
  const metrics = useVoiceOrderingMetrics()
  const [showVoiceOrder, setShowVoiceOrder] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSessionId, setOrderSessionId] = useState<string | null>(null)
  const orderParserRef = useRef<OrderParser | null>(null)

  // Multi-seat ordering state
  const [orderedSeats, setOrderedSeats] = useState<number[]>([])
  const [showPostOrderPrompt, setShowPostOrderPrompt] = useState(false)
  const [lastCompletedSeat, setLastCompletedSeat] = useState<number | null>(null)

  // Rebuild order parser whenever menu items change
  useEffect(() => {
    if (menuItems.length > 0) {
      orderParserRef.current = new OrderParser(menuItems)
      logger.info('[useVoiceOrderWebRTC] OrderParser initialized', { itemCount: menuItems.length })
    }
  }, [menuItems])

  // Track order session started when voice order modal opens
  useEffect(() => {
    if (showVoiceOrder && !orderSessionId) {
      const sessionId = metrics.trackOrderStarted('voice-order', 1)
      setOrderSessionId(sessionId)
      logger.info('[useVoiceOrderWebRTC] Order session started', { sessionId })
    }
  }, [showVoiceOrder, orderSessionId, metrics])

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
  // NOTE: Transcripts are for live display only - AI handles parsing via handleOrderData
  const handleVoiceTranscript = useCallback((textOrEvent: string | { text: string; isFinal: boolean }) => {
    // Normalize input to handle both signatures
    const text = typeof textOrEvent === 'string' ? textOrEvent : textOrEvent.text
    const isFinal = typeof textOrEvent === 'string' ? true : textOrEvent.isFinal

    logger.info('[useVoiceOrderWebRTC] Voice transcript', { text, isFinal })

    // Update transcript for live display
    // Show both interim and final transcripts so users see what was recognized
    setCurrentTranscript(text)

    // Clear transcript after a delay if it's final (to prepare for next utterance)
    if (isFinal) {
      setTimeout(() => setCurrentTranscript(''), 3000)
    }

    // DO NOT parse transcripts here - OpenAI Realtime API handles parsing
    // The AI will call add_to_order() function and emit order.detected events
    // which are processed by handleOrderData callback
  }, [])

  // Handle order data from OpenAI Realtime API
  // AI provides: { items: [{ name: "Greek Salad", quantity: 1, modifiers: ["extra feta"] }] }
  // We need to: find menuItemId from name, transform to our OrderItem format
  const handleOrderData = useCallback((orderData: any) => {
    console.log('[useVoiceOrderWebRTC] handleOrderData CALLED with:', orderData);
    logger.info('[handleOrderData] Received AI order data:', { orderData })

    // AI emits items without menuItemId - only human-readable names
    if (!orderData?.items || orderData.items.length === 0) {
      logger.warn('[handleOrderData] No items in AI order data')
      return
    }

    // Defensive checks: ensure menu is loaded and parser is ready
    if (menuItems.length === 0) {
      logger.error('[handleOrderData] Menu not loaded yet')
      toast.error('Menu is still loading. Please wait and try again.')
      return
    }

    if (!orderParserRef.current) {
      logger.error('[handleOrderData] OrderParser not initialized')
      toast.error('Voice ordering not ready. Please refresh the page.')
      return
    }

    const matchedItems: OrderItem[] = []
    const unmatchedItems: string[] = []

    orderData.items.forEach((aiItem: any) => {
      // Use OrderParser to find menu item by name (fuzzy matching)
      if (orderParserRef.current && menuItems.length > 0) {
        const match = orderParserRef.current.findBestMenuMatch(aiItem.name)

        if (match.item && match.confidence > 0.5) {
          logger.info('[handleOrderData] Matched AI item:', {
            aiName: aiItem.name,
            menuName: match.item.name,
            confidence: match.confidence
          })

          matchedItems.push({
            id: `voice-${Date.now()}-${Math.random()}`,
            menuItemId: match.item.id, // Found the UUID!
            name: match.item.name, // Use actual menu name
            quantity: aiItem.quantity || 1,
            modifications: (aiItem.modifiers || aiItem.modifications || []).map((mod: string | any) => ({
              id: typeof mod === 'string' ? `mod-${mod}` : mod.id,
              name: typeof mod === 'string' ? mod : mod.name,
              price: typeof mod === 'string' ? 0 : (mod.price || 0)
            }))
          })
        } else {
          logger.warn('[handleOrderData] Could not match item:', {
            name: aiItem.name,
            confidence: match.confidence
          })
          unmatchedItems.push(aiItem.name)
        }
      } else {
        logger.warn('[handleOrderData] OrderParser not available or menu not loaded')
        unmatchedItems.push(aiItem.name)
      }
    })

    if (matchedItems.length > 0) {
      setOrderItems(prev => [...prev, ...matchedItems])
      toast.success(
        `Added ${matchedItems.length} item${matchedItems.length > 1 ? 's' : ''} to order`
      )
    }

    if (unmatchedItems.length > 0) {
      logger.error('[handleOrderData] Unmatched items:', { unmatchedItems })
      toast.error(
        `Could not find menu items: ${unmatchedItems.join(', ')}. ` +
        `Please try again or choose from the menu.`
      )
    }
  }, [menuItems, toast])

  // Remove an item from the order
  const removeOrderItem = useCallback((itemId: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  // Submit order to backend
  const submitOrder = useCallback(async (selectedTable: Table | null, selectedSeat: number | null) => {
    // Guard clause: prevent duplicate submissions
    if (isSubmitting) {
      logger.warn('[submitOrder] Submit already in progress, ignoring duplicate call')
      return false
    }

    if (orderItems.length === 0 || !selectedTable || !selectedSeat) {
      toast.error('No order items to submit')
      return false
    }

    setIsSubmitting(true)

    // CRITICAL: Validate all items have menuItemId before submission
    // Items without menuItemId are raw text from failed parsing and will cause 400/500 errors
    const invalidItems = orderItems.filter(item => !item.menuItemId)
    if (invalidItems.length > 0) {
      logger.error('[submitOrder] Invalid items without menuItemId:', {
        invalidCount: invalidItems.length,
        invalidNames: invalidItems.map(i => i.name)
      })
      toast.error(
        `Cannot submit: ${invalidItems.length} item${invalidItems.length > 1 ? 's' : ''} not recognized from menu. ` +
        `Please remove unrecognized items and try again.`
      )
      return false
    }

    try {
      // Dual auth pattern: Try Supabase session first, fallback to localStorage
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ||
        JSON.parse(localStorage.getItem('auth_session') || '{}').session?.accessToken

      if (!token) {
        toast.error('Please log in to submit orders')
        return false
      }

      // Get restaurant ID from context (fix for P0 multi-tenant data corruption bug)
      // Feature flag controls gradual rollout of dynamic restaurant ID
      const restaurantId = useNewCustomerIdFlow
        ? restaurant?.id
        : 'grow' // Fallback to hardcoded ID if flag disabled

      if (useNewCustomerIdFlow && !restaurantId) {
        logger.error('[submitOrder] No restaurant ID available')
        toast.error('Restaurant context not loaded. Please refresh the page.')
        return false
      }

      const response = await fetch(apiUrl('/api/v1/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Restaurant-ID': restaurantId,
          'X-Client-Flow': 'server'
        },
        body: JSON.stringify({
          table_number: selectedTable.label,
          seat_number: selectedSeat,
          items: orderItems.map(item => {
            const menuItem = menuItems.find(m => m.id === item.menuItemId)
            return {
              id: item.id,
              menu_item_id: item.menuItemId,
              name: item.name,
              quantity: item.quantity,
              price: menuItem?.price || 12.99, // Required by OrderItem schema
              modifications: item.modifications?.map(mod => mod.name) || []
            }
          }),
          notes: `Voice order from ${selectedTable.label}, Seat ${selectedSeat}`,
          total_amount: (() => {
            const subtotal = orderItems.reduce((sum, item) => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId)
              return sum + (menuItem?.price || 12.99) * item.quantity
            }, 0);
            const tax = subtotal * taxRate; // Use restaurant-specific tax rate
            return subtotal + tax;
          })(),
          customer_name: `Table ${selectedTable.label} - Seat ${selectedSeat}`,
          type: 'dine-in' // Changed from order_type to match schema
        })
      })

      if (response.ok) {
        const responseData = await response.json()
        const orderId = responseData.id || 'unknown'

        toast.success(`Order submitted for ${selectedTable.label}, Seat ${selectedSeat}!`)

        // Track order completion
        if (orderSessionId) {
          metrics.trackOrderCompleted(orderSessionId, orderId, orderItems.length)
          logger.info('[submitOrder] Order completed', { sessionId: orderSessionId, orderId })
        }

        // Track ordered seat and show post-order prompt
        setOrderedSeats(prev => [...prev, selectedSeat])
        setLastCompletedSeat(selectedSeat)
        setShowPostOrderPrompt(true)

        // Clear current order items for next seat
        setOrderItems([])

        // Reset session ID for next order
        setOrderSessionId(null)

        return true
      } else {
        const errorText = await response.text()
        console.error('Order submission failed:', errorText)
        throw new Error('Failed to submit order')
      }
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order. Please try again.')
      return false
    } finally {
      // Always reset submitting flag, even on error
      setIsSubmitting(false)
    }
  }, [orderItems, menuItems, toast, taxRate, isSubmitting, useNewCustomerIdFlow, restaurant?.id, orderSessionId, metrics])

  // Handler for "Add Next Seat" button
  const handleAddNextSeat = useCallback(() => {
    setShowPostOrderPrompt(false)
    setShowVoiceOrder(false)
    // Don't reset orderedSeats - keep tracking which seats have orders
    // Parent component will re-open seat selection modal
  }, [])

  // Handler for "Finish Table" button
  const handleFinishTable = useCallback(() => {
    setShowPostOrderPrompt(false)
    setShowVoiceOrder(false)
    // Reset all state for this table
    setOrderedSeats([])
    setLastCompletedSeat(null)
    setOrderItems([])
    setCurrentTranscript('')
    setIsVoiceActive(false)
    setIsProcessing(false)
    toast.success('Table orders complete!')
  }, [toast])

  // Reset voice order state (called when canceling or closing)
  const resetVoiceOrder = useCallback(() => {
    // Track order abandoned if there were items and an active session
    if (orderSessionId && orderItems.length > 0) {
      metrics.trackOrderAbandoned(orderSessionId, 'user_closed_modal')
      logger.info('[resetVoiceOrder] Order abandoned', { sessionId: orderSessionId, itemCount: orderItems.length })
    }

    setShowVoiceOrder(false)
    setCurrentTranscript('')
    setOrderItems([])
    setIsVoiceActive(false)
    setIsProcessing(false)
    setShowPostOrderPrompt(false)
    setOrderSessionId(null)
    // Keep orderedSeats intact unless explicitly finishing table
  }, [orderSessionId, orderItems, metrics])

  // Complete reset for starting fresh with a new table
  const resetAllState = useCallback(() => {
    setShowVoiceOrder(false)
    setCurrentTranscript('')
    setOrderItems([])
    setIsVoiceActive(false)
    setIsProcessing(false)
    setShowPostOrderPrompt(false)
    setOrderedSeats([])
    setLastCompletedSeat(null)
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

    // Multi-seat state
    orderedSeats,
    showPostOrderPrompt,
    setShowPostOrderPrompt,
    lastCompletedSeat,

    // Handlers
    handleVoiceTranscript,
    handleOrderData,
    removeOrderItem,
    submitOrder,
    resetVoiceOrder,
    handleAddNextSeat,
    handleFinishTable,
    resetAllState
  }
}