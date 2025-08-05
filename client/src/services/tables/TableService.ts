import { HttpServiceAdapter } from '@/services/base/HttpServiceAdapter'
import { Table } from '@/modules/floor-plan/types'
import { env } from '@/utils/env'

export interface ITableService {
  getTables(): Promise<{ tables: Table[] }>
  getTableById(tableId: string): Promise<Table>
  createTable(table: Omit<Table, 'id'>): Promise<Table>
  updateTable(tableId: string, updates: Partial<Table>): Promise<Table>
  deleteTable(tableId: string): Promise<{ success: boolean }>
  updateTableStatus(tableId: string, status: Table['status'], orderId?: string): Promise<{ success: boolean; table: Table }>
  batchUpdateTables(tables: Partial<Table>[]): Promise<Table[]>
}

export class TableService extends HttpServiceAdapter implements ITableService {
  constructor(private restaurantId?: string) {
    super({ useMockData: false }) // Force real API calls
  }

  private getHeaders() {
    // Restaurant ID can be provided at construction or via environment
    const restaurantId = this.restaurantId || env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
    return { 'x-restaurant-id': restaurantId }
  }

  async getTables(): Promise<{ tables: Table[] }> {
    const response = await this.httpClient.get<Table[]>('/api/v1/tables')
    return { tables: response }
  }

  async getTableById(tableId: string): Promise<Table> {
    const response = await this.httpClient.get<Table>(`/api/v1/tables/${tableId}`)
    return response
  }

  async createTable(table: Omit<Table, 'id'>): Promise<Table> {
    const response = await this.httpClient.post<Table>('/api/v1/tables', table)
    return response
  }

  async updateTable(tableId: string, updates: Partial<Table>): Promise<Table> {
    const response = await this.httpClient.put<Table>(`/api/v1/tables/${tableId}`, updates)
    return response
  }

  async deleteTable(tableId: string): Promise<{ success: boolean }> {
    const response = await this.httpClient.delete<{ success: boolean }>(`/api/v1/tables/${tableId}`)
    return response
  }

  async updateTableStatus(tableId: string, status: Table['status'], orderId?: string): Promise<{ success: boolean; table: Table }> {
    const response = await this.httpClient.patch<Table>(`/api/v1/tables/${tableId}/status`, 
      { status, orderId }
    )
    return { success: true, table: response }
  }

  async batchUpdateTables(tables: Partial<Table>[]): Promise<Table[]> {
    const response = await this.httpClient.put<Table[]>('/api/v1/tables/batch', 
      { tables }
    )
    return response
  }
}

// Export singleton instance with default restaurant ID
export const tableService = new TableService()