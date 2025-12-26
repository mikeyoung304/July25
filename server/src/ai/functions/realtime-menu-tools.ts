/**
 * Realtime Menu Tools
 *
 * Tool definitions for the AI-powered voice ordering system.
 * Handles menu search, item details, and order management.
 *
 * This module re-exports types, validators, and services for backwards compatibility.
 * New code should import from the specific modules directly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';
import NodeCache from 'node-cache';

// Re-export all types for backwards compatibility
export type {
  MenuItem,
  CartModifier,
  CartItem,
  Cart,
  MenuToolContext,
  MenuToolResult,
  FindMenuItemsArgs,
  GetItemDetailsArgs,
  AddToOrderArgs,
  RemoveFromOrderArgs,
  GetCurrentOrderArgs,
  GetStoreInfoArgs,
  GetSpecialsArgs,
  ClearOrderArgs,
  VoiceModifierRule
} from '../types/menu-tools.types';

// Re-export validators for backwards compatibility
export {
  validateModifierName,
  validatePriceAdjustment,
  MAX_PRICE_ADJUSTMENT,
  MIN_PRICE_ADJUSTMENT
} from '../validators/menu-input.validator';

// Re-export cart service functions for backwards compatibility
export {
  withCartLock,
  getRestaurantTaxRate,
  getCart,
  saveCart,
  updateCartTotals,
  cleanupExpiredCarts,
  startCartCleanup,
  stopCartCleanup
} from '../services/cart.service';

// Re-export modifier pricing service for backwards compatibility
export { lookupModifierPrices } from '../services/modifier-pricing.service';

// Import types for use in this file
import type {
  MenuItem,
  CartItem,
  MenuToolContext,
  MenuToolResult,
  FindMenuItemsArgs,
  GetItemDetailsArgs,
  AddToOrderArgs,
  RemoveFromOrderArgs,
  GetCurrentOrderArgs,
  GetStoreInfoArgs,
  GetSpecialsArgs,
  ClearOrderArgs
} from '../types/menu-tools.types';

// Import services for use in tool handlers
import {
  withCartLock,
  getRestaurantTaxRate,
  getCart,
  saveCart,
  updateCartTotals
} from '../services/cart.service';

import { lookupModifierPrices } from '../services/modifier-pricing.service';

// Import menu embedding service for semantic search
import { MenuEmbeddingService } from '../../services/menu-embedding.service';

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
  { auth: { persistSession: false } }
);

// Cache for menu items (5 minutes TTL)
const menuCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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

        // Try semantic search first if we have a text query and embeddings are available
        if (_args.query && !_args.category && !_args.dietary?.length && _args.max_price === undefined) {
          const hasEmbeddings = await MenuEmbeddingService.hasEmbeddings(context.restaurantId);

          if (hasEmbeddings) {
            logger.debug('[MenuTools] Using semantic search for query', { query: _args.query });

            const similarItems = await MenuEmbeddingService.findSimilarItems(
              _args.query,
              context.restaurantId,
              { limit: 10, threshold: 0.4 }
            );

            if (similarItems.length > 0) {
              // Fetch full item details for the matches
              const { data: items, error } = await supabase
                .from('menu_items')
                .select('*')
                .in('id', similarItems.map(item => item.id))
                .eq('restaurant_id', context.restaurantId)
                .eq('available', true);

              if (!error && items && items.length > 0) {
                // Sort by similarity score
                const sortedItems = items.sort((a, b) => {
                  const aScore = similarItems.find(s => s.id === a.id)?.similarity || 0;
                  const bScore = similarItems.find(s => s.id === b.id)?.similarity || 0;
                  return bScore - aScore;
                });

                menuCache.set(cacheKey, sortedItems);
                logger.info('[MenuTools] Semantic search returned results', {
                  query: _args.query,
                  count: sortedItems.length
                });

                return { success: true, data: { items: sortedItems, search_method: 'semantic' } };
              }
            }
          }
        }

        // Fall back to traditional text search
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
        // INPUT VALIDATION
        // Clamp quantity to 1-100 range (agent can follow up for large orders before payment)
        const quantity = Math.max(1, Math.min(100, Math.floor(_args.quantity || 1)));
        // Truncate notes to 1000 characters max (silent truncation per business decision)
        const notes = (_args.notes || '').trim().slice(0, 1000) || undefined;

        // Log if quantity was clamped for debugging
        if (_args.quantity !== quantity) {
          logger.info('[MenuTools] Quantity clamped', {
            original: _args.quantity,
            clamped: quantity
          });
        }

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
            // Update quantity (use validated quantity)
            existingItem.quantity += quantity;
          } else {
            // Add new item with modifier prices
            const newItem: CartItem = {
              id: `${Date.now()}_${Math.random()}`,
              menu_item_id: _args.id,
              name: menuItem.name,
              quantity: quantity, // Use validated quantity
              price: menuItem.price,
              modifiers: modifiersWithPrices
            };

            // Only add notes if provided (use validated notes)
            if (notes) {
              newItem.notes = notes;
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
                quantity: quantity, // Use validated quantity
                price: menuItem.price
              }
            },
            message: `Added ${quantity} ${menuItem.name} to your order`
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
