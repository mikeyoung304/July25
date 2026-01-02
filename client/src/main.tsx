import { StrictMode } from 'react'
import { logger } from '@/services/logger'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { LocalStorageManager } from '@/services/monitoring/localStorage-manager'
import './index.css'
import App from './App.tsx'

// Initialize localStorage cleanup before anything else
LocalStorageManager.initialize()
logger.info('[BOOT] main.tsx loaded, localStorage initialized');

// Capture any window errors with proper cleanup
const handleWindowError = (e: ErrorEvent) => {
  console.error('[WINDOW-ERROR]', e?.error || e?.message);
};
window.addEventListener('error', handleWindowError);

// Store cleanup function for later use
const cleanupGlobalListeners = () => {
  window.removeEventListener('error', handleWindowError);
};

// Clean up on page unload to prevent memory leaks
window.addEventListener('beforeunload', cleanupGlobalListeners);

const rootElement = document.getElementById('root')
logger.info('[BOOT] Root element:', rootElement)

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
      <Analytics />
    </StrictMode>,
  );
  
  // Remove boot sentinel after React mounts
  const sentinel = document.getElementById('boot-sentinel');
  if (sentinel?.parentElement) {
    sentinel.parentElement.removeChild(sentinel);
  }
  logger.info('[BOOT] React mounted');
  
  // Mark app as ready for E2E tests
  document.body.dataset.appReady = '1';
  const probe = document.getElementById('e2e-app-ready');
  if (!probe) {
    const el = document.createElement('div');
    el.id = 'e2e-app-ready';
    el.setAttribute('data-testid', 'app-ready');
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  logger.info('[E2E] app mounted');
} else {
  console.error('[BOOT] Could not find root element!')
}
