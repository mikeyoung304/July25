/**
 * End-to-End Tests for Floor Plan Management
 * Tests the complete workflow for creating and managing restaurant floor plans
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { Toaster } from 'react-hot-toast'

// Components under test
import { AdminDashboard } from '@/pages/AdminDashboard'
import { ServerView } from '@/pages/ServerView'

// Services

// Test utilities
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    <BrowserRouter>
      <RestaurantProvider>
        {children}
        <Toaster />
      </RestaurantProvider>
    </BrowserRouter>
  </ErrorBoundary>
)

describe('Floor Plan Management E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  describe('Floor Plan Creation', () => {
    it('should create and save a floor plan', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Navigate to floor plan creator
      const floorPlanCard = screen.getByText('Floor Plan Creator')
      await user.click(floorPlanCard)
      
      // Wait for editor to load
      await waitFor(() => {
        expect(screen.getByText(/Create and manage your restaurant floor layout/)).toBeInTheDocument()
      })
      
      // Add tables
      const addCircleTableBtn = screen.getByRole('button', { name: /Add circle table/ })
      const addSquareTableBtn = screen.getByRole('button', { name: /Add square table/ })
      const addRectangleTableBtn = screen.getByRole('button', { name: /Add rectangle table/ })
      
      // Add different table types
      await user.click(addCircleTableBtn)
      await user.click(addSquareTableBtn)
      await user.click(addRectangleTableBtn)
      
      // Verify tables are added
      const canvas = screen.getByRole('region', { name: /Floor plan editor canvas/ })
      await waitFor(() => {
        expect(within(canvas).getByText('Table 1')).toBeInTheDocument()
        expect(within(canvas).getByText('Table 2')).toBeInTheDocument()
        expect(within(canvas).getByText('Table 3')).toBeInTheDocument()
      })
      
      // Save floor plan
      const saveButton = screen.getByRole('button', { name: /Save floor plan/ })
      await user.click(saveButton)
      
      // Verify save success
      await waitFor(() => {
        expect(screen.getByText(/Floor plan saved successfully/)).toBeInTheDocument()
      })
      
      // Verify data is saved
      const savedData = localStorage.getItem('floorPlan_test-restaurant')
      expect(savedData).toBeTruthy()
      
      const floorPlan = JSON.parse(savedData!)
      expect(floorPlan.tables).toHaveLength(3)
    })

    it('should edit table properties', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Navigate to floor plan creator
      const floorPlanCard = screen.getByText('Floor Plan Creator')
      await user.click(floorPlanCard)
      
      // Add a table
      const addTableBtn = screen.getByRole('button', { name: /Add square table/ })
      await user.click(addTableBtn)
      
      // Select the table
      const canvas = screen.getByRole('region', { name: /Floor plan editor canvas/ })
      const table = within(canvas).getByText('Table 1')
      await user.click(table)
      
      // Edit properties in side panel
      const labelInput = screen.getByLabelText('Table Label')
      const seatsInput = screen.getByLabelText('Number of Seats')
      
      await user.clear(labelInput)
      await user.type(labelInput, 'VIP Table')
      
      await user.clear(seatsInput)
      await user.type(seatsInput, '6')
      
      // Verify changes
      await waitFor(() => {
        expect(within(canvas).getByText('VIP Table')).toBeInTheDocument()
      })
    })

    it('should support drag and drop positioning', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Navigate to floor plan creator
      const floorPlanCard = screen.getByText('Floor Plan Creator')
      await user.click(floorPlanCard)
      
      // Add a table
      const addTableBtn = screen.getByRole('button', { name: /Add square table/ })
      await user.click(addTableBtn)
      
      const canvas = screen.getByRole('region', { name: /Floor plan editor canvas/ })
      const table = within(canvas).getByText('Table 1')
      
      // Get initial position
      const initialRect = table.getBoundingClientRect()
      
      // Simulate drag
      fireEvent.mouseDown(table)
      fireEvent.mouseMove(table, { clientX: initialRect.x + 100, clientY: initialRect.y + 100 })
      fireEvent.mouseUp(table)
      
      // Table should have moved
      const newRect = table.getBoundingClientRect()
      expect(newRect.x).not.toBe(initialRect.x)
      expect(newRect.y).not.toBe(initialRect.y)
    })

    it('should support undo/redo operations', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Navigate to floor plan creator
      const floorPlanCard = screen.getByText('Floor Plan Creator')
      await user.click(floorPlanCard)
      
      // Add tables
      const addTableBtn = screen.getByRole('button', { name: /Add square table/ })
      await user.click(addTableBtn)
      await user.click(addTableBtn)
      
      const canvas = screen.getByRole('region', { name: /Floor plan editor canvas/ })
      
      // Verify two tables
      expect(within(canvas).getByText('Table 1')).toBeInTheDocument()
      expect(within(canvas).getByText('Table 2')).toBeInTheDocument()
      
      // Undo
      const undoBtn = screen.getByRole('button', { name: /Undo/ })
      await user.click(undoBtn)
      
      // Should only have one table
      await waitFor(() => {
        expect(within(canvas).queryByText('Table 2')).not.toBeInTheDocument()
      })
      
      // Redo
      const redoBtn = screen.getByRole('button', { name: /Redo/ })
      await user.click(redoBtn)
      
      // Should have two tables again
      await waitFor(() => {
        expect(within(canvas).getByText('Table 2')).toBeInTheDocument()
      })
    })
  })

  describe('Floor Plan Usage in Server View', () => {
    it('should load saved floor plan in server view', async () => {
      // Pre-save a floor plan
      const mockFloorPlan = {
        tables: [
          {
            id: 'table-1',
            type: 'square',
            x: 100,
            y: 100,
            width: 80,
            height: 80,
            seats: 4,
            label: 'A1',
            rotation: 0,
            status: 'available',
            zIndex: 1
          },
          {
            id: 'table-2',
            type: 'circle',
            x: 200,
            y: 100,
            width: 80,
            height: 80,
            seats: 2,
            label: 'A2',
            rotation: 0,
            status: 'occupied',
            zIndex: 1
          }
        ],
        lastModified: new Date().toISOString()
      }
      
      localStorage.setItem('floorPlan_test-restaurant', JSON.stringify(mockFloorPlan))
      
      render(
        <TestWrapper>
          <ServerView />
        </TestWrapper>
      )
      
      // Wait for floor plan to load
      await waitFor(() => {
        expect(screen.getByText('A1')).toBeInTheDocument()
        expect(screen.getByText('A2')).toBeInTheDocument()
      })
      
      // Verify table statuses
      const availableTable = screen.getByText('A1').closest('g')
      const occupiedTable = screen.getByText('A2').closest('g')
      
      expect(availableTable).toHaveClass('cursor-pointer')
      expect(occupiedTable).toHaveClass('opacity-75')
    })

    it('should fall back to default layout if no saved plan', async () => {
      render(
        <TestWrapper>
          <ServerView />
        </TestWrapper>
      )
      
      // Wait for default floor plan
      await waitFor(() => {
        expect(screen.getByText(/Using default floor plan/)).toBeInTheDocument()
      })
      
      // Verify default tables are loaded
      expect(screen.getByText('B1')).toBeInTheDocument()
      expect(screen.getByText('T1')).toBeInTheDocument()
      expect(screen.getByText('R1')).toBeInTheDocument()
    })
  })

  describe('Floor Plan Synchronization', () => {
    it('should reflect changes immediately across views', async () => {
      const user = userEvent.setup()
      
      // Start with admin dashboard
      const { rerender } = render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      )
      
      // Navigate to floor plan creator
      const floorPlanCard = screen.getByText('Floor Plan Creator')
      await user.click(floorPlanCard)
      
      // Add and save tables
      const addTableBtn = screen.getByRole('button', { name: /Add square table/ })
      await user.click(addTableBtn)
      await user.click(addTableBtn)
      
      const saveButton = screen.getByRole('button', { name: /Save floor plan/ })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Floor plan saved successfully/)).toBeInTheDocument()
      })
      
      // Switch to server view
      rerender(
        <TestWrapper>
          <ServerView />
        </TestWrapper>
      )
      
      // Verify tables appear
      await waitFor(() => {
        expect(screen.getByText('Table 1')).toBeInTheDocument()
        expect(screen.getByText('Table 2')).toBeInTheDocument()
      })
    })
  })

  describe('Performance with Large Floor Plans', () => {
    it('should handle floor plans with many tables', async () => {
      const user = userEvent.setup()
      
      // Create large floor plan
      const largePlan = {
        tables: Array.from({ length: 100 }, (_, i) => ({
          id: `table-${i}`,
          type: ['square', 'circle', 'rectangle'][i % 3] as 'square' | 'circle' | 'rectangle',
          x: (i % 10) * 100,
          y: Math.floor(i / 10) * 100,
          width: 80,
          height: 80,
          seats: 4,
          label: `T${i + 1}`,
          rotation: 0,
          status: 'available',
          zIndex: 1
        })),
        lastModified: new Date().toISOString()
      }
      
      localStorage.setItem('floorPlan_test-restaurant', JSON.stringify(largePlan))
      
      const startTime = performance.now()
      
      render(
        <TestWrapper>
          <ServerView />
        </TestWrapper>
      )
      
      // Wait for render
      await waitFor(() => {
        expect(screen.getByText('T1')).toBeInTheDocument()
      })
      
      const renderTime = performance.now() - startTime
      
      // Should render efficiently
      expect(renderTime).toBeLessThan(2000) // 2 seconds
      
      // Verify interactions still work
      const table50 = screen.getByText('T50')
      await user.click(table50)
      
      await waitFor(() => {
        expect(screen.getByText(/Select Seat/)).toBeInTheDocument()
      })
    })
  })
})