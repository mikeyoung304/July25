/**
 * Menu ID Mapping Service (external_id <-> UUID)
 * Safe for both old "[ID:###]" descriptions and new external_id column.
 */

export interface ItemLike {
  id: string;                 // UUID from DB
  external_id?: string | null;
  description?: string | null;
  name?: string;
}

/** Extract numeric external id from either column or legacy description tag */
export function extractExternalId(item: ItemLike): string | null {
  if (item.external_id && item.external_id.trim() !== '') return item.external_id.trim();
  if (item.description) {
    const m = item.description.match(/\[ID:(\d+)\]/);
    if (m && m[1]) return m[1];
  }
  return null;
}

/** Build a map of external_id -> UUID for quick lookup */
export function buildExternalIdMap(items: ItemLike[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const it of items) {
    const ext = extractExternalId(it);
    if (ext) map.set(ext, it.id);
  }
  return map;
}

/** Lookup UUID by external_id */
export function resolveUuid(map: Map<string, string>, externalId: string): string | undefined {
  return map.get(externalId);
}

/** Convenience wrapper: give me UUID directly from list */
export function findUuid(items: ItemLike[], externalId: string): string | undefined {
  return buildExternalIdMap(items).get(externalId);
}

/** Menu ID Mapper class for converting between external IDs and UUIDs */
export class MenuIdMapper {
  /**
   * Convert menu items to use external IDs instead of UUIDs
   * For items without external_id, use the UUID as fallback
   */
  async convertToExternalIds<T extends ItemLike>(items: T[]): Promise<T[]> {
    return items.map(item => {
      const externalId = extractExternalId(item);
      return {
        ...item,
        id: externalId || item.id // Use external ID if available, otherwise keep UUID
      };
    });
  }

  /**
   * Convert external IDs back to UUIDs for database operations
   */
  async convertToUuids<T extends ItemLike & { id: string }>(
    items: T[], 
    allMenuItems: ItemLike[]
  ): Promise<T[]> {
    const externalIdMap = buildExternalIdMap(allMenuItems);
    
    return items.map(item => {
      const uuid = resolveUuid(externalIdMap, item.id);
      return {
        ...item,
        id: uuid || item.id // Use UUID if found, otherwise keep original ID
      };
    });
  }
}

// Singleton instance
export const menuIdMapper = new MenuIdMapper();

export default {
  extractExternalId,
  buildExternalIdMap,
  resolveUuid,
  findUuid,
  menuIdMapper,
};