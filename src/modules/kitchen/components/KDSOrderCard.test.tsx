import React from 'react'
import { render, screen } from '@testing-library/react'
import { KDSOrderCard } from './KDSOrderCard'

describe('KDSOrderCard', () => {
  const mockOrder = {
    orderId: 'order-123',
    orderNumber: '042',
    tableNumber: '7',
    items: [
      {
        id: 'item-1',
        name: 'Grilled Salmon',
        quantity: 2,
        modifiers: ['Extra lemon', 'No sauce'],
        notes: 'Customer allergic to garlic'
      },
      {
        id: 'item-2',
        name: 'Caesar Salad',
        quantity: 1,
      }
    ],
    status: 'new' as const,
    orderTime: new Date('2024-07-04T12:00:00'),
  }

  it('displays the order number correctly', () => {
    // Act - Render the component
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status={mockOrder.status}
        orderTime={mockOrder.orderTime}
      />
    )

    // Assert - Check that the order number is displayed
    const orderNumberElement = screen.getByText(`Order #${mockOrder.orderNumber}`)
    expect(orderNumberElement).toBeInTheDocument()
  })

  it('displays the table number', () => {
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status={mockOrder.status}
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText(`Table ${mockOrder.tableNumber}`)).toBeInTheDocument()
  })

  it('displays the correct status badge', () => {
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status={mockOrder.status}
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('displays all order items with correct quantities', () => {
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status={mockOrder.status}
        orderTime={mockOrder.orderTime}
      />
    )

    // Text is now split into separate elements in the atomic components
    expect(screen.getByText('2x')).toBeInTheDocument()
    expect(screen.getByText('Grilled Salmon')).toBeInTheDocument()
    expect(screen.getByText('1x')).toBeInTheDocument()
    expect(screen.getByText('Caesar Salad')).toBeInTheDocument()
  })

  it('displays item modifiers', () => {
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status={mockOrder.status}
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText('Extra lemon, No sauce')).toBeInTheDocument()
  })

  it('displays item notes with alert icon', () => {
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status={mockOrder.status}
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText('Customer allergic to garlic')).toBeInTheDocument()
  })

  it('shows correct button based on status', () => {
    const { rerender } = render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status="new"
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText('Start Preparing')).toBeInTheDocument()

    rerender(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status="preparing"
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText('Mark Ready')).toBeInTheDocument()

    rerender(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status="ready"
        orderTime={mockOrder.orderTime}
      />
    )

    expect(screen.getByText('Ready for Pickup')).toBeInTheDocument()
  })

  it('calls onStatusChange when button is clicked', () => {
    const mockOnStatusChange = jest.fn()
    
    render(
      <KDSOrderCard
        orderId={mockOrder.orderId}
        orderNumber={mockOrder.orderNumber}
        tableNumber={mockOrder.tableNumber}
        items={mockOrder.items}
        status="new"
        orderTime={mockOrder.orderTime}
        onStatusChange={mockOnStatusChange}
      />
    )

    const button = screen.getByText('Start Preparing')
    button.click()

    expect(mockOnStatusChange).toHaveBeenCalledWith('preparing')
  })
})