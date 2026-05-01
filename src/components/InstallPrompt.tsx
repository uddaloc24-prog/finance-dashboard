import { useState, useEffect } from 'react'

// Browser-defined event for the PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    // Honor a previous "Not now" decision for the rest of this session
    return sessionStorage.getItem('rp_install_dismissed') === '1'
  })

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => {
      setInstalled(true)
      setEvent(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    // Detect if already running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) setInstalled(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed || !event) return null

  const handleInstall = async () => {
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
      } else {
        setDismissed(true)
        sessionStorage.setItem('rp_install_dismissed', '1')
      }
      setEvent(null)
    } catch {
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('rp_install_dismissed', '1')
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      onAuxClick={handleDismiss}
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-300 bg-blue-50 text-blue-800 text-[11px] font-semibold hover:bg-blue-100 transition-colors"
      aria-label="Install Indian Retirement Planner as an app"
      title="Install as a phone/desktop app — runs full-screen, works offline"
    >
      <span aria-hidden="true">⬇</span>
      <span>Install app</span>
    </button>
  )
}

// ── Offline indicator ───────────────────────────────────────────────

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      className="bg-amber-100 border-b border-amber-300 text-amber-900 text-[11px] font-medium text-center px-3 py-1.5"
    >
      You are offline. Cached pages still work; live API calls (V2 chat) will retry when you reconnect.
    </div>
  )
}
