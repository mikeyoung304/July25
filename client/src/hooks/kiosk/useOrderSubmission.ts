import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import type { VoiceOrderItem } from '@/modules/voice/contexts/types'
import { httpClient } from '@/services/http'

interface OrderSubmissionResponse {
  id: string
  order_number?: string
  estimatedTime?: string
}

export function useOrderSubmission() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitOrder = useCallback(async (items: VoiceOrderItem[]) => {
    if (items.length === 0) {
      toast.error('No items in cart to submit')
      return { success: false, error: 'Empty cart' }
    }

    setIsSubmitting(true)
    try {
      // FLOATING-POINT FIX (TODO-051): Use cents (integer) arithmetic to avoid rounding errors
      const totalCents = items.reduce((sumCents, item) => {
        const itemPriceCents = Math.round(item.menuItem.price * 100)
        return sumCents + (itemPriceCents * item.quantity)
      }, 0)
      const total = totalCents / 100

      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          id: `kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Cart item ID (required by OrderPayload)
          menu_item_id: item.menuItem.id, // Menu item reference
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          modifications: item.modifications || [],
          special_instructions: ''
        })),
        total: total,
        paymentMethod: 'kiosk',
        customerInfo: {
          name: 'Kiosk Customer',
          phone: '',
          email: ''
        },
        notes: 'Self-service kiosk order',
        metadata: {
          source: 'kiosk',
          timestamp: new Date().toISOString()
        }
      }

      const result = await httpClient.post<OrderSubmissionResponse>('/api/v1/orders', orderData, {
        skipAuth: true,
        headers: {
          Authorization: 'Bearer kiosk-token'
        }
      })
      
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
  }, [toast])

  return {
    submitOrder,
    isSubmitting
  }
}
