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
import { orderUpdatesHandler } from '@/services/websocket'
import { connectionManager } from '@/services/websocket/ConnectionManager'
import { supabase } from '@/core/supabase'
import { env } from '@/utils/env'
import './App.css'

function App() {
  const isDevelopment = env.DEV || false
  const [showSplash, setShowSplash] = useState(true)

  const handleAnimationComplete = () => {
    setShowSplash(false)
    // Mark app ready for performance tracking
    performanceMonitor.mark('app-ready')
    performanceMonitor.measure('app-init', 'navigationStart', 'app-ready')
  }
  
  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not initialized. Skipping auth setup.')
      return
    }

    let isConnected = false // Track connection state to prevent duplicates

    // Initialize WebSocket for ALL users (including demo/friends & family)
    const initializeWebSocket = async () => {
      if (!isConnected) {
        // Only connect in development mode or when we have a real backend
        const shouldConnect = isDevelopment || !!env.VITE_API_BASE_URL
        
        if (shouldConnect) {
          isConnected = true
          logger.info('🔌 Initializing WebSocket connection for real-time updates...')
          
          try {
            // CRITICAL FIX: Connect WebSocket FIRST, then initialize handlers
            await connectionManager.connect()
            logger.info('✅ WebSocket connected, now initializing order updates handler...')
            
            // Initialize order updates handler AFTER connection is established
            orderUpdatesHandler.initialize()
            logger.info('✅ Order updates handler initialized')
          } catch (error) {
            console.warn('WebSocket connection failed:', error)
            isConnected = false // Reset on failure
            // Try to initialize handler anyway for when connection is restored
            orderUpdatesHandler.initialize()
          }
        }
      }
    }

    // Always initialize WebSocket on app startup
    initializeWebSocket()

    // Subscribe to auth state changes (for Supabase users)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'SIGNED_OUT') {
        // Disconnect and reconnect WebSocket on sign out to switch to demo mode
        isConnected = false
        orderUpdatesHandler.cleanup()
        connectionManager.forceDisconnect()
        
        // Reinitialize for demo mode
        setTimeout(() => initializeWebSocket(), 1000)
      }
    })
    
    return () => {
      // Cleanup on unmount
      authListener.subscription.unsubscribe()
      orderUpdatesHandler.cleanup()
      webSocketService.disconnect()
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