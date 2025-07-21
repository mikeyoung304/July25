import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RestaurantProvider } from '@/core/RestaurantContext';
import { FilterProvider } from '@/modules/filters/contexts/FilterContext';
import { SoundSettingsProvider } from '@/modules/sound/contexts/SoundSettingsContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock restaurant data
export const mockRestaurant = {
  id: 'test-restaurant-id',
  name: 'Test Restaurant',
  logo_url: null,
  timezone: 'America/New_York',
  currency: 'USD',
  tax_rate: 0.08,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock order data
export const mockOrder = {
  id: 'order-123',
  restaurant_id: 'test-restaurant-id',
  order_number: 'ORD-001',
  customer_name: 'John Doe',
  customer_phone: '555-0123',
  customer_email: 'john@example.com',
  type: 'dine-in' as const,
  status: 'pending' as const,
  items: [
    {
      id: 'item-1',
      menu_item_id: '101',
      name: 'Test Item',
      quantity: 1,
      price: 10.00,
      modifiers: [],
      subtotal: 10.00,
    },
  ],
  subtotal: 10.00,
  tax: 0.80,
  total: 10.80,
  payment_status: 'pending' as const,
  payment_method: 'cash' as const,
  table_number: '5',
  notes: 'Test order',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Provider wrapper for tests
interface AllTheProvidersProps {
  children: React.ReactNode;
  initialRoute?: string;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children, 
  initialRoute = '/' 
}) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <RestaurantProvider restaurant={mockRestaurant}>
        <FilterProvider>
          <SoundSettingsProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SoundSettingsProvider>
        </FilterProvider>
      </RestaurantProvider>
    </MemoryRouter>
  );
};

// Custom render method
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialRoute?: string }
) => {
  const { initialRoute, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} initialRoute={initialRoute} />,
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Utility functions
export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

// Mock implementations
export const createMockWebSocket = () => {
  const mockWebSocket = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  };
  
  return mockWebSocket;
};

export const createMockMediaRecorder = () => {
  const mockMediaRecorder = {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    state: 'inactive' as RecordingState,
  };
  
  return mockMediaRecorder;
};

// Common test IDs
export const testIds = {
  orderCard: (id: string) => `order-card-${id}`,
  orderStatus: (id: string) => `order-status-${id}`,
  loadingSpinner: 'loading-spinner',
  errorDisplay: 'error-display',
  emptyState: 'empty-state',
};