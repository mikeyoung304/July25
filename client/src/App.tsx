import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { RestaurantIdProvider } from '@/services/http'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { AppContent } from '@/components/layout/AppContent'
import { SplashScreen } from '@/pages/SplashScreen'
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
    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only connect in development mode or when we have a real backend
        let shouldConnect = isDevelopment
        
        // Check for API URL configuration
        if (env.VITE_API_BASE_URL) {
          shouldConnect = true
        }
        
        if (shouldConnect) {
          // Initialize order updates handler
          orderUpdatesHandler.initialize()
          
          // Connect to WebSocket
          webSocketService.connect().catch(error => {
            console.warn('WebSocket connection failed:', error)
            // Continue app operation without WebSocket
          })
        }
      } else if (event === 'SIGNED_OUT') {
        // Disconnect WebSocket on sign out
        orderUpdatesHandler.cleanup()
        webSocketService.disconnect()
      }
    })

    // Check if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Only connect in development mode or when we have a real backend
        let shouldConnect = isDevelopment
        
        // Check for API URL configuration
        if (env.VITE_API_BASE_URL) {
          shouldConnect = true
        }
        
        if (shouldConnect) {
          // Initialize order updates handler
          orderUpdatesHandler.initialize()
          
          // Connect to WebSocket
          webSocketService.connect().catch(error => {
            console.warn('WebSocket connection failed:', error)
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
  
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleAnimationComplete} />
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
        <RestaurantProvider>
          <RestaurantIdProvider>
            <AppContent isDevelopment={isDevelopment} />
          </RestaurantIdProvider>
        </RestaurantProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App