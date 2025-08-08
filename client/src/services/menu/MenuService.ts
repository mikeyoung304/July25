import { MenuItem as SharedMenuItem, MenuCategory } from '@rebuild/shared'
import { httpClient } from '@/services/http/httpClient'
import { MenuItem } from '@/services/types'

export interface IMenuService {
  getMenu(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }>
  getMenuItems(): Promise<MenuItem[]>
  getMenuCategories(): Promise<MenuCategory[]>
  updateMenuItemAvailability(itemId: string, available: boolean): Promise<void>
}

export class MenuService implements IMenuService {
  // Transform shared MenuItem to client MenuItem
  private transformMenuItem(item: SharedMenuItem): MenuItem {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category?.name || 'Uncategorized',
      available: item.is_available, // Map is_available to available
      imageUrl: item.image_url,
      restaurant_id: item.restaurant_id,
      calories: undefined, // Not in shared type
      modifiers: item.modifier_groups?.flatMap(group => 
        group.options.map(opt => ({
          id: opt.id,
          name: opt.name,
          price: opt.price_adjustment
        }))
      ) || []
    }
  }

  async getMenu(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }> {
    try {
      const response = await httpClient.get<{ items: SharedMenuItem[]; categories: MenuCategory[] }>('/api/v1/menu')
      return {
        items: response.items.map(item => this.transformMenuItem(item)),
        categories: response.categories
      }
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error)
      return this.getMockMenu()
    }
  }

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const response = await httpClient.get<SharedMenuItem[]>('/api/v1/menu/items')
      return response.map(item => this.transformMenuItem(item))
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error)
      return this.getMockMenu().items
    }
  }

  async getMenuCategories(): Promise<MenuCategory[]> {
    try {
      const response = await httpClient.get<MenuCategory[]>('/api/v1/menu/categories')
      return response
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error)
      return this.getMockMenu().categories
    }
  }

  async updateMenuItemAvailability(itemId: string, available: boolean): Promise<void> {
    try {
      await httpClient.patch(`/api/v1/menu/items/${itemId}`, { is_available: available })
    } catch (error) {
      console.warn('Mock: Updated menu item availability', { itemId, available })
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
          available: true,
          image_url: null,
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
          available: true,
          image_url: null,
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

export const menuService = new MenuService()