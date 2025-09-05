import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';
import NodeCache from 'node-cache';

// Types
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  available: boolean;
  preparation_time?: number;
  calories?: number;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
}

export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: string[];
  notes?: string;
}

export interface Cart {
  session_id: string;
  restaurant_id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  created_at: number;
  updated_at: number;
}

export interface MenuToolContext {
  sessionId: string;
  restaurantId: string;
}

export interface MenuToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
  { auth: { persistSession: false } }
);

// Cache for menu items (5 minutes TTL)
const menuCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// In-memory cart storage (replace with Redis in production)
const cartStorage = new Map<string, Cart>();

/**
 * Get or create cart for session
 */
function getCart(sessionId: string, restaurantId: string): Cart {
  if (!cartStorage.has(sessionId)) {
    cartStorage.set(sessionId, {
      session_id: sessionId,
      restaurant_id: restaurantId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    });
  }
  return cartStorage.get(sessionId)!;
}

/**
 * Update cart totals
 */
function updateCartTotals(cart: Cart): void {
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cart.tax = cart.subtotal * 0.08; // 8% tax rate
  cart.total = cart.subtotal + cart.tax;
  cart.updated_at = Date.now();
}

/**
 * Menu function tools configuration
 */
export const menuFunctionTools = {
  /**
   * Find menu items by query
   */
  find_menu_items: {
    description: 'Search for menu items by name, category, or dietary restrictions. Use this to verify if items exist on the menu.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for menu item name'
        },
        category: {
          type: 'string',
          description: 'Category filter (appetizers, entrees, desserts, beverages)'
        },
        max_price: {
          type: 'number',
          description: 'Maximum price filter'
        },
        dietary: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dietary restrictions (vegetarian, vegan, gluten_free)'
        },
        suggest_alternatives: {
          type: 'boolean',
          description: 'If true and no items found, suggest similar items from the menu'
        }
      }
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        // Check cache first
        const cacheKey = `menu_${context.restaurantId}_${JSON.stringify(args)}`;
        const cached = menuCache.get<MenuItem[]>(cacheKey);
        if (cached) {
          return { success: true, data: { items: cached } };
        }

        // Build query
        let query = supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', context.restaurantId)
          .eq('available', true);

        // Apply filters
        if (args.query) {
          query = query.ilike('name', `%${args.query}%`);
        }
        if (args.category) {
          query = query.eq('category', args.category);
        }
        if (args.max_price !== undefined) {
          query = query.lte('price', args.max_price);
        }
        if (args.dietary && args.dietary.length > 0) {
          for (const diet of args.dietary) {
            if (diet === 'vegetarian') query = query.eq('is_vegetarian', true);
            if (diet === 'vegan') query = query.eq('is_vegan', true);
            if (diet === 'gluten_free') query = query.eq('is_gluten_free', true);
          }
        }

        const { data, error } = await query.limit(10);

        if (error) {
          logger.error('[MenuTools] Find items error', error);
          return { success: false, error: error.message };
        }

        // Cache results
        menuCache.set(cacheKey, data);

        // If no items found, provide helpful message and maybe suggestions
        if (!data || data.length === 0) {
          const suggestions: any[] = [];
          
          // If requested, try to find alternative suggestions
          if (args.suggest_alternatives) {
            // Instead of hardcoded mappings, intelligently suggest based on:
            // 1. Popular items from the restaurant
            // 2. Items from all categories if no category specified
            // 3. Random sampling of available items
            
            // First try to get popular/featured items
            let suggestionQuery = supabase
              .from('menu_items')
              .select('*')
              .eq('restaurant_id', context.restaurantId)
              .eq('available', true);
            
            // If they specified a category, get items from that category
            if (args.category) {
              suggestionQuery = suggestionQuery.eq('category', args.category);
            }
            
            // Get up to 3 suggestions, prioritizing different categories
            const { data: suggestionData } = await suggestionQuery
              .limit(20); // Get more initially to allow for category diversity
              
            if (suggestionData && suggestionData.length > 0) {
              // Group by category and take one from each (up to 3 total)
              const byCategory: Record<string, any[]> = {};
              suggestionData.forEach((item: any) => {
                const category = item?.category || 'other';
                if (!byCategory[category]) {
                  byCategory[category] = [];
                }
                byCategory[category].push(item);
              });
              
              // Take one item from each category, up to 3 items total
              const categories = Object.keys(byCategory);
              for (let i = 0; i < Math.min(3, categories.length); i++) {
                const category = categories[i];
                if (category) {
                  const categoryItems = byCategory[category];
                  if (categoryItems && categoryItems.length > 0) {
                    // Pick a random item from this category
                    const randomIndex = Math.floor(Math.random() * categoryItems.length);
                    suggestions.push(categoryItems[randomIndex]);
                  }
                }
              }
              
              // If we have fewer than 3 suggestions and more items available, fill up
              if (suggestions.length < 3 && suggestionData.length > suggestions.length) {
                const remaining = suggestionData.filter(item => 
                  !suggestions.find(s => s.id === item.id)
                );
                suggestions.push(...remaining.slice(0, 3 - suggestions.length));
              }
            }
          }
          
          return { 
            success: true, 
            data: { 
              items: [],
              count: 0,
              not_found: true,
              searched_for: args.query || args.category || 'items',
              suggestions: suggestions.slice(0, 3) // Ensure max 3 suggestions
            },
            message: suggestions.length > 0 
              ? `We don't have ${args.query || 'that item'} on our menu, but you might enjoy these options`
              : `No items found matching "${args.query || args.category || 'your search'}"`
          };
        }

        return { 
          success: true, 
          data: { 
            items: data,
            count: data.length
          }
        };
      } catch (error) {
        logger.error('[MenuTools] Find items exception', error);
        return { success: false, error: 'Failed to search menu items' };
      }
    }
  },

  /**
   * Get detailed information about a menu item
   */
  get_item_details: {
    description: 'Get detailed information about a specific menu item',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Menu item ID'
        }
      },
      required: ['id']
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', args.id)
          .eq('restaurant_id', context.restaurantId)
          .single();

        if (error) {
          logger.error('[MenuTools] Get item details error', error);
          return { success: false, error: 'Item not found' };
        }

        return { success: true, data };
      } catch (error) {
        logger.error('[MenuTools] Get item details exception', error);
        return { success: false, error: 'Failed to get item details' };
      }
    }
  },

  /**
   * Add item to order cart
   */
  add_to_order: {
    description: 'Add a menu item to the current order',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Menu item ID'
        },
        quantity: {
          type: 'number',
          description: 'Quantity to add'
        },
        modifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Item modifiers (no onions, extra cheese, etc.)'
        },
        notes: {
          type: 'string',
          description: 'Special instructions'
        }
      },
      required: ['id', 'quantity']
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        // Get menu item details
        const { data: menuItem, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', args.id)
          .eq('restaurant_id', context.restaurantId)
          .single();

        if (error || !menuItem) {
          return { success: false, error: 'Menu item not found' };
        }

        if (!menuItem.available) {
          return { success: false, error: 'Item is not available' };
        }

        // Get or create cart
        const cart = getCart(context.sessionId, context.restaurantId);

        // Check if item already in cart
        const existingItem = cart.items.find(item => 
          item.menu_item_id === args.id && 
          JSON.stringify(item.modifiers) === JSON.stringify(args.modifiers || [])
        );

        if (existingItem) {
          // Update quantity
          existingItem.quantity += args.quantity;
        } else {
          // Add new item
          cart.items.push({
            id: `${Date.now()}_${Math.random()}`,
            menu_item_id: args.id,
            name: menuItem.name,
            quantity: args.quantity,
            price: menuItem.price,
            modifiers: args.modifiers || [],
            notes: args.notes
          });
        }

        // Update totals
        updateCartTotals(cart);

        return {
          success: true,
          data: {
            cart: {
              items: cart.items,
              subtotal: cart.subtotal.toFixed(2),
              tax: cart.tax.toFixed(2),
              total: cart.total.toFixed(2),
              item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            },
            added: {
              name: menuItem.name,
              quantity: args.quantity,
              price: menuItem.price
            }
          },
          message: `Added ${args.quantity} ${menuItem.name} to your order`
        };
      } catch (error) {
        logger.error('[MenuTools] Add to order exception', error);
        return { success: false, error: 'Failed to add item to order' };
      }
    }
  },

  /**
   * Remove item from order
   */
  remove_from_order: {
    description: 'Remove an item from the current order',
    parameters: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'Cart item ID to remove'
        }
      },
      required: ['item_id']
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const cart = getCart(context.sessionId, context.restaurantId);
        
        const itemIndex = cart.items.findIndex(item => item.id === args.item_id);
        if (itemIndex === -1) {
          return { success: false, error: 'Item not found in cart' };
        }

        const removed = cart.items.splice(itemIndex, 1)[0];
        if (!removed) {
          return { success: false, error: 'Failed to remove item from cart' };
        }
        
        updateCartTotals(cart);

        return {
          success: true,
          data: {
            cart: {
              items: cart.items,
              subtotal: cart.subtotal.toFixed(2),
              tax: cart.tax.toFixed(2),
              total: cart.total.toFixed(2),
              item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
          },
          message: `Removed ${removed.name} from your order`
        };
      } catch (error) {
        logger.error('[MenuTools] Remove from order exception', error);
        return { success: false, error: 'Failed to remove item' };
      }
    }
  },

  /**
   * Get current cart
   */
  get_current_order: {
    description: 'Get the current order/cart contents',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const cart = getCart(context.sessionId, context.restaurantId);

        if (cart.items.length === 0) {
          return {
            success: true,
            data: { cart: null },
            message: 'Your cart is empty'
          };
        }

        return {
          success: true,
          data: {
            cart: {
              items: cart.items,
              subtotal: cart.subtotal.toFixed(2),
              tax: cart.tax.toFixed(2),
              total: cart.total.toFixed(2),
              item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
          }
        };
      } catch (error) {
        logger.error('[MenuTools] Get current order exception', error);
        return { success: false, error: 'Failed to get current order' };
      }
    }
  },

  /**
   * Get store information
   */
  get_store_info: {
    description: 'Get restaurant location, hours, and contact information',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('name, phone, address, hours, pickup_eta_minutes, delivery_eta_minutes')
          .eq('id', context.restaurantId)
          .single();

        if (error) {
          logger.error('[MenuTools] Get store info error', error);
          return { success: false, error: 'Store information not found' };
        }

        // Calculate if store is open based on hours
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const dayOfWeek = now.getDay();
        
        let isOpen = true; // Default to open if hours not specified
        if (data.hours && typeof data.hours === 'object') {
          const todayHours = data.hours[dayOfWeek];
          if (todayHours && todayHours.open && todayHours.close) {
            const openTime = parseInt(todayHours.open.replace(':', ''));
            const closeTime = parseInt(todayHours.close.replace(':', ''));
            isOpen = currentTime >= openTime && currentTime <= closeTime;
          }
        }
        
        return { 
          success: true, 
          data: {
            ...data,
            current_time: now.toLocaleTimeString(),
            is_open: isOpen
          }
        };
      } catch (error) {
        logger.error('[MenuTools] Get store info exception', error);
        return { success: false, error: 'Failed to get store information' };
      }
    }
  },

  /**
   * Get today's specials
   */
  get_specials: {
    description: 'Get today\'s special offers and deals',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const { data, error } = await supabase
          .from('menu_specials')
          .select('*')
          .eq('restaurant_id', context.restaurantId)
          .eq('active', true)
          .eq('day_of_week', new Date().getDay())
          .limit(5);

        if (error) {
          logger.error('[MenuTools] Get specials error', error);
          return { success: false, error: 'Failed to get specials' };
        }

        if (!data || data.length === 0) {
          return {
            success: true,
            data: { specials: [] },
            message: 'No specials available today'
          };
        }

        return {
          success: true,
          data: {
            specials: data,
            count: data.length
          }
        };
      } catch (error) {
        logger.error('[MenuTools] Get specials exception', error);
        return { success: false, error: 'Failed to get specials' };
      }
    }
  },

  /**
   * Clear the current order
   */
  clear_order: {
    description: 'Clear all items from the current order',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async (_args: any, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const cart = getCart(context.sessionId, context.restaurantId);
        cart.items = [];
        updateCartTotals(cart);

        return {
          success: true,
          message: 'Your order has been cleared'
        };
      } catch (error) {
        logger.error('[MenuTools] Clear order exception', error);
        return { success: false, error: 'Failed to clear order' };
      }
    }
  }
};

/**
 * Clear expired carts (run periodically)
 */
export function cleanupExpiredCarts(): void {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, cart] of cartStorage.entries()) {
    if (now - cart.updated_at > maxAge) {
      cartStorage.delete(sessionId);
      logger.info('[MenuTools] Expired cart removed', { sessionId });
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCarts, 5 * 60 * 1000);