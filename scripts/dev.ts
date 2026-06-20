// =====================================================================
// Local dev server (Windows + macOS + Linux).
// Env loaded via tsx --env-file=.env.local (see package.json scripts).
// =====================================================================
import { serve, type ServerType } from '@hono/node-server'
// @hono/node-server v1.13+ ships /serve-static at runtime even when its
// type declarations don't expose the subpath. The ambient module decl
// below makes TypeScript happy in strict mode.
import { serveStatic } from '@hono/node-server/serve-static'
import app from '../src/index.js'

app.use('/static/*', serveStatic({ root: './public' }))
app.use('/favicon.ico', serveStatic({ path: './public/static/favicon.svg' }))

const port: number = Number(process.env.PORT || 3000)

serve(
  { fetch: app.fetch, port },
  (info: { address: string; port: number; family: string }): void => {
    console.log(`\n🛰️  RealityPulse running at http://localhost:${info.port}`)
    console.log(`   Landing:   http://localhost:${info.port}/`)
    console.log(`   Dashboard: http://localhost:${info.port}/dashboard?demo=true`)
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
