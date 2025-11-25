import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { OrderModification } from '@/modules/voice/contexts/types'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'
import type { Table } from '@/modules/floor-plan/types'
import { logger } from '@/services/monitoring/logger'
import { useTaxRate } from '@/hooks/useTaxRate'
import { supabase } from '@/core/supabase'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useVoiceOrderingMetrics } from '@/services/metrics'
import { useVoiceCommerce, type VoiceMenuItem } from '@/modules/voice/hooks/useVoiceCommerce'

// Helper to resolve absolute API URLs for production
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

// Counter for generating unique voice order IDs (avoids Date.now() timing issues)
let voiceOrderCounter = 0;

interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
  source?: 'voice' | 'touch'
  price?: number
}

export function useVoiceOrderWebRTC() {
  const { toast } = useToast()
  const { items: menuItems } = useMenuItems()
  const taxRate = useTaxRate()
  const { restaurant } = useRestaurant()
  const metrics = useVoiceOrderingMetrics()
  const [showVoiceOrder, setShowVoiceOrder] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSessionId, setOrderSessionId] = useState<string | null>(null)
  const [orderNotes, setOrderNotes] = useState('')

  // Multi-seat ordering state
  const [orderedSeats, setOrderedSeats] = useState<number[]>([])
  const [showPostOrderPrompt, setShowPostOrderPrompt] = useState(false)
  const [lastCompletedSeat, setLastCompletedSeat] = useState<number | null>(null)

  // ============================================================================
  // ADAPTER: Convert VoiceMenuItem from useVoiceCommerce to OrderItem format
  // ============================================================================
  const handleVoiceAddItem = useCallback((
    menuItem: VoiceMenuItem,
    quantity: number,
    modifications: string[],
    specialInstructions?: string
  ) => {
    const orderItem: OrderItem = {
      id: `voice-order-${++voiceOrderCounter}`,
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price,
      source: 'voice',
      modifications: modifications.map((modName, idx) => ({
        id: `mod-${modName}-${idx}`,
        name: modName,
        price: 0 // Voice doesn't provide modifier prices yet
      }))
    }

    // Add special instructions as a modification if provided
    if (specialInstructions) {
      orderItem.modifications?.push({
        id: `special-${Date.now()}`,
        name: `Note: ${specialInstructions}`,
        price: 0
      })
    }

    setOrderItems(prev => [...prev, orderItem])
    logger.info('[useVoiceOrderWebRTC] Added voice item', {
      menuItem: menuItem.name,
      quantity,
      modifications
    })
  }, [])

  // ============================================================================
  // USE VOICE COMMERCE HOOK (Modern implementation)
  // ============================================================================
  const voiceCommerce = useVoiceCommerce({
    menuItems,
    onAddItem: handleVoiceAddItem,
    context: 'server',
    toast: {
      error: (message: string) => toast.error(message)
    },
    debug: import.meta.env.DEV
  })

  // Track order session started when voice order modal opens
  useEffect(() => {
    if (showVoiceOrder && !orderSessionId) {
      const sessionId = metrics.trackOrderStarted('voice-order', 1)
      setOrderSessionId(sessionId)
      logger.info('[useVoiceOrderWebRTC] Order session started', { sessionId })
    }
  }, [showVoiceOrder, orderSessionId, metrics])

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
      const restaurantId = restaurant?.id

      if (!restaurantId) {
        logger.error('[submitOrder] No restaurant ID available')
        toast.error('Restaurant context not loaded. Please refresh.')
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
              price: menuItem?.price || item.price || 12.99, // Required by OrderItem schema
              modifications: item.modifications?.map(mod => mod.name) || []
            }
          }),
          notes: orderNotes
            ? `${orderNotes}\n\n(Voice order from ${selectedTable.label}, Seat ${selectedSeat})`
            : `Voice order from ${selectedTable.label}, Seat ${selectedSeat}`,
          total_amount: (() => {
            const subtotal = orderItems.reduce((sum, item) => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId)
              const itemPrice = menuItem?.price || item.price || 12.99
              const modifiersTotal = (item.modifications || []).reduce((modSum, mod) => modSum + (mod.price || 0), 0)
              return sum + ((itemPrice + modifiersTotal) * item.quantity)
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

        // Clear current order items and notes for next seat
        setOrderItems([])
        setOrderNotes('')

        // Reset session ID for next order
        setOrderSessionId(null)

        return true
      } else {
        const errorText = await response.text()
        logger.error('Order submission failed:', { errorText })
        throw new Error('Failed to submit order')
      }
    } catch (error) {
      logger.error('Error submitting order:', { error })
      toast.error('Failed to submit order. Please try again.')
      return false
    } finally {
      // Always reset submitting flag, even on error
      setIsSubmitting(false)
    }
  }, [orderItems, menuItems, toast, taxRate, isSubmitting, restaurant?.id, orderSessionId, metrics, orderNotes])

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
    voiceCommerce.setIsCheckingOut(false)
    toast.success('Table orders complete!')
  }, [toast, voiceCommerce])

  // Reset voice order state (called when canceling or closing)
  const resetVoiceOrder = useCallback(() => {
    // Track order abandoned if there were items and an active session
    if (orderSessionId && orderItems.length > 0) {
      metrics.trackOrderAbandoned(orderSessionId, 'user_closed_modal')
      logger.info('[resetVoiceOrder] Order abandoned', { sessionId: orderSessionId, itemCount: orderItems.length })
    }

    setShowVoiceOrder(false)
    setOrderItems([])
    setOrderNotes('')
    setShowPostOrderPrompt(false)
    setOrderSessionId(null)
    voiceCommerce.setIsCheckingOut(false)
    // Keep orderedSeats intact unless explicitly finishing table
  }, [orderSessionId, orderItems, metrics, voiceCommerce])

  // Complete reset for starting fresh with a new table
  const resetAllState = useCallback(() => {
    setShowVoiceOrder(false)
    setOrderItems([])
    setOrderNotes('')
    setShowPostOrderPrompt(false)
    setOrderedSeats([])
    setLastCompletedSeat(null)
    voiceCommerce.setIsCheckingOut(false)
  }, [voiceCommerce])

  return {
    // ============================================================================
    // VOICE COMMERCE STATE (from useVoiceCommerce hook)
    // ============================================================================
    currentTranscript: voiceCommerce.currentTranscript,
    isVoiceActive: voiceCommerce.isListening,
    isProcessing: voiceCommerce.isProcessing,
    voiceConnectionState: voiceCommerce.voiceConnectionState,
    isSessionReady: voiceCommerce.isSessionReady,
    recentlyAdded: voiceCommerce.recentlyAdded,
    voiceFeedback: voiceCommerce.voiceFeedback,

    // Voice commerce handlers (delegated to useVoiceCommerce)
    handleVoiceTranscript: voiceCommerce.handleVoiceTranscript,
    handleOrderData: voiceCommerce.handleOrderData,

    // ============================================================================
    // SERVER-SPECIFIC STATE (multi-seat ordering, submission)
    // ============================================================================
    showVoiceOrder,
    setShowVoiceOrder,
    orderItems,
    setOrderItems,
    setIsProcessing: voiceCommerce.setIsCheckingOut, // Map to voiceCommerce's checkout state
    isSubmitting,
    orderNotes,
    setOrderNotes,

    // Multi-seat state
    orderedSeats,
    showPostOrderPrompt,
    setShowPostOrderPrompt,
    lastCompletedSeat,

    // Server-specific handlers
    removeOrderItem,
    submitOrder,
    resetVoiceOrder,
    handleAddNextSeat,
    handleFinishTable,
    resetAllState
  }
}