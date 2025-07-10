import { api } from '@/services/api'

export interface VoiceOrderItem {
  name: string
  quantity: number
  modifiers?: string[]
}

export interface VoiceOrder {
  items: VoiceOrderItem[]
  specialRequests?: string
  orderType?: 'dine-in' | 'takeout'
}

/**
 * Converts voice transcription to structured order data
 * In production, this would use NLP/AI for better parsing
 */
export const parseVoiceOrder = (transcription: string): VoiceOrder | null => {
  const lowerText = transcription.toLowerCase()
  const items: VoiceOrderItem[] = []
  
  // Menu item patterns - improved to handle various phrasings
  const menuItems = [
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?burgers?/gi, name: 'Burger' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?pizzas?/gi, name: 'Pizza' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?salads?/gi, name: 'Salad' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?fries/gi, name: 'Fries' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:coke|cola)s?/gi, name: 'Coca Cola' },
  ]
  
  // Extract items with quantities
  menuItems.forEach(({ pattern, name }) => {
    const matches = Array.from(transcription.matchAll(pattern))
    matches.forEach(match => {
      let quantity = 1
      if (match[1]) {
        // Handle numeric quantities
        const num = parseInt(match[1])
        if (!isNaN(num)) {
          quantity = num
        } else {
          // Handle word quantities
          const wordToNum: Record<string, number> = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
          }
          quantity = wordToNum[match[1].toLowerCase()] || 1
        }
      }
      const modifiers = extractModifiers(transcription, name.toLowerCase())
      items.push({ name, quantity, modifiers })
    })
  })
  
  if (items.length === 0) return null
  
  // Extract special requests
  const specialRequests = extractSpecialRequests(transcription)
  
  // Determine order type
  const orderType = lowerText.includes('take') || lowerText.includes('to go') 
    ? 'takeout' 
    : 'dine-in'
  
  return {
    items,
    specialRequests,
    orderType
  }
}

const extractModifiers = (text: string, itemName: string): string[] => {
  const modifiers: string[] = []
  const lowerText = text.toLowerCase()
  
  // Common modifier patterns
  if (itemName === 'burger') {
    if (lowerText.includes('no cheese')) modifiers.push('No cheese')
    if (lowerText.includes('extra cheese')) modifiers.push('Extra cheese')
    if (lowerText.includes('no onion')) modifiers.push('No onions')
    if (lowerText.includes('well done')) modifiers.push('Well done')
  }
  
  if (itemName === 'pizza') {
    if (lowerText.includes('large')) modifiers.push('Large')
    if (lowerText.includes('extra cheese')) modifiers.push('Extra cheese')
    if (lowerText.includes('thin crust')) modifiers.push('Thin crust')
  }
  
  if (itemName === 'salad') {
    if (lowerText.includes('no dressing')) modifiers.push('No dressing')
    if (lowerText.includes('ranch')) modifiers.push('Ranch dressing')
    if (lowerText.includes('italian')) modifiers.push('Italian dressing')
  }
  
  return modifiers
}

const extractSpecialRequests = (text: string): string | undefined => {
  // Look for special request indicators
  const patterns = [
    /please\s+(.+?)(?:\.|$)/i,
    /make\s+sure\s+(.+?)(?:\.|$)/i,
    /allergic\s+to\s+(.+?)(?:\.|$)/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  
  return undefined
}

/**
 * Submits a voice order to the KDS system
 */
export const submitVoiceOrder = async (voiceOrder: VoiceOrder) => {
  // Convert to API format
  const orderData = {
    tableNumber: 'K1', // K for Kiosk
    items: voiceOrder.items.map(item => ({
      id: `${Date.now()}-${Math.random()}`,
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers,
      notes: voiceOrder.specialRequests
    })),
    totalAmount: calculateTotal(voiceOrder.items),
    orderType: voiceOrder.orderType
  }
  
  return api.submitOrder(orderData)
}

const calculateTotal = (items: VoiceOrderItem[]): number => {
  // Mock pricing - in production this would come from a menu service
  const prices: Record<string, number> = {
    'Burger': 12.99,
    'Pizza': 18.99,
    'Salad': 9.99,
    'Fries': 4.99,
    'Coca Cola': 2.99
  }
  
  return items.reduce((total, item) => {
    const price = prices[item.name] || 0
    return total + (price * item.quantity)
  }, 0)
}