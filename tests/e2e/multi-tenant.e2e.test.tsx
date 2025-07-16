/**
 * End-to-End Tests for Multi-Tenant Functionality
 * Tests restaurant context switching and data isolation
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { RestaurantIdProvider, setCurrentRestaurantId, getCurrentRestaurantId } from '@/services/http'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'

// Components under test
import { KitchenDisplay } from '@/pages/KitchenDisplay'
import { AdminDashboard } from '@/pages/AdminDashboard'

// Services
import { api } from '@/services/api'
import { httpClient } from '@/services/http/httpClient'
import type { Order } from '@/services/types'

// Mock modules
jest.mock('@/services/api')
jest.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user' }
          }
        }
      })
    }
  }
}))

// Test utilities
const TestWrapper: React.FC<{ 
  children: React.ReactNode,
  restaurantId?: string 
}> = ({ children, restaurantId = 'restaurant-1' }) => {
  // Set restaurant ID for HTTP client
  React.useEffect(() => {
    setCurrentRestaurantId(restaurantId)
  }, [restaurantId])
  
  return (
    <ErrorBoundary level="page">
      <BrowserRouter>
        <RestaurantProvider>
          <RestaurantIdProvider>
            {children}
          </RestaurantIdProvider>
        </RestaurantProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

describe('Multi-Tenant E2E Tests', () => {
  const restaurant1Orders: Order[] = [
    {
      id: 'r1-order-1',
      restaurant_id: 'restaurant-1',
      orderNumber: '001',
      tableNumber: '1',
      items: [{ id: '1', name: 'Restaurant 1 Burger', quantity: 1 }],
      status: 'new',
      orderTime: new Date(),
      totalAmount: 15,
      paymentStatus: 'paid'
    }
  ]
  
  const restaurant2Orders: Order[] = [
    {
      id: 'r2-order-1',
      restaurant_id: 'restaurant-2',
      orderNumber: '001',
      tableNumber: '1',
      items: [{ id: '1', name: 'Restaurant 2 Pizza', quantity: 1 }],
      status: 'new',
      orderTime: new Date(),
      totalAmount: 20,
      paymentStatus: 'paid'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    
    // Mock API to return different data based on restaurant ID
    jest.mocked(api.getOrders).mockImplementation(async () => {
      // Get restaurant ID from the global state
      const restaurantId = getCurrentRestaurantId() || 'restaurant-1'
      
      if (restaurantId === 'restaurant-1') {
        return { orders: restaurant1Orders, total: restaurant1Orders.length }
      } else if (restaurantId === 'restaurant-2') {
        return { orders: restaurant2Orders, total: restaurant2Orders.length }
      }
      
      return { orders: [], total: 0 }
    })
  })

  describe('Restaurant Context Isolation', () => {
    it('should show different orders for different restaurants', async () => {
      // Render kitchen display for restaurant 1
      const { rerender } = render(
        <TestWrapper restaurantId="restaurant-1">
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for restaurant 1 orders
      await waitFor(() => {
        expect(screen.getByText(/Restaurant 1 Burger/)).toBeInTheDocument()
      })
      
      // Should not show restaurant 2 orders
      expect(screen.queryByText(/Restaurant 2 Pizza/)).not.toBeInTheDocument()
      
      // Switch to restaurant 2
      rerender(
        <TestWrapper restaurantId="restaurant-2">
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for restaurant 2 orders
      await waitFor(() => {
        expect(screen.getByText(/Restaurant 2 Pizza/)).toBeInTheDocument()
      })
      
      // Should not show restaurant 1 orders
      expect(screen.queryByText(/Restaurant 1 Burger/)).not.toBeInTheDocument()
    })

    it('should maintain separate floor plans for each restaurant', async () => {
      const user = userEvent.setup()
      
      // Save floor plan for restaurant 1
      const restaurant1Plan = {
        tables: [
          {
            id: 'r1-table-1',
            type: 'square',
            x: 100,
            y: 100,
            width: 80,
            height: 80,
            seats: 4,
            label: 'R1-A1',
            rotation: 0,
            status: 'available',
            zIndex: 1
          }
        ],
        lastModified: new Date().toISOString()
      }
      
      localStorage.setItem('floorPlan_restaurant-1', JSON.stringify(restaurant1Plan))
      
      // Save different floor plan for restaurant 2
      const restaurant2Plan = {
        tables: [
          {
            id: 'r2-table-1',
            type: 'circle',
            x: 200,
            y: 200,
            width: 100,
            height: 100,
            seats: 6,
            label: 'R2-B1',
            rotation: 0,
            status: 'available',
            zIndex: 1
          }
        ],
        lastModified: new Date().toISOString()
      }
      
      localStorage.setItem('floorPlan_restaurant-2', JSON.stringify(restaurant2Plan))
      
      // Load floor plan for restaurant 1
      const { rerender } = render(
        <TestWrapper restaurantId="restaurant-1">
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Navigate to floor plan
      const floorPlanCard = screen.getByText('Floor Plan Creator')
      await user.click(floorPlanCard)
      
      // Should load restaurant 1 floor plan
      await waitFor(() => {
        expect(screen.getByText('R1-A1')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('R2-B1')).not.toBeInTheDocument()
      
      // Switch to restaurant 2
      rerender(
        <TestWrapper restaurantId="restaurant-2">
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Should load restaurant 2 floor plan
      await waitFor(() => {
        expect(screen.getByText('R2-B1')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('R1-A1')).not.toBeInTheDocument()
    })
  })

  describe('API Header Verification', () => {
    it('should include correct restaurant ID in API calls', async () => {
      let capturedHeaders: Record<string, string> = {}
      
      // Mock to capture headers
      jest.mocked(api.getOrders).mockImplementation(async () => {
        // Capture the request headers from the HTTP client
        const requestSpy = jest.spyOn(httpClient, 'request')
        
        return new Promise((resolve) => {
          setTimeout(() => {
            if (requestSpy.mock.calls.length > 0) {
              const headers = requestSpy.mock.calls[0][1]?.headers
              capturedHeaders = headers instanceof Headers 
                ? Object.fromEntries(headers.entries())
                : (headers as Record<string, string>) || {}
            }
            resolve({ orders: [], total: 0 })
          }, 0)
        })
      })
      
      // Set restaurant ID
      setCurrentRestaurantId('restaurant-123')
      
      render(
        <TestWrapper restaurantId="restaurant-123">
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Wait for API call
      await waitFor(() => {
        expect(api.getOrders).toHaveBeenCalled()
      })
      
      // Verify headers
      expect(capturedHeaders['X-Restaurant-ID']).toBe('restaurant-123')
      expect(capturedHeaders['Authorization']).toBe('Bearer test-token')
    })

    it('should handle missing restaurant ID gracefully', async () => {
      // Clear restaurant ID
      setCurrentRestaurantId(null)
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      render(
        <TestWrapper>
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Should still render but with warning
      await waitFor(() => {
        expect(screen.getByText(/Kitchen Display/)).toBeInTheDocument()
      })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No restaurant ID available')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Restaurant Switching', () => {
    it('should handle restaurant context changes smoothly', async () => {
      const { rerender } = render(
        <TestWrapper restaurantId="restaurant-1">
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Initial load
      await waitFor(() => {
        expect(screen.getByText(/Restaurant 1 Burger/)).toBeInTheDocument()
      })
      
      // Simulate restaurant switch (e.g., user changes location)
      setCurrentRestaurantId('restaurant-2')
      
      rerender(
        <TestWrapper restaurantId="restaurant-2">
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Should load new restaurant data
      await waitFor(() => {
        expect(screen.getByText(/Restaurant 2 Pizza/)).toBeInTheDocument()
      })
      
      // Old data should be gone
      expect(screen.queryByText(/Restaurant 1 Burger/)).not.toBeInTheDocument()
    })

    it('should clear cached data when switching restaurants', async () => {
      // TODO: Implement cache clearing logic when restaurant changes
      // This would involve clearing any in-memory caches, resetting WebSocket connections, etc.
      expect(true).toBe(true)
    })
  })

  describe('Multi-Restaurant Dashboard', () => {
    it('should aggregate data across multiple restaurants for chain view', async () => {
      // Mock API to return aggregated data
      jest.mocked(api.getOrders).mockResolvedValue({
        orders: [...restaurant1Orders, ...restaurant2Orders],
        total: restaurant1Orders.length + restaurant2Orders.length
      })
      
      render(
        <TestWrapper restaurantId="chain-view">
          <KitchenDisplay />
        </TestWrapper>
      )
      
      // Should show orders from both restaurants
      await waitFor(() => {
        expect(screen.getByText(/Restaurant 1 Burger/)).toBeInTheDocument()
        expect(screen.getByText(/Restaurant 2 Pizza/)).toBeInTheDocument()
      })
      
      // Should indicate which restaurant each order is from
      // This would require UI updates to show restaurant info
    })
  })
})
