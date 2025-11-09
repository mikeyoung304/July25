import { orderService } from '@/services'
import { Order, OrderType } from '@rebuild/shared'

export interface ParsedVoiceItem {
  id?: string
  name: string
  quantity: number
  modifiers?: string[]
}

export interface VoiceOrder {
  items: ParsedVoiceItem[]
  specialRequests?: string
  orderType?: 'dine-in' | 'takeout'
  type?: OrderType
}

/**
 * Converts voice transcription to structured order data
 * In production, this would use NLP/AI for better parsing
 */
export const parseVoiceOrder = (transcription: string): VoiceOrder | null => {
  const lowerText = transcription.toLowerCase()
  const items: ParsedVoiceItem[] = []
  
  // Grow Fresh Local Food menu patterns with Southern accent variations
  const menuItems = [
    // Bowls
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:soul|sole|georgia\s*soul|soul\s*food)\s*(?:bowl|bol)s?/gi, name: 'Soul Bowl' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:chicken\s*)?(?:fajita|fahita|faheta)\s*(?:keto|keeto|ketto)?(?:\s*bowl)?s?/gi, name: 'Chicken Fajita Keto' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:greek|mediterran(?:ean)?)\s*(?:bowl|chicken|bol)s?/gi, name: 'Greek Bowl' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:summer\s*)?vegan\s*(?:bowl|bol)s?/gi, name: 'Summer Vegan Bowl' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:summer\s*)?succotash(?:\s*bowl)?s?/gi, name: 'Summer Succotash' },
    
    // Salads
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:summer|house|seasonal)\s*salads?/gi, name: 'Summer Salad' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?peach\s*(?:arugula|salad)s?/gi, name: 'Peach Arugula Salad' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?greek\s*salads?/gi, name: 'Greek Salad' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?tuna\s*(?:salad|plate)s?/gi, name: 'Tuna Salad' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:mom'?s?|mama'?s?)\s*chicken\s*salads?/gi, name: "Mom's Chicken Salad" },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?grilled\s*chicken\s*salads?/gi, name: 'Grilled Chicken Salad' },
    
    // Starters
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:summer\s*)?samplers?/gi, name: 'Summer Sampler' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?peach\s*(?:and\s*)?(?:prosciutto\s*)?capreses?/gi, name: 'Peach & Prosciutto Caprese' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?watermelon\s*tatakis?/gi, name: 'Watermelon Tataki' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?tea\s*sandwich(?:es)?/gi, name: 'Tea Sandwiches' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:jalape[nñ]o\s*)?pimento\s*(?:cheese\s*)?bites?/gi, name: 'Jalapeño Pimento Bites' },
    
    // Entrees
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?peach\s*chickens?/gi, name: 'Peach Chicken' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:teriyaki\s*)?salmon(?:\s*over\s*rice)?s?/gi, name: 'Teriyaki Salmon Over Rice' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?hamburger\s*steaks?(?:\s*over\s*rice)?/gi, name: 'Hamburger Steak over rice' },
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?greek\s*chicken\s*thighs?(?:\s*over\s*rice)?/gi, name: 'Greek Chicken Thighs (2) Over Rice' },
    
    // Veggie Plate
    { pattern: /(\d+|one|two|three|four|five)?\s*(?:x\s*)?(?:veggie|vegetable|vegetarian)\s*plates?/gi, name: 'Veggie Plate' },
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
  const lowerItem = itemName.toLowerCase()
  
  // Common modifiers for Grow Fresh Local Food
  // Bowl modifiers
  if (lowerItem.includes('bowl')) {
    if (lowerText.includes('no rice') || lowerText.includes('without rice')) modifiers.push('No rice')
    if (lowerText.includes('extra collards') || lowerText.includes('more collards')) modifiers.push('Extra collards')
    if (lowerText.includes('no olives') || lowerText.includes('without olives')) modifiers.push('No olives')
    if (lowerText.includes('no feta') || lowerText.includes('without feta')) modifiers.push('No feta')
    if (lowerText.includes('extra sauce') || lowerText.includes('more sauce')) modifiers.push('Extra sauce')
  }
  
  // Chicken Fajita Keto specific
  if (lowerItem.includes('keto')) {
    if (lowerText.includes('add rice') || lowerText.includes('with rice')) modifiers.push('Add rice')
  }
  
  // Salad modifiers
  if (lowerItem.includes('salad')) {
    if (lowerText.includes('add chicken') || lowerText.includes('with chicken')) modifiers.push('Add chicken')
    if (lowerText.includes('add salmon') || lowerText.includes('with salmon')) modifiers.push('Add salmon')
    if (lowerText.includes('add prosciutto') || lowerText.includes('with prosciutto')) modifiers.push('Add prosciutto')
    if (lowerText.includes('no dressing') || lowerText.includes('without dressing')) modifiers.push('No dressing')
  }
  
  // Veggie plate modifiers
  if (lowerItem.includes('veggie plate')) {
    if (lowerText.includes('three sides') || lowerText.includes('3 sides')) modifiers.push('Three sides')
    if (lowerText.includes('four sides') || lowerText.includes('4 sides')) modifiers.push('Four sides')
  }
  
  // Dietary preferences
  if (lowerText.includes('make it vegan') || lowerText.includes('vegan version')) modifiers.push('Make it vegan')
  if (lowerText.includes('gluten free') || lowerText.includes('no gluten')) modifiers.push('Gluten free')
  
  // Side selection
  const sidePattern = /with\s+(collards?|rice|sweet\s*potatoes?|black\s*eye(?:d)?\s*peas|potato\s*salad|fruit|cucumber\s*salad|noodles)/gi
  let sideMatch
  while ((sideMatch = sidePattern.exec(lowerText)) !== null) {
    modifiers.push(`With ${sideMatch[1]}`)
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
  const orderData: Partial<Order> = {
    table_number: 'K1', // K for Kiosk
    items: voiceOrder.items.map(item => ({
      id: `${Date.now()}-${Math.random()}`,
      menu_item_id: item.id || `menu-${Date.now()}`,
      name: item.name,
      quantity: item.quantity,
      price: calculateItemPrice(item.name),
      subtotal: calculateItemPrice(item.name) * item.quantity,
      modifiers: item.modifiers?.map(mod => ({
        id: `mod-${Date.now()}-${Math.random()}`,
        name: mod,
        price: 0
      })),
      special_instructions: voiceOrder.specialRequests
    })),
    total: calculateTotal(voiceOrder.items),
    type: (voiceOrder.type || 'voice') as OrderType
  }

  return orderService.submitOrder(orderData)
}

const calculateItemPrice = (itemName: string): number => {
  const prices: Record<string, number> = {
    // Starters
    'Summer Sampler': 16,
    'Peach & Prosciutto Caprese': 12,
    'Watermelon Tataki': 12,
    'Tea Sandwiches': 10,
    'Jalapeño Pimento Bites': 10,
    
    // Salads
    'Summer Salad': 12,
    'Peach Arugula Salad': 12,
    'Greek Salad': 12,
    'Tuna Salad': 14,
    "Mom's Chicken Salad": 13,
    'Grilled Chicken Salad': 14,
    
    // Bowls
    'Soul Bowl': 14,
    'Chicken Fajita Keto': 14,
    'Greek Bowl': 14,
    'Summer Vegan Bowl': 14,
    'Summer Succotash': 14
  }
  
  return prices[itemName] || 10 // Default price if not found
}

const calculateTotal = (items: ParsedVoiceItem[]): number => {
  return items.reduce((total, item) => {
    const basePrice = calculateItemPrice(item.name)
    return total + (basePrice * item.quantity)
  }, 0)
}