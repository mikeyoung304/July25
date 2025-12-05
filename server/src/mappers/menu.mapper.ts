/**
 * Menu API boundary mappers
 *
 * ADR-001: ALL layers use snake_case - database, API, and client.
 * No transformations between layers.
 *
 * These mappers now simply pass through the snake_case data from the database,
 * adding sensible defaults where needed.
 */

// Database/API types (snake_case - same format per ADR-001)
export interface ApiMenuItem {
  id: string;
  menu_item_id?: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  available: boolean;
  dietary_flags: string[];
  modifiers: any[];
  aliases: string[];
  prep_time_minutes: number;
  image_url?: string;
}

export interface ApiMenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  active: boolean;
}

export interface ApiMenuResponse {
  categories: ApiMenuCategory[];
  items: ApiMenuItem[];
}

/**
 * Map database menu item to API format (pass-through with defaults)
 * Per ADR-001: No case transformations - database and API use same snake_case format
 */
export function mapMenuItem(dbItem: any): ApiMenuItem {
  return {
    id: dbItem.id,
    menu_item_id: dbItem.menu_item_id || dbItem.id,
    ...(dbItem.category_id ? { category_id: dbItem.category_id } : {}),
    name: dbItem.name,
    ...(dbItem.description ? { description: dbItem.description } : {}),
    price: dbItem.price,
    active: dbItem.active,
    available: dbItem.available,
    dietary_flags: dbItem.dietary_flags || [],
    modifiers: dbItem.modifiers || [],
    aliases: dbItem.aliases || [],
    prep_time_minutes: dbItem.prep_time_minutes || 10,
    ...(dbItem.image_url ? { image_url: dbItem.image_url } : {}),
  };
}

/**
 * Map database menu category to API format (pass-through with defaults)
 * Per ADR-001: No case transformations
 */
export function mapMenuCategory(dbCategory: any): ApiMenuCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    slug: dbCategory.slug,
    ...(dbCategory.description ? { description: dbCategory.description } : {}),
    display_order: dbCategory.display_order,
    active: dbCategory.active,
  };
}

/**
 * Map array of menu items
 */
export function mapMenuItems(dbItems: any[]): ApiMenuItem[] {
  return dbItems.map(mapMenuItem);
}

/**
 * Map array of menu categories
 */
export function mapMenuCategories(dbCategories: any[]): ApiMenuCategory[] {
  return dbCategories.map(mapMenuCategory);
}

/**
 * Pass-through mapper for simple objects (no transformation needed)
 * Per ADR-001: Database already uses snake_case
 * @deprecated Use direct assignment instead - this function is a no-op
 */
export function mapToCamelCase<T = any>(dbRecord: any): T {
  // ADR-001: No transformation - return as-is since we use snake_case everywhere
  return dbRecord as T;
}
