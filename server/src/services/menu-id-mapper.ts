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
    if (m) return m[1];
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

export default {
  extractExternalId,
  buildExternalIdMap,
  resolveUuid,
  findUuid,
};