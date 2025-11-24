import React, { useState, useEffect } from 'react'
import { logger } from '@/services/logger'
import { performanceMonitor } from '@/services/monitoring/performance'
import { BrowserRouter as Router } from 'react-router-dom'
import { RestaurantProvider } from '@/core'
import { RestaurantIdProvider } from '@/services/http'
import { AuthProvider } from '@/contexts/AuthContext'
import { RoleProvider } from '@/contexts/RoleContext'
import { UnifiedCartProvider } from '@/contexts/UnifiedCartContext'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary'
import { AppContent } from '@/components/layout/AppContent'
import { SplashScreen } from '@/pages/SplashScreen'
import { SetupRequiredScreen } from '@/pages/SetupRequiredScreen'
import { MockDataBanner } from '@/components/MockDataBanner'
import { orderUpdatesHandler, webSocketService } from '@/services/websocket'
import { connectionManager } from '@/services/websocket/ConnectionManager'
import { supabase } from '@/core/supabase'
import { env } from '@/utils/env'
import './App.css'

function App() {
  const isDevelopment = env.DEV || false
  const [showSplash, setShowSplash] = useState(true)

  // Clear legacy demo tokens on app initialization
  useEffect(() => {
    // Clear old demo token from sessionStorage to force proper authentication
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const demoToken = window.sessionStorage.getItem('DEMO_AUTH_TOKEN');
      if (demoToken) {
        logger.info('Clearing legacy demo token from sessionStorage');
        window.sessionStorage.removeItem('DEMO_AUTH_TOKEN');
      }
    }
  }, []);

  const handleAnimationComplete = () => {
    setShowSplash(false)
    // Mark app ready for performance tracking
    performanceMonitor.mark('app-ready')
    performanceMonitor.measure('app-init', 'navigationStart', 'app-ready')

    // Create DOM element for E2E tests to detect app readiness
    const appReadyMarker = document.createElement('div')
    appReadyMarker.setAttribute('data-testid', 'app-ready')
    appReadyMarker.style.display = 'none'
    document.body.appendChild(appReadyMarker)
  }
  
  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not initialized. Skipping auth setup.')
      return
    }

    // PHASE 1 FIX: Use AbortController instead of boolean flags (ADR-014)
    const abortController = new AbortController()
    let isConnected = false // Track connection state
    let connectionPromise: Promise<void> | null = null

    // Initialize WebSocket for authenticated users only
    // NOTE: Anonymous customers (checkout/kiosk) don't need real-time updates
    const initializeWebSocket = async () => {
      // Abort any pending initialization
      if (connectionPromise) {
        logger.info('🔌 Aborting previous WebSocket initialization...')
        abortController.abort()
      }

      // Guard: prevent double initialization
      if (isConnected) {
        logger.info('🔌 WebSocket already connected, skipping...')
        return
      }

      // Check for abort signal before proceeding
      if (abortController.signal.aborted) {
        logger.info('🔌 WebSocket initialization aborted')
        return
      }

      // Check if user is authenticated before connecting
      const { data: { session } } = await supabase.auth.getSession()
      const hasLocalSession = localStorage.getItem('auth_session')

      if (!session && !hasLocalSession) {
        logger.info('🔌 Skipping WebSocket connection - user not authenticated (anonymous customer)')
        return
      }

      // Only connect in development mode or when we have a real backend
      const shouldConnect = isDevelopment || !!env.VITE_API_BASE_URL

      if (!shouldConnect) {
        return
      }

      logger.info('🔌 Initializing WebSocket connection for real-time updates...')

      connectionPromise = (async () => {
        try {
          // Check abort signal before connecting
          if (abortController.signal.aborted) {
            logger.info('🔌 WebSocket connection aborted before connect')
            return
          }

          // CRITICAL FIX: Connect WebSocket FIRST, then initialize handlers
          await connectionManager.connect()

          // Check abort signal after connection
          if (abortController.signal.aborted) {
            logger.info('⚠️ WebSocket initialization aborted after connect, disconnecting...')
            connectionManager.disconnect()
            return
          }

          logger.info('✅ WebSocket connected, now initializing order updates handler...')

          // Initialize order updates handler AFTER connection is established
          orderUpdatesHandler.initialize()
          logger.info('✅ Order updates handler initialized')

          isConnected = true
        } catch (error) {
          // Ignore errors from aborted operations
          if (error instanceof Error && error.name === 'AbortError') {
            logger.info('🔌 WebSocket initialization aborted (expected)')
            return
          }

          console.warn('WebSocket connection failed:', error)
          // Try to initialize handler anyway for when connection is restored
          if (!abortController.signal.aborted) {
            orderUpdatesHandler.initialize()
          }
        } finally {
          connectionPromise = null
        }
      })()

      return connectionPromise
    }

    // Check if user is already logged in on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (abortController.signal.aborted) return

      if (session) {
        logger.info('🔐 Existing session found, initializing WebSocket...')
        initializeWebSocket()
      } else {
        logger.info('👤 No session found, waiting for login...')
      }
    })

    // Subscribe to auth state changes (for Supabase users)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (abortController.signal.aborted) return

      if (event === 'SIGNED_OUT') {
        // PHASE 1 FIX: Properly cleanup before reinitializing (no setTimeout)
        logger.info('🔒 User signed out, cleaning up WebSocket connections...')

        // Abort any pending initialization
        abortController.abort()

        // Set flags first to prevent race conditions
        isConnected = false
        connectionPromise = null

        // Cleanup in correct order
        orderUpdatesHandler.cleanup()
        webSocketService.disconnect()
        connectionManager.forceDisconnect()

        // Reinitialize immediately (React will batch updates)
        logger.info('🔌 Reinitializing WebSocket for demo mode...')
        initializeWebSocket()
      } else if (event === 'SIGNED_IN' && !isConnected) {
        // PHASE 1 FIX: Handle sign in - reconnect with new auth (no setTimeout)
        logger.info('🔓 User signed in, reinitializing WebSocket with auth...')
        initializeWebSocket()
      }
    })

    return () => {
      // PHASE 1 FIX: Abort any pending operations
      abortController.abort()

      // Cleanup on unmount
      authListener.subscription.unsubscribe()
      orderUpdatesHandler.cleanup()
      webSocketService.disconnect()

      // Reset connection state
      isConnected = false
      connectionPromise = null
    }
  }, [isDevelopment])
  
  // Check if required environment variables are present
  const hasRequiredEnvVars = !!(
    env.VITE_API_BASE_URL && 
    env.VITE_SUPABASE_URL && 
    env.VITE_SUPABASE_ANON_KEY
  )
  
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleAnimationComplete} />
  }
  
  // Show setup screen if environment variables are missing
  if (!hasRequiredEnvVars) {
    return <SetupRequiredScreen />
  }
  
  return (
    <GlobalErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Global error boundary triggered', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <ErrorBoundary 
        level="page"
        onError={(error, errorInfo) => {
          // Log to error tracking service in production
          logger.error('App Error:', { error, errorInfo })
        }}
      >
        <Router>
          <MockDataBanner />
          <AuthProvider>
            <RoleProvider>
              <RestaurantProvider>
                <RestaurantIdProvider>
                  <UnifiedCartProvider>
                    <AppContent isDevelopment={isDevelopment} />
                  </UnifiedCartProvider>
                </RestaurantIdProvider>
              </RestaurantProvider>
            </RoleProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </GlobalErrorBoundary>
  )
}

export default App