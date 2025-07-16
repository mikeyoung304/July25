import { OrderService } from '../OrderService'
import { mockData, resetMockData } from '@/services/mockData'
import { Order } from '@/services/types'

describe('OrderService', () => {
  let orderService: OrderService
  
  beforeEach(() => {
    orderService = new OrderService()
    // Reset mock data
    resetMockData()
    mockData.orders.length = 0
    mockData.orders.push(
      {
        id: '1',
        restaurant_id: 'rest-1',
        orderNumber: '001',
        tableNumber: '5',
        items: [
          { id: '1', name: 'Test Item', quantity: 1 }
        ],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 10.00,
        paymentStatus: 'pending'
      }
    )
    // Add test tables
    mockData.tables.push(
      {
        id: 'test-table-1',
        restaurant_id: 'rest-1',
        type: 'square',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        seats: 4,
        label: '1',
        rotation: 0,
        status: 'available',
        z_index: 1
      },
      {
        id: 'test-table-2',
        restaurant_id: 'rest-1',
        type: 'square',
        x: 200,
        y: 100,
        width: 80,
        height: 80,
        seats: 4,
        label: '2',
        rotation: 0,
        status: 'available',
        z_index: 1
      },
      {
        id: 'test-table-10',
        restaurant_id: 'rest-1',
        type: 'square',
        x: 300,
        y: 100,
        width: 80,
        height: 80,
        seats: 4,
        label: '10',
        rotation: 0,
        status: 'available',
        z_index: 1
      }
    )
  })

  afterEach(() => {
    orderService.reset()
    resetMockData()
  })
  
  describe('getOrders', () => {
    it('should return all orders when no filters provided', async () => {
      const result = await orderService.getOrders('rest-1')
      
      expect(result.orders).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.orders[0].orderNumber).toBe('001')
    })
    
    it('should filter orders by status', async () => {
      mockData.orders.push({
        id: '2',
        restaurant_id: 'rest-1',
        orderNumber: '002',
        tableNumber: '6',
        items: [],
        status: 'preparing',
        orderTime: new Date(),
        totalAmount: 20.00,
        paymentStatus: 'paid'
      })
      
      const result = await orderService.getOrders('rest-1', { status: 'new' })
      
      expect(result.orders).toHaveLength(1)
      expect(result.orders[0].status).toBe('new')
    })
    
    it('should enforce rate limiting', async () => {
      // Make 10 requests (the limit)
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(orderService.getOrders('rest-1'))
      }
      await Promise.all(promises)
      
      // 11th request should fail
      await expect(orderService.getOrders('rest-1')).rejects.toThrow('Rate limit exceeded')
    }, 10000)
  })
  
  describe('getOrderById', () => {
    it('should return order when found', async () => {
      const order = await orderService.getOrderById('rest-1', '1')
      
      expect(order).toBeDefined()
      expect(order.orderNumber).toBe('001')
    })
    
    it('should throw error when order not found', async () => {
      await expect(orderService.getOrderById('rest-1', '999')).rejects.toThrow('Order not found')
    })
  })
  
  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const result = await orderService.updateOrderStatus('rest-1', '1', 'preparing')
      
      expect(result.success).toBe(true)
      expect(result.order.status).toBe('preparing')
      expect(mockData.orders[0].status).toBe('preparing')
    })
    
    it('should throw error when order not found', async () => {
      await expect(
        orderService.updateOrderStatus('rest-1', '999', 'preparing')
      ).rejects.toThrow('Order not found')
    })
  })
  
  describe('submitOrder', () => {
    it('should create new order with valid data', async () => {
      const orderData: Partial<Order> = {
        tableNumber: '10',
        items: [
          { id: '1', name: 'Burger', quantity: 2 }
        ],
        totalAmount: 25.00
      }
      
      const result = await orderService.submitOrder('rest-1', orderData)
      
      expect(result.success).toBe(true)
      expect(result.orderId).toBeDefined()
      expect(result.order).toBeDefined()
      expect(result.order.tableNumber).toBe('10')
      expect(result.order.items).toHaveLength(1)
    })
    
    it('should validate and sanitize input data', async () => {
      const orderData: Partial<Order> = {
        tableNumber: '<script>alert("xss")</script>',
        items: [
          { 
            id: '1', 
            name: 'Burger<script>alert("xss")</script>', 
            quantity: -5 // Invalid quantity
          }
        ],
        totalAmount: -100 // Invalid amount
      }
      
      await expect(orderService.submitOrder('rest-1', orderData)).rejects.toThrow()
    })
    
    it('should generate sequential order numbers', async () => {
      const order1 = await orderService.submitOrder('rest-1', {
        tableNumber: '1',
        items: [{ id: '1', name: 'Item 1', quantity: 1 }],
        totalAmount: 10
      })
      
      const order2 = await orderService.submitOrder('rest-1', {
        tableNumber: '2',
        items: [{ id: '2', name: 'Item 2', quantity: 1 }],
        totalAmount: 20
      })
      
      const orderNum1 = parseInt(order1.order.orderNumber)
      const orderNum2 = parseInt(order2.order.orderNumber)
      
      expect(orderNum2).toBe(orderNum1 + 1)
    })
  })
})