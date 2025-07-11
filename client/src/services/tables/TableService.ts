import { BaseService } from '@/services/base/BaseService'
import { Table } from '@/services/types'
import { mockData } from '@/services/mockData'

export interface ITableService {
  getTables(): Promise<{ tables: Table[] }>
  getTableById(tableId: string): Promise<Table>
  updateTableStatus(tableId: string, status: Table['status']): Promise<{ success: boolean; table: Table }>
}

export class TableService extends BaseService implements ITableService {
  async getTables(): Promise<{ tables: Table[] }> {
    await this.delay(400)
    return { tables: mockData.tables }
  }

  async getTableById(tableId: string): Promise<Table> {
    await this.delay(200)
    const table = mockData.tables.find(t => t.id === tableId)
    if (!table) throw new Error('Table not found')
    return table
  }

  async updateTableStatus(tableId: string, status: Table['status']): Promise<{ success: boolean; table: Table }> {
    await this.delay(300)
    const table = mockData.tables.find(t => t.id === tableId)
    if (!table) throw new Error('Table not found')
    
    table.status = status
    console.log('Mock: Updated table status', { tableId, status })
    return { success: true, table }
  }
}

// Export singleton instance
export const tableService = new TableService()