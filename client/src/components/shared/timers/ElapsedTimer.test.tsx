import React from 'react'
import { vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react'
import { ElapsedTimer } from './ElapsedTimer'

/**
 * ElapsedTimer Tests
 *
 * Tests for Issue #122 (OPT-005): useMemo anti-pattern fix
 *
 * Verifies:
 * 1. Timer displays correctly in different formats
 * 2. Timer UPDATES every second (not frozen like before)
 * 3. Interval is cleaned up on unmount (no memory leaks)
 */
describe('ElapsedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders elapsed time in minutes format by default', () => {
    const startTime = new Date('2024-01-01T11:45:00Z') // 15 minutes ago
    const { getByText } = render(<ElapsedTimer startTime={startTime} />)
    expect(getByText('15m')).toBeInTheDocument()
  })

  it('renders elapsed time in seconds format', () => {
    const startTime = new Date('2024-01-01T11:59:30Z') // 30 seconds ago
    const { getByText } = render(<ElapsedTimer startTime={startTime} format="seconds" />)
    expect(getByText('30s')).toBeInTheDocument()
  })

  it('renders elapsed time in full format', () => {
    const startTime = new Date('2024-01-01T10:45:30Z') // 1h 14m 30s ago
    const { getByText } = render(<ElapsedTimer startTime={startTime} format="full" />)
    expect(getByText('1h 14m')).toBeInTheDocument()
  })

  it('renders full format without hours when less than 1 hour', () => {
    const startTime = new Date('2024-01-01T11:45:30Z') // 14m 30s ago
    const { getByText } = render(<ElapsedTimer startTime={startTime} format="full" />)
    expect(getByText('14m 30s')).toBeInTheDocument()
  })

  it('shows clock icon by default', () => {
    const startTime = new Date()
    const { container } = render(<ElapsedTimer startTime={startTime} />)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('hides clock icon when showIcon is false', () => {
    const startTime = new Date()
    const { container } = render(<ElapsedTimer startTime={startTime} showIcon={false} />)
    const icon = container.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const startTime = new Date()
    const { container } = render(<ElapsedTimer startTime={startTime} className="custom-timer" />)
    expect(container.firstChild).toHaveClass('custom-timer')
  })

  /**
   * FIX #122 (OPT-005): Timer updates every second
   *
   * CRITICAL TEST: Verifies timer is NOT frozen (bug from useMemo pattern)
   */
  it('updates elapsed time every second', () => {
    const startTime = new Date('2024-01-01T11:59:30Z') // 30 seconds ago
    const { getByText, rerender } = render(<ElapsedTimer startTime={startTime} format="seconds" />)

    // Initial render shows 30s
    expect(getByText('30s')).toBeInTheDocument()

    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Timer should update to 31s
    expect(getByText('31s')).toBeInTheDocument()

    // Advance time by 5 more seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Timer should update to 36s
    expect(getByText('36s')).toBeInTheDocument()
  })

  /**
   * FIX #122 (OPT-005): Timer updates minutes format
   *
   * Verifies timer updates work for minutes format too
   */
  it('updates elapsed time in minutes format', () => {
    const startTime = new Date('2024-01-01T11:59:00Z') // 1 minute ago
    const { getByText } = render(<ElapsedTimer startTime={startTime} format="minutes" />)

    // Initial render shows 1m
    expect(getByText('1m')).toBeInTheDocument()

    // Advance time by 60 seconds (1 minute)
    act(() => {
      vi.advanceTimersByTime(60000)
    })

    // Timer should update to 2m
    expect(getByText('2m')).toBeInTheDocument()
  })

  /**
   * FIX #122 (OPT-005): Interval cleanup on unmount
   *
   * CRITICAL TEST: Verifies no memory leaks when component unmounts
   */
  it('clears interval on unmount', () => {
    const startTime = new Date('2024-01-01T11:59:30Z')
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const { unmount } = render(<ElapsedTimer startTime={startTime} format="seconds" />)

    // Unmount component
    unmount()

    // Verify clearInterval was called (cleanup function executed)
    expect(clearIntervalSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
  })

  /**
   * FIX #122 (OPT-005): Interval recreated when dependencies change
   *
   * Verifies interval is properly cleaned up and recreated when props change
   */
  it('recreates interval when format changes', () => {
    const startTime = new Date('2024-01-01T11:59:30Z') // 30 seconds ago
    const { getByText, rerender } = render(
      <ElapsedTimer startTime={startTime} format="seconds" />
    )

    // Initial render shows 30s
    expect(getByText('30s')).toBeInTheDocument()

    // Change format to minutes
    rerender(<ElapsedTimer startTime={startTime} format="minutes" />)

    // Should now show 0m (less than 1 minute)
    expect(getByText('0m')).toBeInTheDocument()

    // Advance time by 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000)
    })

    // Timer should update to 1m
    expect(getByText('1m')).toBeInTheDocument()
  })
})