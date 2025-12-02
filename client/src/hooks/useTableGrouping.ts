import { useMemo } from 'react'
import type { Order, OrderItem } from '@rebuild/shared'
import { getOrderUrgency } from '@rebuild/shared/config/kds'

export interface TableGroup {
  tableNumber: string
  orders: Order[]
  totalItems: number
  completedItems: number
  readyItems: number
  preparingItems: number
  oldestOrderTime: string
  newestOrderTime: string
  status: 'pending' | 'in-progress' | 'partially-ready' | 'ready' | 'completed'
  completionPercentage: number
  serverName?: string
  section?: string
  estimatedCompletionTime?: string
  urgencyLevel: 'normal' | 'warning' | 'urgent'
}

export interface GroupedOrders {
  tables: Map<string, TableGroup>
  takeout: Order[]
  delivery: Order[]
  driveThru: Order[]
  unassigned: Order[]
}

/**
 * Intelligent Table Grouping Hook
 * Groups orders by table and provides comprehensive status tracking
 */
export const useTableGrouping = (orders: Order[]) => {
  return useMemo(() => {
    const groups: GroupedOrders = {
      tables: new Map<string, TableGroup>(),
      takeout: [],
      delivery: [],
      driveThru: [],
      unassigned: []
    }
    
    // Process each order
    orders.forEach(order => {
      // Skip completed or cancelled orders
      if (['completed', 'cancelled'].includes(order.status)) {
        return
      }

      if (order.table_number) {
        // Initialize table group if not exists
        if (!groups.tables.has(order.table_number)) {
          groups.tables.set(order.table_number, {
            tableNumber: order.table_number,
            orders: [],
            totalItems: 0,
            completedItems: 0,
            readyItems: 0,
            preparingItems: 0,
            oldestOrderTime: order.created_at,
            newestOrderTime: order.created_at,
            status: 'pending',
            completionPercentage: 0,
            serverName: undefined,
            section: undefined,
            estimatedCompletionTime: undefined,
            urgencyLevel: 'normal'
          })
        }
        
        const tableGroup = groups.tables.get(order.table_number)!
        tableGroup.orders.push(order)
        
        // Update timing
        if (new Date(order.created_at) < new Date(tableGroup.oldestOrderTime)) {
          tableGroup.oldestOrderTime = order.created_at
        }
        if (new Date(order.created_at) > new Date(tableGroup.newestOrderTime)) {
          tableGroup.newestOrderTime = order.created_at
        }
        
        // Count items by status
        order.items.forEach((_item: OrderItem) => {
          tableGroup.totalItems++
          
          // Map order status to item status
          switch (order.status) {
            case 'ready':
              tableGroup.readyItems++
              break
            case 'preparing':
            case 'confirmed':
              tableGroup.preparingItems++
              break
            case 'completed':
              tableGroup.completedItems++
              break
          }
        })

        // Extract server and section from order metadata if available
        // Only set if not already set (first order wins for table group)
        if (!tableGroup.serverName && order.metadata?.serverName) {
          tableGroup.serverName = order.metadata.serverName
        }
        if (!tableGroup.section && order.metadata?.section) {
          tableGroup.section = order.metadata.section
        }

      } else {
        // Route to appropriate non-table category based on order type
        const orderType = order.type?.toLowerCase()
        
        switch (orderType) {
          case 'pickup':
            groups.takeout.push(order)
            break
          case 'delivery':
            groups.delivery.push(order)
            break
          case 'drive-thru':
            groups.driveThru.push(order)
            break
          default:
            // Orders without a table number and unclear type
            groups.unassigned.push(order)
        }
      }
    })
    
    // Calculate group statistics and status
    groups.tables.forEach(tableGroup => {
      // Calculate completion percentage
      if (tableGroup.totalItems > 0) {
        tableGroup.completionPercentage = Math.round(
          ((tableGroup.readyItems + tableGroup.completedItems) / tableGroup.totalItems) * 100
        )
      }
      
      // Determine overall table status
      if (tableGroup.completedItems === tableGroup.totalItems) {
        tableGroup.status = 'completed'
      } else if (tableGroup.readyItems === tableGroup.totalItems) {
        tableGroup.status = 'ready'
      } else if (tableGroup.readyItems > 0) {
        tableGroup.status = 'partially-ready'
      } else if (tableGroup.preparingItems > 0) {
        tableGroup.status = 'in-progress'
      } else {
        tableGroup.status = 'pending'
      }
      
      // Calculate urgency based on oldest order age
      const ageMinutes = Math.floor(
        (Date.now() - new Date(tableGroup.oldestOrderTime).getTime()) / 60000
      )
      tableGroup.urgencyLevel = getOrderUrgency(ageMinutes)
      
      // Estimate completion time (simple version - can be enhanced)
      // Assuming average 15 minutes per order from preparing to ready
      const preparingOrders = tableGroup.orders.filter(o => 
        ['confirmed', 'preparing'].includes(o.status)
      ).length
      
      if (preparingOrders > 0) {
        const estimatedMinutes = Math.max(15, preparingOrders * 5) // 5 min per order min 15
        const estimatedTime = new Date(Date.now() + estimatedMinutes * 60000)
        tableGroup.estimatedCompletionTime = estimatedTime.toISOString()
      }
    })
    
    return groups
  }, [orders])
}

/**
 * Sort table groups by various criteria
 */
export const sortTableGroups = (
  groups: Map<string, TableGroup>,
  sortBy: 'urgency' | 'completion' | 'table' | 'age' = 'urgency'
): TableGroup[] => {
  const groupArray = Array.from(groups.values())
  
  switch (sortBy) {
    case 'urgency':
      // Sort by urgency level, then by age
      return groupArray.sort((a, b) => {
        const urgencyOrder = { urgent: 0, warning: 1, normal: 2 }
        const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
        if (urgencyDiff !== 0) return urgencyDiff

        // If same urgency, sort by oldest order
        return new Date(a.oldestOrderTime).getTime() - new Date(b.oldestOrderTime).getTime()
      })
      
    case 'completion':
      // Sort by completion percentage (lowest first to focus on incomplete tables)
      return groupArray.sort((a, b) => a.completionPercentage - b.completionPercentage)
      
    case 'table':
      // Sort by table number
      return groupArray.sort((a, b) => {
        const aNum = parseInt(a.tableNumber) || 0
        const bNum = parseInt(b.tableNumber) || 0
        return aNum - bNum
      })
      
    case 'age':
      // Sort by oldest order
      return groupArray.sort((a, b) => 
        new Date(a.oldestOrderTime).getTime() - new Date(b.oldestOrderTime).getTime()
      )
      
    default:
      return groupArray
  }
}

/**
 * Get table group statistics
 */
export const getTableGroupStats = (groups: Map<string, TableGroup>) => {
  const stats = {
    totalTables: groups.size,
    readyTables: 0,
    partiallyReadyTables: 0,
    inProgressTables: 0,
    pendingTables: 0,
    urgentTables: 0,
    averageCompletion: 0,
    totalOrders: 0,
    totalItems: 0
  }
  
  let totalCompletion = 0
  
  groups.forEach(group => {
    stats.totalOrders += group.orders.length
    stats.totalItems += group.totalItems
    totalCompletion += group.completionPercentage
    
    switch (group.status) {
      case 'ready':
        stats.readyTables++
        break
      case 'partially-ready':
        stats.partiallyReadyTables++
        break
      case 'in-progress':
        stats.inProgressTables++
        break
      case 'pending':
        stats.pendingTables++
        break
    }
    
    if (group.urgencyLevel === 'urgent') stats.urgentTables++
  })
  
  if (groups.size > 0) {
    stats.averageCompletion = Math.round(totalCompletion / groups.size)
  }
  
  return stats
}