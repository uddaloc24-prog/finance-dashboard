import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Register the service worker (PWA installability + offline support).
// `autoUpdate` mode is set in vite.config so updated SW activates on next reload.
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}
