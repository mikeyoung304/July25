/**
 * Unified Menu Types
 * Single source of truth for all menu-related types
 */

// Category string type used in various places
export type MenuCategoryType = string;

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface MenuItemModifierOption {
  id: string;
  name: string;
  price_adjustment: number;
  is_default?: boolean;
}

export interface MenuItemModifierGroup {
  id: string;
  name: string;
  required: boolean;
  max_selections: number;
  min_selections: number;
  options: MenuItemModifierOption[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  category?: MenuCategory;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_featured?: boolean;
  dietary_flags?: string[];
  preparation_time?: number; // in minutes
  modifier_groups?: MenuItemModifierGroup[];
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuItemDTO {
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  is_featured?: boolean;
  dietary_flags?: string[];
  preparation_time?: number;
  modifier_groups?: MenuItemModifierGroup[];
  display_order?: number;
}

export interface UpdateMenuItemDTO {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  is_available?: boolean;
  is_featured?: boolean;
  dietary_flags?: string[];
  preparation_time?: number;
  modifier_groups?: MenuItemModifierGroup[];
  display_order?: number;
}

export interface MenuFilters {
  category_id?: string;
  is_available?: boolean;
  is_featured?: boolean;
  search?: string;
  dietary_flags?: string[];
}