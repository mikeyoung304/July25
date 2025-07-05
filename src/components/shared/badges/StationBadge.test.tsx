import { render, screen } from '@testing-library/react'
import { StationBadge } from './StationBadge'

describe('StationBadge', () => {
  it('renders grill station badge correctly', () => {
    render(<StationBadge stationType="grill" />)
    
    expect(screen.getByText('🔥')).toBeInTheDocument()
    expect(screen.getByText('Grill Station')).toBeInTheDocument()
  })
  
  it('renders fryer station badge correctly', () => {
    render(<StationBadge stationType="fryer" />)
    
    expect(screen.getByText('🍟')).toBeInTheDocument()
    expect(screen.getByText('Fryer Station')).toBeInTheDocument()
  })
  
  it('renders cold station badge correctly', () => {
    render(<StationBadge stationType="cold" />)
    
    expect(screen.getByText('🥗')).toBeInTheDocument()
    expect(screen.getByText('Cold Station')).toBeInTheDocument()
  })
  
  it('applies custom className', () => {
    render(<StationBadge stationType="pizza" className="ml-2" />)
    
    const badge = screen.getByText('🍕').closest('div')
    expect(badge).toHaveClass('ml-2')
  })
  
  it('has correct color classes for each station type', () => {
    const { rerender } = render(<StationBadge stationType="grill" />)
    let badge = screen.getByText('🔥').closest('div')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300')
    
    rerender(<StationBadge stationType="drinks" />)
    badge = screen.getByText('🥤').closest('div')
    expect(badge).toHaveClass('bg-cyan-100', 'text-cyan-800', 'border-cyan-300')
  })
})