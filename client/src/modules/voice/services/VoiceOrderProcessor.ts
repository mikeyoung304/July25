/**
 * VoiceOrderProcessor - Converts voice transcripts into actual orders
 * Handles the voice -> order system integration
 */

import { api } from '@/services/api';
import { logger } from '@/services/logger'
import { MenuItem } from '@/modules/menu/types';
import { Order, OrderItem, uiOrderTypeToDb } from '@rebuild/shared';

interface ParsedOrderItem {
  menuItem: MenuItem;
  quantity: number;
  modifiers: string[];
  specialInstructions?: string;
}

export class VoiceOrderProcessor {
  private menuItems: MenuItem[] = [];
  private currentOrder: ParsedOrderItem[] = [];
  
  /**
   * Load menu items for matching
   */
  async loadMenuItems(_restaurantId: string): Promise<void> {
    try {
      this.menuItems = await api.getMenuItems();
      logger.info('[VoiceOrderProcessor] Loaded menu items:', this.menuItems.length);
    } catch (error) {
      console.error('[VoiceOrderProcessor] Failed to load menu items:', error);
    }
  }
  
  /**
   * Parse voice transcript to find menu items
   */
  parseTranscriptForItems(transcript: string): ParsedOrderItem[] {
    const items: ParsedOrderItem[] = [];
    const lowerTranscript = transcript.toLowerCase();
    
    // Common quantity words
    const quantityMap: Record<string, number> = {
      'one': 1, 'a': 1, 'an': 1, 'single': 1,
      'two': 2, 'couple': 2, 'pair': 2,
      'three': 3, 'few': 3,
      'four': 4, 'five': 5, 'six': 6,
      'dozen': 12
    };
    
    // Check each menu item
    for (const menuItem of this.menuItems) {
      // const itemNameLower = menuItem.name.toLowerCase(); // Not currently used
      
      // Handle common transcription errors
      const variations = this.getItemVariations(menuItem.name);
      
      for (const variation of variations) {
        if (lowerTranscript.includes(variation.toLowerCase())) {
          // Look for quantity before item name
          let quantity = 1;
          const itemIndex = lowerTranscript.indexOf(variation.toLowerCase());
          const beforeItem = lowerTranscript.substring(Math.max(0, itemIndex - 20), itemIndex);
          
          // Check for number
          const numberMatch = beforeItem.match(/(\d+)\s*$/);
          if (numberMatch) {
            quantity = parseInt(numberMatch[1]);
          } else {
            // Check for word quantities
            for (const [word, num] of Object.entries(quantityMap)) {
              if (beforeItem.includes(word)) {
                quantity = num;
                break;
              }
            }
          }
          
          // Extract modifiers (no cheese, extra sauce, etc)
          const modifiers: string[] = [];
          const afterItem = lowerTranscript.substring(itemIndex + variation.length, itemIndex + variation.length + 50);
          
          if (afterItem.includes('no cheese')) modifiers.push('No cheese');
          if (afterItem.includes('no onion')) modifiers.push('No onion');
          if (afterItem.includes('extra')) modifiers.push('Extra sauce');
          if (afterItem.includes('gluten free')) modifiers.push('Gluten free');
          
          items.push({
            menuItem,
            quantity,
            modifiers,
            specialInstructions: undefined
          });
          
          break; // Found this item, move to next
        }
      }
    }
    
    return items;
  }
  
  /**
   * Get variations of item name to handle transcription errors
   */
  private getItemVariations(itemName: string): string[] {
    const variations = [itemName];
    
    // Add specific variations for commonly misheard items
    const transcriptionMap: Record<string, string[]> = {
      'Soul Bowl': ['soul bowl', 'sobo', 'solo bowl', 'sowl bowl', 'sole bowl'],
      'Peach Arugula': ['peach arugula', 'peach a ruler', 'peach rugula', 'peach arugala'],
      'Jalapeño Pimento': ['jalapeño pimento', 'jalapeno pimento', 'holla peno', 'halapeno pimento'],
      'Succotash': ['succotash', 'suck a tash', 'succa tash', 'suck a toss'],
      'Greek Bowl': ['greek bowl', 'greak bowl', 'greek ball'],
      'BLT Sandwich': ['blt sandwich', 'blt', 'b l t', 'bacon lettuce tomato'],
      'Mom\'s Chicken Salad': ['moms chicken salad', 'mom chicken salad', 'mama chicken salad'],
    };
    
    if (transcriptionMap[itemName]) {
      variations.push(...transcriptionMap[itemName]);
    }
    
    return variations;
  }
  
  /**
   * Add items to current order
   */
  addToCurrentOrder(items: ParsedOrderItem[]): void {
    this.currentOrder.push(...items);
    logger.info('[VoiceOrderProcessor] Current order has items:', this.currentOrder.length);
  }
  
  /**
   * Clear current order
   */
  clearCurrentOrder(): void {
    this.currentOrder = [];
  }
  
  /**
   * Get current order summary
   */
  getCurrentOrderSummary(): string {
    if (this.currentOrder.length === 0) {
      return 'No items in order';
    }
    
    const summary = this.currentOrder.map(item => {
      let text = `${item.quantity}x ${item.menuItem.name}`;
      if (item.modifiers.length > 0) {
        text += ` (${item.modifiers.join(', ')})`;
      }
      text += ` - $${(item.menuItem.price * item.quantity).toFixed(2)}`;
      return text;
    }).join('\n');
    
    const total = this.currentOrder.reduce((sum, item) => 
      sum + (item.menuItem.price * item.quantity), 0
    );
    
    return `${summary}\n\nTotal: $${total.toFixed(2)}`;
  }
  
  /**
   * Submit current order to the system
   */
  async submitCurrentOrder(customerName: string, orderType: 'dine-in' | 'takeout' | 'drive-thru' = 'dine-in'): Promise<Order> {
    if (this.currentOrder.length === 0) {
      throw new Error('No items in order');
    }
    
    // Convert to order items
    const orderItems: Partial<OrderItem>[] = this.currentOrder.map(item => ({
      menuItemId: item.menuItem.id,
      name: item.menuItem.name,
      price: item.menuItem.price,
      quantity: item.quantity,
      modifiers: item.modifiers.map(m => ({
        id: crypto.randomUUID(),
        name: m,
        price: 0
      })),
      specialInstructions: item.specialInstructions
    }));
    
    // Calculate totals
    const subtotal = this.currentOrder.reduce((sum, item) =>
      sum + (item.menuItem.price * item.quantity), 0
    );
    const tax = subtotal * 0.0825; // 8.25% - align with server default (TODO Track B: fetch from API)
    const total = subtotal + tax;
    
    // Submit order - convert UI order type to database type
    const orderData: Partial<Order> = {
      customer_name: customerName,
      type: uiOrderTypeToDb(orderType),
      status: 'new',
      items: orderItems as OrderItem[],
      subtotal,
      tax,
      total,
      payment_status: 'pending'
    };
    
    try {
      const order = await api.submitOrder(orderData);
      logger.info('[VoiceOrderProcessor] Order submitted:', order.order_number);
      this.clearCurrentOrder();
      return order;
    } catch (error) {
      console.error('[VoiceOrderProcessor] Failed to submit order:', error);
      throw error;
    }
  }
}

// Singleton instance
export const voiceOrderProcessor = new VoiceOrderProcessor();