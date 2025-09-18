import NodeCache from 'node-cache';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { getConfig } from '../config/environment';
import { Restaurant, RestaurantSettings, VoiceSettings } from '@rebuild/shared/types';

const config = getConfig();
const restaurantCache = new NodeCache({ stdTTL: config.cache.ttlSeconds });

const CACHE_KEYS = {
  RESTAURANT: 'restaurant:',
  SETTINGS: 'restaurant:settings:',
  VOICE_SETTINGS: 'restaurant:voice_settings:',
};

const serviceLogger = logger.child({ service: 'restaurant' });

export class RestaurantService {
  /**
   * Get restaurant by ID with caching
   */
  static async getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    const cacheKey = `${CACHE_KEYS.RESTAURANT}${restaurantId}`;

    // Check cache first
    const cached = restaurantCache.get<Restaurant>(cacheKey);
    if (cached) {
      serviceLogger.debug('Restaurant cache hit', { restaurantId });
      return cached;
    }

    try {
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          settings
        `)
        .eq('id', restaurantId)
        .single();

      if (error || !restaurant) {
        serviceLogger.warn('Restaurant not found', { restaurantId, error: error?.message });
        return null;
      }

      // Cache the result
      restaurantCache.set(cacheKey, restaurant);
      serviceLogger.debug('Restaurant cached', { restaurantId });

      return restaurant;
    } catch (error) {
      serviceLogger.error('Error fetching restaurant', {
        restaurantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get restaurant by name (case-insensitive)
   */
  static async getRestaurantByName(name: string): Promise<Restaurant | null> {
    const cacheKey = `${CACHE_KEYS.RESTAURANT}name:${name.toLowerCase()}`;

    // Check cache first
    const cached = restaurantCache.get<Restaurant>(cacheKey);
    if (cached) {
      serviceLogger.debug('Restaurant name cache hit', { name });
      return cached;
    }

    serviceLogger.info('Attempting to fetch restaurant by name', { name });

    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          settings
        `)
        .ilike('name', name);

      serviceLogger.info('Supabase query result', {
        name,
        error: error?.message,
        count: restaurants?.length,
        data: restaurants
      });

      if (error || !restaurants || restaurants.length === 0) {
        serviceLogger.debug('Restaurant not found by name', { name, error: error?.message });
        return null;
      }

      const restaurant = restaurants[0];

      // Cache the result by both name and ID
      restaurantCache.set(cacheKey, restaurant);
      restaurantCache.set(`${CACHE_KEYS.RESTAURANT}${restaurant.id}`, restaurant);
      serviceLogger.debug('Restaurant cached by name', { name, id: restaurant.id });

      return restaurant;
    } catch (error) {
      serviceLogger.error('Error fetching restaurant by name', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get restaurant settings with caching
   */
  static async getRestaurantSettings(restaurantId: string): Promise<RestaurantSettings | null> {
    const cacheKey = `${CACHE_KEYS.SETTINGS}${restaurantId}`;

    // Check cache first
    const cached = restaurantCache.get<RestaurantSettings>(cacheKey);
    if (cached) {
      serviceLogger.debug('Restaurant settings cache hit', { restaurantId });
      return cached;
    }

    const restaurant = await this.getRestaurant(restaurantId);
    if (!restaurant) {
      return null;
    }

    const settings = restaurant.settings || {};

    // Cache the settings
    restaurantCache.set(cacheKey, settings);
    serviceLogger.debug('Restaurant settings cached', { restaurantId });

    return settings;
  }

  /**
   * Get voice settings for a specific mode (employee/customer)
   */
  static async getVoiceSettings(
    restaurantId: string,
    mode: 'employee' | 'customer'
  ): Promise<VoiceSettings | null> {
    const cacheKey = `${CACHE_KEYS.VOICE_SETTINGS}${restaurantId}:${mode}`;

    // Check cache first
    const cached = restaurantCache.get<VoiceSettings>(cacheKey);
    if (cached) {
      serviceLogger.debug('Voice settings cache hit', { restaurantId, mode });
      return cached;
    }

    const settings = await this.getRestaurantSettings(restaurantId);
    if (!settings?.voice) {
      serviceLogger.debug('No voice settings found for restaurant', { restaurantId, mode });
      return null;
    }

    const voiceSettings = settings.voice[mode] || null;

    if (voiceSettings) {
      // Cache the voice settings
      restaurantCache.set(cacheKey, voiceSettings);
      serviceLogger.debug('Voice settings cached', { restaurantId, mode });
    }

    return voiceSettings;
  }

  /**
   * Update restaurant settings
   */
  static async updateRestaurantSettings(
    restaurantId: string,
    settings: Partial<RestaurantSettings>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ settings })
        .eq('id', restaurantId);

      if (error) {
        serviceLogger.error('Error updating restaurant settings', {
          restaurantId,
          error: error.message
        });
        return false;
      }

      // Clear relevant caches
      restaurantCache.del(`${CACHE_KEYS.RESTAURANT}${restaurantId}`);
      restaurantCache.del(`${CACHE_KEYS.SETTINGS}${restaurantId}`);
      restaurantCache.del(`${CACHE_KEYS.VOICE_SETTINGS}${restaurantId}:employee`);
      restaurantCache.del(`${CACHE_KEYS.VOICE_SETTINGS}${restaurantId}:customer`);

      serviceLogger.info('Restaurant settings updated', { restaurantId });
      return true;
    } catch (error) {
      serviceLogger.error('Error updating restaurant settings', {
        restaurantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Clear all caches for a restaurant
   */
  static clearRestaurantCache(restaurantId: string): void {
    const keys = restaurantCache.keys().filter(key => key.includes(restaurantId));
    keys.forEach(key => restaurantCache.del(key));
    serviceLogger.debug('Restaurant cache cleared', { restaurantId, clearedKeys: keys.length });
  }
}