/**
 * useWorkspaceAccess Hook
 * Manages workspace access logic and authentication requirements
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth.hooks'
import { WorkspaceType, WORKSPACE_CONFIG } from '@/config/demoCredentials'
import { logger } from '@/services/logger'

export interface WorkspaceAccessResult {
  canAccess: boolean
  requiresAuth: boolean
  hasPermission: boolean
  isLoading: boolean
  showModal: boolean
  intendedDestination: string | null
  handleAccess: () => void
  closeModal: () => void
}

/**
 * Hook to manage workspace access and authentication
 *
 * @param workspace - The workspace type to check access for
 * @returns WorkspaceAccessResult with access state and handlers
 */
export function useWorkspaceAccess(workspace: WorkspaceType): WorkspaceAccessResult {
  const navigate = useNavigate()
  const { isAuthenticated, canAccess: checkAccess, isLoading: authLoading } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [intendedDestination, setIntendedDestination] = useState<string | null>(null)

  // Get workspace config
  const config = WORKSPACE_CONFIG[workspace]
  const requiresAuth = config.requiresAuth
  const destination = config.route
  const requiredRoles = config.requiredRoles

  // Check if user has permission (only relevant if authenticated)
  const hasPermission = !requiresAuth || (isAuthenticated && checkAccess(requiredRoles))

  // Determine if user can access directly
  const canAccess = !requiresAuth || (isAuthenticated && hasPermission)

  /**
   * Handle workspace access attempt
   * Opens modal if auth required, navigates directly if accessible
   */
  const handleAccess = useCallback(() => {
    logger.info('Workspace access attempt', {
      workspace,
      requiresAuth,
      isAuthenticated,
      hasPermission,
      canAccess
    })

    // Public workspaces: navigate directly
    if (!requiresAuth) {
      logger.info('Navigating to public workspace', { workspace, destination })
      navigate(destination)
      return
    }

    // Protected workspaces: check authentication
    if (!isAuthenticated) {
      // Not authenticated: show modal
      logger.info('Authentication required, showing modal', { workspace })
      setIntendedDestination(destination)
      setShowModal(true)
      return
    }

    // Authenticated: check permission
    if (!hasPermission) {
      // Authenticated but insufficient permissions: show modal with switch account option
      logger.warn('Insufficient permissions', { workspace, requiredRoles })
      setIntendedDestination(destination)
      setShowModal(true)
      return
    }

    // Authenticated with permission: navigate directly
    logger.info('Navigating to protected workspace', { workspace, destination })
    navigate(destination)
  }, [
    workspace,
    requiresAuth,
    isAuthenticated,
    hasPermission,
    canAccess,
    destination,
    requiredRoles,
    navigate
  ])

  /**
   * Close the authentication modal
   */
  const closeModal = useCallback(() => {
    setShowModal(false)
    setIntendedDestination(null)
  }, [])

  return {
    canAccess,
    requiresAuth,
    hasPermission,
    isLoading: authLoading,
    showModal,
    intendedDestination,
    handleAccess,
    closeModal
  }
}

/**
 * Hook to handle deep link authentication
 * Used by ProtectedRoute to show modal for unauthenticated deep links
 *
 * @param destination - The intended destination route
 * @returns Modal state and handlers
 */
export function useDeepLinkAuth(destination: string) {
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  const openModal = useCallback(() => {
    setShowModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const onAuthSuccess = useCallback(() => {
    setShowModal(false)
    navigate(destination, { replace: true })
  }, [destination, navigate])

  return {
    showModal,
    openModal,
    closeModal,
    onAuthSuccess,
    intendedDestination: destination
  }
}
