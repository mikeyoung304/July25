import NodeCache from 'node-cache';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { getConfig } from '../config/environment';
import { menuIdMapper } from './menu-id-mapper';
import { mapMenuItem, mapMenuItems, mapMenuCategories } from '../mappers/menu.mapper';

const config = getConfig();
const menuCache = new NodeCache({ stdTTL: config.cache.ttlSeconds });

const CACHE_KEYS = {
  FULL_MENU: 'menu:full:',
  CATEGORIES: 'categories:',
  ITEMS: 'items:',
  ITEM: 'item:',
};

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  available: boolean;
  dietaryFlags: string[];
  modifiers: Array<{
    id?: string;
    name: string;
    price: number;
    group?: string;
  }>;
  aliases: string[];
  prepTimeMinutes: number;
  imageUrl?: string;
}

export interface MenuResponse {
  categories: MenuCategory[];
  items: MenuItem[];
}

export class MenuService {
  private static logger = logger.child({ service: 'MenuService' });

  /**
   * Get full menu with categories and items
   */
  static async getFullMenu(restaurantId: string): Promise<MenuResponse> {
    const cacheKey = `${CACHE_KEYS.FULL_MENU}${restaurantId}`;
    const cached = menuCache.get<MenuResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Menu cache hit', { restaurantId });
      return cached;
    }

    try {
      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .order('display_order');

      if (catError) throw catError;

      // Fetch items
      const { data: items, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .order('name');

      if (itemError) throw itemError;

      // Map items to camelCase and convert to external IDs
      const mappedItems = mapMenuItems(items || []);
      const itemsWithExternalIds = await menuIdMapper.convertToExternalIds(mappedItems);

      const response: MenuResponse = {
        categories: mapMenuCategories(categories || []),
        items: itemsWithExternalIds,
      };

      menuCache.set(cacheKey, response);
      this.logger.info('Menu cached', { restaurantId, categories: response.categories.length, items: response.items.length });

      return response;
    } catch (error) {
      this.logger.error('Failed to fetch menu', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Get all menu items
   */
  static async getItems(restaurantId: string): Promise<MenuItem[]> {
    const cacheKey = `${CACHE_KEYS.ITEMS}${restaurantId}`;
    const cached = menuCache.get<MenuItem[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const items = mapMenuItems(data || []);
      const itemsWithExternalIds = await menuIdMapper.convertToExternalIds(items);
      menuCache.set(cacheKey, itemsWithExternalIds);

      return itemsWithExternalIds;
    } catch (error) {
      this.logger.error('Failed to fetch items', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Get single menu item
   */
  static async getItem(restaurantId: string, itemId: string): Promise<MenuItem | null> {
    const cacheKey = `${CACHE_KEYS.ITEM}${restaurantId}:${itemId}`;
    const cached = menuCache.get<MenuItem>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('id', itemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      const item = mapMenuItem(data);
      const itemWithExternalId = await menuIdMapper.convertToExternalIds([item]);
      menuCache.set(cacheKey, itemWithExternalId[0]);

      return item;
    } catch (error) {
      this.logger.error('Failed to fetch item', { error, restaurantId, itemId });
      throw error;
    }
  }

  /**
   * Get menu categories
   */
  static async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    const cacheKey = `${CACHE_KEYS.CATEGORIES}${restaurantId}`;
    const cached = menuCache.get<MenuCategory[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .order('display_order');

      if (error) throw error;

      const categories = mapMenuCategories(data || []);
      menuCache.set(cacheKey, categories);

      return categories;
    } catch (error) {
      this.logger.error('Failed to fetch categories', { error, restaurantId });
      throw error;
    }
  }

  /**
   * Update a menu item (e.g., toggle availability)
   */
  static async updateItem(
    restaurantId: string,
    itemId: string,
    updates: { is_available: boolean }
  ): Promise<MenuItem | null> {
    try {
      // CRITICAL: Always filter by restaurant_id for multi-tenant isolation
      // Note: DB column is 'available', API uses 'is_available' (snake_case convention)
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          available: updates.is_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      // Clear cache after update to ensure fresh data (O(1) targeted deletion)
      this.clearCache(restaurantId, itemId);

      this.logger.info('Menu item updated', {
        restaurantId,
        itemId,
        updates
      });

      return mapMenuItem(data);
    } catch (error) {
      this.logger.error('Failed to update menu item', { error, restaurantId, itemId });
      throw error;
    }
  }

  /**
   * Clear menu cache (after updates)
   * Uses targeted O(1) deletion instead of iterating all keys
   */
  static clearCache(restaurantId: string, itemId?: string): void {
    const keysDeleted: string[] = [];

    // Always clear aggregated caches for the restaurant
    const fullMenuKey = `${CACHE_KEYS.FULL_MENU}${restaurantId}`;
    const itemsKey = `${CACHE_KEYS.ITEMS}${restaurantId}`;

    if (menuCache.del(fullMenuKey)) keysDeleted.push(fullMenuKey);
    if (menuCache.del(itemsKey)) keysDeleted.push(itemsKey);

    // Clear specific item cache if provided
    if (itemId) {
      const itemKey = `${CACHE_KEYS.ITEM}${restaurantId}:${itemId}`;
      if (menuCache.del(itemKey)) keysDeleted.push(itemKey);
    }

    // Note: Categories cache is NOT cleared on item update
    // as item updates don't affect category data

    this.logger.info('Cleared menu cache', {
      restaurantId,
      itemId,
      keysDeleted: keysDeleted.length
    });
  }

  /**
   * Clear all menu cache (for administrative use)
   */
  static clearAllCache(): void {
    menuCache.flushAll();
    this.logger.info('Cleared all menu cache');
  }

  /**
   * Sync menu to AI service
   */
  static async syncToAI(restaurantId: string): Promise<void> {
    try {
      await this.getFullMenu(restaurantId);
      
      // AI service sync implementation pending

      this.logger.info('Menu synced to AI service', { restaurantId });
    } catch (error) {
      this.logger.error('Failed to sync menu to AI service', { error, restaurantId });
      throw error;
    }
  }

}