import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import type { VoiceOrderItem } from '@/modules/voice/contexts/types'

export function useOrderSubmission() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get authentication token for kiosk
  const getKioskToken = async (): Promise<string> => {
    const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
    
    const response = await fetch('/api/v1/auth/kiosk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ restaurantId })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to authenticate: ${errorData.message || response.statusText}`)
    }

    const { token } = await response.json()
    return token
  }

  const submitOrder = useCallback(async (items: VoiceOrderItem[]) => {
    if (items.length === 0) {
      toast.error('No items in cart to submit')
      return { success: false, error: 'Empty cart' }
    }

    setIsSubmitting(true)
    try {
      // Get authentication token first
      const token = await getKioskToken()

      const total = items.reduce((sum, item) => 
        sum + (item.menuItem.price * item.quantity), 0
      )

      const orderData = {
        type: 'kiosk' as const,
        items: items.map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.menuItem.price,
          modifiers: item.modifications || [],
          specialInstructions: ''
        })),
        subtotal: total,
        tax: total * 0.08,
        total: total * 1.08,
        customer_name: 'Kiosk Customer',
        payment_status: 'pending',
        notes: 'Self-service kiosk order',
        metadata: {
          source: 'kiosk',
          timestamp: new Date().toISOString()
        }
      }

      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Restaurant-ID': import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
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
  }, [])

  return {
    submitOrder,
    isSubmitting
  }
}