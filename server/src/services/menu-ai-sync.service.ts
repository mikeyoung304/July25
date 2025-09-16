/**
 * Menu AI Sync Service
 * Synchronizes menu data with OpenAI for voice agent
 * Created: September 15, 2025
 */

import { MenuService } from './menu.service';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { getConfig } from '../config/environment';

const config = getConfig();
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

const serviceLogger = logger.child({ service: 'MenuAISync' });

// Transform menu for AI consumption
interface AIMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  aliases: string[];
  required: any[];
  possibleMods: string[];
  addons?: any[];
}

export class MenuAISyncService {
  /**
   * Sync menu to OpenAI Assistant or Vector Store
   */
  static async syncToAI(restaurantId: string): Promise<void> {
    try {
      serviceLogger.info('Starting menu sync to AI', { restaurantId });

      // 1. Get full menu from database
      const menu = await MenuService.getFullMenu(restaurantId);

      // 2. Transform to AI format
      const aiMenu = this.transformForAI(menu);

      // 3. Create or update assistant with menu knowledge
      await this.updateAssistant(restaurantId, aiMenu);

      // 4. Optionally: Store in vector database for retrieval
      // await this.updateVectorStore(restaurantId, aiMenu);

      serviceLogger.info('Menu sync completed', {
        restaurantId,
        itemCount: aiMenu.items.length,
        categoryCount: aiMenu.categories.length
      });
    } catch (error) {
      serviceLogger.error('Menu sync failed', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Transform menu data for AI consumption
   */
  private static transformForAI(menu: any): any {
    const globals = {
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
      ]
    };

    const items: AIMenuItem[] = menu.items.map((item: any) => {
      const modifiers = item.modifiers || {};

      return {
        id: item.id,
        name: item.name,
        category: menu.categories.find((c: any) => c.id === item.categoryId)?.name || 'Other',
        price: item.price,
        available: item.available,
        aliases: item.aliases || [],
        required: modifiers.required || [],
        possibleMods: modifiers.optional || [],
        addons: modifiers.addons || []
      };
    });

    return {
      restaurantId: menu.restaurantId,
      menuVersion: 'fall-2025',
      lastUpdated: new Date().toISOString(),
      globals,
      categories: menu.categories,
      items
    };
  }

  /**
   * Update OpenAI Assistant with menu data
   */
  private static async updateAssistant(restaurantId: string, aiMenu: any): Promise<void> {
    try {
      // Check if assistant exists for this restaurant
      const assistantId = await this.getOrCreateAssistant(restaurantId);

      // Update assistant instructions with menu data
      const instructions = this.generateAssistantInstructions(aiMenu);

      await openai.beta.assistants.update(assistantId, {
        instructions,
        metadata: {
          restaurantId,
          menuVersion: aiMenu.menuVersion,
          lastUpdated: aiMenu.lastUpdated
        }
      });

      serviceLogger.info('Assistant updated with menu', { assistantId, restaurantId });
    } catch (error) {
      serviceLogger.error('Failed to update assistant', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Get or create assistant for restaurant
   */
  private static async getOrCreateAssistant(restaurantId: string): Promise<string> {
    try {
      // List existing assistants
      const assistants = await openai.beta.assistants.list({
        limit: 100
      });

      // Find assistant for this restaurant
      const existing = assistants.data.find(
        a => a.metadata?.restaurantId === restaurantId
      );

      if (existing) {
        return existing.id;
      }

      // Create new assistant
      const assistant = await openai.beta.assistants.create({
        name: `Grow Fresh Order Assistant - ${restaurantId}`,
        model: 'gpt-4o',
        instructions: 'You are an order-taking assistant for Grow Fresh restaurant.',
        metadata: {
          restaurantId,
          type: 'restaurant-ordering'
        }
      });

      serviceLogger.info('Created new assistant', { assistantId: assistant.id, restaurantId });
      return assistant.id;
    } catch (error) {
      serviceLogger.error('Failed to get/create assistant', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Generate assistant instructions with menu
   */
  private static generateAssistantInstructions(aiMenu: any): string {
    return `You are a fast, courteous ordering agent for Grow Fresh restaurant.

## CURRENT MENU (${aiMenu.menuVersion})
${JSON.stringify(aiMenu, null, 2)}

## CORE BEHAVIOR
- Parse the whole utterance first; fill all known slots
- Only ask for REQUIRED fields marked in menu items
- Use implicit confirmations: "Got it: Fall Salad, ranch, feta"
- Keep ALL responses under 12 words
- Support interruptions (barge-in friendly)
- Explicit confirm only at checkout with total

## SLOT-FILLING RULES
1. When item has required slots missing, ask ONE pointed question
2. Combine related slots: "Which bread and side?" not separate
3. Never ask about optional modifications (only record if mentioned)
4. Use progressive disclosure: show max 3 options when listing

## AVAILABLE ITEMS
${aiMenu.items.map((item: AIMenuItem) => `- ${item.name}: $${item.price} (${item.category})`).join('\n')}

## GLOBAL OPTIONS
Dressings: ${aiMenu.globals.dressings.join(', ')}
Sides: ${aiMenu.globals.sides.join(', ')}

Remember: Only items marked as available=true can be ordered.`;
  }

  /**
   * Get menu context for real-time session
   */
  static async getMenuContext(restaurantId: string): Promise<any> {
    try {
      const menu = await MenuService.getFullMenu(restaurantId);
      return this.transformForAI(menu);
    } catch (error) {
      serviceLogger.error('Failed to get menu context', { error, restaurantId });
      throw error;
    }
  }
}

export default MenuAISyncService;