import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest';
import { SoundControl } from './SoundControl'

describe('SoundControl', () => {
  const defaultProps = {
    enabled: true,
    volume: 0.5,
    onToggle: vi.fn(),
    onVolumeChange: vi.fn()
  }

  it('should render volume icon when enabled', () => {
    render(<SoundControl {...defaultProps} />)
    
    const button = screen.getByRole('button', { name: 'Sound enabled' })
    expect(button).toBeInTheDocument()
  })

  it('should render muted icon when disabled', () => {
    render(<SoundControl {...defaultProps} enabled={false} />)
    
    const button = screen.getByRole('button', { name: 'Sound disabled' })
    expect(button).toBeInTheDocument()
  })

  it('should show popover on click', () => {
    render(<SoundControl {...defaultProps} />)
    
    const trigger = screen.getByRole('button', { name: 'Sound enabled' })
    fireEvent.click(trigger)
    
    expect(screen.getByText('Sound Notifications')).toBeInTheDocument()
  })

  it('should call onToggle when toggle button clicked', () => {
    render(<SoundControl {...defaultProps} />)
    
    const trigger = screen.getByRole('button', { name: 'Sound enabled' })
    fireEvent.click(trigger)
    
    const toggleButton = screen.getByRole('button', { name: 'On' })
    fireEvent.click(toggleButton)
    
    expect(defaultProps.onToggle).toHaveBeenCalled()
  })

  it('should show Off button when disabled', () => {
    render(<SoundControl {...defaultProps} enabled={false} />)
    
    const trigger = screen.getByRole('button', { name: 'Sound disabled' })
    fireEvent.click(trigger)
    
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument()
  })

  it('should show volume slider when enabled', () => {
    render(<SoundControl {...defaultProps} />)
    
    const trigger = screen.getByRole('button', { name: 'Sound enabled' })
    fireEvent.click(trigger)
    
    expect(screen.getByRole('slider', { name: 'Volume control' })).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('should not show volume slider when disabled', () => {
    render(<SoundControl {...defaultProps} enabled={false} />)
    
    const trigger = screen.getByRole('button', { name: 'Sound disabled' })
    fireEvent.click(trigger)
    
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('should display correct volume percentage', () => {
    render(<SoundControl {...defaultProps} volume={0.75} />)
    
    const trigger = screen.getByRole('button', { name: 'Sound enabled' })
    fireEvent.click(trigger)
    
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<SoundControl {...defaultProps} className="custom-class" />)
    
    const button = container.querySelector('.custom-class')
    expect(button).toBeInTheDocument()
  })
})