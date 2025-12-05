/**
 * Menu API boundary mappers
 * Transforms snake_case DB records to camelCase API responses
 */

import { camelizeKeys } from '../utils/case';

// Database types (snake_case)
interface DbMenuItem {
  id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  available: boolean;
  dietary_flags?: string[];
  modifiers?: any[];
  aliases?: string[];
  prep_time_minutes?: number;
  image_url?: string;
  menu_item_id?: string; // external ID after mapping
}

interface DbMenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  active: boolean;
}

// API types (camelCase) - matching shared module
export interface ApiMenuItem {
  id: string;
  menuItemId?: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  available: boolean;
  dietaryFlags: string[];
  modifiers: any[];
  aliases: string[];
  prepTimeMinutes: number;
  imageUrl?: string;
}

export interface ApiMenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  active: boolean;
}

export interface ApiMenuResponse {
  categories: ApiMenuCategory[];
  items: ApiMenuItem[];
}

/**
 * Map database menu item to API format
 */
export function mapMenuItem(dbItem: DbMenuItem): ApiMenuItem {
  return {
    id: dbItem.id,
    menuItemId: dbItem.menu_item_id || dbItem.id,
    ...(dbItem.category_id ? { categoryId: dbItem.category_id } : {}),
    name: dbItem.name,
    ...(dbItem.description ? { description: dbItem.description } : {}),
    price: dbItem.price,
    active: dbItem.active,
    available: dbItem.available,
    dietaryFlags: dbItem.dietary_flags || [],
    modifiers: dbItem.modifiers || [],
    aliases: dbItem.aliases || [],
    prepTimeMinutes: dbItem.prep_time_minutes || 10,
    ...(dbItem.image_url ? { imageUrl: dbItem.image_url } : {}),
  };
}

/**
 * Map database menu category to API format
 */
export function mapMenuCategory(dbCategory: DbMenuCategory): ApiMenuCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    slug: dbCategory.slug,
    ...(dbCategory.description ? { description: dbCategory.description } : {}),
    displayOrder: dbCategory.display_order,
    active: dbCategory.active,
  };
}

/**
 * Map array of menu items
 */
export function mapMenuItems(dbItems: DbMenuItem[]): ApiMenuItem[] {
  return dbItems.map(mapMenuItem);
}

/**
 * Map array of menu categories
 */
export function mapMenuCategories(dbCategories: DbMenuCategory[]): ApiMenuCategory[] {
  return dbCategories.map(mapMenuCategory);
}

/**
 * Generic camelCase mapper for simple objects
 */
export function mapToCamelCase<T = any>(dbRecord: any): T {
  return camelizeKeys<T>(dbRecord);
}