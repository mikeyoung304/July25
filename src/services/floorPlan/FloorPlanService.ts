/**
 * FloorPlanService - Handles floor plan save/load operations
 * Integrates with Luis's backend API for persistence
 */

import { HttpServiceAdapter } from '@/services/base/HttpServiceAdapter'
import { Table } from '@/modules/floor-plan/types'

export interface FloorPlan {
  id: string
  restaurantId: string
  name: string
  tables: Table[]
  createdAt: Date
  updatedAt: Date
}

export interface SaveFloorPlanResponse {
  success: boolean
  floorPlan: FloorPlan
}

export class FloorPlanService extends HttpServiceAdapter {
  /**
   * Get the floor plan for a restaurant
   */
  async getFloorPlan(restaurantId: string): Promise<FloorPlan | null> {
    return this.execute(
      // Real API call
      async () => {
        try {
          const response = await this.httpClient.get<FloorPlan>(
            `/api/v1/floor-plans/${restaurantId}`
          )
          
          this.logServiceCall('GET', `/api/v1/floor-plans/${restaurantId}`, null, response)
          
          return response
        } catch (error) {
          // If 404, return null (no floor plan exists yet)
          if ((error as { status?: number })?.status === 404) {
            return null
          }
          throw error
        }
      },
      // Mock implementation
      async () => {
        await this.delay(300)
        
        // Check localStorage for mock floor plan
        const mockData = localStorage.getItem(`mockFloorPlan_${restaurantId}`)
        if (!mockData) {
          return null
        }
        
        try {
          const tables = JSON.parse(mockData)
          return {
            id: `floor-plan-${restaurantId}`,
            restaurantId,
            name: 'Main Dining Room',
            tables,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } catch {
          return null
        }
      }
    )
  }

  /**
   * Save or update the floor plan for a restaurant
   */
  async saveFloorPlan(
    restaurantId: string, 
    tables: Table[],
    name: string = 'Main Dining Room'
  ): Promise<SaveFloorPlanResponse> {
    this.checkRateLimit('saveFloorPlan')
    
    return this.execute(
      // Real API call
      async () => {
        // Check if floor plan exists
        const existingPlan = await this.getFloorPlan(restaurantId)
        
        let response: FloorPlan
        
        if (existingPlan) {
          // Update existing floor plan
          response = await this.httpClient.put<FloorPlan>(
            `/api/v1/floor-plans/${existingPlan.id}`,
            { tables, name }
          )
          
          this.logServiceCall('PUT', `/api/v1/floor-plans/${existingPlan.id}`, { tables, name }, response)
        } else {
          // Create new floor plan
          response = await this.httpClient.post<FloorPlan>(
            '/api/v1/floor-plans',
            { 
              restaurantId,
              tables,
              name
            }
          )
          
          this.logServiceCall('POST', '/api/v1/floor-plans', { restaurantId, tables, name }, response)
        }
        
        return { 
          success: true, 
          floorPlan: response 
        }
      },
      // Mock implementation
      async () => {
        await this.delay(500)
        
        // Save to localStorage for mock persistence
        localStorage.setItem(
          `mockFloorPlan_${restaurantId}`,
          JSON.stringify(tables)
        )
        
        const floorPlan: FloorPlan = {
          id: `floor-plan-${restaurantId}`,
          restaurantId,
          name,
          tables,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        console.log('Mock: Saved floor plan', { restaurantId, tableCount: tables.length })
        
        return { 
          success: true, 
          floorPlan
        }
      }
    )
  }

  /**
   * Delete a floor plan (if needed)
   */
  async deleteFloorPlan(restaurantId: string): Promise<{ success: boolean }> {
    return this.execute(
      // Real API call
      async () => {
        const existingPlan = await this.getFloorPlan(restaurantId)
        if (!existingPlan) {
          throw new Error('Floor plan not found')
        }
        
        await this.httpClient.delete(`/api/v1/floor-plans/${existingPlan.id}`)
        
        this.logServiceCall('DELETE', `/api/v1/floor-plans/${existingPlan.id}`, null, null)
        
        return { success: true }
      },
      // Mock implementation
      async () => {
        await this.delay(300)
        
        localStorage.removeItem(`mockFloorPlan_${restaurantId}`)
        
        console.log('Mock: Deleted floor plan', { restaurantId })
        
        return { success: true }
      }
    )
  }

  /**
   * Get all floor plans for a restaurant (if multiple layouts are supported)
   */
  async getAllFloorPlans(restaurantId: string): Promise<FloorPlan[]> {
    return this.execute(
      // Real API call
      async () => {
        const response = await this.httpClient.get<FloorPlan[]>(
          '/api/v1/floor-plans',
          { params: { restaurantId } }
        )
        
        this.logServiceCall('GET', '/api/v1/floor-plans', { restaurantId }, response)
        
        return response
      },
      // Mock implementation
      async () => {
        await this.delay(300)
        
        // For mock, just return the single floor plan if it exists
        const plan = await this.getFloorPlan(restaurantId)
        return plan ? [plan] : []
      }
    )
  }
}

// Export singleton instance
export const floorPlanService = new FloorPlanService()