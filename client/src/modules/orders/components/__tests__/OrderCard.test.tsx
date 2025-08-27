import React from 'react'
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderCard } from '../OrderCard/OrderCard'
import { OrderItem } from '@/modules/orders/types'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/' })),
  useParams: vi.fn(() => ({})),
  Link: vi.fn(({ children, to }) => <a href={to}>{children}</a>),
  NavLink: vi.fn(({ children, to }) => <a href={to}>{children}</a>),
}))

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
    onStatusChange: vi.fn()
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:10:00'))
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('should render order details correctly', () => {
    render(<OrderCard {...defaultProps} />)
    
    expect(screen.getByText('Order #001')).toBeInTheDocument()
    expect(screen.getByText(/Table.*5/)).toBeInTheDocument()
    // Check for quantity and name together as they're rendered in the same element
    expect(screen.getByText('2x Burger')).toBeInTheDocument()
    expect(screen.getByText('1x Fries')).toBeInTheDocument()
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
    vi.setSystemTime(new Date('2024-01-01T12:20:00')) // 20 minutes later
    
    const { container } = render(<OrderCard {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('ring-2 ring-red-500')
  })
  
  it('should not show urgency styling for ready orders', () => {
    vi.setSystemTime(new Date('2024-01-01T12:20:00')) // 20 minutes later
    
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