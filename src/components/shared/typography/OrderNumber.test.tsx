import React from 'react'
import { render } from '@testing-library/react'
import { OrderNumber } from './OrderNumber'

describe('OrderNumber', () => {
  it('renders order number with default prefix', () => {
    const { getByText } = render(<OrderNumber orderNumber="12345" />)
    expect(getByText('Order #12345')).toBeInTheDocument()
  })

  it('renders order number with custom prefix', () => {
    const { getByText } = render(<OrderNumber orderNumber="12345" prefix="Ticket " />)
    expect(getByText('Ticket 12345')).toBeInTheDocument()
  })

  it('renders order number without prefix', () => {
    const { getByText } = render(<OrderNumber orderNumber="12345" prefix="" />)
    expect(getByText('12345')).toBeInTheDocument()
  })

  it('applies small size class', () => {
    const { getByText } = render(<OrderNumber orderNumber="123" size="sm" />)
    expect(getByText('Order #123')).toHaveClass('text-sm')
  })

  it('applies medium size class by default', () => {
    const { getByText } = render(<OrderNumber orderNumber="123" />)
    expect(getByText('Order #123')).toHaveClass('text-base')
  })

  it('applies large size class', () => {
    const { getByText } = render(<OrderNumber orderNumber="123" size="lg" />)
    expect(getByText('Order #123')).toHaveClass('text-lg', 'font-semibold')
  })

  it('applies custom className', () => {
    const { getByText } = render(<OrderNumber orderNumber="123" className="text-red-500" />)
    expect(getByText('Order #123')).toHaveClass('text-red-500')
  })
})