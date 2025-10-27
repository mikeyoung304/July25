import { OrderService } from '../OrderService'
import { vi } from 'vitest'
import { httpClient } from '@/services/http/httpClient'

// Mock the httpClient
vi.mock('@/services/http/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('OrderService', () => {
  let orderService: OrderService

  beforeEach(() => {
    orderService = new OrderService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
  
  describe('getOrders', () => {
    it('should return all orders when no filters provided', async () => {
      const mockOrders = [
        {
          id: '1',
          restaurant_id: 'rest-1',
          order_number: '001',
          table_number: '5',
          items: [{ id: '1', menu_item_id: '1', name: 'Test Item', quantity: 1, price: 10, subtotal: 10 }],
          status: 'new',
          type: 'dine-in',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subtotal: 10.00,
          tax: 0.80,
          total: 10.80,
          payment_status: 'pending'
        }
      ];

      (httpClient.get as vi.Mock).mockResolvedValue(mockOrders)

      const result = await orderService.getOrders()

      expect(result).toHaveLength(1)
      expect(result[0].order_number).toBe('001')
      expect(httpClient.get).toHaveBeenCalledWith('/api/v1/orders', { params: {} })
    })

    it('should filter orders by status', async () => {
      const mockOrders = [
        {
          id: '1',
          restaurant_id: 'rest-1',
          order_number: '001',
          table_number: '5',
          items: [],
          status: 'new',
          type: 'dine-in',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subtotal: 10.00,
          tax: 0.80,
          total: 10.80,
          payment_status: 'pending'
        }
      ];

      (httpClient.get as vi.Mock).mockResolvedValue(mockOrders)

      const result = await orderService.getOrders({ status: 'new' })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('new')
      expect(httpClient.get).toHaveBeenCalledWith('/api/v1/orders', {
        params: { status: 'new' }
      })
    })

    it('should handle API errors and fallback to mock data', async () => {
      (httpClient.get as vi.Mock).mockRejectedValue(new Error('API Error'))

      const result = await orderService.getOrders()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
  
  describe('getOrderById', () => {
    it('should return order when found via API', async () => {
      const mockOrder = {
        id: '1',
        restaurant_id: 'rest-1',
        order_number: '001',
        table_number: '5',
        items: [],
        status: 'new',
        type: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: 10.00,
        tax: 0.80,
        total: 10.80,
        payment_status: 'pending'
      };

      (httpClient.get as vi.Mock).mockResolvedValue(mockOrder)

      const order = await orderService.getOrderById('1')

      expect(order).toBeDefined()
      expect(order.order_number).toBe('001')
      expect(httpClient.get).toHaveBeenCalledWith('/api/v1/orders/1')
    })

    it('should fallback to mock data when API fails', async () => {
      (httpClient.get as vi.Mock).mockRejectedValue(new Error('API Error'))

      const order = await orderService.getOrderById('order-1')

      expect(order).toBeDefined()
      expect(order.order_number).toBe('#1001')
    })

    it('should throw error when order not found in mock data', async () => {
      (httpClient.get as vi.Mock).mockRejectedValue(new Error('API Error'))

      await expect(orderService.getOrderById('999')).rejects.toThrow('Order not found')
    })
  })
  
  describe('updateOrderStatus', () => {
    it('should update order status successfully via API', async () => {
      const mockOrder = {
        id: '1',
        restaurant_id: 'rest-1',
        order_number: '001',
        table_number: '5',
        items: [],
        status: 'preparing',
        type: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: 10.00,
        tax: 0.80,
        total: 10.80,
        payment_status: 'pending'
      };

      (httpClient.patch as vi.Mock).mockResolvedValue(mockOrder)

      const result = await orderService.updateOrderStatus('1', 'preparing')

      expect(result).toBeDefined()
      expect(result.status).toBe('preparing')
      expect(httpClient.patch).toHaveBeenCalledWith('/api/v1/orders/1/status', { status: 'preparing' })
    })

    it('should fallback to mock data when API fails', async () => {
      (httpClient.patch as vi.Mock).mockRejectedValue(new Error('API Error'))

      const result = await orderService.updateOrderStatus('order-1', 'preparing')

      expect(result).toBeDefined()
      expect(result.status).toBe('preparing')
    })

    it('should throw error when order not found in mock data', async () => {
      (httpClient.patch as vi.Mock).mockRejectedValue(new Error('API Error'))

      await expect(
        orderService.updateOrderStatus('999', 'preparing')
      ).rejects.toThrow('Order not found')
    })
  })
  
  describe('submitOrder', () => {
    it('should create new order with valid data via API', async () => {
      const orderData: Partial<Order> = {
        restaurant_id: 'rest-1',
        table_number: '10',
        items: [
          { id: '1', menu_item_id: '1', name: 'Burger', quantity: 2, price: 12.50, subtotal: 25.00 }
        ],
        type: 'online',
        subtotal: 25.00,
        tax: 2.00,
        total: 27.00
      }

      const mockOrder = {
        id: 'new-order-1',
        ...orderData,
        order_number: '100',
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_status: 'pending'
      };

      (httpClient.post as vi.Mock).mockResolvedValue(mockOrder)

      const result = await orderService.submitOrder(orderData)

      expect(result).toBeDefined()
      expect(result.table_number).toBe('10')
      expect(result.items).toHaveLength(1)
      expect(httpClient.post).toHaveBeenCalledWith('/api/v1/orders', orderData)
    })

    it('should fallback to mock order when API fails', async () => {
      const orderData: Partial<Order> = {
        restaurant_id: 'rest-1',
        table_number: '10',
        items: [
          { id: '1', menu_item_id: '1', name: 'Burger', quantity: 2, price: 12.50, subtotal: 25.00 }
        ],
        type: 'online',
        subtotal: 25.00,
        tax: 2.00,
        total: 27.00
      };

      (httpClient.post as vi.Mock).mockRejectedValue(new Error('API Error'))

      const result = await orderService.submitOrder(orderData)

      expect(result).toBeDefined()
      expect(result.table_number).toBe('10')
      expect(result.items).toHaveLength(1)
      expect(result.status).toBe('new')
    })

    it('should reject order with invalid data (no items)', async () => {
      const orderData: Partial<Order> = {
        restaurant_id: 'rest-1',
        table_number: '10',
        items: [],
        type: 'online',
        total: 25.00
      }

      await expect(orderService.submitOrder(orderData)).rejects.toThrow('Invalid order data')
    })

    it('should reject order with invalid item (negative quantity)', async () => {
      const orderData: Partial<Order> = {
        restaurant_id: 'rest-1',
        table_number: '10',
        items: [
          { id: '1', menu_item_id: '1', name: 'Burger', quantity: -5, price: 12.50, subtotal: -62.50 }
        ],
        type: 'online',
        total: 25.00
      }

      await expect(orderService.submitOrder(orderData)).rejects.toThrow('Invalid order data')
    })

    it('should reject order with item missing required fields', async () => {
      const orderData: Partial<Order> = {
        restaurant_id: 'rest-1',
        table_number: '10',
        items: [
          { id: '', menu_item_id: '', name: '', quantity: 1, price: 12.50, subtotal: 12.50 }
        ],
        type: 'online',
        total: 25.00
      }

      await expect(orderService.submitOrder(orderData)).rejects.toThrow('Invalid order data')
    })
  })
})