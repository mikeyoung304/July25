/**
 * MenuContextManager for Voice Agent
 * Handles menu data transformation and slot-filling logic
 * Created: September 15, 2025
 */

import { menuService } from '@/services';
import { MenuItem } from '@rebuild/shared/types/menu.types';

// Slot definition for required fields
interface SlotDefinition {
  slot: string;
  prompt: string;
  options?: string[];
  optionsFrom?: 'dressings' | 'sides';
}

// Addon definition
interface Addon {
  name: string;
  price: number;
}

// Voice-optimized menu item
interface VoiceMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  required: SlotDefinition[];
  possibleMods: string[];
  optionalAddons?: Addon[];
  aliases: string[];
  available: boolean;
}

// Filled slot data
interface FilledSlots {
  [slot: string]: string | string[];
}

// Order item with filled slots
interface OrderItem {
  menuItem: VoiceMenuItem;
  filledSlots: FilledSlots;
  modifications: string[];
  addons: Addon[];
  quantity: number;
  specialInstructions?: string;
}

// Global menu options
const MENU_GLOBALS = {
  dressings: [
    'Vidalia Onion', 'Balsamic', 'Ranch', 'Greek',
    'Honey Mustard', 'Apple Vinaigrette', 'Poppy-Seed'
  ],
  sides: [
    'Dressing & Gravy', 'Mashed Sweet Potato',
    'Broccoli with Cheese Sauce', 'Collards',
    'Roasted Rainbow Carrots', 'Yellow Rice',
    'Black-Eyed Peas', 'Braised Cabbage',
    'Macaroni Salad', 'Apple Sauce', 'Side Salad'
  ],
  breads: ['White', 'Wheat', 'Flatbread']
};

export class MenuContextManager {
  private menuItems: Map<string, VoiceMenuItem> = new Map();
  private menuByName: Map<string, VoiceMenuItem> = new Map();
  private menuByAlias: Map<string, VoiceMenuItem> = new Map();
  private currentOrder: OrderItem[] = [];
  private lastAskedSlot: SlotDefinition | null = null;

  /**
   * Load menu from API and transform for voice
   */
  async loadMenu(restaurantId?: string): Promise<void> {
    try {
      const response = await menuService.getFullMenu();

      // Transform menu items to voice format
      response.items.forEach(item => {
        const voiceItem = this.transformToVoiceItem(item);

        // Index by ID
        this.menuItems.set(voiceItem.id, voiceItem);

        // Index by name (lowercase)
        this.menuByName.set(voiceItem.name.toLowerCase(), voiceItem);

        // Index by aliases
        voiceItem.aliases.forEach(alias => {
          this.menuByAlias.set(alias.toLowerCase(), voiceItem);
        });
      });

      console.log(`[MenuContextManager] Loaded ${this.menuItems.size} items`);
    } catch (error) {
      console.error('[MenuContextManager] Failed to load menu:', error);
      throw error;
    }
  }

  /**
   * Transform database menu item to voice format
   */
  private transformToVoiceItem(item: MenuItem): VoiceMenuItem {
    const modifiers = item.modifiers as any || {};

    return {
      id: item.id,
      name: item.name,
      category: item.category?.name || 'Other',
      price: item.price,
      description: item.description,
      required: modifiers.required || [],
      possibleMods: modifiers.optional || [],
      optionalAddons: modifiers.addons || [],
      aliases: (item as any).aliases || [item.name.toLowerCase()],
      available: item.is_available
    };
  }

  /**
   * Get menu context for voice agent
   */
  getMenuContext(): any {
    const items = Array.from(this.menuItems.values());

    return {
      menuVersion: 'fall-2025',
      globals: MENU_GLOBALS,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        available: item.available,
        aliases: item.aliases,
        required: item.required.map(r => ({
          slot: r.slot,
          prompt: r.prompt,
          options: r.optionsFrom ? MENU_GLOBALS[r.optionsFrom] : r.options
        })),
        possibleMods: item.possibleMods,
        addons: item.optionalAddons
      }))
    };
  }

  /**
   * Parse utterance and find menu item
   */
  findMenuItem(utterance: string): VoiceMenuItem | null {
    const normalized = utterance.toLowerCase();

    // Direct name match
    for (const [name, item] of this.menuByName.entries()) {
      if (normalized.includes(name)) {
        return item;
      }
    }

    // Alias match
    for (const [alias, item] of this.menuByAlias.entries()) {
      if (normalized.includes(alias)) {
        return item;
      }
    }

    return null;
  }

  /**
   * Extract slots from utterance
   */
  extractSlots(utterance: string, menuItem: VoiceMenuItem): FilledSlots {
    const filled: FilledSlots = {};
    const normalized = utterance.toLowerCase();

    // Check each required slot
    menuItem.required.forEach(slot => {
      const options = slot.optionsFrom
        ? MENU_GLOBALS[slot.optionsFrom]
        : slot.options || [];

      // Look for option matches
      for (const option of options) {
        if (normalized.includes(option.toLowerCase())) {
          filled[slot.slot] = option;
          break;
        }
      }
    });

    return filled;
  }

  /**
   * Extract modifications from utterance
   */
  extractModifications(utterance: string, menuItem: VoiceMenuItem): string[] {
    const mods: string[] = [];
    const normalized = utterance.toLowerCase();

    // Check possible modifications
    menuItem.possibleMods.forEach(mod => {
      if (normalized.includes(mod.toLowerCase()) ||
          normalized.includes(mod.replace('no ', 'without ')) ||
          normalized.includes(mod.replace('extra ', 'add '))) {
        mods.push(mod);
      }
    });

    return mods;
  }

  /**
   * Get missing required slots
   */
  getMissingSlots(menuItem: VoiceMenuItem, filled: FilledSlots): SlotDefinition[] {
    return menuItem.required.filter(slot => !filled[slot.slot]);
  }

  /**
   * Generate question for missing slot
   */
  generateSlotQuestion(slot: SlotDefinition): string {
    // Use custom prompt if provided
    if (slot.prompt) {
      return slot.prompt;
    }

    // Generate default prompt
    if (slot.optionsFrom === 'dressings') {
      return 'Which dressing?';
    }
    if (slot.optionsFrom === 'sides') {
      return 'Which side?';
    }
    if (slot.options && slot.options.length <= 3) {
      return `${slot.options.slice(0, -1).join(', ')} or ${slot.options.slice(-1)[0]}?`;
    }

    return `What ${slot.slot}?`;
  }

  /**
   * Process order utterance with slot-filling
   */
  processOrderUtterance(utterance: string): {
    action: 'confirm' | 'ask' | 'error';
    message: string;
    item?: OrderItem;
    missingSlot?: SlotDefinition;
  } {
    // Find menu item
    const menuItem = this.findMenuItem(utterance);

    if (!menuItem) {
      return {
        action: 'error',
        message: "I didn't catch that item. What would you like?"
      };
    }

    if (!menuItem.available) {
      return {
        action: 'error',
        message: `Sorry, ${menuItem.name} is unavailable.`
      };
    }

    // Extract filled slots
    const filledSlots = this.extractSlots(utterance, menuItem);

    // Extract modifications
    const modifications = this.extractModifications(utterance, menuItem);

    // Check for missing required slots
    const missingSlots = this.getMissingSlots(menuItem, filledSlots);

    if (missingSlots.length > 0) {
      // Ask for first missing slot
      const slot = missingSlots[0];
      this.lastAskedSlot = slot;

      return {
        action: 'ask',
        message: this.generateSlotQuestion(slot),
        missingSlot: slot
      };
    }

    // All slots filled - create order item
    const orderItem: OrderItem = {
      menuItem,
      filledSlots,
      modifications,
      addons: [], // TODO: Handle addons
      quantity: 1 // TODO: Extract quantity
    };

    // Generate confirmation
    const confirmMessage = this.generateConfirmation(orderItem);

    return {
      action: 'confirm',
      message: confirmMessage,
      item: orderItem
    };
  }

  /**
   * Generate implicit confirmation message
   */
  private generateConfirmation(item: OrderItem): string {
    const parts = [item.menuItem.name];

    // Add filled slots
    Object.entries(item.filledSlots).forEach(([slot, value]) => {
      if (typeof value === 'string') {
        // Don't repeat the item name
        if (!item.menuItem.name.toLowerCase().includes(value.toLowerCase())) {
          parts.push(value);
        }
      }
    });

    // Add modifications
    item.modifications.forEach(mod => {
      parts.push(mod);
    });

    // Keep under 12 words
    const confirmation = parts.slice(0, 8).join(', ');
    return `${confirmation}. Anything else?`;
  }

  /**
   * Handle slot response
   */
  handleSlotResponse(response: string): {
    action: 'confirm' | 'ask' | 'error';
    message: string;
  } {
    if (!this.lastAskedSlot) {
      return {
        action: 'error',
        message: 'What would you like to order?'
      };
    }

    // TODO: Validate response against slot options
    // TODO: Update current order item
    // TODO: Check for more missing slots

    return {
      action: 'confirm',
      message: 'Got it. Anything else?'
    };
  }

  /**
   * Get current order summary
   */
  getOrderSummary(): string {
    if (this.currentOrder.length === 0) {
      return 'No items in order.';
    }

    const items = this.currentOrder.map(item => {
      const parts = [item.menuItem.name];

      // Add key details
      if (item.filledSlots.bread) {
        parts.push(`on ${item.filledSlots.bread}`);
      }
      if (item.filledSlots.side) {
        parts.push(`with ${item.filledSlots.side}`);
      }

      return parts.join(' ');
    });

    const total = this.currentOrder.reduce((sum, item) => {
      return sum + (item.menuItem.price * item.quantity);
    }, 0);

    return `${items.join('; ')}. Total $${total.toFixed(2)}.`;
  }

  /**
   * Clear current order
   */
  clearOrder(): void {
    this.currentOrder = [];
    this.lastAskedSlot = null;
  }

  /**
   * Add item to current order
   */
  addToOrder(item: OrderItem): void {
    this.currentOrder.push(item);
  }
}

// Export singleton instance
export const menuContextManager = new MenuContextManager();