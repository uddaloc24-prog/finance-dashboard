import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { IncomingMessage, ServerResponse } from 'http'

function apiRoutes(): Plugin {
  return {
    name: 'dev-api-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()

        const pathname = url.split('?')[0]
        const handlerPath = `./${pathname.slice(1)}.ts`

        try {
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = (mod as { default?: (r: Request) => Promise<Response> }).default
          if (typeof handler !== 'function') {
            res.statusCode = 404
            res.end(`No handler exported from ${handlerPath}`)
            return
          }

          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const body = chunks.length ? Buffer.concat(chunks) : undefined

          const webReq = new Request(`http://localhost${url}`, {
            method: req.method ?? 'GET',
            headers: req.headers as HeadersInit,
            body: req.method && req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
          })

          const webRes = await handler(webReq)
          res.statusCode = webRes.status
          webRes.headers.forEach((value, key) => res.setHeader(key, value))
          const buf = Buffer.from(await webRes.arrayBuffer())
          res.end(buf)
        } catch (err) {
          res.statusCode = 500
          res.end(`API handler error: ${(err as Error).message}`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    apiRoutes(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Indian Retirement Planner',
        short_name: 'RetirePlanner',
        description: '4-Bucket SWP retirement strategy calculator for Indian retirees — plan, compare, simulate, and download your full report in PDF / DOCX / PPTX / MD / CSV.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#1B2951',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Don't precache the heavy lazy chunks (jsPDF, recharts, docx, pptxgenjs);
        // they get cached on first use via runtime caching.
        globIgnores: ['**/index.es-*.js', '**/pdf-*.js', '**/recharts-*.js', '**/index-BXI0aHyq.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // API endpoints — network first, fall back to cache for offline reads
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'irp-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          {
            // Heavy lazy chunks — cache aggressively after first load
            urlPattern: /\/assets\/(pdf|recharts|index\.es)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'irp-lazy-chunks',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: {
        // Off in dev so HMR isn't blocked
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
  },
})
