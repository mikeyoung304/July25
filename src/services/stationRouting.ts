import { Order, OrderItem } from '@/services/api'
import { Station, StationType, StationAssignment, STATION_CONFIG } from '@/types/station'

// Mock stations data
const mockStations: Station[] = [
  { id: 'station-1', name: 'Grill 1', type: 'grill', isActive: true, currentOrders: [] },
  { id: 'station-2', name: 'Fryer 1', type: 'fryer', isActive: true, currentOrders: [] },
  { id: 'station-3', name: 'Cold Prep', type: 'cold', isActive: true, currentOrders: [] },
  { id: 'station-4', name: 'Pizza Oven', type: 'pizza', isActive: true, currentOrders: [] },
  { id: 'station-5', name: 'Pasta Station', type: 'pasta', isActive: false, currentOrders: [] },
  { id: 'station-6', name: 'Drinks', type: 'drinks', isActive: true, currentOrders: [] }
]

const stationAssignments: Map<string, StationAssignment[]> = new Map()

export const stationRouting = {
  // Get all stations
  getStations(): Station[] {
    return [...mockStations]
  },
  
  // Get active stations only
  getActiveStations(): Station[] {
    return mockStations.filter(s => s.isActive)
  },
  
  // Determine which station type should handle an item
  getStationTypeForItem(item: OrderItem): StationType | null {
    const itemNameLower = item.name.toLowerCase()
    
    for (const [stationType, config] of Object.entries(STATION_CONFIG)) {
      for (const pattern of config.itemPatterns) {
        if (pattern.test(itemNameLower)) {
          return stationType as StationType
        }
      }
    }
    
    // Default fallback
    return 'cold'
  },
  
  // Assign order items to stations
  assignOrderToStations(order: Order): StationAssignment[] {
    const assignments: StationAssignment[] = []
    
    for (const item of order.items) {
      const stationType = this.getStationTypeForItem(item)
      if (!stationType) continue
      
      // Find least busy station of this type
      const availableStations = mockStations.filter(
        s => s.type === stationType && s.isActive
      )
      
      if (availableStations.length === 0) continue
      
      // Simple load balancing - assign to station with fewest orders
      const targetStation = availableStations.reduce((prev, curr) => 
        prev.currentOrders.length <= curr.currentOrders.length ? prev : curr
      )
      
      const assignment: StationAssignment = {
        orderId: order.id,
        itemId: item.id,
        stationId: targetStation.id,
        assignedAt: new Date(),
        status: 'pending'
      }
      
      assignments.push(assignment)
      targetStation.currentOrders.push(order.id)
    }
    
    // Store assignments
    stationAssignments.set(order.id, assignments)
    
    return assignments
  },
  
  // Get assignments for an order
  getOrderAssignments(orderId: string): StationAssignment[] {
    return stationAssignments.get(orderId) || []
  },
  
  // Get orders for a specific station
  getStationOrders(stationId: string): { order: Order; items: OrderItem[] }[] {
    const station = mockStations.find(s => s.id === stationId)
    if (!station) return []
    
    // This would normally come from the API with proper filtering
    // For now, we'll return mock data based on assignments
    const orders: { order: Order; items: OrderItem[] }[] = []
    
    // In a real implementation, this would query orders assigned to this station
    return orders
  },
  
  // Update assignment status
  updateAssignmentStatus(
    orderId: string, 
    itemId: string, 
    status: StationAssignment['status']
  ): boolean {
    const assignments = stationAssignments.get(orderId)
    if (!assignments) return false
    
    const assignment = assignments.find(a => a.itemId === itemId)
    if (!assignment) return false
    
    assignment.status = status
    
    // If completed, remove from station's current orders
    if (status === 'completed') {
      const station = mockStations.find(s => s.id === assignment.stationId)
      if (station) {
        station.currentOrders = station.currentOrders.filter(id => id !== orderId)
      }
    }
    
    return true
  },
  
  // Get station workload
  getStationWorkload(stationId: string): number {
    const station = mockStations.find(s => s.id === stationId)
    return station?.currentOrders.length || 0
  },
  
  // Toggle station active status
  toggleStationStatus(stationId: string): boolean {
    const station = mockStations.find(s => s.id === stationId)
    if (!station) return false
    
    station.isActive = !station.isActive
    return station.isActive
  }
}