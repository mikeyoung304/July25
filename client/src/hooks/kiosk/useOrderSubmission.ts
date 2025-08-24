import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { useApiRequest } from '@/hooks/useApiRequest'
import type { VoiceOrderItem } from '@/modules/voice/contexts/types'

export function useOrderSubmission() {
  const { toast } = useToast()
  const api = useApiRequest()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitOrder = useCallback(async (items: VoiceOrderItem[]) => {
    if (items.length === 0) {
      toast.error('No items in cart to submit')
      return { success: false, error: 'Empty cart' }
    }

    setIsSubmitting(true)
    try {
      const total = items.reduce((sum, item) => 
        sum + (item.menuItem.price * item.quantity), 0
      )

      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          menu_item_id: item.menuItem.id,
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

      // Use centralized API client with proper auth and restaurant context
      const result = await api.post('/api/v1/orders', orderData, {
        customHeaders: {
          'Authorization': 'Bearer kiosk-token'
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