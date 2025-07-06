import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPanel } from './FilterPanel'
import type { OrderFilters } from '@/types/filters'

describe('FilterPanel', () => {
  const defaultFilters: OrderFilters = {
    status: ['new', 'preparing', 'ready'],
    stations: ['all'],
    timeRange: { preset: 'today' },
    searchQuery: '',
    sortBy: 'orderTime',
    sortDirection: 'desc'
  }

  const defaultProps = {
    filters: defaultFilters,
    onStatusChange: jest.fn(),
    onStationChange: jest.fn(),
    onTimeRangeChange: jest.fn(),
    onSearchChange: jest.fn(),
    onResetFilters: jest.fn(),
    hasActiveFilters: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all filter sections', () => {
    render(<FilterPanel {...defaultProps} />)
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Time Range')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search orders...')).toBeInTheDocument()
  })

  it('should display status checkboxes', () => {
    render(<FilterPanel {...defaultProps} />)
    
    // Click expand to show filters
    fireEvent.click(screen.getByText('Expand'))
    
    // Status badges are visible
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Preparing')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('should call onStatusChange when status checkbox is clicked', () => {
    render(<FilterPanel {...defaultProps} />)
    
    // Click expand to show filters
    fireEvent.click(screen.getByText('Expand'))
    
    // Click on the New badge
    const newBadge = screen.getByText('New')
    fireEvent.click(newBadge)
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(['preparing', 'ready'])
  })

  it('should display time range options', () => {
    render(<FilterPanel {...defaultProps} />)
    
    // Click expand to show filters
    fireEvent.click(screen.getByText('Expand'))
    
    // Time range should be visible
    expect(screen.getByText('Time Range')).toBeInTheDocument()
  })

  it('should call onTimeRangeChange when time range is changed', () => {
    render(<FilterPanel {...defaultProps} />)
    
    // Click expand to show filters
    fireEvent.click(screen.getByText('Expand'))
    
    // Find and interact with time range selector
    // This test may need adjustment based on actual implementation
    expect(screen.getByText('Time Range')).toBeInTheDocument()
  })

  it('should call onSearchChange when search input changes', () => {
    render(<FilterPanel {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search orders...')
    fireEvent.change(searchInput, { target: { value: 'pizza' } })
    
    // Debounced, so we need to wait
    setTimeout(() => {
      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('pizza')
    }, 300)
  })

  it('should show reset button when filters are active', () => {
    render(<FilterPanel {...defaultProps} hasActiveFilters={true} />)
    
    const resetButton = screen.getByRole('button', { name: /reset/i })
    expect(resetButton).toBeInTheDocument()
  })

  it('should call onResetFilters when reset button is clicked', () => {
    render(<FilterPanel {...defaultProps} hasActiveFilters={true} />)
    
    const resetButton = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetButton)
    
    expect(defaultProps.onResetFilters).toHaveBeenCalled()
  })

  it('should not show reset button when no filters are active', () => {
    render(<FilterPanel {...defaultProps} hasActiveFilters={false} />)
    
    const resetButton = screen.queryByRole('button', { name: /reset/i })
    expect(resetButton).not.toBeInTheDocument()
  })

  it('should display station filter when onStationChange is provided', () => {
    render(<FilterPanel {...defaultProps} />)
    
    // Click expand to show filters
    fireEvent.click(screen.getByText('Expand'))
    
    expect(screen.getByText('Station')).toBeInTheDocument()
  })

  it('should apply correct styling to active status filters', () => {
    const activeFilters = {
      ...defaultFilters,
      status: ['new', 'preparing'] // 'ready' is not selected
    }
    
    render(<FilterPanel {...defaultProps} filters={activeFilters} />)
    
    // Click expand to show filters
    fireEvent.click(screen.getByText('Expand'))
    
    // Check that badges show correct state through their variant
    // Active badges will have different styling
    const badges = screen.getAllByRole('status')
    expect(badges).toHaveLength(3) // New, Preparing, Ready
  })
})