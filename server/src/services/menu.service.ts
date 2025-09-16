import NodeCache from 'node-cache';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { getConfig } from '../config/environment';
import { menuIdMapper } from './menu-id-mapper';
import { mapMenuItem, mapMenuCategory, mapMenuItems, mapMenuCategories } from '../mappers/menu.mapper';

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
   * Clear menu cache (after updates)
   */
  static clearCache(restaurantId?: string): void {
    if (restaurantId) {
      // Clear specific restaurant cache
      const keys = menuCache.keys();
      keys.forEach(key => {
        if (key.includes(restaurantId)) {
          menuCache.del(key);
        }
      });
      this.logger.info('Cleared menu cache', { restaurantId });
    } else {
      // Clear all cache
      menuCache.flushAll();
      this.logger.info('Cleared all menu cache');
    }
  }

  /**
   * Sync menu to AI service
   */
  static async syncToAI(restaurantId: string): Promise<void> {
    try {
      // Import dynamically to avoid circular dependency
      const { MenuAISyncService } = await import('./menu-ai-sync.service');

      // Delegate to AI sync service
      await MenuAISyncService.syncToAI(restaurantId);

      this.logger.info('Menu synced to AI service', { restaurantId });
    } catch (error) {
      this.logger.error('Failed to sync menu to AI service', { error, restaurantId });
      throw error;
    }
  }

}