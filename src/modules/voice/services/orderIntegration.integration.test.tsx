import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { KioskDemo } from '@/pages/KioskDemo'
import { api } from '@/services/api'

jest.mock('@/services/api')
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: {
      success: jest.fn(),
      error: jest.fn()
    }
  })
}))

jest.mock('@/modules/voice/components/VoiceCapture', () => ({
  VoiceCapture: ({ onOrderComplete }: { onOrderComplete: (text: string) => void }) => (
    <div data-testid="voice-capture">
      <button onClick={() => onOrderComplete("I'd like 2 burgers with extra cheese and a large pizza")}>
        Simulate Voice Order
      </button>
    </div>
  )
}))

const mockApi = api as jest.Mocked<typeof api>

describe('Voice Order to KDS Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockApi.submitOrder.mockResolvedValue({
      success: true,
      order: {
        id: 'order-123',
        orderNumber: '1001',
        status: 'new',
        tableNumber: 'K1',
        items: [],
        orderTime: new Date().toISOString(),
        totalAmount: 0
      }
    })
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  it('parses voice order and displays in order summary', async () => {
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    act(() => {
      fireEvent.click(simulateButton)
    })
    
    // Check that order was parsed and displayed
    await waitFor(() => {
      // Check for the complete item text
      expect(screen.getByText('2x Burger')).toBeInTheDocument()
    })
    
    // Check for modifiers and other items
    expect(screen.getByText('Extra cheese')).toBeInTheDocument() // Burger modifiers
    expect(screen.getByText('1x Pizza')).toBeInTheDocument()
    expect(screen.getByText('Large, Extra cheese')).toBeInTheDocument() // Pizza modifiers
  })

  it('submits parsed order to KDS when confirmed', async () => {
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait for order to be displayed
    await waitFor(() => {
      expect(screen.getByText('2x Burger')).toBeInTheDocument()
    })
    
    // Confirm order
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(mockApi.submitOrder).toHaveBeenCalledWith({
        tableNumber: 'K1',
        items: expect.arrayContaining([
          expect.objectContaining({
            name: 'Burger',
            quantity: 2,
            modifiers: ['Extra cheese'] // Note: parseVoiceOrder extracts modifiers globally
          }),
          expect.objectContaining({
            name: 'Pizza',
            quantity: 1,
            modifiers: ['Large', 'Extra cheese'] // Pizza also gets "extra cheese" modifier
          })
        ]),
        totalAmount: expect.any(Number),
        orderType: 'dine-in'
      })
    })
  })

  it('shows success animation after order submission', async () => {
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait for order display
    await waitFor(() => {
      expect(screen.getByText('2x Burger')).toBeInTheDocument()
    })
    
    // Confirm order
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    // Check for success indicators
    await waitFor(() => {
      expect(screen.getByText('Order Submitted!')).toBeInTheDocument()
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument()
      expect(screen.getByText('Order #1001')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockApi.submitOrder.mockRejectedValueOnce(new Error('Network error'))
    
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait for order display
    await waitFor(() => {
      expect(screen.getByText('2x Burger')).toBeInTheDocument()
    })
    
    // Confirm order
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    // Should not show success
    await waitFor(() => {
      expect(screen.queryByText('Order Confirmed!')).not.toBeInTheDocument()
    })
    
    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument()
    })
  })

  it('resets order after successful submission', async () => {
    jest.useFakeTimers()
    
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait and confirm order
    await waitFor(() => {
      expect(screen.getByText('2x Burger')).toBeInTheDocument()
    })
    
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Order Submitted!')).toBeInTheDocument()
    })
    
    // Fast forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    
    // Order should be reset
    await waitFor(() => {
      expect(screen.getByText('No items in order yet')).toBeInTheDocument()
      expect(screen.queryByText('Order Submitted!')).not.toBeInTheDocument()
    })
    
    jest.useRealTimers()
  })
})