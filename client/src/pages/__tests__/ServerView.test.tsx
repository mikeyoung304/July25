/**
 * ServerView Component Unit Tests
 * Converted from E2E test: production-serverview-detailed.spec.ts
 *
 * These tests focus on component rendering states (loading, error, success)
 * rather than production network monitoring.
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ServerView } from '../ServerView';
import type { Table } from '@rebuild/shared/types';

// Mock dependencies
vi.mock('@/pages/hooks/useServerView');
vi.mock('@/pages/hooks/useTableInteraction');
vi.mock('@/pages/hooks/useVoiceOrderWebRTC');
vi.mock('@/contexts/auth.hooks');
vi.mock('@/services/http', () => ({
  useHttpClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }))
}));
vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    }
  }))
}));

// Mock child components
vi.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <div data-testid="role-guard">{children}</div>
}));

vi.mock('@/pages/components/ServerFloorPlan', () => ({
  ServerFloorPlan: ({ tables, isLoading }: { tables: Table[]; isLoading: boolean }) => (
    <div data-testid="floor-plan">
      {isLoading && <div>Loading floor plan...</div>}
      {!isLoading && tables.length === 0 && <div>No tables available</div>}
      {!isLoading && tables.length > 0 && (
        <div>
          <div>Floor plan loaded</div>
          {tables.map(table => (
            <div key={table.id} data-testid={`table-${table.id}`}>
              {table.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

vi.mock('@/pages/components/SeatSelectionModal', () => ({
  SeatSelectionModal: () => null
}));

vi.mock('@/pages/components/VoiceOrderModal', () => ({
  VoiceOrderModal: () => null
}));

vi.mock('@/pages/components/PostOrderPrompt', () => ({
  PostOrderPrompt: () => null
}));

vi.mock('@/pages/components/ServerStats', () => ({
  ServerStats: () => null
}));

vi.mock('@/pages/components/ServerHeader', () => ({
  ServerHeader: () => <div data-testid="server-header">Server Header</div>
}));

vi.mock('@/components/payments', () => ({
  PaymentModal: () => null
}));

vi.mock('@/components/errors/PaymentErrorBoundary', () => ({
  PaymentErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('ServerView', () => {
  const mockUseServerView = vi.hoisted(() => vi.fn());
  const mockUseTableInteraction = vi.hoisted(() => vi.fn());
  const mockUseVoiceOrderWebRTC = vi.hoisted(() => vi.fn());
  const mockUseAuth = vi.hoisted(() => vi.fn());

  // Mock table data
  const mockTables: Table[] = [
    {
      id: 'table-1',
      restaurant_id: 'rest-1',
      label: 'T1',
      seats: 4,
      status: 'available',
      type: 'square',
      x: 100,
      y: 100,
      width: 80,
      height: 80,
      rotation: 0,
      z_index: 1,
      active: true
    },
    {
      id: 'table-2',
      restaurant_id: 'rest-1',
      label: 'T2',
      seats: 2,
      status: 'occupied',
      type: 'round',
      x: 200,
      y: 100,
      width: 60,
      height: 60,
      rotation: 0,
      z_index: 1,
      active: true
    },
    {
      id: 'table-3',
      restaurant_id: 'rest-1',
      label: 'T3',
      seats: 6,
      status: 'reserved',
      type: 'rectangle',
      x: 300,
      y: 100,
      width: 120,
      height: 80,
      rotation: 0,
      z_index: 1,
      active: true
    }
  ];

  const mockStats = {
    totalTables: 3,
    availableTables: 1,
    occupiedTables: 1,
    reservedTables: 1,
    paidTables: 0,
    totalSeats: 12,
    availableSeats: 4
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseServerView.mockReturnValue({
      tables: [],
      isLoading: true,
      selectedTableId: null,
      setSelectedTableId: vi.fn(),
      selectedTable: null,
      stats: {
        totalTables: 0,
        availableTables: 0,
        occupiedTables: 0,
        reservedTables: 0,
        paidTables: 0,
        totalSeats: 0,
        availableSeats: 0
      },
      restaurant: { id: 'rest-1', name: 'Test Restaurant' }
    });

    mockUseTableInteraction.mockReturnValue({
      handleTableClick: vi.fn()
    });

    mockUseVoiceOrderWebRTC.mockReturnValue({
      showVoiceOrder: false,
      showPostOrderPrompt: false,
      orderedSeats: [],
      lastCompletedSeat: null,
      isSubmitting: false,
      submitOrder: vi.fn(),
      setShowVoiceOrder: vi.fn(),
      setShowPostOrderPrompt: vi.fn(),
      handleAddNextSeat: vi.fn(),
      handleFinishTable: vi.fn(),
      resetVoiceOrder: vi.fn()
    });

    mockUseAuth.mockReturnValue({
      hasScope: vi.fn().mockReturnValue(true)
    });

    // Apply mocks
    const { useServerView } = await import('@/pages/hooks/useServerView');
    const { useTableInteraction } = await import('@/pages/hooks/useTableInteraction');
    const { useVoiceOrderWebRTC } = await import('@/pages/hooks/useVoiceOrderWebRTC');
    const { useAuth } = await import('@/contexts/auth.hooks');

    vi.mocked(useServerView).mockImplementation(mockUseServerView);
    vi.mocked(useTableInteraction).mockImplementation(mockUseTableInteraction);
    vi.mocked(useVoiceOrderWebRTC).mockImplementation(mockUseVoiceOrderWebRTC);
    vi.mocked(useAuth).mockImplementation(mockUseAuth);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ServerView />
      </BrowserRouter>
    );
  };

  describe('Loading State', () => {
    it('renders loading state while floor plan is fetching', () => {
      mockUseServerView.mockReturnValue({
        tables: [],
        isLoading: true,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      expect(screen.getByText('Loading floor plan...')).toBeInTheDocument();
      expect(screen.queryByText('Floor plan loaded')).not.toBeInTheDocument();
    });

    it('does not display tables while loading', () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: true,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      expect(screen.getByText('Loading floor plan...')).toBeInTheDocument();
      expect(screen.queryByTestId('table-table-1')).not.toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders floor plan when data is loaded', async () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Floor plan loaded')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading floor plan...')).not.toBeInTheDocument();
    });

    it('displays correct number of tables from floor plan data', async () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('table-table-1')).toBeInTheDocument();
      });

      expect(screen.getByTestId('table-table-1')).toHaveTextContent('T1');
      expect(screen.getByTestId('table-table-2')).toHaveTextContent('T2');
      expect(screen.getByTestId('table-table-3')).toHaveTextContent('T3');
    });

    it('renders tables with different statuses correctly', async () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('table-table-1')).toBeInTheDocument();
      });

      // All three tables with different statuses should be rendered
      expect(screen.getByTestId('table-table-1')).toBeInTheDocument(); // available
      expect(screen.getByTestId('table-table-2')).toBeInTheDocument(); // occupied
      expect(screen.getByTestId('table-table-3')).toBeInTheDocument(); // reserved
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no tables exist', async () => {
      mockUseServerView.mockReturnValue({
        tables: [],
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: {
          totalTables: 0,
          availableTables: 0,
          occupiedTables: 0,
          reservedTables: 0,
          paidTables: 0,
          totalSeats: 0,
          availableSeats: 0
        },
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No tables available')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading floor plan...')).not.toBeInTheDocument();
      expect(screen.queryByText('Floor plan loaded')).not.toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders server header', () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      expect(screen.getByTestId('server-header')).toBeInTheDocument();
    });

    it('renders role guard wrapper', () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      expect(screen.getByTestId('role-guard')).toBeInTheDocument();
    });

    it('renders floor plan component', () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      expect(screen.getByTestId('floor-plan')).toBeInTheDocument();
    });

    it('renders how-to-use instructions', async () => {
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('How to Use Server View')).toBeInTheDocument();
      });

      expect(screen.getByText(/Click on any available table/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('correctly handles both loading and loaded states independently', () => {
      // Test 1: Loading state
      mockUseServerView.mockReturnValue({
        tables: [],
        isLoading: true,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: {
          totalTables: 0,
          availableTables: 0,
          occupiedTables: 0,
          reservedTables: 0,
          paidTables: 0,
          totalSeats: 0,
          availableSeats: 0
        },
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      const { unmount } = render(
        <BrowserRouter>
          <ServerView />
        </BrowserRouter>
      );

      expect(screen.getByText('Loading floor plan...')).toBeInTheDocument();
      expect(screen.queryByText('Floor plan loaded')).not.toBeInTheDocument();

      // Cleanup
      unmount();

      // Test 2: Loaded state (separate render)
      mockUseServerView.mockReturnValue({
        tables: mockTables,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: mockStats,
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      render(
        <BrowserRouter>
          <ServerView />
        </BrowserRouter>
      );

      expect(screen.queryByText('Loading floor plan...')).not.toBeInTheDocument();
      expect(screen.getByText('Floor plan loaded')).toBeInTheDocument();
    });

    it('handles single table correctly', async () => {
      const singleTable: Table[] = [mockTables[0]];

      mockUseServerView.mockReturnValue({
        tables: singleTable,
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: {
          totalTables: 1,
          availableTables: 1,
          occupiedTables: 0,
          reservedTables: 0,
          paidTables: 0,
          totalSeats: 4,
          availableSeats: 4
        },
        restaurant: { id: 'rest-1', name: 'Test Restaurant' }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('table-table-1')).toBeInTheDocument();
      });

      expect(screen.getByTestId('table-table-1')).toHaveTextContent('T1');
      expect(screen.queryByTestId('table-table-2')).not.toBeInTheDocument();
    });

    it('handles restaurant context without restaurant ID', () => {
      mockUseServerView.mockReturnValue({
        tables: [],
        isLoading: false,
        selectedTableId: null,
        setSelectedTableId: vi.fn(),
        selectedTable: null,
        stats: {
          totalTables: 0,
          availableTables: 0,
          occupiedTables: 0,
          reservedTables: 0,
          paidTables: 0,
          totalSeats: 0,
          availableSeats: 0
        },
        restaurant: null
      });

      renderComponent();

      // Should render without crashing
      expect(screen.getByTestId('floor-plan')).toBeInTheDocument();
    });
  });
});
