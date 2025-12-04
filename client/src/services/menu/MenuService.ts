import { MenuItem as SharedMenuItem, MenuCategory } from '@rebuild/shared'
import { httpClient } from '@/services/http/httpClient'
import { MenuItem } from '@/services/types'
import { logger } from '@/services/logger'

export interface IMenuService {
  getMenu(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }>
  getMenuItems(): Promise<MenuItem[]>
  getMenuCategories(): Promise<MenuCategory[]>
  updateMenuItemAvailability(itemId: string, is_available: boolean): Promise<void>
}

export class MenuService implements IMenuService {
  private categoriesCache: Map<string, MenuCategory> = new Map()

  // Transform backend API response to client MenuItem format
  private transformMenuItem(item: any, categories?: MenuCategory[]): MenuItem {
    // Handle both SharedMenuItem format and API response format
    let category: any = undefined
    
    if (item.category?.name) {
      category = item.category
    } else if (item.categoryId && categories) {
      const cat = categories.find(c => c.id === item.categoryId)
      category = cat ? { name: cat.name, id: cat.id } : undefined
    } else if (item.category_id && categories) {
      const cat = categories.find(c => c.id === item.category_id)
      category = cat ? { name: cat.name, id: cat.id } : undefined
    } else if (item.categoryId && this.categoriesCache.has(item.categoryId)) {
      const cat = this.categoriesCache.get(item.categoryId)!
      category = { name: cat.name, id: cat.id }
    } else if (item.category_id && this.categoriesCache.has(item.category_id)) {
      const cat = this.categoriesCache.get(item.category_id)!
      category = { name: cat.name, id: cat.id }
    }

    return {
      id: item.id,
      menuItemId: item.menuItemId || item.id,
      restaurantId: item.restaurant_id || item.restaurantId,
      categoryId: item.categoryId || item.category_id,
      category,
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl || item.image_url,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : (item.is_available !== undefined ? item.is_available : item.available),
      isFeatured: item.isFeatured || item.is_featured,
      dietaryFlags: item.dietaryFlags || item.dietary_flags || [],
      preparationTime: item.preparationTime || item.preparation_time || item.prepTimeMinutes,
      modifiers: item.modifiers?.map((mod: any) => ({
        id: mod.id,
        name: mod.name,
        price: mod.price
      })) || [],
      // Compatibility fields
      available: item.available,
      active: item.active,
      prepTimeMinutes: item.prepTimeMinutes || item.preparation_time,
      aliases: item.aliases || [],
      calories: item.calories
    }
  }

  async getMenu(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }> {
    try {
      // Only use mocks if explicitly enabled in dev mode
      const useMocks = import.meta.env.VITE_USE_MOCK_DATA === 'true' && 
                      import.meta.env.MODE === 'development';
      
      if (useMocks) {
        return this.getMockMenu();
      }
      
      const response = await httpClient.get<{ items: SharedMenuItem[]; categories: MenuCategory[] }>('/api/v1/menu')
      
      // Cache categories locally for transformation
      response.categories.forEach(cat => this.categoriesCache.set(cat.id, cat))
      return {
        items: response.items.map(item => this.transformMenuItem(item, response.categories)),
        categories: response.categories
      }
    } catch (error) {
      logger.error('Menu API failed', { error });
      throw new Error("Menu service error");
    }
  }

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      // Only use mocks if explicitly enabled in dev mode
      const useMocks = import.meta.env.VITE_USE_MOCK_DATA === 'true' && 
                      import.meta.env.MODE === 'development';
      
      if (useMocks) {
        return this.getMockMenu().items;
      }
      
      // First fetch categories to map them properly
      const categories = await this.getMenuCategories()
      const response = await httpClient.get<any[]>('/api/v1/menu/items')
      return response.map(item => this.transformMenuItem(item, categories))
    } catch (error) {
      logger.error('Menu items API failed', { error });
      throw new Error("Menu service error");
    }
  }

  async getMenuCategories(): Promise<MenuCategory[]> {
    try {
      // Only use mocks if explicitly enabled in dev mode
      const useMocks = import.meta.env.VITE_USE_MOCK_DATA === 'true' && 
                      import.meta.env.MODE === 'development';
      
      if (useMocks) {
        return this.getMockMenu().categories;
      }
      
      const response = await httpClient.get<MenuCategory[]>('/api/v1/menu/categories')
      // Cache categories
      response.forEach(cat => this.categoriesCache.set(cat.id, cat))
      return response
    } catch (error) {
      logger.error('Menu categories API failed', { error });
      throw new Error("Menu service error");
    }
  }

  async updateMenuItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    await httpClient.patch(`/api/v1/menu/items/${itemId}`, { is_available: isAvailable })
  }

  private getMockMenu(): { items: MenuItem[]; categories: MenuCategory[] } {
    return {
      items: [
        {
          id: '1',
          restaurantId: 'rest-1',
          categoryId: '2',
          name: 'Classic Burger',
          description: 'Juicy beef patty with lettuce, tomato, and cheese',
          price: 12.99,
          category: 'Main Course' as any,
          isAvailable: true,
          imageUrl: '/images/menu/Gemini_Generated_Image_5m93ul5m93ul5m93.jpeg',
          preparationTime: 15,
          dietaryFlags: ['dairy', 'gluten']
        },
        {
          id: '2',
          restaurantId: 'rest-1',
          categoryId: '1',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with Caesar dressing',
          price: 8.99,
          category: 'Appetizers' as any,
          isAvailable: true,
          imageUrl: '/images/menu/greek-salad.jpeg',
          preparationTime: 8,
          dietaryFlags: ['dairy', 'eggs']
        }
      ],
      categories: [
        {
          id: '1',
          name: 'Appetizers',
          description: 'Start your meal right',
          display_order: 1,
          is_active: true
        },
        {
          id: '2',
          name: 'Main Course',
          description: 'Our signature dishes',
          display_order: 2,
          is_active: true
        }
      ]
    }
  }
}

// Export singleton instance with default restaurant ID
export const menuService = new MenuService()