import { stationRouting } from './stationRouting'
import { Order } from './types'

describe('stationRouting', () => {
  describe('getStationTypeForItem', () => {
    it('correctly identifies grill items', () => {
      expect(stationRouting.getStationTypeForItem({ 
        id: '1', 
        name: 'Grilled Burger', 
        quantity: 1 
      })).toBe('grill')
      
      expect(stationRouting.getStationTypeForItem({ 
        id: '2', 
        name: 'Salmon Steak', 
        quantity: 1 
      })).toBe('grill')
    })
    
    it('correctly identifies fryer items', () => {
      expect(stationRouting.getStationTypeForItem({ 
        id: '1', 
        name: 'French Fries', 
        quantity: 1 
      })).toBe('fryer')
      
      expect(stationRouting.getStationTypeForItem({ 
        id: '2', 
        name: 'Chicken Wings', 
        quantity: 1 
      })).toBe('fryer')
    })
    
    it('correctly identifies pizza items', () => {
      expect(stationRouting.getStationTypeForItem({ 
        id: '1', 
        name: 'Margherita Pizza', 
        quantity: 1 
      })).toBe('pizza')
    })
    
    it('defaults to cold station for unmatched items', () => {
      expect(stationRouting.getStationTypeForItem({ 
        id: '1', 
        name: 'Unknown Item', 
        quantity: 1 
      })).toBe('cold')
    })
  })
  
  describe('assignOrderToStations', () => {
    it('assigns items to appropriate stations', () => {
      const mockOrder: Order = {
        id: 'order-1',
        restaurant_id: 'test-restaurant',
        orderNumber: '001',
        tableNumber: '5',
        items: [
          { id: 'item-1', name: 'Burger', quantity: 1 },
          { id: 'item-2', name: 'French Fries', quantity: 1 },
          { id: 'item-3', name: 'Caesar Salad', quantity: 1 }
        ],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 25.99,
        paymentStatus: 'pending'
      }
      
      const assignments = stationRouting.assignOrderToStations(mockOrder)
      
      expect(assignments).toHaveLength(3)
      expect(assignments[0]).toMatchObject({
        orderId: 'order-1',
        itemId: 'item-1',
        status: 'pending'
      })
      
      // Check that different items went to different station types
      const stationIds = assignments.map(a => a.stationId)
      expect(new Set(stationIds).size).toBeGreaterThanOrEqual(2)
    })
    
    it('distributes items among stations of the same type', () => {
      // Reset stations to ensure clean state
      const stations = stationRouting.getStations()
      stations.forEach(s => s.currentOrders = [])
      
      const order1: Order = {
        id: 'order-1',
        restaurant_id: 'test-restaurant',
        orderNumber: '001',
        tableNumber: '1',
        items: [{ id: 'item-1', name: 'Burger', quantity: 1 }],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 10,
        paymentStatus: 'pending'
      }
      
      const order2: Order = {
        id: 'order-2',
        restaurant_id: 'test-restaurant',
        orderNumber: '002',
        tableNumber: '2',
        items: [{ id: 'item-2', name: 'Steak', quantity: 1 }],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 20,
        paymentStatus: 'pending'
      }
      
      stationRouting.assignOrderToStations(order1)
      stationRouting.assignOrderToStations(order2)
      
      // Both should go to grill stations
      const grillStations = stations.filter(s => s.type === 'grill' && s.isActive)
      const totalOrders = grillStations.reduce((sum, s) => sum + s.currentOrders.length, 0)
      
      expect(totalOrders).toBe(2)
    })
  })
  
  describe('getActiveStations', () => {
    it('returns only active stations', () => {
      const activeStations = stationRouting.getActiveStations()
      expect(activeStations.every(s => s.isActive)).toBe(true)
      expect(activeStations.length).toBeGreaterThan(0)
    })
  })
  
  describe('updateAssignmentStatus', () => {
    it('updates assignment status correctly', () => {
      const order: Order = {
        id: 'order-test',
        restaurant_id: 'test-restaurant',
        orderNumber: '999',
        tableNumber: '1',
        items: [{ id: 'item-test', name: 'Test Burger', quantity: 1 }],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 10,
        paymentStatus: 'pending'
      }
      
      stationRouting.assignOrderToStations(order)
      
      const updated = stationRouting.updateAssignmentStatus(
        'order-test',
        'item-test',
        'in-progress'
      )
      
      expect(updated).toBe(true)
      
      const assignments = stationRouting.getOrderAssignments('order-test')
      expect(assignments[0].status).toBe('in-progress')
    })
    
    it('removes order from station when completed', () => {
      const order: Order = {
        id: 'order-complete',
        restaurant_id: 'test-restaurant',
        orderNumber: '888',
        tableNumber: '1',
        items: [{ id: 'item-complete', name: 'Complete Burger', quantity: 1 }],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 10,
        paymentStatus: 'pending'
      }
      
      const assignments = stationRouting.assignOrderToStations(order)
      const stationId = assignments[0].stationId
      const station = stationRouting.getStations().find(s => s.id === stationId)
      
      expect(station?.currentOrders).toContain('order-complete')
      
      stationRouting.updateAssignmentStatus(
        'order-complete',
        'item-complete',
        'completed'
      )
      
      expect(station?.currentOrders).not.toContain('order-complete')
    })
  })
  
  describe('toggleStationStatus', () => {
    it('toggles station active status', () => {
      const stations = stationRouting.getStations()
      const testStation = stations[0]
      const initialStatus = testStation.isActive
      
      const newStatus = stationRouting.toggleStationStatus(testStation.id)
      expect(newStatus).toBe(!initialStatus)
      expect(testStation.isActive).toBe(!initialStatus)
      
      // Toggle back
      stationRouting.toggleStationStatus(testStation.id)
      expect(testStation.isActive).toBe(initialStatus)
    })
  })
})