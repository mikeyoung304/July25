import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reportWebVitals } from 'web-vitals'
import { monitoring } from './services/monitoring'
import { performanceMonitor, trackWebVital } from './services/performance/performanceMonitor'
import './index.css'
import App from './App.tsx'

// Initialize monitoring services
monitoring.initialize()

// Connect Web Vitals to performance monitor
reportWebVitals((metric) => {
  trackWebVital(metric)
})

// Start memory tracking in production
if (!import.meta.env.DEV) {
  performanceMonitor.startMemoryTracking(30000) // Every 30 seconds
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
