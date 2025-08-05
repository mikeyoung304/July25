import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { RestaurantIdProvider } from '@/services/http'
import { RoleProvider } from '@/contexts/RoleContext'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { AppContent } from '@/components/layout/AppContent'
import { SplashScreen } from '@/pages/SplashScreen'
import { SetupRequiredScreen } from '@/pages/SetupRequiredScreen'
import { webSocketService, orderUpdatesHandler } from '@/services/websocket'
import { supabase } from '@/core/supabase'
import { env } from '@/utils/env'
import './App.css'

function App() {
  const isDevelopment = env.DEV || false
  const [showSplash, setShowSplash] = useState(true)

  const handleAnimationComplete = () => {
    setShowSplash(false)
  }
  
  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not initialized. Skipping auth setup.')
      return
    }

    let isWebSocketInitialized = false

    const initializeWebSocket = async () => {
      if (isWebSocketInitialized) {
        return // Prevent duplicate initialization
      }

      // Only connect in development mode or when we have a real backend
      const shouldConnect = isDevelopment || !!env.VITE_API_BASE_URL
      
      if (shouldConnect) {
        isWebSocketInitialized = true
        console.log('🔧 Initializing real-time services')
        
        // Initialize order updates handler
        orderUpdatesHandler.initialize()
        
        // Connect to WebSocket
        webSocketService.connect().catch(error => {
          console.warn('WebSocket connection failed:', error)
          isWebSocketInitialized = false // Allow retry
        })
      }
    }

    const cleanupWebSocket = () => {
      if (isWebSocketInitialized) {
        console.log('🔧 Cleaning up real-time services')
        orderUpdatesHandler.cleanup()
        webSocketService.disconnect()
        isWebSocketInitialized = false
      }
    }

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await initializeWebSocket()
      } else if (event === 'SIGNED_OUT') {
        cleanupWebSocket()
      }
    })

    // Check if already authenticated or initialize in development
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session || isDevelopment) {
        initializeWebSocket()
      }
    })
    
    return () => {
      // Cleanup on unmount
      authListener.subscription.unsubscribe()
      cleanupWebSocket()
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
    <ErrorBoundary 
      level="page"
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error('App Error:', error, errorInfo)
      }}
    >
      <Router>
        <RoleProvider>
          <RestaurantProvider>
            <RestaurantIdProvider>
              <AppContent isDevelopment={isDevelopment} />
            </RestaurantIdProvider>
          </RestaurantProvider>
        </RoleProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App