import React from 'react'
import { render } from '@testing-library/react'
import { TableLabel } from './TableLabel'

describe('TableLabel', () => {
  it('renders table number with default prefix', () => {
    const { getByText } = render(<TableLabel tableNumber="5" />)
    expect(getByText('Table 5')).toBeInTheDocument()
  })

  it('renders table number with custom prefix', () => {
    const { getByText } = render(<TableLabel tableNumber="A1" prefix="Station" />)
    expect(getByText('Station A1')).toBeInTheDocument()
  })

  it('has default styling classes', () => {
    const { getByText } = render(<TableLabel tableNumber="3" />)
    expect(getByText('Table 3')).toHaveClass('text-sm', 'text-muted-foreground')
  })

  it('applies custom className', () => {
    const { getByText } = render(<TableLabel tableNumber="7" className="font-bold" />)
    expect(getByText('Table 7')).toHaveClass('font-bold', 'text-sm', 'text-muted-foreground')
  })
})