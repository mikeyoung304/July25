import React from 'react'
import { vi } from 'vitest';
import { render } from '@testing-library/react'
import { ElapsedTimer } from './ElapsedTimer'

describe('ElapsedTimer', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  afterAll(() => {
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
})