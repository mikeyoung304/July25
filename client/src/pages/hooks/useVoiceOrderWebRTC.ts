import { useState, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser'
import { OrderModification } from '@/modules/voice/contexts/types'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'
import type { Table } from '@/modules/floor-plan/types'
import { logger } from '@/services/monitoring/logger'
import { useAuth } from '@/contexts/auth.hooks'
import { useUnifiedCart } from '@/contexts/cart.hooks'

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
  const { cart, addItem, clearCart, removeFromCart, updateItemQuantity } = useUnifiedCart()
  const [showVoiceOrder, setShowVoiceOrder] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const orderParserRef = useRef<OrderParser | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recentItemsRef = useRef<Map<string, number>>(new Map()) // Track recent additions for deduplication
  
  // Convert cart items to the format expected by the voice UI
  const orderItems = useMemo(() => {
    return cart.items.map(item => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      modifications: item.modifications?.map(mod => ({ 
        name: mod, 
        price: 0 
      } as OrderModification)) || []
    }))
  }, [cart.items])

  // Initialize order parser when menu items are loaded
  if (menuItems.length > 0 && !orderParserRef.current) {
    orderParserRef.current = new OrderParser(menuItems)
  }

  // Process parsed menu items and add to cart with deduplication
  const processParsedItems = useCallback((parsedItems: ParsedOrderItem[]) => {
    let itemsAdded = 0
    const now = Date.now()
    
    // Clean up old entries (older than 2 seconds)
    for (const [key, timestamp] of recentItemsRef.current.entries()) {
      if (now - timestamp > 2000) {
        recentItemsRef.current.delete(key)
      }
    }
    
    parsedItems.forEach(parsed => {
      if (parsed.menuItem) {
        switch (parsed.action) {
          case 'add': {
            // Create deduplication key
            const modifiersKey = (parsed.modifications || [])
              .map(m => m.name)
              .sort()
              .join('|')
            const dedupeKey = `${parsed.menuItem.id}:${parsed.quantity}:${modifiersKey}`
            
            // Check if this exact item was added in the last 2 seconds
            if (recentItemsRef.current.has(dedupeKey)) {
              logger.debug('Skipping duplicate item addition', { 
                itemId: parsed.menuItem.id,
                dedupeKey 
              })
              return
            }
            
            // Mark as recently added
            recentItemsRef.current.set(dedupeKey, now)
            
            // Use UnifiedCart's addItem method - adapt ApiMenuItem to MenuItem
            const fullMenuItem = {
              ...parsed.menuItem,
              restaurant_id: restaurantId || '',
              category_id: parsed.menuItem.categoryId || '',
              is_available: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as any
            
            addItem(
              fullMenuItem,
              parsed.quantity,
              parsed.modifications?.map(mod => mod.name) || [],
              undefined // specialInstructions
            )
            itemsAdded++
            
            // Log structured event for tracking
            logger.info('Voice order item added', {
              source: 'voice',
              itemId: parsed.menuItem.id,
              modifiersHash: modifiersKey,
              idempotencyKey: dedupeKey
            })
            break
          }
          case 'remove': {
            // Find and remove item from cart
            const itemToRemove = cart.items.find(item => 
              item.menuItemId === parsed.menuItem?.id
            )
            if (itemToRemove) {
              removeFromCart(itemToRemove.id)
            }
            break
          }
          case 'update': {
            // Find and update item quantity in cart
            const itemToUpdate = cart.items.find(item => 
              item.menuItemId === parsed.menuItem?.id
            )
            if (itemToUpdate) {
              updateItemQuantity(itemToUpdate.id, parsed.quantity)
            }
            break
          }
        }
      }
    })

    if (itemsAdded > 0) {
      toast.success(`Added ${itemsAdded} item${itemsAdded > 1 ? 's' : ''} to order`)
    }
  }, [cart.items, addItem, removeFromCart, updateItemQuantity, toast])

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
          // If no items parsed, show error instead of adding raw text
          toast.error('Could not understand the order. Please try again.')
        }
      } else {
        // No parser available
        toast.error('Menu items not loaded. Please wait and try again.')
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
      // Add items to cart using UnifiedCart
      orderData.items.forEach((item: any) => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId)
        if (menuItem) {
          const fullMenuItem = {
            ...menuItem,
            restaurant_id: restaurantId || '',
            category_id: menuItem.categoryId || '',
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any
          
          addItem(
            fullMenuItem,
            item.quantity || 1,
            item.modifications || [],
            undefined
          )
        }
      })
      
      toast.success(`Added ${orderData.items.length} item${orderData.items.length > 1 ? 's' : ''} from server`)
    }
  }, [menuItems, toast])

  // Remove an item from the order (delegate to cart)
  const removeOrderItem = useCallback((itemId: string) => {
    removeFromCart(itemId)
  }, [removeFromCart])
  
  // Poll payment status from Square Terminal
  const pollPaymentStatus = useCallback(async (checkoutId: string) => {
    let attempts = 0
    const maxAttempts = 60 // Poll for up to 2 minutes (60 * 2 seconds)
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        logger.warn('[useVoiceOrderWebRTC] Payment polling timeout', { checkoutId })
        setPaymentStatus('failed')
        toast.error('Payment timeout. Please process manually.')
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        return
      }
      
      try {
        const response = await fetch(apiUrl(`/api/v1/terminal/checkout/${checkoutId}`), {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'X-Restaurant-ID': restaurantId || import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const status = data.checkout?.status
          
          logger.info('[useVoiceOrderWebRTC] Payment status check', { checkoutId, status, attempt: attempts })
          
          if (status === 'COMPLETED') {
            setPaymentStatus('completed')
            toast.success('Payment completed successfully!')
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          } else if (status === 'CANCELED' || status === 'FAILED') {
            setPaymentStatus('failed')
            toast.error('Payment failed or was cancelled')
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
          // Otherwise continue polling (status is IN_PROGRESS)
        }
      } catch (error) {
        logger.error('[useVoiceOrderWebRTC] Payment status check error', { error })
      }
      
      attempts++
    }
    
    // Start polling immediately
    poll()
    
    // Then poll every 2 seconds
    pollIntervalRef.current = setInterval(poll, 2000)
  }, [session?.accessToken, restaurantId, toast])

  // Submit order to backend and initiate payment
  const submitOrder = useCallback(async (selectedTable: Table | null, selectedSeat: number | null) => {
    console.log('[submitOrder] START - Debug state:', {
      cartItemsLength: cart.items.length,
      cartItems: cart.items,
      cartTotal: cart.total,
      selectedTable,
      selectedSeat,
      hasSession: !!session?.accessToken,
      restaurantId,
      timestamp: new Date().toISOString()
    })
    
    // Validation checks with detailed logging
    if (cart.items.length === 0) {
      console.error('[submitOrder] VALIDATION FAILED: No items in cart')
      toast.error('No items in cart to submit')
      return false
    }
    
    if (!selectedTable) {
      console.error('[submitOrder] VALIDATION FAILED: No table selected')
      toast.error('No table selected')
      return false
    }
    
    if (!selectedSeat) {
      console.error('[submitOrder] VALIDATION FAILED: No seat selected')
      toast.error('No seat selected')
      return false
    }
    
    if (!session?.accessToken) {
      console.error('[submitOrder] VALIDATION FAILED: User not authenticated')
      toast.error('User not authenticated')
      return false
    }
    
    console.log('[submitOrder] All validations passed, preparing order data...')
    
    try {
      // Prepare the order payload matching server expectations
      const orderPayload = {
        // Server expects camelCase for these fields
        tableNumber: selectedTable.label,  // Changed from table_number
        customerName: `Table ${selectedTable.label} - Seat ${selectedSeat}`,  // Changed from customer_name
        type: 'dine-in',  // Changed from order_type to type
        items: cart.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price || 0,  // Added price field
          quantity: item.quantity,
          modifiers: item.modifications?.map(mod => ({  // Changed from modifications to modifiers
            name: mod,
            price: 0
          })) || [],
          notes: ''  // Added notes field for items
        })),
        notes: `Voice order from ${selectedTable.label}, Seat ${selectedSeat}`,
        subtotal: cart.subtotal,  // Added subtotal
        tax: cart.tax,  // Added tax
        tip: cart.tip || 0,  // Added tip
        total_amount: cart.total,  // Keep total_amount for backward compatibility
        metadata: {
          seatNumber: selectedSeat,  // Store seat number in metadata
          source: 'voice_server_view'
        }
      }
      
      console.log('[submitOrder] Order payload prepared:', orderPayload)
      
      const apiEndpoint = apiUrl('/api/v1/orders')
      console.log('[submitOrder] Making API request to:', apiEndpoint)
      
      // Step 1: Create the order
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Restaurant-ID': restaurantId || import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
        },
        body: JSON.stringify(orderPayload)
      })
      
      console.log('[submitOrder] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[submitOrder] API ERROR:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          endpoint: apiEndpoint,
          payload: orderPayload
        })
        
        // Try to parse error message if it's JSON
        let errorMessage = 'Failed to submit order'
        try {
          const errorJson = JSON.parse(errorText)
          // Ensure we extract a string from the error response
          if (typeof errorJson.message === 'string') {
            errorMessage = errorJson.message
          } else if (typeof errorJson.error === 'string') {
            errorMessage = errorJson.error
          } else if (typeof errorJson === 'string') {
            errorMessage = errorJson
          } else {
            // If the error is an object, stringify it for debugging
            errorMessage = `Failed to submit order: ${JSON.stringify(errorJson)}`
          }
        } catch (e) {
          // If not JSON, use the text as is
          if (errorText && typeof errorText === 'string') {
            errorMessage = errorText
          }
        }
        
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }

      const orderData = await response.json()
      console.log('[submitOrder] Order created successfully:', orderData)
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
            const checkoutId = checkoutData.checkout?.id
            logger.info('[useVoiceOrderWebRTC] Terminal checkout initiated', { checkoutId })
            toast.success(`Payment initiated on terminal for ${selectedTable.label}, Seat ${selectedSeat}`)
            
            // Start polling for payment status
            setPaymentStatus('processing')
            if (checkoutId) {
              pollPaymentStatus(checkoutId)
            }
            
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
      
      // Clear cart after successful order submission
      clearCart()
      console.log('[submitOrder] SUCCESS - Order submitted and cart cleared')
      return true
    } catch (error) {
      console.error('[submitOrder] CATCH ERROR:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        cartItems: cart.items,
        timestamp: new Date().toISOString()
      })
      
      // Don't show duplicate error toast if we already showed one
      if (error instanceof Error && !error.message.includes('Failed to submit order')) {
        toast.error('Failed to submit order. Please try again.')
      }
      
      return false
    }
  }, [cart, toast, session?.accessToken, restaurantId, pollPaymentStatus, clearCart])

  // Reset voice order state
  const resetVoiceOrder = useCallback(() => {
    setShowVoiceOrder(false)
    setCurrentTranscript('')
    clearCart() // Clear the unified cart
    setIsVoiceActive(false)
    setIsProcessing(false)
    setPaymentStatus('idle')
    // Clear any polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [clearCart])

  return {
    // State
    showVoiceOrder,
    setShowVoiceOrder,
    currentTranscript,
    orderItems,
    setOrderItems: (items: OrderItem[]) => {
      // Clear cart and add new items
      clearCart()
      items.forEach(item => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId)
        if (menuItem) {
          const fullMenuItem = {
            ...menuItem,
            restaurant_id: restaurantId || '',
            category_id: menuItem.categoryId || '',
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any
          
          addItem(
            fullMenuItem,
            item.quantity,
            item.modifications?.map(mod => mod.name) || [],
            undefined
          )
        }
      })
    },
    isVoiceActive,
    isProcessing,
    setIsProcessing,
    paymentStatus,
    
    // Handlers
    handleVoiceTranscript,
    handleOrderData,
    removeOrderItem,
    submitOrder,
    resetVoiceOrder
  }
}