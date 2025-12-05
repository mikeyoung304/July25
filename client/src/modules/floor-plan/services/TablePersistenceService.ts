import { logger } from '@/services/logger'
import { tableService } from '@/services/tables/TableService'
import { Table } from '../types'
import { toast } from 'react-hot-toast'

/**
 * Service for handling table persistence (save/load operations)
 * Extracted from FloorPlanEditor for better testability and separation of concerns
 */
export class TablePersistenceService {
  /**
   * Save tables to the backend
   * Handles create/update logic and refreshes state after save
   */
  static async saveTables(
    tables: Table[],
    restaurantId: string,
    onSuccess?: (savedTables: Table[]) => void
  ): Promise<Table[] | null> {
    if (tables.length === 0) {
      toast.error('No tables to save')
      return null
    }

    // Basic duplicate name check
    const labels = tables.map(t => t.label.trim().toLowerCase())
    const duplicates = labels.filter((label, index) =>
      label && labels.indexOf(label) !== index
    )

    if (duplicates.length > 0) {
      toast.error(`Duplicate table names found. Please rename tables.`)
      logger.warn('Duplicate names found:', duplicates)
      return null
    }

    logger.info('Starting save process...')

    try {
      // Separate new tables (with generated IDs) from existing tables (with UUID IDs)
      const newTables = tables.filter(table => table.id.startsWith('table-'))
      const existingTables = tables.filter(table => !table.id.startsWith('table-'))

      logger.info('🔧 Save analysis:', {
        total: tables.length,
        new: newTables.length,
        existing: existingTables.length
      })

      const savedTables: Table[] = []

      // 1. Create new tables first
      if (newTables.length > 0) {
        logger.info(`🆕 Creating ${newTables.length} new tables...`)
        logger.info('Creating new tables:', newTables)
        for (const table of newTables) {
          const cleanNewTable = {
            restaurant_id: restaurantId,
            label: table.label.trim(),
            seats: table.seats,
            x: Math.round(table.x),
            y: Math.round(table.y),
            width: Math.round(table.width),
            height: Math.round(table.height),
            rotation: table.rotation || 0,
            type: table.type,
            status: table.status,
            current_order_id: table.current_order_id || null,
            active: table.active !== false,
            z_index: table.z_index || 1
          }

          logger.debug('Calling tableService.createTable with:', cleanNewTable)
          const createdTable = await tableService.createTable(cleanNewTable)
          logger.debug('Received created table:', createdTable)
          savedTables.push(createdTable)
          logger.info('✅ Created table:', createdTable.id)
        }
      }

      // 2. Update existing tables
      if (existingTables.length > 0) {
        logger.info(`🔄 Updating ${existingTables.length} existing tables...`)
        logger.info('Updating existing tables:', existingTables)
        const cleanExistingTables = existingTables.map(table => ({
          id: table.id,
          label: table.label.trim(),
          seats: table.seats,
          x: Math.round(table.x),
          y: Math.round(table.y),
          width: Math.round(table.width),
          height: Math.round(table.height),
          rotation: table.rotation || 0,
          type: table.type,
          status: table.status,
          current_order_id: table.current_order_id || null,
          active: table.active !== false,
          z_index: table.z_index || 1
        }))

        logger.debug('Calling tableService.batchUpdateTables with:', cleanExistingTables)
        const updatedTables = await tableService.batchUpdateTables(cleanExistingTables)
        logger.debug('Received updated tables:', updatedTables)
        savedTables.push(...updatedTables)
      }

      logger.info(`✅ Save successful, total tables: ${savedTables.length}`)
      toast.success(`Floor plan saved! (${savedTables.length} tables)`)
      onSuccess?.(savedTables)

      // Force reload tables to ensure consistency
      setTimeout(async () => {
        try {
          logger.info('[TablePersistenceService] Reloading tables after save to ensure consistency')
          const { tables: refreshedTables } = await tableService.getTables()
          logger.info('[TablePersistenceService] Tables refreshed after save:', refreshedTables?.length || 0)
        } catch (refreshError) {
          logger.error('[TablePersistenceService] Failed to refresh tables after save:', refreshError)
        }
      }, 500)

      return savedTables
    } catch (error: any) {
      logger.error('[TablePersistenceService] Save failed:', {
        error: error.message,
        status: error.status,
        details: error.details,
        restaurantId,
        tableCount: tables.length
      })
      console.error('❌ Save failed with error:', error)
      console.error('❌ Error type:', error.constructor.name)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error status:', error.status)
      console.error('❌ Error details:', error.details)

      // More specific error messages
      if (error.status === 401) {
        toast.error('Authentication failed. Please sign in again.')
      } else if (error.status === 403) {
        toast.error('You do not have permission to save the floor plan.')
      } else if (error.status === 400) {
        toast.error(`Invalid data: ${error.message || 'Please check table names and positions.'}`)
      } else {
        toast.error(`Failed to save floor plan: ${error.message || 'Unknown error'}`)
      }

      return null
    }
  }

  /**
   * Load tables from the backend
   */
  static async loadTables(restaurantId: string): Promise<Table[]> {
    try {
      logger.info('[TablePersistenceService] Loading tables for restaurant:', restaurantId)

      const { tables } = await tableService.getTables()
      logger.info('[TablePersistenceService] Loaded tables from API:', {
        count: tables?.length || 0,
        sample: tables?.[0] || null
      })

      if (tables?.length > 0) {
        toast.success(`Loaded ${tables.length} tables`)
      } else {
        logger.info('[TablePersistenceService] No tables found, starting with empty floor plan')
      }

      return tables || []
    } catch (error: any) {
      logger.error('[TablePersistenceService] Failed to load tables:', {
        error: error.message,
        restaurantId,
        stack: error.stack
      })
      console.error('Failed to load tables:', error)
      toast.error('Failed to load floor plan. Please check your connection.')
      // Return empty array on error so user can still create new tables
      return []
    }
  }
}
