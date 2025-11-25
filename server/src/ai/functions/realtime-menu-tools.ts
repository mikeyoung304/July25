import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';
import NodeCache from 'node-cache';
import { DEFAULT_TAX_RATE, TAX_RATE_SOURCE } from '@rebuild/shared/constants/business';
import { Mutex } from 'async-mutex';

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

export interface CartModifier {
  name: string;
  price: number; // Price adjustment (can be negative)
}

export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: CartModifier[];
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

export interface MenuToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Function argument types
export interface FindMenuItemsArgs {
  query?: string;
  category?: string;
  max_price?: number;
  dietary?: string[];
  suggest_alternatives?: boolean;
}

export interface GetItemDetailsArgs {
  id: string;
}

export interface AddToOrderArgs {
  id: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface RemoveFromOrderArgs {
  item_id: string;
}

export interface GetCurrentOrderArgs {
  // No arguments needed
}

export interface GetStoreInfoArgs {
  // No arguments needed
}

export interface GetSpecialsArgs {
  // No arguments needed
}

export interface ClearOrderArgs {
  // No arguments needed
}

// Database row types
export interface VoiceModifierRule {
  target_name: string;
  price_adjustment: number;
  trigger_phrases: string[];
  applicable_menu_item_ids: string[] | null;
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
  { auth: { persistSession: false } }
);

// Cache for menu items (5 minutes TTL)
const menuCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Cache for restaurant data including tax rates (5 minutes TTL)
const restaurantCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Cache for modifier pricing rules (5 minutes TTL)
const modifierCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// In-memory cart storage (replace with Redis in production)
const cartStorage = new Map<string, Cart>();

// Session-level cart locks to prevent concurrent modifications
const cartLocks = new Map<string, Mutex>();

/**
 * Execute a cart operation with exclusive lock for the session
 * Prevents race conditions from concurrent AI function calls
 */
async function withCartLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  if (!cartLocks.has(sessionId)) {
    cartLocks.set(sessionId, new Mutex());
  }
  const mutex = cartLocks.get(sessionId)!;
  return await mutex.runExclusive(fn);
}

/**
 * Get restaurant tax rate from database (with caching)
 */
async function getRestaurantTaxRate(restaurantId: string): Promise<number> {
  const cacheKey = `tax_rate_${restaurantId}`;
  const cached = restaurantCache.get<number>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('tax_rate')
      .eq('id', restaurantId)
      .single();

    if (error || !data) {
      logger.warn('[MenuTools] Failed to fetch tax rate, using shared constant', {
        restaurantId,
        error,
        fallback: DEFAULT_TAX_RATE,
        source: TAX_RATE_SOURCE.FALLBACK
      });
      return DEFAULT_TAX_RATE;
    }

    const taxRate = data.tax_rate ?? DEFAULT_TAX_RATE;
    restaurantCache.set(cacheKey, taxRate);
    return taxRate;
  } catch (error) {
    logger.error('[MenuTools] Exception fetching tax rate', { restaurantId, error });
    logger.warn('[MenuTools] Using fallback tax rate', {
      fallback: DEFAULT_TAX_RATE,
      source: TAX_RATE_SOURCE.FALLBACK
    });
    return DEFAULT_TAX_RATE;
  }
}

/**
 * Validate and sanitize a modifier name from voice input
 * @param modifierName - Raw modifier name from voice/AI input
 * @returns Sanitized modifier name or null if invalid
 */
function validateModifierName(modifierName: unknown): string | null {
  // Check if modifier name exists and is a string
  if (!modifierName || typeof modifierName !== 'string') {
    return null;
  }

  // Trim and normalize
  const trimmed = modifierName.trim();

  // Length validation: min 1, max 100 characters (prevent DoS)
  if (trimmed.length === 0 || trimmed.length > 100) {
    logger.warn('[MenuTools] Modifier name length invalid', {
      length: trimmed.length,
      rejected: trimmed.substring(0, 50)
    });
    return null;
  }

  // Character whitelist: alphanumeric, spaces, hyphens, apostrophes, commas
  // Allow common food modifiers like "no onions", "extra cheese", "well-done", etc.
  const validPattern = /^[a-zA-Z0-9\s\-',]+$/;
  if (!validPattern.test(trimmed)) {
    logger.warn('[MenuTools] Modifier name contains invalid characters', {
      rejected: trimmed.substring(0, 50)
    });
    return null;
  }

  return trimmed;
}

/**
 * Look up modifier prices from voice_modifier_rules table
 * @param restaurantId - Restaurant ID for tenant isolation
 * @param modifierNames - Array of modifier names from AI (e.g., ["extra cheese", "no onions"])
 * @param menuItemId - Optional menu item ID to filter applicable rules
 * @returns Array of CartModifier objects with prices
 */
async function lookupModifierPrices(
  restaurantId: string,
  modifierNames: string[],
  menuItemId?: string
): Promise<CartModifier[]> {
  if (!modifierNames || modifierNames.length === 0) {
    return [];
  }

  // Validate array bounds: max 20 modifiers per item (prevent DoS)
  if (modifierNames.length > 20) {
    logger.warn('[MenuTools] Too many modifiers requested', {
      count: modifierNames.length,
      restaurantId
    });
    // Truncate to first 20
    modifierNames = modifierNames.slice(0, 20);
  }

  // Validate and sanitize each modifier name
  const validatedModifiers = modifierNames
    .map(name => validateModifierName(name))
    .filter((name): name is string => name !== null);

  if (validatedModifiers.length === 0) {
    logger.warn('[MenuTools] No valid modifiers after validation', {
      originalCount: modifierNames.length,
      restaurantId
    });
    return [];
  }

  try {
    // Check cache first
    const cacheKey = `modifiers_${restaurantId}`;
    let rules = modifierCache.get<any[]>(cacheKey);

    if (!rules) {
      // Cache miss - query voice_modifier_rules for matching trigger phrases
      // Note: Supabase uses parameterized queries, preventing SQL injection
      const { data, error } = await supabase
        .from('voice_modifier_rules')
        .select('target_name, price_adjustment, trigger_phrases, applicable_menu_item_ids')
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      if (error || !data) {
        logger.warn('[MenuTools] Failed to fetch modifier rules', { restaurantId, error });
        // Fallback: return modifiers with zero price
        return validatedModifiers.map(name => ({ name, price: 0 }));
      }

      rules = data;
      // Cache the modifier rules for 5 minutes
      modifierCache.set(cacheKey, rules);
    }

    // Match modifier names against trigger phrases
    const modifiersWithPrices: CartModifier[] = validatedModifiers.map(modName => {
      const normalizedModName = modName.toLowerCase().trim();

      // Find a rule where any trigger phrase matches the modifier name
      const matchingRule = rules?.find(rule => {
        // Check if rule applies to this menu item
        if (menuItemId && rule.applicable_menu_item_ids && rule.applicable_menu_item_ids.length > 0) {
          if (!rule.applicable_menu_item_ids.includes(menuItemId)) {
            return false;
          }
        }

        // Check trigger phrases for a match
        return rule.trigger_phrases.some((phrase: string) =>
          phrase.toLowerCase().includes(normalizedModName) ||
          normalizedModName.includes(phrase.toLowerCase())
        );
      });

      if (matchingRule) {
        // price_adjustment is in cents, convert to dollars
        return {
          name: modName,
          price: (matchingRule.price_adjustment || 0) / 100
        };
      }

      // No matching rule found - modifier has no price impact
      return { name: modName, price: 0 };
    });

    return modifiersWithPrices;
  } catch (error) {
    logger.error('[MenuTools] Exception looking up modifier prices', { restaurantId, error });
    // Fallback: return modifiers with zero price
    return validatedModifiers.map(name => ({ name, price: 0 }));
  }
}

/**
 * Get cart from Supabase (with write-through cache)
 */
async function getCart(sessionId: string, restaurantId: string): Promise<Cart> {
  // Check cache first
  if (cartStorage.has(sessionId)) {
    return cartStorage.get(sessionId)!;
  }

  try {
    // Query Supabase for existing cart
    const { data, error } = await supabase
      .from('voice_order_carts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!error && data) {
      // Convert from database format to Cart interface
      const cart: Cart = {
        session_id: data.session_id,
        restaurant_id: data.restaurant_id,
        items: data.items as CartItem[],
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax),
        total: parseFloat(data.total),
        created_at: new Date(data.created_at).getTime(),
        updated_at: new Date(data.updated_at).getTime()
      };

      // Cache it
      cartStorage.set(sessionId, cart);
      return cart;
    }

    // No cart found or expired - create new one
    const newCart: Cart = {
      session_id: sessionId,
      restaurant_id: restaurantId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Cache it (will be persisted on first modification)
    cartStorage.set(sessionId, newCart);
    return newCart;
  } catch (error) {
    logger.error('[MenuTools] Failed to get cart from Supabase', {
      sessionId,
      restaurantId,
      error
    });

    // Fallback to in-memory only
    const fallbackCart: Cart = {
      session_id: sessionId,
      restaurant_id: restaurantId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    cartStorage.set(sessionId, fallbackCart);
    return fallbackCart;
  }
}

/**
 * Save cart to Supabase (write-through)
 */
async function saveCart(cart: Cart): Promise<void> {
  try {
    const { error } = await supabase
      .from('voice_order_carts')
      .upsert({
        session_id: cart.session_id,
        restaurant_id: cart.restaurant_id,
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        updated_at: new Date(cart.updated_at).toISOString()
      }, {
        onConflict: 'session_id,restaurant_id'
      });

    if (error) {
      logger.error('[MenuTools] Failed to save cart to Supabase', {
        sessionId: cart.session_id,
        restaurantId: cart.restaurant_id,
        error
      });
      // Don't throw - continue with in-memory cache
    }

    // Update cache
    cartStorage.set(cart.session_id, cart);
  } catch (error) {
    logger.error('[MenuTools] Exception saving cart', {
      sessionId: cart.session_id,
      restaurantId: cart.restaurant_id,
      error
    });
    // Continue with in-memory cache only
  }
}

/**
 * Update cart totals
 * @param cart - Cart to update
 * @param taxRate - Tax rate as decimal (e.g., 0.0825 for 8.25%)
 *
 * ADR-013: Using shared DEFAULT_TAX_RATE constant
 */
function updateCartTotals(cart: Cart, taxRate: number = DEFAULT_TAX_RATE): void {
  // Calculate subtotal including modifier prices
  cart.subtotal = cart.items.reduce((sum, item) => {
    const basePrice = item.price * item.quantity;
    const modifierPrice = (item.modifiers || []).reduce(
      (modSum, mod) => modSum + mod.price,
      0
    ) * item.quantity;
    return sum + basePrice + modifierPrice;
  }, 0);

  cart.tax = cart.subtotal * taxRate;
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
    handler: async (_args: FindMenuItemsArgs, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        // Check cache first
        const cacheKey = `menu_${context.restaurantId}_${JSON.stringify(_args)}`;
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
        if (_args.query) {
          query = query.ilike('name', `%${_args.query}%`);
        }
        if (_args.category) {
          query = query.eq('category', _args.category);
        }
        if (_args.max_price !== undefined) {
          query = query.lte('price', _args.max_price);
        }
        if (_args.dietary && _args.dietary.length > 0) {
          for (const diet of _args.dietary) {
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
          const suggestions: MenuItem[] = [];
          
          // If requested, try to find alternative suggestions
          if (_args.suggest_alternatives) {
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
            if (_args.category) {
              suggestionQuery = suggestionQuery.eq('category', _args.category);
            }
            
            // Get up to 3 suggestions, prioritizing different categories
            const { data: suggestionData } = await suggestionQuery
              .limit(20); // Get more initially to allow for category diversity
              
            if (suggestionData && suggestionData.length > 0) {
              // Group by category and take one from each (up to 3 total)
              const byCategory: Record<string, MenuItem[]> = {};
              suggestionData.forEach((item: MenuItem) => {
                const category = item?.category || 'other';
                if (!byCategory[category]) {
                  byCategory[category] = [];
                }
                byCategory[category]!.push(item);
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
                    const selectedItem = categoryItems[randomIndex];
                    if (selectedItem) {
                      suggestions.push(selectedItem);
                    }
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
              searched_for: _args.query || _args.category || 'items',
              suggestions: suggestions.slice(0, 3) // Ensure max 3 suggestions
            },
            message: suggestions.length > 0 
              ? `We don't have ${_args.query || 'that item'} on our menu, but you might enjoy these options`
              : `No items found matching "${_args.query || _args.category || 'your search'}"`
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
    handler: async (_args: GetItemDetailsArgs, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', _args.id)
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
    handler: async (_args: AddToOrderArgs, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        // Get menu item details
        const { data: menuItem, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', _args.id)
          .eq('restaurant_id', context.restaurantId)
          .single();

        if (error || !menuItem) {
          return { success: false, error: 'Menu item not found' };
        }

        if (!menuItem.available) {
          return { success: false, error: 'Item is not available' };
        }

        // Execute cart modifications with session-level mutex lock
        return await withCartLock(context.sessionId, async () => {
          // Get or create cart
          const cart = await getCart(context.sessionId, context.restaurantId);

          // Look up modifier prices from database
          const modifiersWithPrices = await lookupModifierPrices(
            context.restaurantId,
            _args.modifiers || [],
            _args.id
          );

          // Check if item already in cart (compare by menu_item_id and modifier names)
          const existingItem = cart.items.find(item =>
            item.menu_item_id === _args.id &&
            JSON.stringify(item.modifiers?.map(m => m.name)) === JSON.stringify(_args.modifiers || [])
          );

          if (existingItem) {
            // Update quantity
            existingItem.quantity += _args.quantity;
          } else {
            // Add new item with modifier prices
            const newItem: CartItem = {
              id: `${Date.now()}_${Math.random()}`,
              menu_item_id: _args.id,
              name: menuItem.name,
              quantity: _args.quantity,
              price: menuItem.price,
              modifiers: modifiersWithPrices
            };

            // Only add notes if provided
            if (_args.notes) {
              newItem.notes = _args.notes;
            }

            cart.items.push(newItem);
          }

          // Fetch restaurant tax rate and update totals
          const taxRate = await getRestaurantTaxRate(context.restaurantId);
          updateCartTotals(cart, taxRate);

          // Save cart to Supabase
          await saveCart(cart);

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
                quantity: _args.quantity,
                price: menuItem.price
              }
            },
            message: `Added ${_args.quantity} ${menuItem.name} to your order`
          };
        });
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
    handler: async (_args: RemoveFromOrderArgs, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        // Execute cart modifications with session-level mutex lock
        return await withCartLock(context.sessionId, async () => {
          const cart = await getCart(context.sessionId, context.restaurantId);

          const itemIndex = cart.items.findIndex(item => item.id === _args.item_id);
          if (itemIndex === -1) {
            return { success: false, error: 'Item not found in cart' };
          }

          const removed = cart.items.splice(itemIndex, 1)[0];
          if (!removed) {
            return { success: false, error: 'Failed to remove item from cart' };
          }

          // Fetch restaurant tax rate and update totals
          const taxRate = await getRestaurantTaxRate(context.restaurantId);
          updateCartTotals(cart, taxRate);

          // Save cart to Supabase
          await saveCart(cart);

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
        });
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
    handler: async (_args: GetCurrentOrderArgs, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        const cart = await getCart(context.sessionId, context.restaurantId);

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
    handler: async (_args: GetStoreInfoArgs, context: MenuToolContext): Promise<MenuToolResult> => {
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
    handler: async (_args: GetSpecialsArgs, context: MenuToolContext): Promise<MenuToolResult> => {
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
    handler: async (_args: ClearOrderArgs, context: MenuToolContext): Promise<MenuToolResult> => {
      try {
        // Execute cart modifications with session-level mutex lock
        return await withCartLock(context.sessionId, async () => {
          const cart = await getCart(context.sessionId, context.restaurantId);
          cart.items = [];
          // Fetch restaurant tax rate and update totals (will be 0 since cart is empty)
          const taxRate = await getRestaurantTaxRate(context.restaurantId);
          updateCartTotals(cart, taxRate);

          // Save cart to Supabase
          await saveCart(cart);

          return {
            success: true,
            message: 'Your order has been cleared'
          };
        });
      } catch (error) {
        logger.error('[MenuTools] Clear order exception', error);
        return { success: false, error: 'Failed to clear order' };
      }
    }
  }
};

/**
 * Clear expired carts from both cache and Supabase
 * Also cleans up associated mutex locks
 */
export async function cleanupExpiredCarts(): Promise<void> {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  // Clean up in-memory cache
  for (const [sessionId, cart] of cartStorage.entries()) {
    if (now - cart.updated_at > maxAge) {
      cartStorage.delete(sessionId);
      cartLocks.delete(sessionId);
      logger.info('[MenuTools] Expired cart and lock removed from cache', { sessionId });
    }
  }

  // Clean up Supabase using the cleanup function
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_voice_carts');

    if (error) {
      logger.error('[MenuTools] Failed to cleanup expired carts in Supabase', { error });
    } else {
      logger.info('[MenuTools] Cleaned up expired carts from Supabase', { deletedCount: data });
    }
  } catch (error) {
    logger.error('[MenuTools] Exception during Supabase cart cleanup', { error });
  }
}

// Run cleanup every 5 minutes
setInterval(() => {
  cleanupExpiredCarts().catch(error => {
    logger.error('[MenuTools] Cleanup interval error', { error });
  });
}, 5 * 60 * 1000);