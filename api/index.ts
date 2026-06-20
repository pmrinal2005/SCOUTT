import express, { Request, Response, NextFunction } from 'express'
import path from 'path'

// ─── Page renderers (HTML strings) ────────────────────────────────────────────
import { landingPage } from '../src/pages/landing'
import { dashboardPage } from '../src/pages/dashboard'
import { onboardingPage } from '../src/pages/onboarding'

// ─── Supabase + data helpers (named imports — supabase.ts has NO default) ────
import {
  supabase,
  supabaseAdmin,
  supabaseEnabled,
  getTenant,
  getTodayBriefing,
  getTimeline,
  getCreditLedger,
  seedDemoTenant,
  logCredit,
  insertBriefing,
} from '../src/supabase'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }
  next()
})

// ─── Static assets (Vercel ships /public alongside /api in the lambda) ───────
// Works both locally (cwd = project root) and on Vercel (cwd = /var/task)
const PUBLIC_DIR = path.join(process.cwd(), 'public')
app.use('/static', express.static(path.join(PUBLIC_DIR, 'static'), {
  maxAge: '1h',
  fallthrough: true,
}))

// ─── Favicon (browsers auto-request /favicon.ico and /favicon.png) ───────────
app.get(['/favicon.ico', '/favicon.png'], (_req: Request, res: Response) => {
  res.redirect(301, '/static/favicon.svg')
})

// =============================================================================
// FRONTEND HTML ROUTES  ←  THIS IS THE FIX FOR THE "BLACK SCREEN WITH JSON" BUG
// =============================================================================

// ─── Landing page ('/') ──────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(landingPage())
})

// ─── Dashboard (private, tenant view) ─────────────────────────────────────────
app.get('/dashboard', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(dashboardPage(false))
})

// ─── Public Threat Index ──────────────────────────────────────────────────────
app.get('/threat-index', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(dashboardPage(true))
})

// ─── Onboarding ───────────────────────────────────────────────────────────────
app.get('/onboarding', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(onboardingPage())
})

// =============================================================================
// API ROUTES  (unchanged from your previous code — all preserved)
// =============================================================================

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'SCOUTT API is running',
    supabaseEnabled,
    timestamp: new Date().toISOString(),
  })
})

// ─── /api/tenant ──────────────────────────────────────────────────────────────
app.get('/api/tenant', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string | undefined
    const tenant = await getTenant(tenantId)
    res.status(200).json(tenant)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/tenant]', message)
    res.status(500).json({ error: 'Failed to fetch tenant', message })
  }
})

// ─── /api/briefing (GET) ──────────────────────────────────────────────────────
app.get('/api/briefing', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string | undefined
    const briefing = await getTodayBriefing(tenantId)
    res.status(200).json(briefing)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/briefing]', message)
    res.status(500).json({ error: 'Failed to fetch briefing', message })
  }
})

// ─── /api/timeline ────────────────────────────────────────────────────────────
app.get('/api/timeline', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string | undefined
    const timeline = await getTimeline(tenantId)
    res.status(200).json(timeline)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/timeline]', message)
    res.status(500).json({ error: 'Failed to fetch timeline', message })
  }
})

// ─── /api/credits ─────────────────────────────────────────────────────────────
app.get('/api/credits', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string | undefined
    const ledger = await getCreditLedger(tenantId)
    res.status(200).json(ledger)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/credits]', message)
    res.status(500).json({ error: 'Failed to fetch credit ledger', message })
  }
})

// ─── /api/seed ────────────────────────────────────────────────────────────────
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        ok: false,
        reason: 'SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment.',
      })
      return
    }
    const result = await seedDemoTenant()
    res.status(200).json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/seed]', message)
    res.status(500).json({ error: 'Seed failed', message })
  }
})

// ─── /api/log-credit ──────────────────────────────────────────────────────────
app.post('/api/log-credit', async (req: Request, res: Response) => {
  try {
    const { tenantId, endpoint, creditsUsed, jobId } = req.body as {
      tenantId?: string
      endpoint: string
      creditsUsed: number
      jobId?: string
    }
    if (!endpoint || creditsUsed === undefined) {
      res.status(400).json({ error: 'endpoint and creditsUsed are required' })
      return
    }
    await logCredit({ tenantId, endpoint, creditsUsed, jobId })
    res.status(200).json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/log-credit]', message)
    res.status(500).json({ error: 'Failed to log credit', message })
  }
})

// ─── /api/briefing (POST - insert) ────────────────────────────────────────────
app.post('/api/briefing', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment.',
      })
      return
    }
    const { tenantId, briefingDate, generatedJson, anakinJobId, creditsSpent } =
      req.body as {
        tenantId?: string
        briefingDate: string
        generatedJson: unknown
        anakinJobId?: string
        creditsSpent?: number
      }
    if (!briefingDate || !generatedJson) {
      res.status(400).json({ error: 'briefingDate and generatedJson are required' })
      return
    }
    const result = await insertBriefing({
      tenantId,
      briefingDate,
      generatedJson,
      anakinJobId,
      creditsSpent,
    })
    res.status(200).json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/briefing POST]', message)
    res.status(500).json({ error: 'Failed to insert briefing', message })
  }
})

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SCOUTT] Unhandled error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  })
})

export default app

// Local dev only — Vercel imports the default export above
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = Number(process.env.PORT) || 3000
  app.listen(PORT, () => {
    console.log(`[SCOUTT] Server running on http://localhost:${PORT}`)
  })
}
