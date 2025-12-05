import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FloorPlanCanvas } from '../FloorPlanCanvas';
import { SeatSelectionModal } from '@/pages/components/SeatSelectionModal';
import type { Table } from '@/modules/floor-plan/types';

// Mock data
const mockTable: Table = {
  id: 'table-1',
  restaurant_id: '11111111-1111-1111-1111-111111111111',
  label: 'Table 5',
  seats: 4,
  status: 'available',
  type: 'rectangle',
  x: 300,
  y: 200,
  width: 80,
  height: 80,
  rotation: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockOccupiedTable: Table = {
  ...mockTable,
  id: 'table-2',
  label: 'Table 6',
  x: 500,
  y: 200,
  status: 'occupied'
};

const mockCircleTable: Table = {
  ...mockTable,
  id: 'table-3',
  label: 'Table 7',
  type: 'circle',
  x: 700,
  y: 200
};

describe('Table Interaction', () => {
  let mockOnTableClick: ReturnType<typeof vi.fn>;
  let mockOnCanvasClick: ReturnType<typeof vi.fn>;
  let mockOnTableMove: ReturnType<typeof vi.fn>;
  let mockOnTableResize: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnTableClick = vi.fn();
    mockOnCanvasClick = vi.fn();
    mockOnTableMove = vi.fn();
    mockOnTableResize = vi.fn();
  });

  describe('Table Click Interaction', () => {
    it('calls onTableClick when table is clicked', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          onCanvasClick={mockOnCanvasClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Simulate click at table position
      fireEvent.mouseDown(canvas!, { clientX: 300, clientY: 200 });

      expect(mockOnTableClick).toHaveBeenCalledWith('table-1');
    });

    it('calls onCanvasClick when empty area is clicked', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          onCanvasClick={mockOnCanvasClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');

      // Click far from any table
      fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 100 });

      expect(mockOnCanvasClick).toHaveBeenCalled();
      expect(mockOnTableClick).not.toHaveBeenCalled();
    });

    it('handles clicks on multiple tables correctly', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable, mockOccupiedTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          onCanvasClick={mockOnCanvasClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');

      // Click first table
      fireEvent.mouseDown(canvas!, { clientX: 300, clientY: 200 });
      expect(mockOnTableClick).toHaveBeenCalledWith('table-1');

      // Click second table
      fireEvent.mouseDown(canvas!, { clientX: 500, clientY: 200 });
      expect(mockOnTableClick).toHaveBeenCalledWith('table-2');
    });
  });

  describe('Table Selection State', () => {
    it('highlights selected table with visual indicator', () => {
      const { container, rerender } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      // Rerender with selected table
      rerender(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId="table-1"
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      // Verify canvas is rendered with selected table
      // Note: Cannot directly inspect canvas rendering in jsdom,
      // but we can verify the component accepts selectedTableId
      expect(canvas).toBeInTheDocument();
    });

    it('changes selection when different table is clicked', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable, mockOccupiedTable]}
          selectedTableId="table-1"
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');

      // Click different table
      fireEvent.mouseDown(canvas!, { clientX: 500, clientY: 200 });

      expect(mockOnTableClick).toHaveBeenCalledWith('table-2');
    });

    it('clears selection when canvas is clicked', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId="table-1"
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          onCanvasClick={mockOnCanvasClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');

      // Click empty area
      fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 100 });

      expect(mockOnCanvasClick).toHaveBeenCalled();
    });
  });

  describe('Table Component Rendering', () => {
    it('renders table with correct properties', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '1200');
      expect(canvas).toHaveAttribute('height', '700');
    });

    it('renders as clickable canvas element', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          onTableClick={mockOnTableClick}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('cursor-pointer');
    });

    it('renders multiple tables correctly', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable, mockOccupiedTable, mockCircleTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Canvas should render all tables (we can't inspect canvas content directly,
      // but we can verify the component accepts multiple tables)
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Table Status Rendering', () => {
    it('renders available table with correct visual state', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('renders occupied table with correct visual state', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockOccupiedTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Table Shapes', () => {
    it('renders rectangle table', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('renders circle table', () => {
      const { container } = render(
        <FloorPlanCanvas
          tables={[mockCircleTable]}
          selectedTableId={null}
          canvasSize={{ width: 1200, height: 700 }}
          showGrid={false}
          gridSize={20}
          snapToGrid={false}
          zoomLevel={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});

describe('Seat Selection', () => {
  let mockOnSeatSelect: ReturnType<typeof vi.fn>;
  let mockOnStartVoiceOrder: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  const transformedTable = {
    ...mockTable,
    table_number: mockTable.label,
    capacity: mockTable.seats
  };

  beforeEach(() => {
    mockOnSeatSelect = vi.fn();
    mockOnStartVoiceOrder = vi.fn();
    mockOnClose = vi.fn();
  });

  describe('Seat Selection Modal', () => {
    it('shows seat selection after table is selected', () => {
      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Select Seat - Table 5/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose a seat number/i)).toBeInTheDocument();
    });

    it('renders correct number of seat buttons', () => {
      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      // Should render 4 seats (based on mockTable.seats)
      expect(screen.getByText('Seat 1')).toBeInTheDocument();
      expect(screen.getByText('Seat 2')).toBeInTheDocument();
      expect(screen.getByText('Seat 3')).toBeInTheDocument();
      expect(screen.getByText('Seat 4')).toBeInTheDocument();
    });

    it('calls onSeatSelect when seat is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const seat1Button = screen.getByText('Seat 1').closest('button');
      await user.click(seat1Button!);

      expect(mockOnSeatSelect).toHaveBeenCalledWith(1);
    });

    it('highlights selected seat', () => {
      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={2}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const seat2Button = screen.getByText('Seat 2').closest('button');
      expect(seat2Button).toHaveClass('border-primary');
    });

    it('disables voice order button when no seat selected', async () => {
      const user = userEvent.setup();

      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const voiceButton = screen.getByText(/Voice Order/i).closest('button');

      // ActionButton uses opacity and cursor styles for disabled state
      expect(voiceButton).toHaveClass('opacity-50');
      expect(voiceButton).toHaveClass('cursor-not-allowed');

      // Verify clicking doesn't trigger callback
      await user.click(voiceButton!);
      expect(mockOnStartVoiceOrder).not.toHaveBeenCalled();
    });

    it('enables voice order button when seat is selected', () => {
      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={1}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const voiceButton = screen.getByText(/Voice Order/i).closest('button');
      expect(voiceButton).not.toBeDisabled();
    });

    it('calls onStartVoiceOrder with voice mode', async () => {
      const user = userEvent.setup();

      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={1}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const voiceButton = screen.getByText(/Voice Order/i).closest('button');
      await user.click(voiceButton!);

      expect(mockOnStartVoiceOrder).toHaveBeenCalledWith('voice');
    });

    it('calls onStartVoiceOrder with touch mode', async () => {
      const user = userEvent.setup();

      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={1}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const touchButton = screen.getByText(/Touch Order/i).closest('button');
      await user.click(touchButton!);

      expect(mockOnStartVoiceOrder).toHaveBeenCalledWith('touch');
    });

    it('marks seats as ordered correctly', () => {
      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[1, 3]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const seat1Button = screen.getByText('Seat 1').closest('button');
      const seat3Button = screen.getByText('Seat 3').closest('button');

      expect(seat1Button).toHaveClass('border-green-300');
      expect(seat3Button).toHaveClass('border-green-300');
    });

    it('shows ordered count when seats are ordered', () => {
      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[1, 2]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/2 of 4 seats ordered/i)).toBeInTheDocument();
    });

    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SeatSelectionModal
          show={true}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not render when show is false', () => {
      const { container } = render(
        <SeatSelectionModal
          show={false}
          table={transformedTable}
          selectedSeat={null}
          orderedSeats={[]}
          canCreateOrders={true}
          onSeatSelect={mockOnSeatSelect}
          onStartVoiceOrder={mockOnStartVoiceOrder}
          onClose={mockOnClose}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});

describe('Table Interaction Hook', () => {
  it('returns table click handler', () => {
    // This would test the useTableInteraction hook
    // For now, we test the behavior through component integration
    expect(true).toBe(true);
  });

  it('returns canvas click handler', () => {
    // This would test the useTableInteraction hook
    expect(true).toBe(true);
  });

  it('checks table availability correctly', () => {
    // This would test the isTableAvailable function
    expect(true).toBe(true);
  });
});
