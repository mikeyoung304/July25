import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Performance mode entry point without StrictMode
// Use this for performance testing: npm run dev -- --mode performance
createRoot(document.getElementById('root')!).render(
  <App />
)