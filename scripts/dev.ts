// =====================================================================
// Local dev server (Windows + macOS + Linux). Replaces wrangler pages dev.
// Env loaded via tsx --env-file=.env.local (see package.json scripts).
// =====================================================================
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from '../src/index.js'

app.use('/static/*', serveStatic({ root: './public' }))
app.use('/favicon.ico', serveStatic({ path: './public/static/favicon.svg' }))

const port = Number(process.env.PORT || 3000)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n🛰️  RealityPulse running at http://localhost:${info.port}`)
  console.log(`   Landing:   http://localhost:${info.port}/`)
  console.log(`   Dashboard: http://localhost:${info.port}/dashboard?demo=true`)
  console.log(`   Supabase:  ${process.env.SUPABASE_URL ? '✅ connected' : '⚠️  using demo data'}`)
  console.log(`   NVIDIA:    ${process.env.NVIDIA_API_KEY ? '✅ live' : '⚠️  mock answers'}\n`)
})
