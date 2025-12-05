/**
 * API types with snake_case naming convention (ADR-001)
 *
 * Per ADR-001: ALL layers use snake_case - database, API, and client.
 * No transformations between layers.
 *
 * Research validation (December 4, 2025):
 * - Supabase has no camelCase support (postgrest-js archived Oct 2025)
 * - Prisma has no global case transform (would conflict with ADR-010 remote-first)
 * - Industry precedent: Stripe, Twitter, GitHub, OAuth2 all use snake_case
 */

export interface ApiMenuItem {
  id: string;
  menu_item_id?: string;
  restaurant_id: string;
  category_id: string;
  category?: ApiMenuCategory;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_featured?: boolean;
  dietary_flags?: string[];
  preparation_time?: number; // in minutes
  modifier_groups?: ApiMenuItemModifierGroup[];
  modifiers?: ApiMenuItemModifier[]; // Simplified modifiers array
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  // Additional fields for compatibility with different parts of the system
  available?: boolean;
  active?: boolean;
  prep_time_minutes?: number;
  aliases?: string[];
  calories?: number;
}

export interface ApiMenuCategory {
  id: string;
  restaurant_id?: string;
  name: string;
  slug?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  active?: boolean; // Alias for compatibility
  created_at?: string;
  updated_at?: string;
}

export interface ApiMenuItemModifier {
  id?: string;
  name: string;
  price: number;
  group?: string;
}

export interface ApiMenuItemModifierOption {
  id: string;
  name: string;
  price: number;
  is_default?: boolean;
}

export interface ApiMenuItemModifierGroup {
  id: string;
  name: string;
  required: boolean;
  max_selections?: number;
  options: ApiMenuItemModifierOption[];
}

export interface ApiMenuResponse {
  categories: ApiMenuCategory[];
  items: ApiMenuItem[];
}

// Re-export as standard names for compatibility
export type MenuItem = ApiMenuItem;
export type MenuCategory = ApiMenuCategory;
export type MenuResponse = ApiMenuResponse;
