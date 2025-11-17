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
    preparationTime?: number;
    modifierGroups?: ApiMenuItemModifierGroup[];
    modifiers?: ApiMenuItemModifier[];
    displayOrder?: number;
    createdAt?: string;
    updatedAt?: string;
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
    active?: boolean;
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
export type MenuItem = ApiMenuItem;
export type MenuCategory = ApiMenuCategory;
export type MenuResponse = ApiMenuResponse;
//# sourceMappingURL=api-types.d.ts.map