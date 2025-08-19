import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom'
import { KioskDemo } from '@/pages/KioskDemo'
import { api } from '@/services/api'
import { RestaurantProvider } from '@/core'

vi.mock('@/services/api')
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn()
    }
  })
}))

vi.mock('@/modules/voice/components/VoiceCapture', () => ({
  VoiceCapture: ({ onOrderComplete }: { onOrderComplete: (text: string) => void }) => (
    <div data-testid="voice-capture">
      <button onClick={() => onOrderComplete("I'd like 2 soul bowls with extra collards")}>
        Simulate Voice Order
      </button>
    </div>
  )
}))

const mockApi = api as vi.Mocked<typeof api>

// TODO(luis): enable when Playwright pipeline runs
describe('Voice Order to KDS Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockApi.submitOrder.mockResolvedValue({
      success: true,
      orderId: 'order-123',
      order: {
        id: 'order-123',
        restaurant_id: 'rest-1',
        orderNumber: '1001',
        status: 'new',
        tableNumber: 'K1',
        items: [],
        orderTime: new Date(),
        totalAmount: 0,
        paymentStatus: 'pending'
      }
    })
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <RestaurantProvider>
          {component}
        </RestaurantProvider>
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
      // Check for quantity and item name separately
      expect(screen.getByText('2x')).toBeInTheDocument()
      expect(screen.getByText('Soul Bowl')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for modifiers from real Grow Fresh menu
    expect(screen.getByText('Extra collards')).toBeInTheDocument()
  })

  it('submits parsed order to KDS when confirmed', async () => {
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait for order to be displayed
    await waitFor(() => {
      expect(screen.getByText('2x')).toBeInTheDocument()
      expect(screen.getByText('Soul Bowl')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Confirm order
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(mockApi.submitOrder).toHaveBeenCalledWith({
        tableNumber: 'K1',
        items: expect.arrayContaining([
          expect.objectContaining({
            name: 'Soul Bowl',
            quantity: 2,
            modifiers: ['Extra collards'] // Real Grow Fresh modifier
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
      expect(screen.getByText('2x')).toBeInTheDocument()
      expect(screen.getByText('Soul Bowl')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Confirm order
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    // Check for success indicators
    await waitFor(() => {
      expect(screen.getByText('Order Submitted!')).toBeInTheDocument()
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument()
      expect(screen.getByText('Order #1001')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles API errors gracefully', async () => {
    mockApi.submitOrder.mockRejectedValueOnce(new Error('Network error'))
    
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait for order display
    await waitFor(() => {
      expect(screen.getByText('2x')).toBeInTheDocument()
      expect(screen.getByText('Soul Bowl')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Confirm order
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    // Should not show success
    await waitFor(() => {
      expect(screen.queryByText('Order Confirmed!')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('resets order after successful submission', async () => {
    vi.useFakeTimers()
    
    renderWithRouter(<KioskDemo />)
    
    // Simulate voice capture
    const simulateButton = screen.getByText('Simulate Voice Order')
    fireEvent.click(simulateButton)
    
    // Wait and confirm order
    await waitFor(() => {
      expect(screen.getByText('2x')).toBeInTheDocument()
      expect(screen.getByText('Soul Bowl')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const confirmButton = screen.getByRole('button', { name: /confirm order/i })
    fireEvent.click(confirmButton)
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Order Submitted!')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Fast forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    
    // Order should be reset
    await waitFor(() => {
      expect(screen.getByText('No items in order yet')).toBeInTheDocument()
      expect(screen.queryByText('Order Submitted!')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    vi.useRealTimers()
  })
})