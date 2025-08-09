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

    let isConnected = false // Track connection state to prevent duplicates

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only connect in development mode or when we have a real backend
        let shouldConnect = isDevelopment || !!env.VITE_API_BASE_URL
        
        if (shouldConnect && !isConnected) {
          isConnected = true
          // Initialize order updates handler
          orderUpdatesHandler.initialize()
          
          // Connect to WebSocket
          webSocketService.connect().catch(error => {
            console.warn('WebSocket connection failed:', error)
            isConnected = false // Reset on failure
            // Continue app operation without WebSocket
          })
        }
      } else if (event === 'SIGNED_OUT') {
        // Disconnect WebSocket on sign out
        isConnected = false
        orderUpdatesHandler.cleanup()
        webSocketService.disconnect()
      }
    })

    // Check if already authenticated (but don't auto-connect in dev)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isConnected) {
        // Only connect in development mode or when we have a real backend
        let shouldConnect = isDevelopment || !!env.VITE_API_BASE_URL
        
        if (shouldConnect) {
          isConnected = true
          // Initialize order updates handler
          orderUpdatesHandler.initialize()
          
          // Connect to WebSocket
          webSocketService.connect().catch(error => {
            console.warn('WebSocket connection failed:', error)
            isConnected = false
            // Continue app operation without WebSocket
          })
        }
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