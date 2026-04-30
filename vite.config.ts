import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react(), apiRoutes()],
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
