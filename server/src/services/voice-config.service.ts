/**
 * Voice Configuration Service
 * Handles voice ordering configuration (menu aliases, tax rates, modifier rules)
 * Created: 2025-11-23 (Phase 4: Cleanup)
 */

import NodeCache from 'node-cache';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { getConfig } from '../config/environment';
import type {
  VoiceMenuConfiguration,
  VoiceModifierRule,
  CreateVoiceModifierRuleDTO,
  UpdateVoiceModifierRuleDTO,
} from '@rebuild/shared';

const config = getConfig();
const voiceCache = new NodeCache({ stdTTL: config.cache.ttlSeconds || 300 });

const CACHE_KEYS = {
  MENU_CONFIG: 'voice:menu:',
  MODIFIER_RULES: 'voice:rules:',
  MODIFIER_RULE: 'voice:rule:',
};

export class VoiceConfigService {
  private static logger = logger.child({ service: 'VoiceConfigService' });

  /**
   * Get complete voice menu configuration
   * Includes: menu items with aliases, tax rate, modifier rules
   */
  static async getMenuConfiguration(restaurantId: string): Promise<VoiceMenuConfiguration> {
    const cacheKey = `${CACHE_KEYS.MENU_CONFIG}${restaurantId}`;
    const cached = voiceCache.get<VoiceMenuConfiguration>(cacheKey);

    if (cached) {
      this.logger.debug('Voice menu config cache hit', { restaurantId });
      return cached;
    }

    try {
      // Fetch menu items with aliases
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, aliases')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .eq('available', true)
        .order('name');

      if (menuError) throw menuError;

      // Fetch tax rate
      const { data: restaurant, error: taxError } = await supabase
        .from('restaurants')
        .select('tax_rate')
        .eq('id', restaurantId)
        .single();

      if (taxError) throw taxError;

      // Fetch modifier rules
      const { data: modifierRules, error: rulesError } = await supabase
        .from('voice_modifier_rules')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (rulesError) throw rulesError;

      const configuration: VoiceMenuConfiguration = {
        restaurant_id: restaurantId,
        menu_items: menuItems || [],
        tax_rate: restaurant?.tax_rate ? Number(restaurant.tax_rate) : 0.08,
        modifier_rules: (modifierRules || []).map(this.mapModifierRule),
      };

      voiceCache.set(cacheKey, configuration);
      this.logger.info('Voice menu configuration loaded', {
        restaurantId,
        itemCount: configuration.menu_items.length,
        ruleCount: configuration.modifier_rules.length,
      });

      return configuration;
    } catch (error) {
      this.logger.error('Failed to fetch voice menu configuration', { restaurantId, error });
      throw error;
    }
  }

  /**
   * Get all modifier rules for a restaurant
   */
  static async getModifierRules(
    restaurantId: string,
    activeOnly: boolean = true
  ): Promise<VoiceModifierRule[]> {
    const cacheKey = `${CACHE_KEYS.MODIFIER_RULES}${restaurantId}:${activeOnly}`;
    const cached = voiceCache.get<VoiceModifierRule[]>(cacheKey);

    if (cached) {
      this.logger.debug('Modifier rules cache hit', { restaurantId, activeOnly });
      return cached;
    }

    try {
      let query = supabase
        .from('voice_modifier_rules')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rules = (data || []).map(this.mapModifierRule);
      voiceCache.set(cacheKey, rules);

      return rules;
    } catch (error) {
      this.logger.error('Failed to fetch modifier rules', { restaurantId, error });
      throw error;
    }
  }

  /**
   * Get a single modifier rule
   */
  static async getModifierRule(
    restaurantId: string,
    ruleId: string
  ): Promise<VoiceModifierRule | null> {
    const cacheKey = `${CACHE_KEYS.MODIFIER_RULE}${ruleId}`;
    const cached = voiceCache.get<VoiceModifierRule>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('voice_modifier_rules')
        .select('*')
        .eq('id', ruleId)
        .eq('restaurant_id', restaurantId) // Tenant isolation
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      const rule = this.mapModifierRule(data);
      voiceCache.set(cacheKey, rule);

      return rule;
    } catch (error) {
      this.logger.error('Failed to fetch modifier rule', { ruleId, restaurantId, error });
      throw error;
    }
  }

  /**
   * Create a new modifier rule
   */
  static async createModifierRule(
    ruleData: CreateVoiceModifierRuleDTO
  ): Promise<VoiceModifierRule> {
    try {
      const { data, error } = await supabase
        .from('voice_modifier_rules')
        .insert({
          restaurant_id: ruleData.restaurant_id,
          trigger_phrases: ruleData.trigger_phrases,
          action_type: ruleData.action_type,
          target_name: ruleData.target_name,
          replacement_value: ruleData.replacement_value || null,
          price_adjustment: ruleData.price_adjustment || 0,
          applicable_menu_item_ids: ruleData.applicable_menu_item_ids || null,
          active: ruleData.active !== undefined ? ruleData.active : true,
          notes: ruleData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Created voice modifier rule', {
        ruleId: data.id,
        restaurantId: ruleData.restaurant_id,
        actionType: ruleData.action_type,
      });

      // Invalidate cache
      this.clearCache(ruleData.restaurant_id);

      return this.mapModifierRule(data);
    } catch (error) {
      this.logger.error('Failed to create modifier rule', { ruleData, error });
      throw error;
    }
  }

  /**
   * Update an existing modifier rule
   */
  static async updateModifierRule(
    restaurantId: string,
    ruleId: string,
    updates: UpdateVoiceModifierRuleDTO
  ): Promise<VoiceModifierRule | null> {
    try {
      const { data, error } = await supabase
        .from('voice_modifier_rules')
        .update({
          ...(updates.trigger_phrases && { trigger_phrases: updates.trigger_phrases }),
          ...(updates.action_type && { action_type: updates.action_type }),
          ...(updates.target_name && { target_name: updates.target_name }),
          ...(updates.replacement_value !== undefined && {
            replacement_value: updates.replacement_value,
          }),
          ...(updates.price_adjustment !== undefined && {
            price_adjustment: updates.price_adjustment,
          }),
          ...(updates.applicable_menu_item_ids !== undefined && {
            applicable_menu_item_ids: updates.applicable_menu_item_ids,
          }),
          ...(updates.active !== undefined && { active: updates.active }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .eq('restaurant_id', restaurantId) // Tenant isolation
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      this.logger.info('Updated voice modifier rule', { ruleId, restaurantId });

      // Invalidate cache
      this.clearCache(restaurantId);
      voiceCache.del(`${CACHE_KEYS.MODIFIER_RULE}${ruleId}`);

      return this.mapModifierRule(data);
    } catch (error) {
      this.logger.error('Failed to update modifier rule', { ruleId, restaurantId, error });
      throw error;
    }
  }

  /**
   * Delete a modifier rule
   */
  static async deleteModifierRule(restaurantId: string, ruleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('voice_modifier_rules')
        .delete()
        .eq('id', ruleId)
        .eq('restaurant_id', restaurantId); // Tenant isolation

      if (error) throw error;

      this.logger.info('Deleted voice modifier rule', { ruleId, restaurantId });

      // Invalidate cache
      this.clearCache(restaurantId);
      voiceCache.del(`${CACHE_KEYS.MODIFIER_RULE}${ruleId}`);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete modifier rule', { ruleId, restaurantId, error });
      return false;
    }
  }

  /**
   * Clear voice configuration cache for a restaurant
   */
  static clearCache(restaurantId: string): void {
    const keys = voiceCache.keys();
    const pattern = restaurantId;

    keys.forEach((key) => {
      if (key.includes(pattern)) {
        voiceCache.del(key);
      }
    });

    this.logger.info('Cleared voice config cache', { restaurantId, clearedKeys: keys.length });
  }

  /**
   * Map database row to VoiceModifierRule type
   */
  private static mapModifierRule(data: any): VoiceModifierRule {
    return {
      id: data.id,
      restaurant_id: data.restaurant_id,
      trigger_phrases: data.trigger_phrases || [],
      action_type: data.action_type,
      target_name: data.target_name,
      replacement_value: data.replacement_value,
      price_adjustment: data.price_adjustment || 0,
      applicable_menu_item_ids: data.applicable_menu_item_ids,
      active: data.active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      notes: data.notes,
    };
  }
}
