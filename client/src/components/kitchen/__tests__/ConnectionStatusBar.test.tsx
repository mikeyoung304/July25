import React from 'react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConnectionStatusBar } from '../ConnectionStatusBar'
import { useConnectionStatus, type ConnectionState } from '@/hooks/useConnectionStatus'

// Mock the useConnectionStatus hook
vi.mock('@/hooks/useConnectionStatus')

const mockUseConnectionStatus = useConnectionStatus as Mock

describe('ConnectionStatusBar', () => {
  const createMockReturn = (overrides: Partial<ReturnType<typeof useConnectionStatus>> = {}) => ({
    connectionState: 'disconnected' as ConnectionState,
    lastConnected: null,
    reconnectAttempts: 0,
    isOnline: true,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConnectionStatus.mockReturnValue(createMockReturn())
  })

  describe('Connected state', () => {
    it('displays green Live indicator when connected and online', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('applies green background for connected state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Live').closest('div')
      expect(statusBar).toHaveClass('bg-green-500')
    })

    it('does not apply pulse animation for connected state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Live').closest('div')
      expect(statusBar).not.toHaveClass('animate-pulse')
    })
  })

  describe('Connecting state', () => {
    it('displays connecting message with spinner', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connecting',
        reconnectAttempts: 1
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText('Connecting...')).toBeInTheDocument()
    })

    it('displays reconnect attempt counter when attempts > 1', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connecting',
        reconnectAttempts: 3
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText('Reconnecting... (3)')).toBeInTheDocument()
    })

    it('applies yellow background for connecting state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connecting'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Connecting...').closest('div')
      expect(statusBar).toHaveClass('bg-yellow-500')
    })
  })

  describe('Error state', () => {
    it('displays connection error message', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'error'
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
    })

    it('applies red background for error state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'error'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Connection Error').closest('div')
      expect(statusBar).toHaveClass('bg-red-500')
    })

    it('shows Retry button in error state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'error'
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('reloads page when Retry button is clicked', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'error'
      }))

      // Mock window.location.reload
      const reloadMock = vi.fn()
      const originalLocation = window.location

      try {
        Object.defineProperty(window, 'location', {
          value: { ...originalLocation, reload: reloadMock },
          writable: true
        })

        render(<ConnectionStatusBar />)
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
        expect(reloadMock).toHaveBeenCalled()
      } finally {
        // Restore guaranteed even on test failure
        Object.defineProperty(window, 'location', {
          value: originalLocation,
          writable: true
        })
      }
    })
  })

  describe('Offline state', () => {
    it('displays offline message when isOnline is false', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected', // Even if "connected", offline takes precedence
        isOnline: false
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText('No Internet Connection')).toBeInTheDocument()
    })

    it('applies red background for offline state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        isOnline: false
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('No Internet Connection').closest('div')
      expect(statusBar).toHaveClass('bg-red-500')
    })
  })

  describe('Disconnected state', () => {
    it('displays disconnected message', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'disconnected'
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('applies gray background for disconnected state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'disconnected'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Disconnected').closest('div')
      expect(statusBar).toHaveClass('bg-gray-500')
    })
  })

  describe('Last connected timestamp', () => {
    it('shows last connected time when not connected', () => {
      const lastConnected = new Date('2024-01-01T12:30:00')
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'disconnected',
        lastConnected
      }))

      render(<ConnectionStatusBar />)
      expect(screen.getByText(/Last:/)).toBeInTheDocument()
    })

    it('does not show last connected time when connected', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true,
        lastConnected: new Date()
      }))

      render(<ConnectionStatusBar />)
      // Shows "Live" indicator but not the "Last:" timestamp when connected
      expect(screen.getByText('Live')).toBeInTheDocument()
      expect(screen.queryByText(/Last:/)).not.toBeInTheDocument()
    })
  })

  describe('Styling and layout', () => {
    it('applies white text color for all states', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'disconnected'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Disconnected').closest('div')
      expect(statusBar).toHaveClass('text-white')
    })

    it('displays status bar as flex layout', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'disconnected'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Disconnected').closest('div')
      expect(statusBar).toHaveClass('flex')
    })

    it('applies pulse animation for connecting state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connecting'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Connecting...').closest('div')
      expect(statusBar).toHaveClass('animate-pulse')
    })

    it('does not apply pulse animation for disconnected state', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'disconnected'
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByText('Disconnected').closest('div')
      expect(statusBar).not.toHaveClass('animate-pulse')
    })
  })

  describe('Accessibility', () => {
    it('provides accessible retry button', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'error'
      }))

      render(<ConnectionStatusBar />)
      const button = screen.getByRole('button', { name: 'Retry' })
      expect(button).toBeInTheDocument()
    })

    it('status text is accessible to screen readers', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'error'
      }))

      render(<ConnectionStatusBar />)
      // Text is directly in the DOM, accessible by default
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
    })

    it('has role="status" for live region announcements', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByRole('status')
      expect(statusBar).toBeInTheDocument()
    })

    it('has aria-live="polite" for non-intrusive updates', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByRole('status')
      expect(statusBar).toHaveAttribute('aria-live', 'polite')
    })

    it('has descriptive aria-label for connection status', () => {
      mockUseConnectionStatus.mockReturnValue(createMockReturn({
        connectionState: 'connected',
        isOnline: true
      }))

      render(<ConnectionStatusBar />)
      const statusBar = screen.getByRole('status')
      expect(statusBar).toHaveAttribute('aria-label', 'WebSocket connection status: Live')
    })
  })
})
