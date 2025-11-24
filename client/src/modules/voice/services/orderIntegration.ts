import { orderService } from '@/services'
import { Order, OrderType } from '@rebuild/shared'
import { voiceMenuMatcher } from './VoiceMenuMatcher'
import { logger } from '@/services/logger'

export interface ParsedVoiceItem {
  id?: string
  menu_item_id?: string
  name: string
  quantity: number
  price?: number
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
 *
 * PHASE 3 UPDATE (2025-01-23):
 * - Removed 25 hardcoded menu items
 * - Now uses VoiceMenuMatcher for dynamic menu lookup
 * - Enables voice ordering for ALL restaurants (multi-tenant ready)
 */
export const parseVoiceOrder = async (transcription: string): Promise<VoiceOrder | null> => {
  const lowerText = transcription.toLowerCase()
  const items: ParsedVoiceItem[] = []

  // ✅ PHASE 3: Dynamic menu matching (no hardcoded items)
  if (!voiceMenuMatcher.isReady()) {
    logger.warn('[parseVoiceOrder] VoiceMenuMatcher not initialized, initializing now...');
    await voiceMenuMatcher.initialize();
  }

  // Extract quantity patterns from transcription
  const quantityPattern = /(\d+|one|two|three|four|five)\s*(?:x\s*)?(.+?)(?:\s+and|\s+plus|\.|\,|$)/gi;
  const wordToNum: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
  };

  let hasMatches = false;
  let match;

  while ((match = quantityPattern.exec(transcription)) !== null) {
    const quantityStr = match[1];
    const itemText = match[2].trim();

    // Parse quantity
    let quantity = 1;
    const num = parseInt(quantityStr);
    if (!isNaN(num)) {
      quantity = num;
    } else {
      quantity = wordToNum[quantityStr.toLowerCase()] || 1;
    }

    // Match to menu item
    const matchResult = voiceMenuMatcher.matchItem(itemText);
    if (matchResult) {
      hasMatches = true;
      const modifiers = extractModifiers(transcription, matchResult.menuItem.name.toLowerCase());
      items.push({
        id: matchResult.menuItem.id,
        menu_item_id: matchResult.menuItem.id,
        name: matchResult.menuItem.name,
        quantity,
        price: matchResult.menuItem.price,
        modifiers
      });

      logger.info('[parseVoiceOrder] Matched item', {
        spoken: itemText,
        matched: matchResult.menuItem.name,
        confidence: matchResult.confidence,
        quantity
      });
    }
  }

  // Fallback: Try matching the entire transcription if no quantity patterns found
  if (!hasMatches) {
    const matchResult = voiceMenuMatcher.matchItem(transcription);
    if (matchResult) {
      const modifiers = extractModifiers(transcription, matchResult.menuItem.name.toLowerCase());
      items.push({
        id: matchResult.menuItem.id,
        menu_item_id: matchResult.menuItem.id,
        name: matchResult.menuItem.name,
        quantity: 1,
        price: matchResult.menuItem.price,
        modifiers
      });
    }
  }

  if (items.length === 0) return null;

  // Extract special requests
  const specialRequests = extractSpecialRequests(transcription);

  // Determine order type
  const orderType = lowerText.includes('take') || lowerText.includes('to go')
    ? 'takeout'
    : 'dine-in';

  return {
    items,
    specialRequests,
    orderType
  };
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
 *
 * PHASE 3 UPDATE (2025-01-23):
 * - Removed 22 hardcoded prices
 * - Now uses dynamic pricing from MenuService
 */
export const submitVoiceOrder = async (voiceOrder: VoiceOrder) => {
  // Convert to API format
  const orderData: Partial<Order> = {
    table_number: 'K1', // K for Kiosk
    items: voiceOrder.items.map(item => ({
      id: `${Date.now()}-${Math.random()}`,
      menu_item_id: item.menu_item_id || item.id || `menu-${Date.now()}`,
      name: item.name,
      quantity: item.quantity,
      price: item.price || 0, // ✅ Price from MenuService, not hardcoded
      subtotal: (item.price || 0) * item.quantity,
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

// ✅ PHASE 3: Removed calculateItemPrice() - prices now from MenuService
const calculateTotal = (items: ParsedVoiceItem[]): number => {
  return items.reduce((total, item) => {
    const basePrice = item.price || 0; // Use price from menu item
    return total + (basePrice * item.quantity)
  }, 0)
}