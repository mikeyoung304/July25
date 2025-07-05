import { render, screen, waitFor } from '@testing-library/react'
import { AnimatedStatusBadge } from './AnimatedStatusBadge'

describe('AnimatedStatusBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  
  afterEach(() => {
    jest.useRealTimers()
  })
  
  it('renders initial status without animation', () => {
    render(<AnimatedStatusBadge status="new" />)
    
    expect(screen.getByText('New')).toBeInTheDocument()
  })
  
  it('animates when status changes', async () => {
    const { rerender } = render(
      <AnimatedStatusBadge status="new" previousStatus="new" />
    )
    
    // Change status
    rerender(
      <AnimatedStatusBadge status="preparing" previousStatus="new" />
    )
    
    // Check that animation class is applied
    const container = screen.getByText('New').closest('div')?.parentElement
    expect(container).toHaveClass('animate-scale-up')
    
    // Fast forward through animation
    jest.advanceTimersByTime(150)
    
    await waitFor(() => {
      expect(screen.getByText('Preparing')).toBeInTheDocument()
    })
  })
  
  it('shows ripple effect for ready status', () => {
    const { rerender } = render(
      <AnimatedStatusBadge status="preparing" previousStatus="preparing" />
    )
    
    rerender(
      <AnimatedStatusBadge status="ready" previousStatus="preparing" />
    )
    
    // Check for ripple animation
    const ripple = document.querySelector('.animate-ping')
    expect(ripple).toBeInTheDocument()
    expect(ripple).toHaveClass('bg-green-400')
  })
  
  it('applies correct animation classes for different transitions', () => {
    const { rerender } = render(
      <AnimatedStatusBadge status="new" />
    )
    
    // New → Preparing
    rerender(
      <AnimatedStatusBadge status="preparing" previousStatus="new" />
    )
    
    const container = screen.getByText('New').closest('div')?.parentElement
    expect(container).toHaveClass('animate-pulse-preparing')
    
    jest.advanceTimersByTime(200)
    
    // Preparing → Ready
    rerender(
      <AnimatedStatusBadge status="ready" previousStatus="preparing" />
    )
    
    expect(container).toHaveClass('animate-pulse-ready')
    expect(container).toHaveClass('animate-flash')
  })
  
  it('removes animation classes after animation completes', async () => {
    const { rerender } = render(
      <AnimatedStatusBadge status="new" previousStatus="new" />
    )
    
    rerender(
      <AnimatedStatusBadge status="preparing" previousStatus="new" />
    )
    
    const container = screen.getByText('New').closest('div')?.parentElement
    expect(container).toHaveClass('animate-scale-up')
    
    // Fast forward through all timers
    jest.advanceTimersByTime(1000)
    
    await waitFor(() => {
      expect(container).not.toHaveClass('animate-scale-up')
    })
  })
})