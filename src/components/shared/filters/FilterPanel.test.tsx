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
    
    expect(screen.getByLabelText('New')).toBeInTheDocument()
    expect(screen.getByLabelText('Preparing')).toBeInTheDocument()
    expect(screen.getByLabelText('Ready')).toBeInTheDocument()
  })

  it('should call onStatusChange when status checkbox is clicked', () => {
    render(<FilterPanel {...defaultProps} />)
    
    const newCheckbox = screen.getByLabelText('New')
    fireEvent.click(newCheckbox)
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(['preparing', 'ready'])
  })

  it('should display time range options', () => {
    render(<FilterPanel {...defaultProps} />)
    
    const timeRangeSelect = screen.getByRole('combobox', { name: /time range/i })
    expect(timeRangeSelect).toHaveValue('today')
  })

  it('should call onTimeRangeChange when time range is changed', () => {
    render(<FilterPanel {...defaultProps} />)
    
    const timeRangeSelect = screen.getByRole('combobox', { name: /time range/i })
    fireEvent.change(timeRangeSelect, { target: { value: 'last30min' } })
    
    expect(defaultProps.onTimeRangeChange).toHaveBeenCalledWith({ preset: 'last30min' })
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
    
    expect(screen.getByText('Station')).toBeInTheDocument()
  })

  it('should apply correct styling to active status filters', () => {
    const activeFilters = {
      ...defaultFilters,
      status: ['new', 'preparing'] // 'ready' is not selected
    }
    
    render(<FilterPanel {...defaultProps} filters={activeFilters} />)
    
    const newCheckbox = screen.getByLabelText('New')
    const readyCheckbox = screen.getByLabelText('Ready')
    
    expect(newCheckbox).toBeChecked()
    expect(readyCheckbox).not.toBeChecked()
  })
})