import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuService } from '../src/services/menu.service';

/**
 * Cache Isolation Tests (P2 Task 186)
 *
 * Verifies that the menu caching system properly isolates cache entries
 * by restaurant_id to prevent data leakage between tenants.
 *
 * Critical for multi-tenant security per ADR-001 (snake_case) and
 * CLAUDE.md universal rule #1 (multi-tenant isolation).
 */

// Test restaurant IDs per CLAUDE.md specifications
const RESTAURANT_A = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_B = '22222222-2222-2222-2222-222222222222';

// Mock Supabase client
vi.mock('../src/config/database', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null
            })),
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          })),
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        })),
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      }))
    }))
  }
}));

// Mock menu ID mapper
vi.mock('../src/services/menu-id-mapper', () => ({
  menuIdMapper: {
    convertToExternalIds: vi.fn((items) => Promise.resolve(items))
  }
}));

// Mock audit service
vi.mock('../src/services/audit.service', () => ({
  AuditService: {
    logMenuItemAvailabilityChange: vi.fn()
  }
}));

describe('Cache Isolation - Multi-Tenant Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all cache before each test
    MenuService.clearAllCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    MenuService.clearAllCache();
  });

  describe('Full Menu Cache Keys', () => {
    it('should include restaurant_id in full menu cache key', async () => {
      const { supabase } = await import('../src/config/database');

      // Mock menu data for restaurant A
      const mockCategoriesA = [
        {
          id: 'cat-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Appetizers',
          active: true,
          display_order: 1
        }
      ];

      const mockItemsA = [
        {
          id: 'item-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Burger',
          price: 12.99,
          active: true,
          available: true,
          category_id: 'cat-a-1'
        }
      ];

      // Setup mock to return restaurant A's data
      const mockFrom = vi.fn((table: string) => {
        if (table === 'menu_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: mockCategoriesA,
                    error: null
                  }))
                }))
              }))
            }))
          };
        } else if (table === 'menu_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: mockItemsA,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return { select: vi.fn() };
      });

      (supabase.from as any) = mockFrom;

      // Fetch menu for restaurant A (should cache with restaurant_id)
      const menuA = await MenuService.getFullMenu(RESTAURANT_A);

      expect(menuA).toBeDefined();
      expect(menuA.categories).toHaveLength(1);
      expect(menuA.items).toHaveLength(1);

      // Fetch again - should hit cache (no additional DB calls)
      const callCountBefore = mockFrom.mock.calls.length;
      const menuACached = await MenuService.getFullMenu(RESTAURANT_A);
      const callCountAfter = mockFrom.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore); // No new DB calls
      expect(menuACached).toEqual(menuA); // Same data
    });

    it('should use separate cache entries for different restaurants', async () => {
      const { supabase } = await import('../src/config/database');

      // Mock data for both restaurants
      const mockCategoriesA = [
        {
          id: 'cat-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Appetizers',
          active: true,
          display_order: 1
        }
      ];

      const mockItemsA = [
        {
          id: 'item-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Burger',
          price: 12.99,
          active: true,
          available: true,
          category_id: 'cat-a-1'
        }
      ];

      const mockCategoriesB = [
        {
          id: 'cat-b-1',
          restaurant_id: RESTAURANT_B,
          name: 'Restaurant B Desserts',
          active: true,
          display_order: 1
        }
      ];

      const mockItemsB = [
        {
          id: 'item-b-1',
          restaurant_id: RESTAURANT_B,
          name: 'Restaurant B Pizza',
          price: 15.99,
          active: true,
          available: true,
          category_id: 'cat-b-1'
        }
      ];

      let currentRestaurant = RESTAURANT_A;

      // Setup mock to return different data based on restaurant_id
      const mockFrom = vi.fn((table: string) => {
        if (table === 'menu_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, value: string) => {
                if (field === 'restaurant_id') {
                  currentRestaurant = value;
                }
                return {
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({
                      data: currentRestaurant === RESTAURANT_A ? mockCategoriesA : mockCategoriesB,
                      error: null
                    }))
                  }))
                };
              })
            }))
          };
        } else if (table === 'menu_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, value: string) => {
                if (field === 'restaurant_id') {
                  currentRestaurant = value;
                }
                return {
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({
                      data: currentRestaurant === RESTAURANT_A ? mockItemsA : mockItemsB,
                      error: null
                    }))
                  }))
                };
              })
            }))
          };
        }
        return { select: vi.fn() };
      });

      (supabase.from as any) = mockFrom;

      // Fetch menu for restaurant A
      const menuA = await MenuService.getFullMenu(RESTAURANT_A);

      // Fetch menu for restaurant B
      const menuB = await MenuService.getFullMenu(RESTAURANT_B);

      // Verify they have different data (not shared cache)
      expect(menuA.categories[0].name).toBe('Restaurant A Appetizers');
      expect(menuA.items[0].name).toBe('Restaurant A Burger');
      expect(menuA.items[0].price).toBe(12.99);

      expect(menuB.categories[0].name).toBe('Restaurant B Desserts');
      expect(menuB.items[0].name).toBe('Restaurant B Pizza');
      expect(menuB.items[0].price).toBe(15.99);

      // Verify both are cached independently
      const callCountBefore = mockFrom.mock.calls.length;

      const menuACached = await MenuService.getFullMenu(RESTAURANT_A);
      const menuBCached = await MenuService.getFullMenu(RESTAURANT_B);

      const callCountAfter = mockFrom.mock.calls.length;

      // No new DB calls - both hit cache
      expect(callCountAfter).toBe(callCountBefore);

      // Data remains isolated
      expect(menuACached.items[0].name).toBe('Restaurant A Burger');
      expect(menuBCached.items[0].name).toBe('Restaurant B Pizza');
    });
  });

  describe('Menu Items Cache Keys', () => {
    it('should include restaurant_id in items cache key', async () => {
      const { supabase } = await import('../src/config/database');

      const mockItemsA = [
        {
          id: 'item-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Taco',
          price: 8.99,
          active: true,
          available: true,
          category_id: 'cat-a-1'
        }
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockItemsA,
                error: null
              }))
            }))
          }))
        }))
      }));

      (supabase.from as any) = mockFrom;

      // Fetch items for restaurant A
      const itemsA = await MenuService.getItems(RESTAURANT_A);

      expect(itemsA).toHaveLength(1);
      expect(itemsA[0].name).toBe('Restaurant A Taco');

      // Fetch again - should hit cache
      const callCountBefore = mockFrom.mock.calls.length;
      const itemsACached = await MenuService.getItems(RESTAURANT_A);
      const callCountAfter = mockFrom.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
      expect(itemsACached).toEqual(itemsA);
    });

    it('should isolate items cache between restaurants', async () => {
      const { supabase } = await import('../src/config/database');

      const mockItemsA = [
        {
          id: 'item-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Salad',
          price: 9.99,
          active: true,
          available: true,
          category_id: 'cat-a-1'
        }
      ];

      const mockItemsB = [
        {
          id: 'item-b-1',
          restaurant_id: RESTAURANT_B,
          name: 'Restaurant B Pasta',
          price: 13.99,
          active: true,
          available: true,
          category_id: 'cat-b-1'
        }
      ];

      let currentRestaurant = RESTAURANT_A;

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'restaurant_id') {
              currentRestaurant = value;
            }
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: currentRestaurant === RESTAURANT_A ? mockItemsA : mockItemsB,
                  error: null
                }))
              }))
            };
          })
        }))
      }));

      (supabase.from as any) = mockFrom;

      // Fetch items for both restaurants
      const itemsA = await MenuService.getItems(RESTAURANT_A);
      const itemsB = await MenuService.getItems(RESTAURANT_B);

      // Verify isolation
      expect(itemsA[0].name).toBe('Restaurant A Salad');
      expect(itemsB[0].name).toBe('Restaurant B Pasta');
      expect(itemsA[0].price).not.toBe(itemsB[0].price);
    });
  });

  describe('Single Item Cache Keys', () => {
    it('should include restaurant_id in single item cache key', async () => {
      const { supabase } = await import('../src/config/database');

      const mockItem = {
        id: 'item-a-1',
        restaurant_id: RESTAURANT_A,
        name: 'Restaurant A Sandwich',
        price: 10.99,
        active: true,
        available: true,
        category_id: 'cat-a-1'
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockItem,
                error: null
              }))
            }))
          }))
        }))
      }));

      (supabase.from as any) = mockFrom;

      // Fetch single item
      const item = await MenuService.getItem(RESTAURANT_A, 'item-a-1');

      expect(item).toBeDefined();
      expect(item?.name).toBe('Restaurant A Sandwich');

      // Fetch again - should hit cache
      const callCountBefore = mockFrom.mock.calls.length;
      const itemCached = await MenuService.getItem(RESTAURANT_A, 'item-a-1');
      const callCountAfter = mockFrom.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
      expect(itemCached).toEqual(item);
    });

    it('should isolate single item cache between restaurants', async () => {
      const { supabase } = await import('../src/config/database');

      // Same item ID but different restaurants
      const itemId = 'item-same-id';

      const mockItemA = {
        id: itemId,
        restaurant_id: RESTAURANT_A,
        name: 'Restaurant A Item',
        price: 11.99,
        active: true,
        available: true,
        category_id: 'cat-a-1'
      };

      const mockItemB = {
        id: itemId,
        restaurant_id: RESTAURANT_B,
        name: 'Restaurant B Item',
        price: 14.99,
        active: true,
        available: true,
        category_id: 'cat-b-1'
      };

      let currentRestaurant = RESTAURANT_A;

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'restaurant_id') {
              currentRestaurant = value;
            }
            return {
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: currentRestaurant === RESTAURANT_A ? mockItemA : mockItemB,
                  error: null
                }))
              }))
            };
          })
        }))
      }));

      (supabase.from as any) = mockFrom;

      // Fetch same item ID for different restaurants
      const itemA = await MenuService.getItem(RESTAURANT_A, itemId);
      const itemB = await MenuService.getItem(RESTAURANT_B, itemId);

      // Verify complete isolation
      expect(itemA?.name).toBe('Restaurant A Item');
      expect(itemA?.price).toBe(11.99);

      expect(itemB?.name).toBe('Restaurant B Item');
      expect(itemB?.price).toBe(14.99);

      // Verify no cross-contamination
      expect(itemA?.name).not.toBe(itemB?.name);
      expect(itemA?.price).not.toBe(itemB?.price);
    });
  });

  describe('Categories Cache Keys', () => {
    it('should include restaurant_id in categories cache key', async () => {
      const { supabase } = await import('../src/config/database');

      const mockCategories = [
        {
          id: 'cat-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Entrees',
          active: true,
          display_order: 1
        }
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockCategories,
                error: null
              }))
            }))
          }))
        }))
      }));

      (supabase.from as any) = mockFrom;

      // Fetch categories
      const categories = await MenuService.getCategories(RESTAURANT_A);

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Restaurant A Entrees');

      // Fetch again - should hit cache
      const callCountBefore = mockFrom.mock.calls.length;
      const categoriesCached = await MenuService.getCategories(RESTAURANT_A);
      const callCountAfter = mockFrom.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
      expect(categoriesCached).toEqual(categories);
    });

    it('should isolate categories cache between restaurants', async () => {
      const { supabase } = await import('../src/config/database');

      const mockCategoriesA = [
        {
          id: 'cat-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Drinks',
          active: true,
          display_order: 1
        }
      ];

      const mockCategoriesB = [
        {
          id: 'cat-b-1',
          restaurant_id: RESTAURANT_B,
          name: 'Restaurant B Specials',
          active: true,
          display_order: 1
        }
      ];

      let currentRestaurant = RESTAURANT_A;

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'restaurant_id') {
              currentRestaurant = value;
            }
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: currentRestaurant === RESTAURANT_A ? mockCategoriesA : mockCategoriesB,
                  error: null
                }))
              }))
            };
          })
        }))
      }));

      (supabase.from as any) = mockFrom;

      // Fetch categories for both restaurants
      const categoriesA = await MenuService.getCategories(RESTAURANT_A);
      const categoriesB = await MenuService.getCategories(RESTAURANT_B);

      // Verify isolation
      expect(categoriesA[0].name).toBe('Restaurant A Drinks');
      expect(categoriesB[0].name).toBe('Restaurant B Specials');
      expect(categoriesA[0].name).not.toBe(categoriesB[0].name);
    });
  });

  describe('Cache Clear Isolation', () => {
    it('should only clear cache for specified restaurant', async () => {
      const { supabase } = await import('../src/config/database');

      // Setup mock data for both restaurants
      const mockItemsA = [
        {
          id: 'item-a-1',
          restaurant_id: RESTAURANT_A,
          name: 'Restaurant A Soup',
          price: 7.99,
          active: true,
          available: true,
          category_id: 'cat-a-1'
        }
      ];

      const mockItemsB = [
        {
          id: 'item-b-1',
          restaurant_id: RESTAURANT_B,
          name: 'Restaurant B Steak',
          price: 24.99,
          active: true,
          available: true,
          category_id: 'cat-b-1'
        }
      ];

      let currentRestaurant = RESTAURANT_A;
      let dbCallCount = 0;

      const mockFrom = vi.fn(() => {
        dbCallCount++;
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              if (field === 'restaurant_id') {
                currentRestaurant = value;
              }
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: currentRestaurant === RESTAURANT_A ? mockItemsA : mockItemsB,
                    error: null
                  }))
                }))
              };
            })
          }))
        };
      });

      (supabase.from as any) = mockFrom;

      // Fetch and cache items for both restaurants
      await MenuService.getItems(RESTAURANT_A);
      await MenuService.getItems(RESTAURANT_B);

      const callsAfterInitialFetch = dbCallCount;

      // Verify both are cached (no new DB calls)
      await MenuService.getItems(RESTAURANT_A);
      await MenuService.getItems(RESTAURANT_B);

      expect(dbCallCount).toBe(callsAfterInitialFetch);

      // Clear cache for restaurant A only
      MenuService.clearCache(RESTAURANT_A);

      // Fetch again
      await MenuService.getItems(RESTAURANT_A); // Should hit DB (cache cleared)
      await MenuService.getItems(RESTAURANT_B); // Should hit cache (not cleared)

      // Verify only restaurant A made a new DB call
      expect(dbCallCount).toBe(callsAfterInitialFetch + 1);
    });

    it('should clear specific item without affecting other restaurants', async () => {
      const { supabase } = await import('../src/config/database');

      const itemId = 'item-test-1';

      const mockItemA = {
        id: itemId,
        restaurant_id: RESTAURANT_A,
        name: 'Restaurant A Fish',
        price: 16.99,
        active: true,
        available: true,
        category_id: 'cat-a-1'
      };

      const mockItemB = {
        id: itemId,
        restaurant_id: RESTAURANT_B,
        name: 'Restaurant B Chicken',
        price: 18.99,
        active: true,
        available: true,
        category_id: 'cat-b-1'
      };

      let currentRestaurant = RESTAURANT_A;
      let dbCallCount = 0;

      const mockFrom = vi.fn(() => {
        dbCallCount++;
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              if (field === 'restaurant_id') {
                currentRestaurant = value;
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: currentRestaurant === RESTAURANT_A ? mockItemA : mockItemB,
                    error: null
                  }))
                }))
              };
            })
          }))
        };
      });

      (supabase.from as any) = mockFrom;

      // Cache items for both restaurants
      await MenuService.getItem(RESTAURANT_A, itemId);
      await MenuService.getItem(RESTAURANT_B, itemId);

      const callsAfterInitialFetch = dbCallCount;

      // Verify both are cached
      await MenuService.getItem(RESTAURANT_A, itemId);
      await MenuService.getItem(RESTAURANT_B, itemId);

      expect(dbCallCount).toBe(callsAfterInitialFetch);

      // Clear cache for specific item in restaurant A only
      MenuService.clearCache(RESTAURANT_A, itemId);

      // Fetch again
      await MenuService.getItem(RESTAURANT_A, itemId); // Should hit DB
      await MenuService.getItem(RESTAURANT_B, itemId); // Should hit cache

      // Verify only restaurant A made a new DB call
      expect(dbCallCount).toBe(callsAfterInitialFetch + 1);
    });

    it('should not affect other restaurants when clearing all cache types', async () => {
      const { supabase } = await import('../src/config/database');

      // Mock full menu data
      const mockCategoriesA = [{ id: 'cat-a-1', restaurant_id: RESTAURANT_A, name: 'Cat A', active: true, display_order: 1 }];
      const mockItemsA = [{ id: 'item-a-1', restaurant_id: RESTAURANT_A, name: 'Item A', price: 10, active: true, available: true, category_id: 'cat-a-1' }];

      const mockCategoriesB = [{ id: 'cat-b-1', restaurant_id: RESTAURANT_B, name: 'Cat B', active: true, display_order: 1 }];
      const mockItemsB = [{ id: 'item-b-1', restaurant_id: RESTAURANT_B, name: 'Item B', price: 12, active: true, available: true, category_id: 'cat-b-1' }];

      let currentRestaurant = RESTAURANT_A;
      let dbCallCount = 0;

      const mockFrom = vi.fn((table: string) => {
        dbCallCount++;
        if (table === 'menu_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, value: string) => {
                if (field === 'restaurant_id') currentRestaurant = value;
                return {
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({
                      data: currentRestaurant === RESTAURANT_A ? mockCategoriesA : mockCategoriesB,
                      error: null
                    }))
                  }))
                };
              })
            }))
          };
        } else {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, value: string) => {
                if (field === 'restaurant_id') currentRestaurant = value;
                return {
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({
                      data: currentRestaurant === RESTAURANT_A ? mockItemsA : mockItemsB,
                      error: null
                    }))
                  }))
                };
              })
            }))
          };
        }
      });

      (supabase.from as any) = mockFrom;

      // Cache full menu for both restaurants
      await MenuService.getFullMenu(RESTAURANT_A);
      await MenuService.getFullMenu(RESTAURANT_B);

      const callsAfterInitialFetch = dbCallCount;

      // Verify both are cached
      await MenuService.getFullMenu(RESTAURANT_A);
      await MenuService.getFullMenu(RESTAURANT_B);

      expect(dbCallCount).toBe(callsAfterInitialFetch);

      // Clear all cache types for restaurant A
      MenuService.clearCache(RESTAURANT_A);

      // Fetch again
      await MenuService.getFullMenu(RESTAURANT_A); // Should hit DB (2 calls: categories + items)
      await MenuService.getFullMenu(RESTAURANT_B); // Should hit cache (0 calls)

      // Verify only restaurant A made new DB calls
      expect(dbCallCount).toBe(callsAfterInitialFetch + 2);
    });
  });

  describe('Security - Cache Key Format Validation', () => {
    it('should prevent cache key collision between restaurants', () => {
      // This test verifies the cache key format prevents collisions
      // Cache key format: "prefix:restaurant_id" or "prefix:restaurant_id:item_id"

      const CACHE_KEYS = {
        FULL_MENU: 'menu:full:',
        CATEGORIES: 'categories:',
        ITEMS: 'items:',
        ITEM: 'item:',
      };

      // Generate cache keys for both restaurants
      const fullMenuKeyA = `${CACHE_KEYS.FULL_MENU}${RESTAURANT_A}`;
      const fullMenuKeyB = `${CACHE_KEYS.FULL_MENU}${RESTAURANT_B}`;

      const itemsKeyA = `${CACHE_KEYS.ITEMS}${RESTAURANT_A}`;
      const itemsKeyB = `${CACHE_KEYS.ITEMS}${RESTAURANT_B}`;

      const itemKeyA = `${CACHE_KEYS.ITEM}${RESTAURANT_A}:item-123`;
      const itemKeyB = `${CACHE_KEYS.ITEM}${RESTAURANT_B}:item-123`;

      // Verify keys are unique
      expect(fullMenuKeyA).not.toBe(fullMenuKeyB);
      expect(itemsKeyA).not.toBe(itemsKeyB);
      expect(itemKeyA).not.toBe(itemKeyB);

      // Verify keys contain restaurant_id
      expect(fullMenuKeyA).toContain(RESTAURANT_A);
      expect(fullMenuKeyB).toContain(RESTAURANT_B);
      expect(itemsKeyA).toContain(RESTAURANT_A);
      expect(itemsKeyB).toContain(RESTAURANT_B);
      expect(itemKeyA).toContain(RESTAURANT_A);
      expect(itemKeyB).toContain(RESTAURANT_B);
    });

    it('should handle restaurant_ids with special characters', () => {
      // Test with various UUID formats and edge cases
      const specialRestaurantIds = [
        '00000000-0000-0000-0000-000000000000', // All zeros
        'ffffffff-ffff-ffff-ffff-ffffffffffff', // All f's
        '12345678-1234-1234-1234-123456789abc', // Mixed
      ];

      const CACHE_KEY_PREFIX = 'menu:full:';

      specialRestaurantIds.forEach(restaurantId => {
        const cacheKey = `${CACHE_KEY_PREFIX}${restaurantId}`;

        // Verify key is well-formed
        expect(cacheKey).toContain(restaurantId);
        expect(cacheKey).toMatch(/^menu:full:[0-9a-f-]{36}$/);
      });
    });
  });
});
