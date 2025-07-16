/**
 * End-to-End Tests for Voice-to-Kitchen Flow
 * Tests the complete workflow from voice order capture to kitchen display
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { RestaurantIdProvider } from '@/services/http'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { Toaster } from 'react-hot-toast'

// Components under test
import { ServerView } from '@/pages/ServerView'
import { KioskDemo } from '@/pages/KioskDemo'
import { KitchenDisplay } from '@/pages/KitchenDisplay'

// Services
import { api } from '@/services/api'
import { webSocketService, orderUpdatesHandler, type OrderUpdatePayload } from '@/services/websocket'
import type { Order } from '@/services/types'

// Mock modules
jest.mock('@/services/api')
jest.mock('@/services/websocket')
jest.mock('@/modules/voice/services/transcriptionService')

// Test utilities
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    <BrowserRouter>
      <RestaurantProvider>
        <RestaurantIdProvider>
          {children}
          <Toaster />
        </RestaurantIdProvider>
      </RestaurantProvider>
    </BrowserRouter>
  </ErrorBoundary>
)

describe('Voice-to-Kitchen E2E Flow', () => {
  let mockOrders: Order[] = []
  let orderUpdateCallbacks: ((update: OrderUpdatePayload) => void)[] = []

  beforeEach(() => {
    jest.clearAllMocks()
    mockOrders = []
    orderUpdateCallbacks = []
    
    // Mock API responses
    jest.mocked(api.getOrders).mockResolvedValue({
      orders: mockOrders,
      total: mockOrders.length
    })
    
    jest.mocked(api.submitOrder).mockImplementation(async (orderData) => {
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        restaurant_id: 'test-restaurant',
        orderNumber: String(mockOrders.length + 1).padStart(3, '0'),
        tableNumber: orderData.tableNumber || '',
        items: orderData.items || [],
        status: 'new' as const,
        orderTime: new Date(),
        totalAmount: orderData.totalAmount || 0,
        paymentStatus: 'pending' as const
      }
      
      mockOrders.push(newOrder)
      
      // Simulate WebSocket notification
      setTimeout(() => {
        orderUpdateCallbacks.forEach(cb => cb({
          action: 'created',
          order: newOrder
        }))
      }, 100)
      
      return { success: true, orderId: newOrder.id, order: newOrder }
    })
    
    jest.mocked(api.updateOrderStatus).mockImplementation(async (orderId, status) => {
      const order = mockOrders.find(o => o.id === orderId)
      if (order) {
        order.status = status
        
        // Simulate WebSocket notification
        setTimeout(() => {
          orderUpdateCallbacks.forEach(cb => cb({
            action: 'status_changed',
            orderId,
            status,
            previousStatus: order.status
          }))
        }, 50)
      }
      
      return { success: true, order: order! }
    })
    
    // Mock WebSocket
    jest.mocked(webSocketService.connect).mockResolvedValue(undefined)
    jest.mocked(webSocketService.isConnected).mockReturnValue(true)
    jest.mocked(orderUpdatesHandler.onOrderUpdate).mockImplementation((callback) => {
      orderUpdateCallbacks.push(callback)
      return () => {
        const index = orderUpdateCallbacks.indexOf(callback)
        if (index > -1) orderUpdateCallbacks.splice(index, 1)
      }
    })
    
    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
          stop: jest.fn()
        }),
        enumerateDevices: jest.fn().mockResolvedValue([
          { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' }
        ])
      },
      writable: true
    })
    
    // Mock AudioContext
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createMediaStreamSource: jest.fn(),
      createScriptProcessor: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn()
      })),
      close: jest.fn()
    }))
  })

  describe('Complete Order Flow', () => {
    it('should complete full flow from table selection to kitchen display', async () => {
      const user = userEvent.setup()
      
      // Step 1: Server selects table and seat
      const { rerender } = render(
        <TestWrapper>
          <ServerView />
        </TestWrapper>
      )
      
      // Wait for floor plan to load
      await waitFor(() => {
        expect(screen.getByText(/Server View - Dining Room/)).toBeInTheDocument()
      })
      
      // Click on an available table
      const canvas = screen.getByRole('region', { name: /Floor plan canvas/ })
      const table = within(canvas).getByText('B1')
      
      await act(async () => {
        fireEvent.click(table)
      })
      
      // Select seat
      await waitFor(() => {
        expect(screen.getByText(/Select Seat/)).toBeInTheDocument()
      })
      
      const seat1Button = screen.getByText('Seat 1')
      await user.click(seat1Button)
      
      // Start voice order
      const startOrderButton = screen.getByText('Start Voice Order')
      await user.click(startOrderButton)
      
      // Step 2: Voice order at kiosk
      rerender(
        <TestWrapper>
          <KioskDemo />
        </TestWrapper>
      )
      
      // Check we have table context
      await waitFor(() => {
        expect(screen.getByText(/Voice Ordering - Kiosk Mode/)).toBeInTheDocument()
      })
      
      // Mock voice transcription
      const { transcriptionService } = await import('@/modules/voice/services/transcriptionService')
      jest.mocked(transcriptionService.transcribe).mockResolvedValue({
        text: "I'd like a burger with fries and a coke",
        confidence: 0.95
      })
      
      // Start recording
      const recordButton = screen.getByRole('button', { name: /Start Recording/ })
      await user.click(recordButton)
      
      // Wait for recording to start
      await waitFor(() => {
        expect(screen.getByText(/Recording.../)).toBeInTheDocument()
      })
      
      // Stop recording (simulate voice capture)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
      })
      
      const stopButton = screen.getByRole('button', { name: /Stop Recording/ })
      await user.click(stopButton)
      
      // Wait for transcription
      await waitFor(() => {
        expect(screen.getByText(/burger with fries and a coke/)).toBeInTheDocument()
      })
      
      // Submit order
      const submitButton = screen.getByText('Submit Order')
      await user.click(submitButton)
      
      // Wait for order confirmation
      await waitFor(() => {
        expect(screen.getByText(/Order submitted successfully!/)).toBeInTheDocument()
      })
      
      // Step 3: Check kitchen display
      rerender(
        <TestWrapper>
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for kitchen display to load
      await waitFor(() => {
        expect(screen.getByText(/Kitchen Display/)).toBeInTheDocument()
      })
      
      // Verify order appears
      await waitFor(() => {
        expect(screen.getByText('Order #001')).toBeInTheDocument()
        expect(screen.getByText(/burger with fries and a coke/)).toBeInTheDocument()
      })
      
      // Update order status to preparing
      const prepareButton = screen.getByRole('button', { name: /Start Preparing/ })
      await user.click(prepareButton)
      
      await waitFor(() => {
        expect(mockOrders[0].status).toBe('preparing')
      })
      
      // Update order status to ready
      const readyButton = screen.getByRole('button', { name: /Mark Ready/ })
      await user.click(readyButton)
      
      await waitFor(() => {
        expect(mockOrders[0].status).toBe('ready')
      })
    })

    it('should handle multiple concurrent orders', async () => {
      // Create multiple orders
      const orders = [
        { tableNumber: '1', items: [{ name: 'Pizza', quantity: 1 }] },
        { tableNumber: '2', items: [{ name: 'Salad', quantity: 2 }] },
        { tableNumber: '3', items: [{ name: 'Pasta', quantity: 1 }] }
      ]
      
      for (const orderData of orders) {
        await api.submitOrder({
          ...orderData,
          items: orderData.items.map((item, idx) => ({
            id: String(idx),
            ...item
          })),
          totalAmount: 20
        })
      }
      
      // Render kitchen display
      render(
        <TestWrapper>
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for all orders to appear
      await waitFor(() => {
        expect(screen.getByText('Order #001')).toBeInTheDocument()
        expect(screen.getByText('Order #002')).toBeInTheDocument()
        expect(screen.getByText('Order #003')).toBeInTheDocument()
      })
      
      // Verify order details
      expect(screen.getByText(/Pizza/)).toBeInTheDocument()
      expect(screen.getByText(/Salad.*x2/)).toBeInTheDocument()
      expect(screen.getByText(/Pasta/)).toBeInTheDocument()
    })

    it('should handle order filtering and sorting', async () => {
      const user = userEvent.setup()
      
      // Create orders with different statuses
      mockOrders = [
        {
          id: 'order-1',
          restaurant_id: 'test-restaurant',
          orderNumber: '001',
          tableNumber: '1',
          items: [{ id: '1', name: 'Burger', quantity: 1 }],
          status: 'new' as const,
          orderTime: new Date(Date.now() - 600000), // 10 min ago
          totalAmount: 15,
          paymentStatus: 'paid' as const
        },
        {
          id: 'order-2',
          restaurant_id: 'test-restaurant',
          orderNumber: '002',
          tableNumber: '2',
          items: [{ id: '2', name: 'Pizza', quantity: 1 }],
          status: 'preparing' as const,
          orderTime: new Date(Date.now() - 300000), // 5 min ago
          totalAmount: 20,
          paymentStatus: 'paid' as const
        },
        {
          id: 'order-3',
          restaurant_id: 'test-restaurant',
          orderNumber: '003',
          tableNumber: '3',
          items: [{ id: '3', name: 'Salad', quantity: 1 }],
          status: 'ready' as const,
          orderTime: new Date(), // now
          totalAmount: 10,
          paymentStatus: 'paid' as const
        }
      ]
      
      render(
        <TestWrapper>
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for orders to load
      await waitFor(() => {
        expect(screen.getByText('Order #001')).toBeInTheDocument()
      })
      
      // Filter by status
      const statusFilter = screen.getByRole('combobox', { name: /Status filter/ })
      await user.click(statusFilter)
      await user.click(screen.getByText('Preparing'))
      
      await waitFor(() => {
        expect(screen.queryByText('Order #001')).not.toBeInTheDocument()
        expect(screen.getByText('Order #002')).toBeInTheDocument()
        expect(screen.queryByText('Order #003')).not.toBeInTheDocument()
      })
      
      // Reset filters
      const resetButton = screen.getByText('Reset Filters')
      await user.click(resetButton)
      
      await waitFor(() => {
        expect(screen.getByText('Order #001')).toBeInTheDocument()
        expect(screen.getByText('Order #002')).toBeInTheDocument()
        expect(screen.getByText('Order #003')).toBeInTheDocument()
      })
      
      // Sort by time (oldest first)
      const sortButton = screen.getByRole('button', { name: /Sort options/ })
      await user.click(sortButton)
      
      const oldestFirstOption = screen.getByText('Oldest First')
      await user.click(oldestFirstOption)
      
      // Verify order
      const orderCards = screen.getAllByText(/Order #\d+/)
      expect(orderCards[0]).toHaveTextContent('Order #001')
      expect(orderCards[1]).toHaveTextContent('Order #002')
      expect(orderCards[2]).toHaveTextContent('Order #003')
    })

    it('should handle real-time updates via WebSocket', async () => {
      render(
        <TestWrapper>
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/No orders yet/)).toBeInTheDocument()
      })
      
      // Simulate WebSocket order creation
      act(() => {
        orderUpdateCallbacks.forEach(cb => cb({
          action: 'created',
          order: {
            id: 'ws-order-1',
            restaurant_id: 'test-restaurant',
            orderNumber: '001',
            tableNumber: '5',
            items: [{ id: '1', name: 'WebSocket Order', quantity: 1 }],
            status: 'new' as const,
            orderTime: new Date(),
            totalAmount: 25,
            paymentStatus: 'paid' as const
          }
        }))
      })
      
      // Verify order appears
      await waitFor(() => {
        expect(screen.getByText('Order #001')).toBeInTheDocument()
        expect(screen.getByText(/WebSocket Order/)).toBeInTheDocument()
      })
      
      // Simulate status update
      act(() => {
        orderUpdateCallbacks.forEach(cb => cb({
          action: 'status_changed',
          orderId: 'ws-order-1',
          status: 'preparing',
          previousStatus: 'new'
        }))
      })
      
      // Verify status change
      await waitFor(() => {
        expect(screen.getByText(/Preparing/)).toBeInTheDocument()
      })
    })

    it('should handle errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      jest.mocked(api.submitOrder).mockRejectedValueOnce(new Error('Network error'))
      
      render(
        <TestWrapper>
          <KioskDemo />
        </TestWrapper>
      )
      
      // Try to submit order
      const submitButton = screen.getByText('Submit Order')
      await user.click(submitButton)
      
      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to submit order/)).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle large number of orders efficiently', async () => {
      // Create 50 orders
      mockOrders = Array.from({ length: 50 }, (_, i) => ({
        id: `order-${i}`,
        restaurant_id: 'test-restaurant',
        orderNumber: String(i + 1).padStart(3, '0'),
        tableNumber: String((i % 20) + 1),
        items: [
          { id: '1', name: `Item ${i + 1}`, quantity: Math.floor(Math.random() * 3) + 1 }
        ],
        status: ['new', 'preparing', 'ready'][i % 3] as Order['status'],
        orderTime: new Date(Date.now() - i * 60000),
        totalAmount: Math.random() * 50 + 10,
        paymentStatus: 'paid' as const
      }))
      
      const startTime = performance.now()
      
      render(
        <TestWrapper>
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for render
      await waitFor(() => {
        expect(screen.getByText('Order #001')).toBeInTheDocument()
      })
      
      const renderTime = performance.now() - startTime
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(3000) // 3 seconds
      
      // Verify all orders are rendered
      expect(screen.getAllByText(/Order #\d+/)).toHaveLength(50)
    })
  })
})
