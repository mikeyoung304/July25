import { useState, useCallback } from 'react'
import { useVoiceToAudio } from '@/modules/voice/hooks/useVoiceToAudio'
import { useToast } from '@/hooks/useToast'
import type { Table } from '@/modules/floor-plan/types'

export function useVoiceOrderFlow() {
  const { toast } = useToast()
  const [showVoiceOrder, setShowVoiceOrder] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [orderItems, setOrderItems] = useState<string[]>([])
  const [isVoiceActive, setIsVoiceActive] = useState(false)

  const { processVoiceWithTranscript, isProcessing } = useVoiceToAudio({
    onTranscriptReceived: (transcript) => {
      setCurrentTranscript(transcript)
      if (transcript && transcript !== 'Voice processed successfully') {
        setOrderItems(prev => [...prev, transcript])
      }
    },
    onAudioResponseStart: () => setIsVoiceActive(true),
    onAudioResponseEnd: () => setIsVoiceActive(false),
    onError: (error) => {
      console.error('Voice processing error:', error)
      setIsVoiceActive(false)
    }
  })

  const handleVoiceTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      setCurrentTranscript(text)
      setOrderItems(prev => [...prev, text])
    }
  }, [])

  const submitOrder = useCallback(async (selectedTable: Table | null, selectedSeat: number | null) => {
    if (orderItems.length === 0 || !selectedTable || !selectedSeat) {
      toast.error('No order items to submit')
      return false
    }
    
    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
        },
        body: JSON.stringify({
          table_number: selectedTable.label,
          seat_number: selectedSeat,
          items: orderItems.map((item, index) => ({
            id: `voice-${Date.now()}-${index}`,
            name: item,
            quantity: 1
          })),
          notes: `Voice order from ${selectedTable.label}, Seat ${selectedSeat}`,
          total_amount: orderItems.length * 12.99,
          customer_name: `Table ${selectedTable.label} - Seat ${selectedSeat}`
        })
      })
      
      if (response.ok) {
        toast.success(`Order submitted for ${selectedTable.label}, Seat ${selectedSeat}!`)
        return true
      } else {
        throw new Error('Failed to submit order')
      }
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order. Please try again.')
      return false
    }
  }, [orderItems])

  const resetVoiceOrder = useCallback(() => {
    setShowVoiceOrder(false)
    setCurrentTranscript('')
    setOrderItems([])
    setIsVoiceActive(false)
  }, [])

  return {
    showVoiceOrder,
    setShowVoiceOrder,
    currentTranscript,
    orderItems,
    setOrderItems,
    isVoiceActive,
    isProcessing,
    handleVoiceTranscript,
    submitOrder,
    resetVoiceOrder
  }
}