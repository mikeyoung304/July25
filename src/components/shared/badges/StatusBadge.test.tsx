import React from 'react'
import { render } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders new status correctly', () => {
    const { getByText } = render(<StatusBadge status="new" />)
    const badge = getByText('New')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('renders preparing status correctly', () => {
    const { getByText } = render(<StatusBadge status="preparing" />)
    const badge = getByText('Preparing')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('renders ready status correctly', () => {
    const { getByText } = render(<StatusBadge status="ready" />)
    const badge = getByText('Ready')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('applies compact variant styles', () => {
    const { getByText } = render(<StatusBadge status="new" variant="compact" />)
    const badge = getByText('New')
    expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5')
  })

  it('applies custom className', () => {
    const { getByText } = render(<StatusBadge status="new" className="custom-class" />)
    const badge = getByText('New')
    expect(badge).toHaveClass('custom-class')
  })
})