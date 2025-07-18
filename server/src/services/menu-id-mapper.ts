/**
 * Menu ID Mapping Service
 * 
 * Handles conversion between numeric string IDs (used by frontend/voice)
 * and UUIDs (used by database). This ensures all ordering channels
 * can communicate effectively.
 */

import { supabase } from '../config/database';
import { MenuItem } from './menu.service';

interface IdMapping {
  external_id: string;  // Numeric string ID (e.g., '101', '201')
  uuid: string;         // Database UUID
  name: string;         // Item name for debugging
}

class MenuIdMapper {
  private mappings: Map<string, IdMapping> = new Map();
  private uuidToExternal: Map<string, string> = new Map();
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get UUID from external numeric ID
   */
  async getUuid(externalId: string): Promise<string | null> {
    await this.ensureMappingsLoaded();
    const mapping = this.mappings.get(externalId);
    return mapping?.uuid || null;
  }

  /**
   * Get external numeric ID from UUID
   */
  async getExternalId(uuid: string): Promise<string | null> {
    await this.ensureMappingsLoaded();
    return this.uuidToExternal.get(uuid) || null;
  }

  /**
   * Convert menu items to use external IDs
   */
  async convertToExternalIds(items: MenuItem[]): Promise<MenuItem[]> {
    await this.ensureMappingsLoaded();
    
    return items.map(item => {
      const externalId = this.uuidToExternal.get(item.id);
      if (externalId) {
        return { ...item, id: externalId };
      }
      
      // Extract from description if available
      const match = item.description?.match(/\[ID:(\d+)\]/);
      if (match) {
        return { 
          ...item, 
          id: match[1],
          description: item.description?.replace(/\s*\[ID:\d+\]/, '') || item.description
        };
      }
      
      return item;
    });
  }

  /**
   * Convert order items to use UUIDs
   */
  async convertToUuids(items: any[]): Promise<any[]> {
    await this.ensureMappingsLoaded();
    
    return Promise.all(items.map(async item => {
      const uuid = await this.getUuid(item.menu_item_id || item.id);
      if (uuid) {
        return { ...item, menu_item_id: uuid };
      }
      return item;
    }));
  }

  /**
   * Load mappings from database
   */
  private async ensureMappingsLoaded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < this.CACHE_TTL && this.mappings.size > 0) {
      return;
    }

    try {
      const { data: items, error } = await supabase
        .from('menu_items')
        .select('id, name, description');

      if (error) throw error;

      this.mappings.clear();
      this.uuidToExternal.clear();

      items?.forEach(item => {
        // Extract external ID from description
        const match = item.description?.match(/\[ID:(\d+)\]/);
        if (match) {
          const externalId = match[1];
          const mapping: IdMapping = {
            external_id: externalId,
            uuid: item.id,
            name: item.name
          };
          
          this.mappings.set(externalId, mapping);
          this.uuidToExternal.set(item.id, externalId);
        }
      });

      this.lastFetch = now;
      console.log(`📊 Loaded ${this.mappings.size} ID mappings`);
    } catch (error) {
      console.error('❌ Failed to load ID mappings:', error);
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.mappings.clear();
    this.uuidToExternal.clear();
    this.lastFetch = 0;
  }
}

// Export singleton instance
export const menuIdMapper = new MenuIdMapper();