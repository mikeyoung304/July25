import React, { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { AppContent } from '@/components/layout/AppContent'
import { SplashScreen } from '@/pages/SplashScreen'
import './App.css'

function App() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const [showSplash, setShowSplash] = useState(true)

  const handleAnimationComplete = () => {
    setShowSplash(false)
  }
  
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
          <AppContent isDevelopment={isDevelopment} />
        </RestaurantProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App