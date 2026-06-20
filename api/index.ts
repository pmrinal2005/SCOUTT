import express, { Request, Response, NextFunction } from 'express'

// ✅ FIXED: Named imports — supabase.ts has NO default export. Default import = undefined = CRASH
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

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'SCOUTT API is running',
    supabaseEnabled,   // ✅ tells you at a glance if DB is wired up
    timestamp: new Date().toISOString(),
  })
})

// ─── /api/health ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
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

// ─── /api/briefing ────────────────────────────────────────────────────────────
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
    // ✅ null guard — supabaseAdmin can be null if SERVICE_ROLE_KEY is not set
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

// ─── /api/briefing (POST - insert) ───────────────────────────────────────────
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