import React from 'react'
import { render, screen } from '@testing-library/react'
import { RecordingIndicator } from './RecordingIndicator'

describe('RecordingIndicator', () => {
  it('shows recording indicator when isRecording is true', () => {
    render(<RecordingIndicator isRecording={true} />)
    
    const indicator = screen.getByTestId('recording-indicator')
    expect(indicator).toBeInTheDocument()
    expect(screen.getByText(/listening/i)).toBeInTheDocument()
  })

  it('does not show indicator when isRecording is false', () => {
    render(<RecordingIndicator isRecording={false} />)
    
    expect(screen.queryByTestId('recording-indicator')).not.toBeInTheDocument()
  })

  it('shows custom text when provided', () => {
    render(<RecordingIndicator isRecording={true} text="Recording your order..." />)
    
    expect(screen.getByText('Recording your order...')).toBeInTheDocument()
  })

  it('has pulsing animation', () => {
    render(<RecordingIndicator isRecording={true} />)
    
    const indicator = screen.getByTestId('recording-indicator')
    expect(indicator).toHaveClass('animate-pulse')
  })
})