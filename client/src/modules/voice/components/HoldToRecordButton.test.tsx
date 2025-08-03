import React from 'react';
import { vi } from 'vitest';
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

  it('renders with "HOLD ME" text by default', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    expect(screen.getByText('HOLD ME')).toBeInTheDocument();
  });

  it('shows "LISTENING..." when isListening is true', () => {
    render(<HoldToRecordButton {...defaultProps} isListening={true} />);
    expect(screen.getByText('LISTENING...')).toBeInTheDocument();
  });

  it('shows "PROCESSING..." when isProcessing is true', () => {
    render(<HoldToRecordButton {...defaultProps} isProcessing={true} />);
    expect(screen.getByText('PROCESSING...')).toBeInTheDocument();
  });

  it('calls onMouseDown when button is pressed', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseUp when button is released', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.mouseUp(button);
    expect(defaultProps.onMouseUp).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseUp when mouse leaves button', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.mouseLeave(button);
    expect(defaultProps.onMouseUp).toHaveBeenCalledTimes(1);
  });

  it('handles touch events', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const button = screen.getByRole('button');
    
    // Touch start
    fireEvent.touchStart(button);
    expect(defaultProps.onMouseDown).toHaveBeenCalledTimes(1);
    
    // Touch end
    fireEvent.touchEnd(button);
    expect(defaultProps.onMouseUp).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<HoldToRecordButton {...defaultProps} disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('applies danger styling when listening', () => {
    render(<HoldToRecordButton {...defaultProps} isListening={true} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger');
  });

  it('applies primary styling when not listening', () => {
    render(<HoldToRecordButton {...defaultProps} isListening={false} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies pulse animation when processing', () => {
    render(<HoldToRecordButton {...defaultProps} isProcessing={true} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('animate-pulse');
  });

  it('renders microphone icon', () => {
    render(<HoldToRecordButton {...defaultProps} />);
    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toHaveClass('lucide-mic');
  });
});