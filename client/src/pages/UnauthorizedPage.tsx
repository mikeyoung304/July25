import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShieldAlert, Home, ArrowLeft, LogOut, UserX } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth.hooks'
import { logger } from '@/services/logger'

export function UnauthorizedPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSwitchAccount = async () => {
    try {
      logger.info('UnauthorizedPage: User requested account switch', {
        currentUser: user?.email,
        currentRole: user?.role,
        attemptedPath: location.pathname
      })
      await logout()
      // Redirect to home/workspace dashboard after logout
      navigate('/', { replace: true })
    } catch (error) {
      logger.error('UnauthorizedPage: Logout failed during account switch', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <ShieldAlert className="h-16 w-16 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>

          {/* Message - Different for authenticated vs unauthenticated users */}
          {isAuthenticated && user ? (
            <div className="mb-8">
              <p className="text-gray-600 mb-4">
                Your current account doesn't have permission to access this page.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
                  <UserX className="h-4 w-4" />
                  <span className="font-medium">Current Account</span>
                </div>
                <p className="text-gray-900 font-medium">{user.email}</p>
                {user.role && (
                  <p className="text-gray-500 text-sm mt-1">
                    Role: <span className="font-medium text-gray-700">{user.role}</span>
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Please switch to an account with the required permissions.
              </p>
            </div>
          ) : (
            <p className="text-gray-600 mb-8">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Show Switch Account button for authenticated users */}
            {isAuthenticated && user && (
              <button
                onClick={handleSwitchAccount}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Switch Account
              </button>
            )}

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="h-5 w-5" />
              Go to Home
            </Link>

            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact your system administrator.
        </p>
      </motion.div>
    </div>
  )
}
