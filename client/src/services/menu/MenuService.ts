import { BaseService } from '@/services/base/BaseService'
import { MenuItem } from '@/services/types'
import { mockData } from '@/services/mockData'
import { httpClient } from '@/services/http'

export interface IMenuService {
  getMenuItems(category?: string): Promise<MenuItem[]>
  getMenuItemById(itemId: string): Promise<MenuItem>
  updateMenuItemAvailability(itemId: string, available: boolean): Promise<{ success: boolean; item: MenuItem }>
}

export class MenuService extends BaseService implements IMenuService {
  async getMenuItems(category?: string): Promise<MenuItem[]> {
    // Try API first in production mode
    if (this.options?.apiMode && this.options.apiMode !== 'mock') {
      try {
        const response = await httpClient.get<{ items: MenuItem[] }>('/menu', {
          params: category ? { category } : undefined
        })
        return response.items
      } catch (error) {
        console.warn('API call failed, falling back to mock data:', error)
      }
    }
    
    // Use mock data
    await this.delay(400)
    if (category) {
      return mockData.menuItems.filter(item => item.category === category)
    }
    return mockData.menuItems
  }

  async getMenuItemById(itemId: string): Promise<MenuItem> {
    await this.delay(200)
    const item = mockData.menuItems.find(i => i.id === itemId)
    if (!item) throw new Error('Menu item not found')
    return item
  }

  async updateMenuItemAvailability(itemId: string, available: boolean): Promise<{ success: boolean; item: MenuItem }> {
    // Try API first in production mode
    if (this.options?.apiMode && this.options.apiMode !== 'mock') {
      try {
        const response = await httpClient.patch<{ success: boolean; item: MenuItem }>(
          `/menu/${itemId}`,
          { available }
        )
        return response
      } catch (error) {
        console.warn('API call failed, falling back to mock data:', error)
      }
    }
    
    // Use mock data
    await this.delay(300)
    const item = mockData.menuItems.find(i => i.id === itemId)
    if (!item) throw new Error('Menu item not found')
    
    item.available = available
    console.warn('Mock: Updated menu item availability', { itemId, available })
    return { success: true, item }
  }
}

// Export singleton instance
export const menuService = new MenuService()