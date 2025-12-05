import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HoldToRecordButton } from './HoldToRecordButton';

describe('HoldToRecordButton', () => {
  const defaultProps = {
    onMouseDown: vi.fn(),
    onMouseUp: vi.fn(),
    isListening: false,
    isProcessing: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with "Hold to Speak" text by default', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    expect(screen.getByText('Hold to Speak')).toBeInTheDocument();
  });

  it('shows "Listening..." when isListening is true in toggle mode', () => {
    // In toggle/vad modes, the text shows "Listening..." when isListening is true
    render(<HoldToRecordButton {...defaultProps} mode="toggle" isListening={true} />);
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('shows "Processing..." when isProcessing is true', () => {
    render(<HoldToRecordButton {...defaultProps} isProcessing={true} />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('calls onMouseDown when button is pressed', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseUp when button is released after mouseDown (with debounce)', async () => {
    vi.useFakeTimers();
    render(<HoldToRecordButton {...defaultProps} debounceMs={0} />);
    const button = screen.getByRole('button');
    // Must press down first to set isHoldingRef.current = true
    fireEvent.mouseDown(button);
    // Advance time past debounce
    vi.advanceTimersByTime(200);
    fireEvent.mouseUp(button);
    expect(defaultProps.onMouseUp).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('calls onMouseUp when mouse leaves button after mouseDown (with debounce)', async () => {
    vi.useFakeTimers();
    render(<HoldToRecordButton {...defaultProps} debounceMs={0} />);
    const button = screen.getByRole('button');
    // Must press down first to set isHoldingRef.current = true
    fireEvent.mouseDown(button);
    // Advance time past debounce
    vi.advanceTimersByTime(200);
    fireEvent.mouseLeave(button);
    expect(defaultProps.onMouseUp).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('handles touch events (with debounce)', async () => {
    vi.useFakeTimers();
    render(<HoldToRecordButton {...defaultProps} debounceMs={0} />);
    const button = screen.getByRole('button');

    // Touch start
    fireEvent.touchStart(button);
    expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);

    // Advance time past debounce
    vi.advanceTimersByTime(200);

    // Touch end - should call onMouseUp since touchStart set isHoldingRef.current
    fireEvent.touchEnd(button);
    expect(defaultProps.onMouseUp).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('is disabled when disabled prop is true', () => {
    render(<HoldToRecordButton {...defaultProps} disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('applies danger styling when listening in toggle mode', () => {
    // In toggle/vad modes, isActive is derived from isListening || isPendingStart
    render(<HoldToRecordButton {...defaultProps} mode="toggle" isListening={true} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger');
  });

  it('applies primary styling when not listening', () => {
    render(<HoldToRecordButton {...defaultProps} isListening={false} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies pulse animation when connecting', () => {
    // Pulse animation is applied during connecting state
    render(<HoldToRecordButton {...defaultProps} connectionState="connecting" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('animate-pulse');
  });

  it('renders microphone icon', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toHaveClass('lucide-mic');
  });

  describe('toggle mode', () => {
    it('shows "Tap to Start" in toggle mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" />);
      expect(screen.getByText('Tap to Start')).toBeInTheDocument();
    });

    it('shows "Listening..." when active in toggle mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" isListening={true} />);
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });
  });

  describe('vad mode', () => {
    it('shows "Tap to Speak" in vad mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="vad" />);
      expect(screen.getByText('Tap to Speak')).toBeInTheDocument();
    });

    it('shows "Listening..." when active in vad mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="vad" isListening={true} />);
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });
  });

  describe('connection states', () => {
    it('shows "Tap to Connect" when disconnected', () => {
      render(<HoldToRecordButton {...defaultProps} connectionState="disconnected" />);
      expect(screen.getByText('Tap to Connect')).toBeInTheDocument();
    });

    it('shows "Connecting..." when connecting', () => {
      render(<HoldToRecordButton {...defaultProps} connectionState="connecting" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('shows "Connection Error" when error state', () => {
      render(<HoldToRecordButton {...defaultProps} connectionState="error" />);
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    it('transitions from "Tap to Connect" to "Connecting..." when tapped in toggle mode', () => {
      const { rerender } = render(
        <HoldToRecordButton
          {...defaultProps}
          mode="toggle"
          connectionState="disconnected"
        />
      );

      expect(screen.getByText('Tap to Connect')).toBeInTheDocument();

      // Simulate transition to connecting state
      rerender(
        <HoldToRecordButton
          {...defaultProps}
          mode="toggle"
          connectionState="connecting"
        />
      );

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('transitions from "Tap to Connect" to "Connecting..." when isPendingStart is true', () => {
      const { rerender } = render(
        <HoldToRecordButton
          {...defaultProps}
          mode="vad"
          connectionState="disconnected"
        />
      );

      expect(screen.getByText('Tap to Connect')).toBeInTheDocument();

      // Simulate pending start state
      rerender(
        <HoldToRecordButton
          {...defaultProps}
          mode="vad"
          isPendingStart={true}
          connectionState="disconnected"
        />
      );

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('kiosk mode sizing', () => {
    it('has correct size classes for large kiosk mode (w-40 h-40)', () => {
      render(<HoldToRecordButton {...defaultProps} size="large" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-40', 'h-40');
    });

    it('has correct size classes for normal mode (w-32 h-32)', () => {
      render(<HoldToRecordButton {...defaultProps} size="normal" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-32', 'h-32');
    });

    it('defaults to normal size when size prop is not provided', () => {
      render(<HoldToRecordButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-32', 'h-32');
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA label when disconnected', () => {
      render(<HoldToRecordButton {...defaultProps} connectionState="disconnected" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Tap to connect to voice service');
    });

    it('has correct ARIA label when connecting', () => {
      render(<HoldToRecordButton {...defaultProps} connectionState="connecting" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Connecting to voice service...');
    });

    it('has correct ARIA label when connected and ready to record in VAD mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="vad" connectionState="connected" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Tap to start speaking your order');
    });

    it('has correct ARIA label when listening in VAD mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="vad" isListening={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Listening - speak naturally, I will detect when you finish');
    });

    it('has correct ARIA label when connected and ready to record in toggle mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" connectionState="connected" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Tap to start recording your voice order');
    });

    it('has correct ARIA label when listening in toggle mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" isListening={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Tap to stop recording');
    });

    it('has correct ARIA label when processing', () => {
      render(<HoldToRecordButton {...defaultProps} isProcessing={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Processing your voice order');
    });

    it('has correct ARIA label for hold mode when ready', () => {
      render(<HoldToRecordButton {...defaultProps} mode="hold" connectionState="connected" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Hold to record your voice order');
    });

    it('sets aria-pressed to false when not active', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" isListening={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('sets aria-pressed to true when listening in toggle mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" isListening={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('sets aria-busy to true when processing', () => {
      render(<HoldToRecordButton {...defaultProps} isProcessing={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('sets aria-busy to false when not processing', () => {
      render(<HoldToRecordButton {...defaultProps} isProcessing={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'false');
    });
  });

  describe('touch event handling', () => {
    it('responds to touch events and calls onMouseDown', () => {
      render(<HoldToRecordButton {...defaultProps} mode="hold" />);
      const button = screen.getByRole('button');

      fireEvent.touchStart(button);
      expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);
    });

    it('responds to touch events in toggle mode', async () => {
      vi.useFakeTimers();
      render(<HoldToRecordButton {...defaultProps} mode="toggle" debounceMs={0} />);
      const button = screen.getByRole('button');

      fireEvent.touchStart(button);
      expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('responds to touch events in VAD mode', async () => {
      vi.useFakeTimers();
      render(<HoldToRecordButton {...defaultProps} mode="vad" debounceMs={0} />);
      const button = screen.getByRole('button');

      fireEvent.touchStart(button);
      expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('rejects multi-touch events in toggle mode', () => {
      render(<HoldToRecordButton {...defaultProps} mode="toggle" showDebounceWarning={true} />);
      const button = screen.getByRole('button');

      // Simulate multi-touch with 2 touches
      fireEvent.touchStart(button, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 150, clientY: 150 }
        ]
      });

      // Should not call onMouseDown due to multi-touch rejection
      expect(defaultProps.onMouseDown).not.toHaveBeenCalled();
    });
  });
});
