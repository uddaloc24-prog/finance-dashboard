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
// `autoUpdate` mode is set in vite.config so an updated SW activates on the
// next page load. We additionally listen for the SW's `controllerchange`
// event — fired when a new SW takes control after `skipWaiting()` — and
// reload the page once, so installed users pick up the new bundle
// without having to manually refresh.
if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // A new SW is waiting — workbox will skipWaiting and the
      // controllerchange listener above will auto-reload.
    },
    onOfflineReady() { /* no-op */ },
  })
}
