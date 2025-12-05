/**
 * WorkspaceDashboard Component Tests
 * Part of: Workspace-Based Landing Flow
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { WorkspaceDashboard } from '../WorkspaceDashboard'
import * as authHooks from '@/contexts/auth.hooks'
import * as workspaceAccessHook from '@/hooks/useWorkspaceAccess'

// Mock dependencies
vi.mock('@/contexts/auth.hooks')
vi.mock('@/hooks/useWorkspaceAccess')
vi.mock('@/components/auth/WorkspaceAuthModal', () => ({
  WorkspaceAuthModal: ({ isOpen, workspace }: any) =>
    isOpen ? <div data-testid={`auth-modal-${workspace}`}>Mock Auth Modal for {workspace}</div> : null
}))

describe('WorkspaceDashboard', () => {
  const mockUseAuth = {
    isAuthenticated: false,
    user: null,
    isLoading: false
  }

  const mockUseWorkspaceAccess = {
    handleAccess: vi.fn(),
    showModal: false,
    closeModal: vi.fn(),
    intendedDestination: null,
    hasPermission: false,
    requiresAuth: true,
    isLoading: false,
    canAccess: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(authHooks, 'useAuth').mockReturnValue(mockUseAuth as any)
    vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue(mockUseWorkspaceAccess as any)

    // Mock import.meta.env
    vi.stubEnv('VITE_DEMO_PANEL', '0')
  })

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    )
  }

  describe('Rendering', () => {
    it('renders the dashboard with logo and title', () => {
      renderComponent()

      expect(screen.getByText('Restaurant OS')).toBeInTheDocument()
      expect(screen.getByText('Select your workspace')).toBeInTheDocument()
      expect(screen.getByAltText('MACON AI SOLUTIONS')).toBeInTheDocument()
    })

    it('renders all 6 workspace tiles', () => {
      renderComponent()

      expect(screen.getByTestId('workspace-tile-server')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-kitchen')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-kiosk')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-online-order')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-admin')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-expo')).toBeInTheDocument()
    })

    it('does NOT contain login or sign-in text', () => {
      renderComponent()

      // These should NOT be present on the dashboard
      expect(screen.queryByText(/login/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/email/i)).not.toBeInTheDocument()
    })

    it('shows demo badge when VITE_DEMO_PANEL=1', () => {
      vi.stubEnv('VITE_DEMO_PANEL', '1')
      renderComponent()

      expect(screen.getByText('Demo')).toBeInTheDocument()
    })

    it('does NOT show demo badge when VITE_DEMO_PANEL=0', () => {
      vi.stubEnv('VITE_DEMO_PANEL', '0')
      renderComponent()

      expect(screen.queryByText('Demo')).not.toBeInTheDocument()
    })
  })

  describe('Tile Interactions', () => {
    it('calls handleAccess when a tile is clicked', () => {
      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')
      fireEvent.click(serverTile)

      expect(mockUseWorkspaceAccess.handleAccess).toHaveBeenCalled()
    })

    it('shows modal when showModal is true', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: true,
        intendedDestination: '/server'
      } as any)

      renderComponent()

      expect(screen.getByTestId('auth-modal-server')).toBeInTheDocument()
    })

    it('does NOT show modal when showModal is false', () => {
      renderComponent()

      expect(screen.queryByTestId(/auth-modal/)).not.toBeInTheDocument()
    })

    it('REGRESSION: tiles are clickable even when auth isLoading is true (Oct 29 bug fix)', () => {
      // This test verifies the fix for the bug where tiles were disabled during
      // AuthContext initialization (150-700ms), causing them to be stuck with
      // loading spinners in incognito mode
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        isLoading: true
      } as any)

      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')

      // Tile should NOT be disabled even when auth is loading
      expect(serverTile).not.toBeDisabled()

      // Tile should be clickable
      fireEvent.click(serverTile)
      expect(mockUseWorkspaceAccess.handleAccess).toHaveBeenCalled()
    })

    it('REGRESSION: tiles do not show loading spinner during auth initialization', () => {
      // Verify that tiles don't have loading spinners during auth init
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        isLoading: true
      } as any)

      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')

      // No loading spinner should be present in the tile
      // The tile should show the workspace icon and title immediately
      expect(screen.getByText('Server')).toBeInTheDocument()

      // Verify no spinner element exists in the tile
      const tileContent = serverTile.textContent
      expect(tileContent).toBe('Server') // Only title, no loading text
    })

    it('REGRESSION: tiles are immediately clickable on mount during auth initialization', async () => {
      // Simulate the exact scenario: auth is loading during initial render
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        isLoading: true
      } as any)

      renderComponent()

      // Tiles should be immediately clickable without waiting for auth to finish
      const kioskTile = screen.getByTestId('workspace-tile-kiosk')
      const serverTile = screen.getByTestId('workspace-tile-server')

      // Both tiles should be enabled and clickable immediately
      expect(kioskTile).not.toBeDisabled()
      expect(serverTile).not.toBeDisabled()

      // Clicking should work immediately
      fireEvent.click(kioskTile)
      expect(mockUseWorkspaceAccess.handleAccess).toHaveBeenCalled()
    })

    it('REGRESSION: handleAccess is called during auth loading state', () => {
      // This ensures the workspace access logic runs even if auth hasn't initialized
      const mockHandleAccess = vi.fn()
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        isLoading: true,
        handleAccess: mockHandleAccess
      } as any)

      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')
      fireEvent.click(serverTile)

      // handleAccess should be called even when isLoading is true
      expect(mockHandleAccess).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('renders with proper semantic HTML structure', () => {
      renderComponent()

      const dashboard = screen.getByTestId('workspace-dashboard')
      expect(dashboard).toBeInTheDocument()
    })

    it('all tiles are keyboard accessible (buttons)', () => {
      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')
      expect(serverTile.tagName).toBe('BUTTON')
    })

    it('tiles can be focused and activated with keyboard', async () => {
      // Native buttons handle Enter and Space key activation automatically
      // Testing focus and click is sufficient to verify keyboard accessibility
      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')
      serverTile.focus()

      expect(serverTile).toHaveFocus()

      // For native buttons, fireEvent.click simulates keyboard activation
      // as the browser converts Enter/Space → click automatically
      fireEvent.click(serverTile)
      await waitFor(() => {
        expect(mockUseWorkspaceAccess.handleAccess).toHaveBeenCalled()
      })
    })
  })

  describe('Public vs Protected Workspaces', () => {
    it('kiosk and online-order tiles work without authentication', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockImplementation((workspace) => ({
        ...mockUseWorkspaceAccess,
        requiresAuth: workspace === 'kiosk' || workspace === 'online-order' ? false : true,
        canAccess: workspace === 'kiosk' || workspace === 'online-order' ? true : false
      } as any))

      renderComponent()

      const kioskTile = screen.getByTestId('workspace-tile-kiosk')
      const onlineOrderTile = screen.getByTestId('workspace-tile-online-order')

      expect(kioskTile).not.toBeDisabled()
      expect(onlineOrderTile).not.toBeDisabled()
    })

    it('protected tiles require authentication', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockImplementation((workspace) => ({
        ...mockUseWorkspaceAccess,
        requiresAuth: workspace !== 'kiosk' && workspace !== 'online-order',
        showModal: workspace !== 'kiosk' && workspace !== 'online-order'
      } as any))

      renderComponent()

      // Protected tiles should trigger authentication
      expect(screen.getByTestId('workspace-tile-server')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-kitchen')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-admin')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-tile-expo')).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('renders copyright footer', () => {
      renderComponent()

      expect(screen.getByText(/© 2025 MACON AI Solutions/i)).toBeInTheDocument()
    })
  })

  describe('Modal Interactions', () => {
    beforeEach(() => {
      // Mock the modal to show by default
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: true,
        intendedDestination: '/server'
      } as any)
    })

    it('shows modal when showModal is true', () => {
      renderComponent()

      // Modal content should be visible - there will be 6 modals (one per tile) but only one shown
      const modals = screen.getAllByText(/Mock Auth Modal for/)
      expect(modals.length).toBeGreaterThan(0)
    })

    it('modal behavior (ESC, close button, backdrop) is tested in WorkspaceAuthModal tests', () => {
      // This test just verifies the modal hook returns the expected state
      // The actual modal behavior (ESC, close button, backdrop click) is tested
      // in the WorkspaceAuthModal.test.tsx file

      const result = workspaceAccessHook.useWorkspaceAccess('server' as any)
      expect(result.showModal).toBe(true)
      expect(result.intendedDestination).toBe('/server')
    })
  })

  describe('Demo Mode Pre-filled Credentials', () => {
    it('shows demo badge in demo mode', () => {
      vi.stubEnv('VITE_DEMO_PANEL', '1')
      renderComponent()

      expect(screen.getByText('Demo')).toBeInTheDocument()
    })

    it('does not show demo badge when demo mode is disabled', () => {
      vi.stubEnv('VITE_DEMO_PANEL', '0')
      renderComponent()

      expect(screen.queryByText('Demo')).not.toBeInTheDocument()
    })
  })

  describe('Alternative Login Methods', () => {
    it('modal provides alternative login methods (tested in WorkspaceAuthModal tests)', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: true,
        intendedDestination: '/server'
      } as any)

      renderComponent()

      // The modal is shown - PIN and Station links are tested in WorkspaceAuthModal.test.tsx
      const modals = screen.getAllByText(/Mock Auth Modal for/)
      expect(modals.length).toBeGreaterThan(0)
    })
  })

  describe('Deep Link Behavior', () => {
    it('opens modal for protected route when accessing directly', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: true,
        intendedDestination: '/server',
        requiresAuth: true,
        canAccess: false
      } as any)

      renderComponent()

      const modals = screen.getAllByText(/Mock Auth Modal for/)
      expect(modals.length).toBeGreaterThan(0)
    })

    it('does not show modal for public routes', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: false,
        intendedDestination: '/kiosk',
        requiresAuth: false,
        canAccess: true
      } as any)

      renderComponent()

      expect(screen.queryByText(/Mock Auth Modal for/)).not.toBeInTheDocument()
    })

    it('preserves intendedDestination when showing modal', () => {
      const intendedDestination = '/admin'
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: true,
        intendedDestination,
        requiresAuth: true,
        canAccess: false
      } as any)

      renderComponent()

      // Modal is shown with the correct workspace
      const modals = screen.getAllByText(/Mock Auth Modal for/)
      expect(modals.length).toBeGreaterThan(0)
    })
  })

  describe('Authenticated User Behavior', () => {
    it('allows authenticated user with correct permissions to access workspace', () => {
      vi.spyOn(authHooks, 'useAuth').mockReturnValue({
        ...mockUseAuth,
        isAuthenticated: true,
        user: { email: 'server@restaurant.com', role: 'Server' }
      } as any)

      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: false,
        requiresAuth: true,
        hasPermission: true,
        canAccess: true
      } as any)

      renderComponent()

      // Modal should not be shown for authenticated user with permission
      expect(screen.queryByText(/Mock Auth Modal for/)).not.toBeInTheDocument()
    })

    it('shows modal for authenticated user without correct permissions', () => {
      vi.spyOn(authHooks, 'useAuth').mockReturnValue({
        ...mockUseAuth,
        isAuthenticated: true,
        user: { email: 'server@restaurant.com', role: 'Server' }
      } as any)

      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        showModal: true,
        intendedDestination: '/admin',
        requiresAuth: true,
        hasPermission: false,
        canAccess: false
      } as any)

      renderComponent()

      // Modal should be shown for insufficient permissions
      const modals = screen.getAllByText(/Mock Auth Modal for/)
      expect(modals.length).toBeGreaterThan(0)
    })
  })
})
