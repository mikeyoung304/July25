/**
 * Menu Item Test Factory
 *
 * Creates mock MenuItem objects for testing with sensible defaults.
 *
 * Usage:
 * ```typescript
 * import { createMenuItem, createMenuItemWithModifiers } from '@/test/factories/menu-item.factory';
 *
 * const item = createMenuItem({ price: 14.99 });
 * const itemWithMods = createMenuItemWithModifiers();
 * ```
 */

import type {
  MenuItem,
  MenuCategory,
  MenuItemModifierGroup,
  MenuItemModifierOption,
} from '@rebuild/shared/types';

import { TEST_RESTAURANT_ID } from './order.factory';

let menuItemCounter = 0;
let categoryCounter = 0;
let modifierGroupCounter = 0;

/**
 * Reset factory counters
 */
export function resetMenuItemCounters() {
  menuItemCounter = 0;
  categoryCounter = 0;
  modifierGroupCounter = 0;
}

/**
 * Create a mock MenuCategory
 */
export function createMenuCategory(overrides: Partial<MenuCategory> = {}): MenuCategory {
  categoryCounter++;
  return {
    id: `category-${categoryCounter}`,
    name: `Category ${categoryCounter}`,
    description: `Test category ${categoryCounter}`,
    display_order: categoryCounter,
    is_active: true,
    ...overrides,
  };
}

/**
 * Create a mock MenuItemModifierOption
 */
export function createModifierOption(
  overrides: Partial<MenuItemModifierOption> = {}
): MenuItemModifierOption {
  return {
    id: `option-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Option',
    price_adjustment: 0,
    is_default: false,
    ...overrides,
  };
}

/**
 * Create a mock MenuItemModifierGroup
 */
export function createModifierGroup(
  overrides: Partial<MenuItemModifierGroup> = {}
): MenuItemModifierGroup {
  modifierGroupCounter++;
  return {
    id: `mod-group-${modifierGroupCounter}`,
    name: `Modifier Group ${modifierGroupCounter}`,
    required: false,
    min_selections: 0,
    max_selections: 1,
    options: [
      createModifierOption({ name: 'Option A' }),
      createModifierOption({ name: 'Option B', price_adjustment: 1.50 }),
    ],
    ...overrides,
  };
}

/**
 * Create a mock MenuItem
 */
export function createMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  menuItemCounter++;
  const now = new Date().toISOString();

  return {
    id: `menu-item-${menuItemCounter}`,
    restaurant_id: TEST_RESTAURANT_ID,
    category_id: 'category-1',
    name: `Test Menu Item ${menuItemCounter}`,
    description: `Delicious test item ${menuItemCounter}`,
    price: 9.99,
    is_available: true,
    is_featured: false,
    display_order: menuItemCounter,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create multiple MenuItems
 */
export function createMenuItems(count: number, overrides: Partial<MenuItem> = {}): MenuItem[] {
  return Array.from({ length: count }, () => createMenuItem(overrides));
}

/**
 * Create a MenuItem with modifier groups
 */
export function createMenuItemWithModifiers(
  modifierGroupCount = 2,
  overrides: Partial<MenuItem> = {}
): MenuItem {
  const modifierGroups = Array.from(
    { length: modifierGroupCount },
    () => createModifierGroup()
  );

  return createMenuItem({
    modifier_groups: modifierGroups,
    ...overrides,
  });
}

/**
 * Create a featured MenuItem
 */
export function createFeaturedMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return createMenuItem({
    is_featured: true,
    image_url: 'https://example.com/featured-item.jpg',
    ...overrides,
  });
}

/**
 * Create an unavailable MenuItem
 */
export function createUnavailableMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return createMenuItem({
    is_available: false,
    ...overrides,
  });
}

/**
 * Create MenuItems with dietary flags
 */
export function createDietaryMenuItem(
  dietaryFlags: string[],
  overrides: Partial<MenuItem> = {}
): MenuItem {
  return createMenuItem({
    dietary_flags: dietaryFlags,
    ...overrides,
  });
}

/**
 * Create a full menu structure (categories with items)
 */
export function createFullMenu(categoryCount = 3, itemsPerCategory = 4): {
  categories: MenuCategory[];
  items: MenuItem[];
} {
  const categories = Array.from({ length: categoryCount }, () => createMenuCategory());
  const items: MenuItem[] = [];

  categories.forEach((category) => {
    const categoryItems = createMenuItems(itemsPerCategory, { category_id: category.id });
    items.push(...categoryItems);
  });

  return { categories, items };
}

/**
 * Common menu item presets
 */
export const menuItemPresets = {
  burger: (overrides: Partial<MenuItem> = {}) =>
    createMenuItem({
      name: 'Classic Burger',
      description: 'Beef patty with lettuce, tomato, and special sauce',
      price: 12.99,
      preparation_time: 15,
      ...overrides,
    }),

  fries: (overrides: Partial<MenuItem> = {}) =>
    createMenuItem({
      name: 'French Fries',
      description: 'Crispy golden fries',
      price: 4.99,
      preparation_time: 8,
      ...overrides,
    }),

  drink: (overrides: Partial<MenuItem> = {}) =>
    createMenuItem({
      name: 'Soft Drink',
      description: 'Choice of Coke, Sprite, or Fanta',
      price: 2.99,
      preparation_time: 1,
      ...overrides,
    }),

  salad: (overrides: Partial<MenuItem> = {}) =>
    createMenuItem({
      name: 'Garden Salad',
      description: 'Fresh mixed greens with vinaigrette',
      price: 8.99,
      preparation_time: 5,
      dietary_flags: ['vegetarian', 'vegan', 'gluten-free'],
      ...overrides,
    }),
};
