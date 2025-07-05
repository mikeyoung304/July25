import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderCard } from '../OrderCard'
import { OrderItem } from '@/modules/orders/types'

describe('OrderCard', () => {
  const defaultProps = {
    orderId: '1',
    orderNumber: '001',
    tableNumber: '5',
    items: [
      {
        id: '1',
        name: 'Burger',
        quantity: 2,
        modifiers: ['Extra cheese', 'No onions']
      },
      {
        id: '2',
        name: 'Fries',
        quantity: 1,
        notes: 'Extra crispy'
      }
    ] as OrderItem[],
    status: 'new' as const,
    orderTime: new Date('2024-01-01T12:00:00'),
    onStatusChange: jest.fn()
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T12:10:00'))
  })
  
  afterEach(() => {
    jest.useRealTimers()
  })
  
  it('should render order details correctly', () => {
    render(<OrderCard {...defaultProps} />)
    
    expect(screen.getByText('Order #001')).toBeInTheDocument()
    expect(screen.getByText(/Table.*5/)).toBeInTheDocument()
    // Check for quantity and name separately since they might be in different elements
    expect(screen.getByText('2x')).toBeInTheDocument()
    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.getByText('1x')).toBeInTheDocument()
    expect(screen.getByText('Fries')).toBeInTheDocument()
  })
  
  it('should display modifiers', () => {
    render(<OrderCard {...defaultProps} />)
    
    expect(screen.getByText('Extra cheese, No onions')).toBeInTheDocument()
  })
  
  it('should display item notes', () => {
    render(<OrderCard {...defaultProps} />)
    
    expect(screen.getByText('Extra crispy')).toBeInTheDocument()
  })
  
  it('should show correct status badge', () => {
    render(<OrderCard {...defaultProps} />)
    
    expect(screen.getByText('New')).toBeInTheDocument()
  })
  
  it('should show elapsed time', () => {
    render(<OrderCard {...defaultProps} />)
    
    expect(screen.getByText('10m')).toBeInTheDocument()
  })
  
  it('should not show urgency styling for orders under 15 minutes', () => {
    const { container } = render(<OrderCard {...defaultProps} />)
    
    expect(container.firstChild).not.toHaveClass('ring-2 ring-red-500')
  })
  
  it('should show urgency styling for orders over 15 minutes when not ready', () => {
    jest.setSystemTime(new Date('2024-01-01T12:20:00')) // 20 minutes later
    
    const { container } = render(<OrderCard {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('ring-2 ring-red-500')
  })
  
  it('should not show urgency styling for ready orders', () => {
    jest.setSystemTime(new Date('2024-01-01T12:20:00')) // 20 minutes later
    
    const { container } = render(<OrderCard {...defaultProps} status="ready" />)
    
    expect(container.firstChild).not.toHaveClass('ring-2 ring-red-500')
  })
  
  it('should call onStatusChange when action button is clicked', () => {
    render(<OrderCard {...defaultProps} />)
    
    const button = screen.getByText('Start Preparing')
    fireEvent.click(button)
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('preparing')
  })
  
  it('should show correct button for preparing status', () => {
    render(<OrderCard {...defaultProps} status="preparing" />)
    
    expect(screen.getByText('Mark Ready')).toBeInTheDocument()
  })
  
  it('should use React.memo for performance optimization', () => {
    // Just verify that the component is wrapped with memo
    expect(OrderCard.$$typeof.toString()).toBe('Symbol(react.memo)')
  })
})