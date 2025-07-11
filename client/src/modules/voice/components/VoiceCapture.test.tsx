import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceCapture } from './VoiceCapture'

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn()
const mockMediaStream = {
  getTracks: jest.fn(() => [
    { stop: jest.fn() }
  ])
}

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
})

// Mock MediaRecorder
const mockMediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
}))
// Add isTypeSupported as a static method
;(mockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported = jest.fn().mockReturnValue(true)
global.MediaRecorder = mockMediaRecorder as unknown as typeof MediaRecorder

describe('VoiceCapture', () => {
  beforeEach(() => {
    mockGetUserMedia.mockClear()
  })

  it('renders a button with "Tap to Order" text', () => {
    render(<VoiceCapture />)
    
    const button = screen.getByRole('button', { name: /tap to order/i })
    expect(button).toBeInTheDocument()
  })

  it('shows "Listening..." text after clicking the button', async () => {
    mockGetUserMedia.mockResolvedValueOnce(mockMediaStream)
    
    render(<VoiceCapture />)
    
    // Initially, recording indicator should not be visible
    expect(screen.queryByTestId('recording-indicator')).not.toBeInTheDocument()
    
    // Click the button
    const button = screen.getByRole('button', { name: /tap to order/i })
    fireEvent.click(button)
    
    // After clicking and permission granted, recording indicator should appear
    await waitFor(() => {
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument()
      expect(screen.getByText(/listening/i)).toBeInTheDocument()
    })
  })

  describe('Microphone Permissions', () => {
    it('requests microphone permission when starting to listen', async () => {
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream)
      
      render(<VoiceCapture />)
      
      const button = screen.getByRole('button', { name: /tap to order/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
      })
    })

    it('shows error message when microphone permission is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
      
      render(<VoiceCapture />)
      
      const button = screen.getByRole('button', { name: /tap to order/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument()
      })
    })

    it('shows error message when microphone is not available', async () => {
      const error = new Error('Device not found')
      error.name = 'NotFoundError'
      mockGetUserMedia.mockRejectedValueOnce(error)
      
      render(<VoiceCapture />)
      
      const button = screen.getByRole('button', { name: /tap to order/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/no microphone found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Voice Recording', () => {
    it('shows recording indicator when microphone is active', async () => {
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream)
      
      render(<VoiceCapture />)
      
      const button = screen.getByRole('button', { name: /tap to order/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByTestId('recording-indicator')).toBeInTheDocument()
      })
    })

    it('displays transcription results', async () => {
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream)
      
      render(<VoiceCapture />)
      
      // Start recording
      const button = screen.getByRole('button', { name: /tap to order/i })
      fireEvent.click(button)
      
      // Wait for permission to be granted
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled()
      })
      
      // Simulate MediaRecorder stopping and triggering transcription
      const mediaRecorder = mockMediaRecorder.mock.results[0].value
      
      // Simulate some time passing and then stopping
      await waitFor(() => {
        expect(mediaRecorder.start).toHaveBeenCalled()
      })
      
      // Trigger the onstop callback to simulate transcription
      mediaRecorder.onstop()
      
      // Wait for transcription display to appear
      await waitFor(() => {
        expect(screen.getByTestId('transcription-display')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })
})