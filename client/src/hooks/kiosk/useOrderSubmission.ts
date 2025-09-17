import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { useRestaurantContext } from '@/core/RestaurantContext'
import type { VoiceOrderItem } from '@/modules/voice/contexts/types'

export function useOrderSubmission() {
  const { toast } = useToast()
  const { restaurant } = useRestaurantContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitOrder = useCallback(async (items: VoiceOrderItem[]) => {
    if (items.length === 0) {
      toast.error('No items in cart to submit')
      return { success: false, error: 'Empty cart' }
    }

    if (!restaurant?.id) {
      toast.error('Restaurant context not available')
      return { success: false, error: 'Missing restaurant context' }
    }

    setIsSubmitting(true)
    try {
      // Calculate totals
      const subtotal = items.reduce((sum, item) => 
        sum + (item.menuItem.price * item.quantity), 0
      )
      const tax = subtotal * 0.08 // 8% tax
      const total = subtotal + tax
      
      // Generate idempotency key
      const idempotencyPayload = JSON.stringify({
        items: items.map(i => ({ id: i.menuItem.id, qty: i.quantity })),
        timestamp: Math.floor(Date.now() / 3000) // 3-second window
      })
      const idempotencyKey = btoa(idempotencyPayload).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)

      // Use camelCase fields per DTO contract
      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          id: item.menuItem.id, // Changed from menu_item_id
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          modifiers: (item.modifications || []).map(mod =>
            typeof mod === 'string' ? { name: mod, price: 0 } : mod
          ),
          notes: '' // Changed from special_instructions
        })),
        customerName: 'Kiosk Customer', // Changed from nested customerInfo
        customerEmail: '',
        customerPhone: '',
        notes: 'Self-service kiosk order',
        subtotal: subtotal,
        tax: tax,
        tip: 0,
        total: total // Changed from just total field
      }

      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer kiosk-token',
          'X-Restaurant-ID': restaurant.id, // Use context instead of env
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      toast.success(`Order #${result.order_number || result.id} submitted successfully!`)
      
      return { 
        success: true, 
        order_number: result.order_number || result.id,
        orderId: result.id,
        estimatedTime: result.estimatedTime || '10-15 minutes'
      }

    } catch (error) {
      console.error('Order submission failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to submit order: ${errorMessage}`)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [toast, restaurant?.id])

  return {
    submitOrder,
    isSubmitting
  }
}