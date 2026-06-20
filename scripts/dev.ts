// scripts/dev.ts
// =====================================================================
// Local dev server (Windows + macOS + Linux).
// Env loaded via tsx --env-file=.env.local (see package.json scripts).
// This file is ONLY used locally — never deployed to Vercel.
// =====================================================================

// Ambient module declaration to satisfy strict TypeScript when
// @hono/node-server's type definitions don't expose /serve-static.
declare module '@hono/node-server/serve-static' {
  import type { MiddlewareHandler } from 'hono'
  export function serveStatic(options: {
    root?: string
    path?: string
    rewriteRequestPath?: (path: string) => string
  }): MiddlewareHandler
}

import { serve, type ServerType } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from '../src/index.js'

app.use('/static/*', serveStatic({ root: './public' }))
app.use('/favicon.ico', serveStatic({ path: './public/static/favicon.svg' }))

const port: number = Number(process.env.PORT ?? 3000)

serve(
  { fetch: app.fetch, port },
  (info: { address: string; port: number; family: string }): void => {
    console.log(`\n🛰️  RealityPulse running at http://localhost:${info.port}`)
    console.log(`   Landing:   http://localhost:${info.port}/`)
    console.log(
      `   Dashboard: http://localhost:${info.port}/dashboard?demo=true`,
    )
    console.log(
      `   Supabase:  ${process.env.SUPABASE_URL ? '✅ connected' : '⚠️  using demo data'}`,
    )
    console.log(
      `   NVIDIA:    ${process.env.NVIDIA_API_KEY ? '✅ live' : '⚠️  mock answers'}\n`,
    )
  },
)

// Silence "ServerType imported but unused" if the user customizes later
export type { ServerType }