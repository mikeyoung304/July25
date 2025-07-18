import { apiClient } from './api/client';
import { MenuItem } from '@/modules/menu/types';

export interface MenuResponse {
  items: MenuItem[];
  categories: string[];
}

export class MenuService {
  static async getMenuItems(restaurantId: string): Promise<MenuResponse> {
    try {
      const response = await apiClient.get<{ data: MenuItem[] }>('/menu', {
        headers: {
          'X-Restaurant-ID': restaurantId
        }
      });

      const items = response.data || [];
      
      // Extract unique categories
      const categories = Array.from(new Set(
        items
          .filter(item => item.category)
          .map(item => item.category as string)
      )).sort();

      return { items, categories };
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      throw new Error('Failed to load menu. Please try again.');
    }
  }

  static async getMenuItem(restaurantId: string, itemId: string): Promise<MenuItem | null> {
    try {
      const response = await apiClient.get<{ data: MenuItem }>(`/menu/${itemId}`, {
        headers: {
          'X-Restaurant-ID': restaurantId
        }
      });

      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch menu item:', error);
      return null;
    }
  }

  static async searchMenuItems(restaurantId: string, query: string): Promise<MenuItem[]> {
    try {
      const response = await apiClient.get<{ data: MenuItem[] }>('/menu/search', {
        params: { q: query },
        headers: {
          'X-Restaurant-ID': restaurantId
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to search menu items:', error);
      return [];
    }
  }
}