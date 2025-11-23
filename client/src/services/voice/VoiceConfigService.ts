/**
 * Voice Configuration Service (Client)
 * Fetches voice configuration from API (menu aliases, tax rate, modifier rules)
 * Created: 2025-11-23 (Phase 4: Cleanup)
 */

import { httpClient as api } from '@/services/http/httpClient';
import { logger } from '@/services/logger';
import { env } from '@/utils/env';
import type {
  VoiceMenuConfiguration,
  VoiceModifierRule,
  CreateVoiceModifierRuleDTO,
  UpdateVoiceModifierRuleDTO,
} from '@rebuild/shared';

export interface IVoiceConfigService {
  getMenuConfiguration(): Promise<VoiceMenuConfiguration>;
  getModifierRules(activeOnly?: boolean): Promise<VoiceModifierRule[]>;
  getModifierRule(ruleId: string): Promise<VoiceModifierRule>;
  createModifierRule(rule: CreateVoiceModifierRuleDTO): Promise<VoiceModifierRule>;
  updateModifierRule(ruleId: string, updates: UpdateVoiceModifierRuleDTO): Promise<VoiceModifierRule>;
  deleteModifierRule(ruleId: string): Promise<{ success: boolean; deleted_id: string }>;
  clearCache(): Promise<{ success: boolean; message: string }>;
}

export class VoiceConfigService implements IVoiceConfigService {
  private static instance: VoiceConfigService;

  constructor(private restaurantId?: string) {}

  /**
   * Get singleton instance (for global usage)
   */
  static getInstance(restaurantId?: string): VoiceConfigService {
    if (!VoiceConfigService.instance) {
      VoiceConfigService.instance = new VoiceConfigService(restaurantId);
    }
    return VoiceConfigService.instance;
  }

  private getHeaders() {
    // Restaurant ID can be provided at construction or via environment
    const restaurantId = this.restaurantId || env.VITE_DEFAULT_RESTAURANT_ID || 'grow';
    return { 'x-restaurant-id': restaurantId };
  }

  /**
   * Get complete voice menu configuration
   * Includes: menu items with aliases, tax rate, modifier rules
   */
  async getMenuConfiguration(): Promise<VoiceMenuConfiguration> {
    try {
      const response = await api.get<VoiceMenuConfiguration>('/api/v1/voice-config/menu', {
        headers: this.getHeaders(),
      });

      logger.info('[VoiceConfigService] Menu configuration loaded', {
        itemCount: response.menu_items.length,
        ruleCount: response.modifier_rules.length,
        taxRate: response.tax_rate,
      });

      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to fetch menu configuration', { error });
      throw error;
    }
  }

  /**
   * Get all modifier rules
   */
  async getModifierRules(activeOnly: boolean = true): Promise<VoiceModifierRule[]> {
    try {
      const params = activeOnly ? '?active_only=true' : '';
      const response = await api.get<VoiceModifierRule[]>(
        `/api/v1/voice-config/modifier-rules${params}`,
        {
          headers: this.getHeaders(),
        }
      );

      logger.debug('[VoiceConfigService] Modifier rules loaded', {
        count: response.length,
        activeOnly,
      });

      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to fetch modifier rules', { error });
      throw error;
    }
  }

  /**
   * Get a single modifier rule by ID
   */
  async getModifierRule(ruleId: string): Promise<VoiceModifierRule> {
    try {
      const response = await api.get<VoiceModifierRule>(
        `/api/v1/voice-config/modifier-rules/${ruleId}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to fetch modifier rule', { ruleId, error });
      throw error;
    }
  }

  /**
   * Create a new modifier rule
   */
  async createModifierRule(rule: CreateVoiceModifierRuleDTO): Promise<VoiceModifierRule> {
    try {
      const response = await api.post<VoiceModifierRule>(
        '/api/v1/voice-config/modifier-rules',
        rule,
        {
          headers: this.getHeaders(),
        }
      );

      // Clear cache after mutation
      api.clearCache('/api/v1/voice-config/menu');
      api.clearCache('/api/v1/voice-config/modifier-rules');
      logger.info('[VoiceConfigService] Cache cleared after createModifierRule');

      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to create modifier rule', { rule, error });
      throw error;
    }
  }

  /**
   * Update an existing modifier rule
   */
  async updateModifierRule(
    ruleId: string,
    updates: UpdateVoiceModifierRuleDTO
  ): Promise<VoiceModifierRule> {
    try {
      const response = await api.patch<VoiceModifierRule>(
        `/api/v1/voice-config/modifier-rules/${ruleId}`,
        updates,
        {
          headers: this.getHeaders(),
        }
      );

      // Clear cache after mutation
      api.clearCache('/api/v1/voice-config/menu');
      api.clearCache('/api/v1/voice-config/modifier-rules');
      logger.info('[VoiceConfigService] Cache cleared after updateModifierRule');

      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to update modifier rule', { ruleId, error });
      throw error;
    }
  }

  /**
   * Delete a modifier rule
   */
  async deleteModifierRule(ruleId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      const response = await api.delete<{ success: boolean; deleted_id: string }>(
        `/api/v1/voice-config/modifier-rules/${ruleId}`,
        {
          headers: this.getHeaders(),
        }
      );

      // Clear cache after mutation
      api.clearCache('/api/v1/voice-config/menu');
      api.clearCache('/api/v1/voice-config/modifier-rules');
      logger.info('[VoiceConfigService] Cache cleared after deleteModifierRule');

      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to delete modifier rule', { ruleId, error });
      throw error;
    }
  }

  /**
   * Clear voice configuration cache on the server
   */
  async clearCache(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ success: boolean; message: string }>(
        '/api/v1/voice-config/cache/clear',
        {},
        {
          headers: this.getHeaders(),
        }
      );

      // Also clear local HTTP client cache
      api.clearCache('/api/v1/voice-config/menu');
      api.clearCache('/api/v1/voice-config/modifier-rules');

      logger.info('[VoiceConfigService] Server and local cache cleared');

      return response;
    } catch (error) {
      logger.error('[VoiceConfigService] Failed to clear cache', { error });
      throw error;
    }
  }
}

// Export singleton instance for convenience
export const voiceConfigService = VoiceConfigService.getInstance();
