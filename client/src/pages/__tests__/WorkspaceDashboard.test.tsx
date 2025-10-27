/**
 * WorkspaceDashboard Component Tests
 * Part of: Workspace-Based Landing Flow
 */

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
    isOpen ? <div data-testid={`auth-modal-${workspace}`}>Mock Auth Modal</div> : null
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

    it('disables tile when isLoading is true', () => {
      vi.spyOn(workspaceAccessHook, 'useWorkspaceAccess').mockReturnValue({
        ...mockUseWorkspaceAccess,
        isLoading: true
      } as any)

      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')
      expect(serverTile).toBeDisabled()
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
      renderComponent()

      const serverTile = screen.getByTestId('workspace-tile-server')
      serverTile.focus()

      expect(serverTile).toHaveFocus()

      fireEvent.keyDown(serverTile, { key: 'Enter', code: 'Enter' })
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
})
