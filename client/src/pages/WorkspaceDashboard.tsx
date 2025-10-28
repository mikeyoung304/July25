/**
 * WorkspaceDashboard Component
 * Main landing page with 6 workspace tiles
 * Features: No login text, intelligent auth gating, demo mode support
 * Part of: Workspace-Based Landing Flow
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Users, ChefHat, ShoppingCart, Settings, Globe, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { WorkspaceAuthModal } from '@/components/auth/WorkspaceAuthModal'
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess'
import { WorkspaceType } from '@/config/demoCredentials'
import { useAuth } from '@/contexts/auth.hooks'
import { logger } from '@/services/logger'

interface WorkspaceTileProps {
  title: string
  workspace: WorkspaceType
  icon: React.ReactNode
  color: string
  delay?: number
}

function WorkspaceTile({ title, workspace, icon, color, delay = 0 }: WorkspaceTileProps) {
  const {
    handleAccess,
    showModal,
    closeModal,
    intendedDestination,
    hasPermission,
    requiresAuth,
    isLoading
  } = useWorkspaceAccess(workspace)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Show insufficient permissions if authenticated but lacking access
  const showInsufficientPermissions = requiresAuth && isAuthenticated && !hasPermission

  const handleSuccess = () => {
    closeModal()
    // Navigate directly to intended destination after successful authentication
    // Don't call handleAccess() again to avoid race condition with stale auth state
    if (intendedDestination) {
      logger.info('Navigating to workspace after auth success', {
        workspace,
        destination: intendedDestination
      })
      navigate(intendedDestination)
    }
  }

  return (
    <>
      <motion.div
        className="h-full min-h-[200px] md:min-h-[250px]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay * 0.08, duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <button
          onClick={handleAccess}
          disabled={isLoading}
          className="w-full h-full rounded-2xl p-8 md:p-10 lg:p-12 flex flex-col items-center justify-center text-white shadow-xl cursor-pointer overflow-hidden group transition-all duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: color }}
          data-testid={`workspace-tile-${workspace}`}
        >
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          {isLoading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
            </div>
          )}
          <div className="relative z-10 flex flex-col items-center space-y-4 md:space-y-6">
            {React.cloneElement(icon as React.ReactElement, {
              className: 'h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24'
            } as any)}
            <h3 className="text-white font-bold text-xl md:text-2xl lg:text-3xl">
              {title}
            </h3>
          </div>
        </button>
      </motion.div>

      {/* Authentication Modal */}
      {showModal && intendedDestination && (
        <WorkspaceAuthModal
          isOpen={showModal}
          onClose={closeModal}
          onSuccess={handleSuccess}
          workspace={workspace}
          intendedDestination={intendedDestination}
          showInsufficientPermissions={showInsufficientPermissions}
        />
      )}
    </>
  )
}

export function WorkspaceDashboard() {
  const demoMode = import.meta.env.VITE_DEMO_PANEL === '1'

  // Workspace configuration - matches HomePage color palette
  const workspaces = [
    {
      title: 'Server',
      workspace: 'server' as WorkspaceType,
      icon: <Users />,
      color: '#2A4B5C' // Deep blue-gray
    },
    {
      title: 'Kitchen',
      workspace: 'kitchen' as WorkspaceType,
      icon: <ChefHat />,
      color: '#FF6B35' // Vibrant orange
    },
    {
      title: 'Kiosk',
      workspace: 'kiosk' as WorkspaceType,
      icon: <ShoppingCart />,
      color: '#4ECDC4' // Teal
    },
    {
      title: 'Online Order',
      workspace: 'online-order' as WorkspaceType,
      icon: <Globe />,
      color: '#7B68EE' // Medium purple
    },
    {
      title: 'Admin',
      workspace: 'admin' as WorkspaceType,
      icon: <Settings />,
      color: '#88B0A4' // Sage green
    },
    {
      title: 'Expo',
      workspace: 'expo' as WorkspaceType,
      icon: <Package />,
      color: '#F4A460' // Sandy brown
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col" data-testid="workspace-dashboard">
      {/* Logo and Title - Compact, no login text */}
      <motion.div
        className="text-center py-6 md:py-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="/transparent.png"
          alt="MACON AI SOLUTIONS"
          className="h-14 md:h-16 lg:h-20 w-auto mx-auto mb-3 object-contain"
        />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
          Restaurant OS
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Select your workspace
        </p>

        {/* Demo Mode Badge - Neutral, no "Login" text */}
        {demoMode && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Demo
          </div>
        )}
      </motion.div>

      {/* Workspace Grid - Use all available space */}
      <div className="flex-1 px-4 md:px-8 lg:px-12 pb-4 md:pb-8">
        <div className="h-full grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6 max-w-screen-2xl mx-auto">
          {workspaces.map((workspace, index) => (
            <WorkspaceTile
              key={workspace.workspace}
              title={workspace.title}
              workspace={workspace.workspace}
              icon={workspace.icon}
              color={workspace.color}
              delay={index}
            />
          ))}
        </div>
      </div>

      {/* Footer - Minimal */}
      <div className="text-center pb-4 text-xs text-gray-500">
        <p>&copy; 2025 MACON AI Solutions. All rights reserved.</p>
      </div>
    </div>
  )
}
