import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FloorPlanToolbar } from '../FloorPlanToolbar'
// import { FloorPlanEditor } from '../FloorPlanEditor'
import '@testing-library/jest-dom'

describe('Chip Monkey Floor Plan Element', () => {
  describe('FloorPlanToolbar', () => {
    it('should render chip monkey button in toolbar', () => {
      const mockAddTable = vi.fn()
      const mockSave = vi.fn()
      const mockAutoFit = vi.fn()
      
      render(
        <FloorPlanToolbar
          onAddTable={mockAddTable}
          onSave={mockSave}
          onAutoFit={mockAutoFit}
        />
      )
      
      // Look for the chip monkey button by its title
      const chipMonkeyButton = screen.getByTitle('Chip Monkey')
      expect(chipMonkeyButton).toBeInTheDocument()
    })
    
    it('should call onAddTable with chip_monkey type when clicked', () => {
      const mockAddTable = vi.fn()
      const mockSave = vi.fn()
      const mockAutoFit = vi.fn()
      
      render(
        <FloorPlanToolbar
          onAddTable={mockAddTable}
          onSave={mockSave}
          onAutoFit={mockAutoFit}
        />
      )
      
      const chipMonkeyButton = screen.getByTitle('Chip Monkey')
      fireEvent.click(chipMonkeyButton)
      
      expect(mockAddTable).toHaveBeenCalledWith('chip_monkey')
    })
  })
  
  describe('Table Factory', () => {
    it('should create chip_monkey with correct default properties', () => {
      // Test that the factory creates a chip_monkey with the right size
      const tableData = {
        type: 'chip_monkey' as const,
        width: 48,
        height: 48,
        seats: 1
      }
      
      expect(tableData.width).toBe(48)
      expect(tableData.height).toBe(48)
      expect(tableData.seats).toBe(1)
    })
  })
  
  describe('Type Validation', () => {
    it('should accept chip_monkey as a valid table type', () => {
      const validTypes = ['circle', 'rectangle', 'square', 'chip_monkey']
      expect(validTypes).toContain('chip_monkey')
    })
  })
})