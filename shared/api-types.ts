/**
 * API types with camelCase naming convention
 * These are the types used at the API boundary (client <-> server)
 */

export interface ApiMenuItem {
  id: string;
  menuItemId?: string;
  restaurantId: string;
  categoryId: string;
  category?: ApiMenuCategory;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isFeatured?: boolean;
  dietaryFlags?: string[];
  preparationTime?: number; // in minutes
  modifierGroups?: ApiMenuItemModifierGroup[];
  modifiers?: ApiMenuItemModifier[]; // Simplified modifiers array
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields for compatibility
  available?: boolean;
  active?: boolean;
  prepTimeMinutes?: number;
  aliases?: string[];
  calories?: number;
}

export interface ApiMenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  active?: boolean; // Alias for compatibility
  createdAt?: string;
  updatedAt?: string;
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
  isDefault?: boolean;
}

export interface ApiMenuItemModifierGroup {
  id: string;
  name: string;
  required: boolean;
  maxSelections?: number;
  options: ApiMenuItemModifierOption[];
}

export interface ApiMenuResponse {
  categories: ApiMenuCategory[];
  items: ApiMenuItem[];
}

// Re-export as standard names
export type MenuItem = ApiMenuItem;
export type MenuCategory = ApiMenuCategory;
export type MenuResponse = ApiMenuResponse;