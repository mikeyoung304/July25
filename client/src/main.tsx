import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[BOOT] main.tsx loaded');

// Capture any window errors
window.addEventListener('error', e => {
  console.error('[WINDOW-ERROR]', e?.error || e?.message);
});

const rootElement = document.getElementById('root')
console.log('[BOOT] Root element:', rootElement)

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  
  // Remove boot sentinel after React mounts
  const sentinel = document.getElementById('boot-sentinel');
  if (sentinel?.parentElement) {
    sentinel.parentElement.removeChild(sentinel);
  }
  console.log('[BOOT] React mounted');
  
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
  console.log('[E2E] app mounted');
} else {
  console.error('[BOOT] Could not find root element!')
}
