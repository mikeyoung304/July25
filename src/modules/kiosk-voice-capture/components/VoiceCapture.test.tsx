import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceCapture } from './VoiceCapture'
import * as api from '@/services/api'

jest.mock('@/services/api')

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  state: 'inactive',
  ondataavailable: null as any,
  onstop: null as any,
}

const mockGetUserMedia = jest.fn().mockResolvedValue({
  getTracks: () => [{ stop: jest.fn() }]
})

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  },
  configurable: true
})

// @ts-ignore
global.MediaRecorder = jest.fn().mockImplementation(() => {
  const recorder = { ...mockMediaRecorder }
  
  // Simulate recording lifecycle
  recorder.start = jest.fn(() => {
    recorder.state = 'recording'
    
    // Simulate data available after 100ms
    setTimeout(() => {
      if (recorder.ondataavailable) {
        recorder.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) })
      }
    }, 100)
  })
  
  recorder.stop = jest.fn(() => {
    recorder.state = 'inactive'
    // Trigger onstop immediately
    if (recorder.onstop) {
      recorder.onstop()
    }
  })
  
  return recorder
})

// @ts-ignore
global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true)

describe('VoiceCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders a button with "Tap to Order" text', () => {
    render(<VoiceCapture />)
    
    const button = screen.getByRole('button', { name: /tap to order/i })
    expect(button).toBeInTheDocument()
  })

  it('shows "Listening..." when button is clicked', () => {
    render(<VoiceCapture />)
    
    const button = screen.getByRole('button', { name: /tap to order/i })
    fireEvent.click(button)
    
    expect(screen.getByText('Listening...')).toBeInTheDocument()
  })

  it('calls api.submitAudioForTranscription after listening completes', async () => {
    const mockSubmitAudio = jest.mocked(api.submitAudioForTranscription)
    mockSubmitAudio.mockResolvedValue({ success: true, transcript: 'Test transcript' })

    render(<VoiceCapture />)
    
    const button = screen.getByRole('button', { name: /tap to order/i })
    fireEvent.click(button)

    // Allow useEffect to run
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled()
    })

    // Fast-forward time to trigger the stop after 3 seconds
    jest.advanceTimersByTime(3000)

    // Wait for the API call with real timers for async operations
    jest.useRealTimers()
    await waitFor(() => {
      expect(mockSubmitAudio).toHaveBeenCalledTimes(1)
      expect(mockSubmitAudio).toHaveBeenCalledWith(expect.any(Blob))
    })
  })

  it('displays the transcript after successful API response', async () => {
    const mockSubmitAudio = jest.mocked(api.submitAudioForTranscription)
    mockSubmitAudio.mockResolvedValue({ 
      success: true, 
      transcript: 'This is a successful test transcript.' 
    })

    render(<VoiceCapture />)
    
    const button = screen.getByRole('button', { name: /tap to order/i })
    fireEvent.click(button)

    // Allow useEffect to run
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled()
    })

    // Fast-forward time to trigger the stop after 3 seconds
    jest.advanceTimersByTime(3000)

    // Wait for the transcript to appear
    jest.useRealTimers()
    await waitFor(() => {
      expect(screen.getByText('This is a successful test transcript.')).toBeInTheDocument()
    })
  })
})