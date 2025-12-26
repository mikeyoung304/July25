/**
 * Menu Tools Type Definitions
 *
 * All interfaces and types for the realtime menu tools system.
 * Uses snake_case convention per ADR-001.
 */

// Core entity types

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  available: boolean;
  preparation_time?: number;
  calories?: number;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
}

export interface CartModifier {
  name: string;
  price: number; // Price adjustment (can be negative)
}

export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: CartModifier[];
  notes?: string;
}

export interface Cart {
  session_id: string;
  restaurant_id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  created_at: number;
  updated_at: number;
}

// Context and result types

export interface MenuToolContext {
  sessionId: string;
  restaurantId: string;
}

export interface MenuToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Function argument types

export interface FindMenuItemsArgs {
  query?: string;
  category?: string;
  max_price?: number;
  dietary?: string[];
  suggest_alternatives?: boolean;
}

export interface GetItemDetailsArgs {
  id: string;
}

export interface AddToOrderArgs {
  id: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface RemoveFromOrderArgs {
  item_id: string;
}

export interface GetCurrentOrderArgs {
  // No arguments needed
}

export interface GetStoreInfoArgs {
  // No arguments needed
}

export interface GetSpecialsArgs {
  // No arguments needed
}

export interface ClearOrderArgs {
  // No arguments needed
}

// Database row types

export interface VoiceModifierRule {
  target_name: string;
  price_adjustment: number;
  trigger_phrases: string[];
  applicable_menu_item_ids: string[] | null;
}
