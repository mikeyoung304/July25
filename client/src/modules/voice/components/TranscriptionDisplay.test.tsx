import React from 'react'
import { render, screen } from '@testing-library/react'
import { TranscriptionDisplay } from './TranscriptionDisplay'

describe('TranscriptionDisplay', () => {
  it('shows transcription text when provided', () => {
    render(<TranscriptionDisplay transcription="I would like a large pizza" />)
    
    const display = screen.getByTestId('transcription-display')
    expect(display).toBeInTheDocument()
    expect(screen.getByText('I would like a large pizza')).toBeInTheDocument()
  })

  it('does not render when transcription is empty', () => {
    render(<TranscriptionDisplay transcription="" />)
    
    expect(screen.queryByTestId('transcription-display')).not.toBeInTheDocument()
  })

  it('shows processing state', () => {
    render(<TranscriptionDisplay transcription="" isProcessing={true} />)
    
    expect(screen.getByTestId('transcription-display')).toBeInTheDocument()
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
  })

  it('shows interim transcription with different styling', () => {
    render(
      <TranscriptionDisplay 
        transcription="I would like" 
        isInterim={true}
      />
    )
    
    const display = screen.getByTestId('transcription-display')
    expect(display).toHaveClass('opacity-70')
  })

  it('shows confidence level when provided', () => {
    render(
      <TranscriptionDisplay 
        transcription="One hamburger please" 
        confidence={0.95}
      />
    )
    
    expect(screen.getByText('95% confident')).toBeInTheDocument()
  })
})