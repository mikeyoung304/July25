import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { memoryLeakDetector } from './utils/memoryLeakPrevention'
import './index.css'
import App from './App.tsx'

// Start memory monitoring
if (import.meta.env.PROD) {
  memoryLeakDetector.startMonitoring(120000) // Check every 2 minutes in production
}

// Listen for memory pressure events
window.addEventListener('memory-pressure', (() => {
  const stats = memoryLeakDetector.getStats()
  console.warn('Memory pressure detected:', stats)
}) as EventListener)

const rootElement = document.getElementById('root')
console.log('Root element:', rootElement)

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  console.error('Could not find root element!')
}
