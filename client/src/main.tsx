import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { monitoring } from './services/monitoring'
import { performanceMonitor } from './services/performance/performanceMonitor'
import './index.css'
import App from './App.tsx'

// Initialize monitoring services
monitoring.initialize()

// Start memory tracking in production (only if performance monitoring is enabled)
const perfEnabled = import.meta.env.VITE_ENABLE_PERF === 'true'
if (!import.meta.env.DEV && perfEnabled) {
  performanceMonitor.startMemoryTracking(30000) // Every 30 seconds
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
