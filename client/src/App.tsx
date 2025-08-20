import React, { useState, useEffect } from 'react'
import { logger } from '@/services/logger'
import { BrowserRouter as Router } from 'react-router-dom'
import { RestaurantProvider } from '@/core'
import { RestaurantIdProvider } from '@/services/http'
import { RoleProvider } from '@/contexts/RoleContext'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { AppContent } from '@/components/layout/AppContent'
import { SplashScreen } from '@/pages/SplashScreen'
import { SetupRequiredScreen } from '@/pages/SetupRequiredScreen'
import { MockDataBanner } from '@/components/MockDataBanner'
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
            await webSocketService.connect()
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
        webSocketService.disconnect()
        
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
    <ErrorBoundary 
      level="page"
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error('App Error:', error, errorInfo)
      }}
    >
      <Router>
        <MockDataBanner />
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