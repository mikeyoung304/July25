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
  });
});
