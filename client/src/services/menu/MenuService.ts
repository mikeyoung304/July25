import { MenuItem as SharedMenuItem, MenuCategory } from '@rebuild/shared'
import { httpClient } from '@/services/http/httpClient'
import { MenuItem } from '@/services/types'

export interface IMenuService {
  getMenu(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }>
  getMenuItems(): Promise<MenuItem[]>
  getMenuCategories(): Promise<MenuCategory[]>
  updateMenuItemAvailability(itemId: string, is_available: boolean): Promise<void>
}

export class MenuService implements IMenuService {
  private categoriesCache: Map<string, MenuCategory> = new Map()

  // Transform shared MenuItem to client MenuItem
  private transformMenuItem(item: any, categories?: MenuCategory[]): MenuItem {
    // Handle both SharedMenuItem format and API response format
    let category = 'Uncategorized'
    
    if (item.category?.name) {
      category = item.category.name
    } else if (item.category_id && categories) {
      const cat = categories.find(c => c.id === item.category_id)
      category = cat?.name || 'Uncategorized'
    } else if (item.category_id && this.categoriesCache.has(item.category_id)) {
      category = this.categoriesCache.get(item.category_id)!.name
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category,
      is_available: item.is_available !== undefined ? item.is_available : item.available,
      image_url: item.imageUrl || item.image_url,
      restaurant_id: item.restaurant_id,
      calories: item.calories,
      modifiers: item.modifier_groups?.flatMap((group: any) => 
        group.options.map((opt: any) => ({
          id: opt.id,
          name: opt.name,
          price: opt.price_adjustment || opt.price || 0
        }))
      ) || item.modifiers || []
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
      console.error('Menu API failed:', error);
      throw error;
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
      console.error('Menu items API failed:', error);
      throw error;
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
      console.error('Menu categories API failed:', error);
      throw error;
    }
  }

  async updateMenuItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    try {
      await httpClient.patch(`/api/v1/menu/items/${itemId}`, { is_available: isAvailable })
    } catch (error) {
      console.warn('Mock: Updated menu item availability', { itemId, isAvailable })
      // In mock mode, just log the update
    }
  }

  private getMockMenu(): { items: MenuItem[]; categories: MenuCategory[] } {
    return {
      items: [
        {
          id: '1',
          name: 'Classic Burger',
          description: 'Juicy beef patty with lettuce, tomato, and cheese',
          price: 12.99,
          category: 'Main Course',
          is_available: true,
          image_url: '/images/menu/Gemini_Generated_Image_5m93ul5m93ul5m93.jpeg',
          preparation_time: 15,
          allergens: ['dairy', 'gluten'],
          nutritional_info: {
            calories: 650,
            protein: 25,
            carbs: 45,
            fat: 35
          }
        },
        {
          id: '2',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with Caesar dressing',
          price: 8.99,
          category: 'Appetizers',
          is_available: true,
          image_url: '/images/menu/greek-salad.jpeg',
          preparation_time: 8,
          allergens: ['dairy', 'eggs'],
          nutritional_info: {
            calories: 320,
            protein: 8,
            carbs: 12,
            fat: 28
          }
        }
      ],
      categories: [
        {
          id: '1',
          name: 'Appetizers',
          description: 'Start your meal right',
          sort_order: 1
        },
        {
          id: '2',
          name: 'Main Course',
          description: 'Our signature dishes',
          sort_order: 2
        }
      ]
    }
  }
}

// Export singleton instance with default restaurant ID
export const menuService = new MenuService()