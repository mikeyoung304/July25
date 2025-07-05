import React from 'react'
import { render, screen } from '@testing-library/react'
import { MicrophonePermission } from './MicrophonePermission'

describe('MicrophonePermission', () => {
  it('renders children when permission is granted', () => {
    render(
      <MicrophonePermission status="granted">
        <div>Content visible with permission</div>
      </MicrophonePermission>
    )
    
    expect(screen.getByText('Content visible with permission')).toBeInTheDocument()
  })

  it('shows permission denied message when denied', () => {
    render(
      <MicrophonePermission status="denied">
        <div>Should not be visible</div>
      </MicrophonePermission>
    )
    
    expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument()
    expect(screen.queryByText('Should not be visible')).not.toBeInTheDocument()
  })

  it('shows no microphone found message when not found', () => {
    render(
      <MicrophonePermission status="not-found">
        <div>Should not be visible</div>
      </MicrophonePermission>
    )
    
    expect(screen.getByText(/no microphone found/i)).toBeInTheDocument()
    expect(screen.queryByText('Should not be visible')).not.toBeInTheDocument()
  })

  it('shows checking permission message when checking', () => {
    render(
      <MicrophonePermission status="checking">
        <div>Should not be visible</div>
      </MicrophonePermission>
    )
    
    expect(screen.getByText(/checking microphone/i)).toBeInTheDocument()
    expect(screen.queryByText('Should not be visible')).not.toBeInTheDocument()
  })

  it('renders custom error message when provided', () => {
    render(
      <MicrophonePermission status="denied" errorMessage="Custom error message">
        <div>Should not be visible</div>
      </MicrophonePermission>
    )
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })
})