import { useReducer, useCallback, useRef, useEffect } from 'react'
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

// ============================================================================
// VOICE ORDER STATE & REDUCER (Consolidated from 8 useState calls)
// ============================================================================
interface VoiceOrderState {
  showVoiceOrder: boolean
  orderItems: OrderItem[]
  isSubmitting: boolean
  orderSessionId: string | null
  orderNotes: string
  orderedSeats: number[]
  showPostOrderPrompt: boolean
  lastCompletedSeat: number | null
}

type VoiceOrderAction =
  | { type: 'SHOW_VOICE_ORDER'; payload: boolean }
  | { type: 'ADD_ORDER_ITEM'; payload: OrderItem }
  | { type: 'REMOVE_ORDER_ITEM'; payload: string }
  | { type: 'SET_ORDER_ITEMS'; payload: OrderItem[] }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ORDER_SESSION_ID'; payload: string | null }
  | { type: 'SET_ORDER_NOTES'; payload: string }
  | { type: 'ADD_ORDERED_SEAT'; payload: number }
  | { type: 'SET_SHOW_POST_ORDER_PROMPT'; payload: boolean }
  | { type: 'SET_LAST_COMPLETED_SEAT'; payload: number | null }
  | { type: 'RESET_VOICE_ORDER' }
  | { type: 'RESET_ALL_STATE' }
  | { type: 'ORDER_SUBMITTED'; payload: number }

const initialVoiceOrderState: VoiceOrderState = {
  showVoiceOrder: false,
  orderItems: [],
  isSubmitting: false,
  orderSessionId: null,
  orderNotes: '',
  orderedSeats: [],
  showPostOrderPrompt: false,
  lastCompletedSeat: null
}

function voiceOrderReducer(state: VoiceOrderState, action: VoiceOrderAction): VoiceOrderState {
  switch (action.type) {
    case 'SHOW_VOICE_ORDER':
      return { ...state, showVoiceOrder: action.payload }
    case 'ADD_ORDER_ITEM':
      return { ...state, orderItems: [...state.orderItems, action.payload] }
    case 'REMOVE_ORDER_ITEM':
      return { ...state, orderItems: state.orderItems.filter(item => item.id !== action.payload) }
    case 'SET_ORDER_ITEMS':
      return { ...state, orderItems: action.payload }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload }
    case 'SET_ORDER_SESSION_ID':
      return { ...state, orderSessionId: action.payload }
    case 'SET_ORDER_NOTES':
      return { ...state, orderNotes: action.payload }
    case 'ADD_ORDERED_SEAT':
      return { ...state, orderedSeats: [...state.orderedSeats, action.payload] }
    case 'SET_SHOW_POST_ORDER_PROMPT':
      return { ...state, showPostOrderPrompt: action.payload }
    case 'SET_LAST_COMPLETED_SEAT':
      return { ...state, lastCompletedSeat: action.payload }
    case 'ORDER_SUBMITTED':
      return {
        ...state,
        orderedSeats: [...state.orderedSeats, action.payload],
        lastCompletedSeat: action.payload,
        showPostOrderPrompt: true,
        orderItems: [],
        orderNotes: '',
        orderSessionId: null,
        isSubmitting: false
      }
    case 'RESET_VOICE_ORDER':
      return {
        ...state,
        showVoiceOrder: false,
        orderItems: [],
        orderNotes: '',
        showPostOrderPrompt: false,
        orderSessionId: null
      }
    case 'RESET_ALL_STATE':
      return initialVoiceOrderState
    default:
      return state
  }
}

export function useVoiceOrderWebRTC() {
  const { toast } = useToast()
  const { items: menuItems } = useMenuItems()
  const taxRate = useTaxRate()
  const { restaurant } = useRestaurant()
  const metrics = useVoiceOrderingMetrics()

  // Consolidated state management with useReducer (replaces 8 useState calls)
  const [state, dispatch] = useReducer(voiceOrderReducer, initialVoiceOrderState)

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

    dispatch({ type: 'ADD_ORDER_ITEM', payload: orderItem })
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
    if (state.showVoiceOrder && !state.orderSessionId) {
      const sessionId = metrics.trackOrderStarted('voice-order', 1)
      dispatch({ type: 'SET_ORDER_SESSION_ID', payload: sessionId })
      logger.info('[useVoiceOrderWebRTC] Order session started', { sessionId })
    }
  }, [state.showVoiceOrder, state.orderSessionId, metrics])

  // Remove an item from the order
  const removeOrderItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ORDER_ITEM', payload: itemId })
  }, [])

  // Submit order to backend
  const submitOrder = useCallback(async (selectedTable: Table | null, selectedSeat: number | null) => {
    // Guard clause: prevent duplicate submissions
    if (state.isSubmitting) {
      logger.warn('[submitOrder] Submit already in progress, ignoring duplicate call')
      return false
    }

    if (state.orderItems.length === 0 || !selectedTable || !selectedSeat) {
      toast.error('No order items to submit')
      return false
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true })

    // CRITICAL: Validate all items have menuItemId before submission
    // Items without menuItemId are raw text from failed parsing and will cause 400/500 errors
    const invalidItems = state.orderItems.filter(item => !item.menuItemId)
    if (invalidItems.length > 0) {
      logger.error('[submitOrder] Invalid items without menuItemId:', {
        invalidCount: invalidItems.length,
        invalidNames: invalidItems.map(i => i.name)
      })
      toast.error(
        `Cannot submit: ${invalidItems.length} item${invalidItems.length > 1 ? 's' : ''} not recognized from menu. ` +
        `Please remove unrecognized items and try again.`
      )
      dispatch({ type: 'SET_SUBMITTING', payload: false })
      return false
    }

    try {
      // Dual auth pattern: Try Supabase session first, fallback to localStorage
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ||
        JSON.parse(localStorage.getItem('auth_session') || '{}').session?.accessToken

      if (!token) {
        toast.error('Please log in to submit orders')
        dispatch({ type: 'SET_SUBMITTING', payload: false })
        return false
      }

      // Get restaurant ID from context (fix for P0 multi-tenant data corruption bug)
      const restaurantId = restaurant?.id

      if (!restaurantId) {
        logger.error('[submitOrder] No restaurant ID available')
        toast.error('Restaurant context not loaded. Please refresh.')
        dispatch({ type: 'SET_SUBMITTING', payload: false })
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
          items: state.orderItems.map(item => {
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
          notes: state.orderNotes
            ? `${state.orderNotes}\n\n(Voice order from ${selectedTable.label}, Seat ${selectedSeat})`
            : `Voice order from ${selectedTable.label}, Seat ${selectedSeat}`,
          total_amount: (() => {
            const subtotal = state.orderItems.reduce((sum, item) => {
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
        if (state.orderSessionId) {
          metrics.trackOrderCompleted(state.orderSessionId, orderId, state.orderItems.length)
          logger.info('[submitOrder] Order completed', { sessionId: state.orderSessionId, orderId })
        }

        // Use composite action to handle all post-submission state changes atomically
        dispatch({ type: 'ORDER_SUBMITTED', payload: selectedSeat })

        return true
      } else {
        const errorText = await response.text()
        logger.error('Order submission failed:', { errorText })
        throw new Error('Failed to submit order')
      }
    } catch (error) {
      logger.error('Error submitting order:', { error })
      toast.error('Failed to submit order. Please try again.')
      dispatch({ type: 'SET_SUBMITTING', payload: false })
      return false
    }
  }, [state.isSubmitting, state.orderItems, state.orderNotes, state.orderSessionId, menuItems, toast, taxRate, restaurant?.id, metrics])

  // Handler for "Add Next Seat" button
  const handleAddNextSeat = useCallback(() => {
    dispatch({ type: 'SET_SHOW_POST_ORDER_PROMPT', payload: false })
    dispatch({ type: 'SHOW_VOICE_ORDER', payload: false })
    // Don't reset orderedSeats - keep tracking which seats have orders
    // Parent component will re-open seat selection modal
  }, [])

  // Handler for "Finish Table" button
  const handleFinishTable = useCallback(() => {
    dispatch({ type: 'RESET_ALL_STATE' })
    voiceCommerce.setIsCheckingOut(false)
    toast.success('Table orders complete!')
  }, [toast, voiceCommerce])

  // Reset voice order state (called when canceling or closing)
  const resetVoiceOrder = useCallback(() => {
    // Track order abandoned if there were items and an active session
    if (state.orderSessionId && state.orderItems.length > 0) {
      metrics.trackOrderAbandoned(state.orderSessionId, 'user_closed_modal')
      logger.info('[resetVoiceOrder] Order abandoned', { sessionId: state.orderSessionId, itemCount: state.orderItems.length })
    }

    dispatch({ type: 'RESET_VOICE_ORDER' })
    voiceCommerce.setIsCheckingOut(false)
    // Keep orderedSeats intact unless explicitly finishing table
  }, [state.orderSessionId, state.orderItems, metrics, voiceCommerce])

  // Complete reset for starting fresh with a new table
  const resetAllState = useCallback(() => {
    dispatch({ type: 'RESET_ALL_STATE' })
    voiceCommerce.setIsCheckingOut(false)
  }, [voiceCommerce])

  // Wrapper functions for setters to maintain API compatibility
  const setShowVoiceOrder = useCallback((show: boolean) => {
    dispatch({ type: 'SHOW_VOICE_ORDER', payload: show })
  }, [])

  const setOrderItems = useCallback((items: OrderItem[] | ((prev: OrderItem[]) => OrderItem[])) => {
    if (typeof items === 'function') {
      dispatch({ type: 'SET_ORDER_ITEMS', payload: items(state.orderItems) })
    } else {
      dispatch({ type: 'SET_ORDER_ITEMS', payload: items })
    }
  }, [state.orderItems])

  const setOrderNotes = useCallback((notes: string) => {
    dispatch({ type: 'SET_ORDER_NOTES', payload: notes })
  }, [])

  const setShowPostOrderPrompt = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_POST_ORDER_PROMPT', payload: show })
  }, [])

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
    showVoiceOrder: state.showVoiceOrder,
    setShowVoiceOrder,
    orderItems: state.orderItems,
    setOrderItems,
    setIsProcessing: voiceCommerce.setIsCheckingOut, // Map to voiceCommerce's checkout state
    isSubmitting: state.isSubmitting,
    orderNotes: state.orderNotes,
    setOrderNotes,

    // Multi-seat state
    orderedSeats: state.orderedSeats,
    showPostOrderPrompt: state.showPostOrderPrompt,
    setShowPostOrderPrompt,
    lastCompletedSeat: state.lastCompletedSeat,

    // Server-specific handlers
    removeOrderItem,
    submitOrder,
    resetVoiceOrder,
    handleAddNextSeat,
    handleFinishTable,
    resetAllState
  }
}