import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { UnifiedVoiceRecorder } from '../UnifiedVoiceRecorder';

// Mock the hooks
vi.mock('@/modules/voice/hooks/useAudioCapture', () => ({
  useAudioCapture: () => ({
    isRecording: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));

vi.mock('@/modules/voice/hooks/useVoiceSocket', () => ({
  useVoiceSocket: () => ({
    isConnected: true,
    connectionState: 'connected',
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendAudio: vi.fn(),
  }),
}));

// Mock MicrophonePermission component
vi.mock('@/modules/voice/components/MicrophonePermission', () => ({
  MicrophonePermission: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('UnifiedVoiceRecorder', () => {
  const defaultProps = {
    onTranscriptionComplete: vi.fn(),
    onOrderProcessed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<UnifiedVoiceRecorder {...defaultProps} />);
    
    expect(screen.getByText('Tap to record')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows connection status when enabled', () => {
    render(
      <UnifiedVoiceRecorder 
        {...defaultProps} 
        showConnectionStatus={true}
      />
    );
    
    // ConnectionIndicator should be rendered
    expect(screen.getByText(/connected|connecting|disconnected/i)).toBeInTheDocument();
  });

  it('hides connection status when disabled', () => {
    render(
      <UnifiedVoiceRecorder 
        {...defaultProps} 
        showConnectionStatus={false}
      />
    );
    
    expect(screen.queryByText(/connected|connecting|disconnected/i)).not.toBeInTheDocument();
  });

  it('handles tap-to-toggle mode', async () => {
    const mockStartRecording = vi.fn();
    const mockStopRecording = vi.fn();
    
    vi.mocked(useAudioCapture).mockReturnValue({
      isRecording: false,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
    });

    render(
      <UnifiedVoiceRecorder 
        {...defaultProps} 
        mode="tap-to-toggle"
      />
    );
    
    const button = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockStartRecording).toHaveBeenCalled();
    });
  });

  it('handles hold-to-talk mode', () => {
    render(
      <UnifiedVoiceRecorder 
        {...defaultProps} 
        mode="hold-to-talk"
      />
    );
    
    expect(screen.getByText('Hold to talk')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const errorMessage = 'Connection failed';
    
    // Mock the hook to trigger an error
    vi.mocked(useVoiceSocket).mockReturnValue({
      isConnected: false,
      connectionState: 'error',
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      onError: (callback: (error: Error) => void) => {
        callback(new Error(errorMessage));
      },
    });
    
    render(<UnifiedVoiceRecorder {...defaultProps} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows transcription when enabled', () => {
    const transcription = 'I would like a burger';
    
    // Mock the hook to provide transcription
    vi.mocked(useVoiceSocket).mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      onTranscription: (callback: (text: string) => void) => {
        callback(transcription);
      },
    });
    
    render(
      <UnifiedVoiceRecorder 
        {...defaultProps} 
        showTranscription={true}
      />
    );
    
    expect(screen.getByText(transcription)).toBeInTheDocument();
  });

  it('applies custom class names', () => {
    const customClass = 'custom-recorder-class';
    const buttonClass = 'custom-button-class';
    const transcriptionClass = 'custom-transcription-class';
    
    const { container } = render(
      <UnifiedVoiceRecorder 
        {...defaultProps}
        className={customClass}
        buttonClassName={buttonClass}
        transcriptionClassName={transcriptionClass}
      />
    );
    
    expect(container.querySelector('.unified-voice-recorder')).toHaveClass(customClass);
  });

  it('shows recording indicator when recording', () => {
    vi.mocked(useAudioCapture).mockReturnValue({
      isRecording: true,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
    });
    
    render(
      <UnifiedVoiceRecorder 
        {...defaultProps} 
        showRecordingIndicator={true}
      />
    );
    
    // RecordingIndicator component should be rendered
    expect(screen.getByText(/recording/i)).toBeInTheDocument();
  });

  it('calls onTranscriptionComplete callback', () => {
    const transcription = 'Test transcription';
    
    vi.mocked(useVoiceSocket).mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      onTranscription: (callback: (text: string) => void) => {
        callback(transcription);
      },
    });
    
    render(<UnifiedVoiceRecorder {...defaultProps} />);
    
    expect(defaultProps.onTranscriptionComplete).toHaveBeenCalledWith(transcription);
  });
});