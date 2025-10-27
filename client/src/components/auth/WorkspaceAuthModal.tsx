/**
 * WorkspaceAuthModal Component
 * Authentication modal for workspace access
 * Features: Focus trap, keyboard navigation, demo mode, accessibility
 * Part of: Workspace-Based Landing Flow
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth.hooks'
import { toast } from 'react-hot-toast'
import { logger } from '@/services/logger'
import {
  WorkspaceType,
  getDemoCredentials,
  WORKSPACE_CONFIG
} from '@/config/demoCredentials'

export interface WorkspaceAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workspace: WorkspaceType
  intendedDestination: string
  showInsufficientPermissions?: boolean
}

export function WorkspaceAuthModal({
  isOpen,
  onClose,
  onSuccess,
  workspace,
  intendedDestination,
  showInsufficientPermissions = false
}: WorkspaceAuthModalProps) {
  const { login, isAuthenticated, user, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [useDemoCredentials, setUseDemoCredentials] = useState(false)

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
  const demoMode = import.meta.env.VITE_DEMO_PANEL === '1'
  const demoCredentials = getDemoCredentials(workspace)
  const requiredRoles = WORKSPACE_CONFIG[workspace].requiredRoles

  // Pre-fill demo credentials if available
  useEffect(() => {
    if (isOpen && demoMode && demoCredentials && !showInsufficientPermissions) {
      setEmail(demoCredentials.email)
      setPassword(demoCredentials.password)
      setUseDemoCredentials(true)
      logger.info('Pre-filled demo credentials for workspace', { workspace })
    } else {
      setEmail('')
      setPassword('')
      setUseDemoCredentials(false)
    }
  }, [isOpen, demoMode, demoCredentials, workspace, showInsufficientPermissions])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Save previous focus
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus first input after modal opens
      const timer = setTimeout(() => {
        emailInputRef.current?.focus()
      }, 100)

      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    } else {
      // Restore focus when modal closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const modal = modalRef.current
      if (!modal) return

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setIsLoading(true)

    try {
      await login(email, password, restaurantId)
      toast.success('Login successful!')
      logger.info('Workspace authentication successful', { workspace, email })
      onSuccess()
    } catch (error: any) {
      logger.error('Workspace authentication failed:', error)
      toast.error(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchAccount = async () => {
    setIsLoading(true)
    try {
      await logout()
      toast.success('Logged out successfully')
      setEmail('')
      setPassword('')
      setUseDemoCredentials(false)
    } catch (error) {
      logger.error('Logout failed:', error)
      toast.error('Failed to log out')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCredentials = () => {
    setEmail('')
    setPassword('')
    setUseDemoCredentials(false)
    emailInputRef.current?.focus()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-auth-title"
      aria-describedby="workspace-auth-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 id="workspace-auth-title" className="text-2xl font-bold text-gray-900 mb-2">
            {showInsufficientPermissions ? 'Insufficient Permissions' : 'Authentication Required'}
          </h2>
          <p id="workspace-auth-description" className="text-gray-600">
            {showInsufficientPermissions ? (
              <>
                Your current account ({user?.email}) doesn't have access to this workspace.
                <br />
                <span className="text-sm text-gray-500 mt-1 inline-block">
                  Required roles: {requiredRoles.join(', ')}
                </span>
              </>
            ) : (
              <>Please sign in to access <span className="font-medium">{workspace}</span> workspace</>
            )}
          </p>
        </div>

        {/* Insufficient Permissions Actions */}
        {showInsufficientPermissions && isAuthenticated && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              You can switch to a different account with the required permissions.
            </p>
            <button
              onClick={handleSwitchAccount}
              disabled={isLoading}
              className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                'Switch Account'
              )}
            </button>
          </div>
        )}

        {/* Login Form */}
        {(!showInsufficientPermissions || !isAuthenticated) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Demo Mode Indicator */}
            {demoMode && useDemoCredentials && demoCredentials && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Demo Mode</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Pre-filled with {demoCredentials.role} credentials
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCredentials}
                    className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                  >
                    Use different account
                  </button>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="workspace-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="workspace-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
                placeholder="your@email.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="workspace-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="workspace-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>

            {/* Alternative Login Methods */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  to="/pin-login"
                  state={{ from: intendedDestination }}
                  className="inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  PIN Login
                </Link>
                <Link
                  to="/station-login"
                  state={{ from: intendedDestination }}
                  className="inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Station
                </Link>
              </div>
            </div>
          </form>
        )}

        {/* Back Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="mt-4 w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
