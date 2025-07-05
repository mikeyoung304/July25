import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { RestaurantProvider } from '@/core/RestaurantContext'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { AppContent } from '@/components/layout/AppContent'
import './App.css'

function App() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
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