import { BaseService } from '@/services/base/BaseService'
import { MenuItem } from '@/services/types'
import { mockData } from '@/services/mockData'

export interface IMenuService {
  getMenuItems(category?: string): Promise<{ items: MenuItem[] }>
  getMenuItemById(itemId: string): Promise<MenuItem>
  updateMenuItemAvailability(itemId: string, available: boolean): Promise<{ success: boolean; item: MenuItem }>
}

export class MenuService extends BaseService implements IMenuService {
  async getMenuItems(category?: string): Promise<{ items: MenuItem[] }> {
    await this.delay(400)
    
    if (category) {
      return { items: mockData.menuItems.filter(item => item.category === category) }
    }
    
    return { items: mockData.menuItems }
  }

  async getMenuItemById(itemId: string): Promise<MenuItem> {
    await this.delay(200)
    const item = mockData.menuItems.find(i => i.id === itemId)
    if (!item) throw new Error('Menu item not found')
    return item
  }

  async updateMenuItemAvailability(itemId: string, available: boolean): Promise<{ success: boolean; item: MenuItem }> {
    await this.delay(300)
    const item = mockData.menuItems.find(i => i.id === itemId)
    if (!item) throw new Error('Menu item not found')
    
    item.available = available
    console.log('Mock: Updated menu item availability', { itemId, available })
    return { success: true, item }
  }
}

// Export singleton instance
export const menuService = new MenuService()