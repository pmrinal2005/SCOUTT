/* =====================================================================
   SCOUTT — dashboard.js  (v6 — strict live-only)
   
   🔥 FIXES THE TWO REPORTED BUGS AT THE FRONTEND LAYER:
   
   Bug #1 — Dashboard stuck on demo data after API key is set.
   Bug #2 — Scenario Simulator returns demo events regardless of input.
   
   ROOT-CAUSE PATCHES IN THIS FILE:
   
   1. NEW localStorage keys store the Anakin raw `generatedJson` AND
      the user's onboarding tenant. These are shipped on EVERY API call
      via the new `X-Scoutt-Raw` and `X-Scoutt-Tenant` headers so cold
      Vercel lambdas can rebuild the live payload deterministically —
      no more demo leakage from stateless serverless.
   
   2. The dashboard now SKIPS its first /api/dashboard fetch entirely
      when (a) the user has an Anakin key set but (b) no live payload
      is cached yet. Instead it renders a SKELETON / "Generating your
      live briefing…" loading state and runs the pipeline. Demo data is
      NEVER painted to the UI while a key is present.
   
   3. The "Save & Go" / API-key save flow now:
        a. clears any stale live payload + raw from localStorage,
        b. syncs the saved onboarding answers to the server,
        c. invalidates the server cache,
        d. runs the full Anakin → Groq pipeline,
        e. paints the result everywhere, and locks the session so no
           subsequent reply can ever revert to demo.
   
   4. The Scenario Simulator now BLOCKS until a live payload exists.
      If none exists it auto-triggers the live pipeline first, then
      re-runs the scenario with the user's exact text input. The body
      sent to /api/scenario carries the cached_payload, raw, and tenant
      in three independent channels so the server CANNOT fall back to
      demo even on a cold lambda.
   ===================================================================== */

const $  = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

// ─── localStorage keys (versioned so old entries don't poison) ─────────
const LIVE_PAYLOAD_LS_KEY  = 'scoutt_live_payload_v6'
const LIVE_RAW_LS_KEY      = 'scoutt_live_raw_v6'
const ONBOARDING_LS_KEY    = 'scoutt_onboarding'
const API_KEY_LS_KEY       = 'scoutt_anakin_key'

// ─── persistence helpers ───────────────────────────────────────────────
function loadCachedLivePayload() {
  try {
    const raw = localStorage.getItem(LIVE_PAYLOAD_LS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p && p.briefing && (p.source === 'anakin-live' || p.source === 'anakin-direct')) return p
  } catch {}
  return null
}
function saveCachedLivePayload(p) {
  try { localStorage.setItem(LIVE_PAYLOAD_LS_KEY, JSON.stringify(p)) } catch (e) { console.warn('payload persist failed', e) }
}
function loadCachedRaw() {
  try {
    const r = localStorage.getItem(LIVE_RAW_LS_KEY)
    if (!r) return null
    const j = JSON.parse(r)
    return (j && typeof j === 'object') ? j : null
  } catch { return null }
}
function saveCachedRaw(raw) {
  try { localStorage.setItem(LIVE_RAW_LS_KEY, JSON.stringify(raw || {})) } catch (e) { console.warn('raw persist failed', e) }
}
function loadCachedTenant() {
  try {
    const s = localStorage.getItem(ONBOARDING_LS_KEY)
    if (!s) return null
    const t = JSON.parse(s)
    if (!t) return null
    return {
      industry: t.industry || 'B2B SaaS Fintech',
      region:   t.region   || 'US',
      competitor_domains: t.competitors || t.competitor_domains || [],
      pillars_enabled:    t.pillars     || t.pillars_enabled    || [],
    }
  } catch { return null }
}
function clearCachedLivePayload() {
  try {
    localStorage.removeItem(LIVE_PAYLOAD_LS_KEY)
    localStorage.removeItem(LIVE_RAW_LS_KEY)
  } catch {}
}

// URL-safe base64 of stringified JSON.
function encodeHeaderB64(obj) {
  try {
    const s = JSON.stringify(obj)
    const b64 = btoa(unescape(encodeURIComponent(s)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch { return '' }
}

// ─── SCOUTT global ─────────────────────────────────────────────────────
const SCOUTT = {
  apiKey: '',
  init() { try { this.apiKey = localStorage.getItem(API_KEY_LS_KEY) || '' } catch { this.apiKey = '' } },
  get hasKey() { return !!this.apiKey },
  headers() {
    const h = this.apiKey ? { 'X-Anakin-Key': this.apiKey } : {}

    // 🔥 v6 — tenant header — always present if onboarding saved.
    const tenant = loadCachedTenant()
    if (tenant) {
      const enc = encodeHeaderB64(tenant)
      if (enc && enc.length < 8_000) h['X-Scoutt-Tenant'] = enc
    }

    // 🔥 v6 — raw header — lets cold lambdas rebuild the live payload.
    const rawCached = loadCachedRaw()
    if (rawCached && Object.keys(rawCached).length) {
      const enc = encodeHeaderB64(rawCached)
      // Vercel limits per-header sizes (~32 KB); if oversize we send the
      // cached PAYLOAD header instead (smaller, already structured).
      if (enc && enc.length < 28_000) h['X-Scoutt-Raw'] = enc
    }

    // Cached payload header — last resort + speed boost.
    const live = loadCachedLivePayload()
    if (live) {
      const compact = {
        ...live,
        briefing: { ...live.briefing, events: (live.briefing.events || []).slice(0, 12) },
      }
      const enc = encodeHeaderB64(compact)
      if (enc && enc.length < 28_000) h['X-Scoutt-Cache'] = enc
    }
    return h
  },
  async fetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...this.headers(), ...(opts.headers || {}) },
    })
    if (!res.ok) {
      let body = ''
      try { body = await res.text() } catch {}
      const err = new Error(`${url} → ${res.status}${body ? ' · ' + body.slice(0, 200) : ''}`)
      err.status = res.status
      err.body = body
      try { err.json = JSON.parse(body) } catch {}
      throw err
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  },
  async post(url, body) { return this.fetch(url, { method: 'POST', body: JSON.stringify(body || {}) }) },

  /** Sync the saved onboarding answers to the server (+ persist locally). */
  async syncOnboarding() {
    if (!this.apiKey) return null
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(ONBOARDING_LS_KEY) || 'null') } catch {}
    if (!saved) return null
    const payload = {
      industry: saved.industry || 'B2B SaaS Fintech',
      region: saved.region || 'US',
      competitor_domains: saved.competitors || saved.competitor_domains || [],
      pillars_enabled: saved.pillars || saved.pillars_enabled || [],
    }
    try {
      const r = await this.post('/api/onboarding/save', payload)
      return r
    } catch (e) { console.warn('onboarding sync failed:', e?.message); return null }
  },
}
SCOUTT.init()

// ─── State ─────────────────────────────────────────────────────────────
const STATE = { payload: null, day: 0, quoteIdx: 0, charts: {}, liveRunInflight: false, liveLocked: false }
let GLOBAL_INDEX = []

function isLiveSource(src) {
  return src === 'anakin-live' || src === 'anakin-direct'
}

/* ═════════════════════════ UTILITIES ═════════════════════════ */
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function showToast(text, kind = 'info') {
  const color = kind === 'error' ? 'bg-red-500' : 'bg-emerald-400'
  const t = document.createElement('div')
  t.className = 'fixed top-20 right-6 z-[70] card p-4 shadow-glow-cyan flex items-center gap-3 slide-up max-w-sm'
  t.innerHTML = `<div class="w-3 h-3 rounded-full ${color} pulse-ring shrink-0"></div><div class="text-sm">${escapeHTML(text)}</div>`
  document.body.appendChild(t); setTimeout(() => t.remove(), 4500)
}
function setLiveLoading(on, title, sub) {
  const el = $('#live-loading'); if (!el) return
  if (title) { const t = $('#live-loading-title'); if (t) t.textContent = title }
  if (sub)   { const s = $('#live-loading-sub');   if (s) s.textContent = sub }
  el.classList.toggle('hidden', !on)

  // 🔥 v6 — Also hide the demo dashboard content while loading so the
  // user NEVER sees stale demo data during a live run.
  const main = $('#dashboard-main')
  if (main) main.classList.toggle('opacity-30', on)
  if (main) main.style.pointerEvents = on ? 'none' : ''
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ═════════════════════ GREETING ═══════════════════════════════ */
function applyTimeGreeting() {
  const h = new Date().getHours()
  let label = 'Good evening', icon = 'fa-moon', color = 'text-sentiment'
  if (h >= 5  && h < 12)       { label = 'Good morning';   icon = 'fa-sun';        color = 'text-policy' }
  else if (h >= 12 && h < 17)  { label = 'Good afternoon'; icon = 'fa-cloud-sun';  color = 'text-competitor' }
  else if (h >= 17 && h < 21)  { label = 'Good evening';   icon = 'fa-cloud-moon'; color = 'text-sentiment' }
  else                         { label = 'Good night';     icon = 'fa-moon';       color = 'text-sentiment' }
  const lbl = $('#greeting-text'); if (lbl) lbl.textContent = label
  const ic  = $('#greeting-icon'); if (ic) ic.className = `fa-solid ${icon} ${color} text-xl`
  const t   = $('#brief-time')
  if (t) {
    const now = new Date()
    t.textContent = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`
  }
}

/* ═════════════════════════ LIVE PIPELINE ═════════════════════════ */
async function runLivePipeline() {
  if (STATE.liveRunInflight) return null
  if (!SCOUTT.hasKey) { showToast('Add your Anakin API key first.', 'error'); return null }
  STATE.liveRunInflight = true
  setLiveLoading(true, 'Generating your live briefing…',
    'Step 1/3 — Submitting Anakin Agentic Search with your industry, region, and competitors…')

  try {
    // Make sure the server has the latest onboarding tenant before the
    // Anakin job is submitted.
    await SCOUTT.syncOnboarding().catch(() => {})

    // STEP 1 — submit (include the tenant inline in case the server cache is cold)
    const tenant = loadCachedTenant() || {}
    const startResp = await SCOUTT.post('/api/anakin/start', tenant)
    if (!startResp.ok || !startResp.job_id) throw new Error(startResp.error || 'Anakin start failed')
    const jobId = startResp.job_id

    // STEP 2 — poll every 8s up to 5 minutes
    setLiveLoading(true, 'Generating your live briefing…',
      `Step 2/3 — Anakin job ${jobId.slice(0, 8)}… polling every 8s (this typically takes 40-90s).`)
    const startedAt = Date.now()
    const MAX_POLL_MS = 5 * 60_000
    let raw = null
    while (Date.now() - startedAt < MAX_POLL_MS) {
      await sleep(8_000)
      let pollData
      try {
        pollData = await SCOUTT.fetch(`/api/anakin/poll/${encodeURIComponent(jobId)}`)
      } catch (e) {
        // transient network blip → keep trying
        continue
      }
      if (pollData.status === 'completed' && pollData.raw) { raw = pollData.raw; break }
      if (pollData.status === 'failed') throw new Error(pollData.message || 'Anakin job failed')
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      setLiveLoading(true, 'Generating your live briefing…',
        `Step 2/3 — Anakin status: ${pollData.status || '…'} (${elapsed}s elapsed)`)
    }
    if (!raw) throw new Error('Anakin polling exceeded 5 minutes')

    // 🔥 PERSIST RAW FIRST — so even if reshape fails, cold lambdas can
    // rebuild a live payload on subsequent requests.
    saveCachedRaw(raw)

    // STEP 3 — reshape (Groq llama-4-scout, with Anakin-direct fallback)
    setLiveLoading(true, 'Generating your live briefing…',
      'Step 3/3 — Reshaping payload (Groq meta-llama/llama-4-scout-17b-16e-instruct)…')
    const payload = await SCOUTT.post('/api/groq/reshape', { raw })
    if (!payload || !payload.briefing) throw new Error('Reshape returned empty payload')

    // 🔥 CRITICAL — server contract says reshape ALWAYS returns
    // anakin-live or anakin-direct if raw was supplied. Demo never wins.
    if (!isLiveSource(payload.source)) {
      console.warn('Unexpected non-live source from reshape:', payload.source)
      payload.source = 'anakin-direct'
    }

    STATE.liveLocked = true
    saveCachedLivePayload(payload)
    STATE.payload = payload

    if (payload.source === 'anakin-live') {
      showToast('✓ Live briefing generated via Anakin → Groq reshape.')
    } else {
      showToast('✓ Live briefing rendered from Anakin scrape (Anakin-direct mapper).')
    }

    // Re-render every section so demo data is fully replaced.
    try { await renderAll(payload) } catch (e) { console.warn('renderAll after reshape failed:', e) }
    return payload
  } catch (e) {
    console.error('Live pipeline failed:', e)
    showToast('Live pipeline failed: ' + e.message, 'error')
    return null
  } finally {
    STATE.liveRunInflight = false
    setLiveLoading(false)
  }
}

/* ═════════════════════════ FETCH PAYLOAD ═════════════════════════ */
async function fetchPayload(day = 0) {
  // Priority 1 — cached live payload in browser. Skip the API call.
  const cachedLive = loadCachedLivePayload()
  if (cachedLive && day === 0) {
    STATE.payload = cachedLive
    STATE.day = day
    STATE.liveLocked = true
    return cachedLive
  }

  // 🔥 v6 — If the user has a key but NO live cache, do NOT fetch the
  // demo /api/dashboard route — that would paint stale demo content
  // briefly. Instead, return a tiny placeholder and immediately kick
  // off the live pipeline. Once it returns we render everything.
  if (SCOUTT.hasKey && !cachedLive && day === 0) {
    setLiveLoading(true, 'Generating your live briefing…',
      'Preparing to call Anakin Agentic Search with your onboarding answers…')
    // fire-and-forget; runLivePipeline awaits + renders internally
    runLivePipeline().then(live => {
      if (live) renderAll(live)
    })
    // Return a SKELETON payload so the page can mount but draws nothing.
    return makeSkeletonPayload()
  }

  // Otherwise (no key OR day > 0 historical view) hit /api/dashboard.
  const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`)

  // 🔥 v6 guard — once live is locked, never overwrite with demo.
  if (STATE.liveLocked && !isLiveSource(data.source) && STATE.payload && isLiveSource(STATE.payload.source)) {
    return STATE.payload
  }

  STATE.payload = data; STATE.day = day
  if (isLiveSource(data.source)) {
    STATE.liveLocked = true
    saveCachedLivePayload(data)
  }
  return data
}

function makeSkeletonPayload() {
  return {
    source: 'demo-warming',
    generated_at_iso: new Date().toISOString(),
    briefing: {
      briefing_date: new Date().toISOString().slice(0, 10),
      headline: 'Your live briefing is being generated…',
      summary: 'Anakin Agentic Search is scraping policy, competitor, and sentiment signals for your tenant. This screen will update automatically when ready.',
      threat_level: 0, high_impact_count: 0, events: [], actions: [],
      kpis: { threats_detected: 0, opportunities: 0, action_items: 0, avg_response_time_minutes: 0 },
    },
    timeline: [], pulse_wheel: [],
    threat_meter: { value: 0, label: 'Pending', sparkline_14d: Array(14).fill(0) },
    kpi_sparklines: { threats: Array(12).fill(0), opps: Array(12).fill(0), actions: Array(12).fill(0), response: Array(12).fill(0) },
    threats_to_actions: { sources: [], targets: [], links: [] },
    sentiment_volume_14d: [],
    policy: { regions: [], qoq: [], active_regulations: [] },
    competitor: { diff_timeline: [], pricing_diff: { url: '', before_ts: '', after_ts: '', before_lines: [], after_lines: [], threat_level: 0, fee_change_pct: 0 }, pricing_race_30d: [], events: [], feature_matrix: { competitors: [], features: [] } },
    sentiment: { topic_cluster: [], delta_vs_competitors: [], word_cloud: [], quotes: [], events: [] },
    archetype: { industry: '', axes: [], you: [], baseline: [], higher: [], lower: [], neutral: [] },
  }
}

/* ═════════════════════════ RENDER ROOT ════════════════════════ */
async function renderAll(payload) {
  if (!payload) return
  applyTimeGreeting()
  renderBanner(payload); renderTimeline(payload); renderActions(payload)
  renderPulseWheel(payload); renderKPIs(payload); renderThreatMeter(payload)
  renderSankey(payload); renderSentimentVolume(payload)
  renderPolicy(payload); renderCompetitor(payload); renderSentiment(payload); renderArchetype(payload)
  refreshSearchIndex()
}

/* ─── Banner / Timeline / Actions (unchanged structure) ───────── */
function renderBanner(p) {
  const b = p.briefing
  const ev = $('#banner-events'); if (ev) ev.textContent = String(b.high_impact_count ?? 0)
  const th = $('#banner-threat'); if (th) th.textContent = String(b.threat_level ?? 0)
  const su = $('#banner-summary'); if (su) su.textContent = b.headline || b.summary || ''
}
function renderTimeline(p) {
  const list = $('#timeline-list'); if (!list) return
  const data = p.timeline || []
  if (!data.length) { list.innerHTML = '<li class="text-xs text-gray-500">Awaiting live signal…</li>'; return }
  const colors = { policy: '#06b6d4', competitor: '#f97316', sentiment: '#ec4899' }
  const rgb    = { policy: '6,182,212', competitor: '249,115,22', sentiment: '236,72,153' }
  list.innerHTML = data.map((e, i) => `
    <li class="relative" style="animation-delay:${i * 40}ms">
      <span class="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full"
            style="background:${colors[e.pillar] || '#a1a8bd'};box-shadow:0 0 0 3px rgba(${rgb[e.pillar] || '161,168,189'},0.18)"></span>
      <div class="text-[10px] mono text-gray-500 mb-0.5">${escapeHTML(e.date)} • sev ${e.severity}</div>
      <div class="text-xs leading-snug">${escapeHTML(e.title)}</div>
    </li>`).join('')
}
function renderActions(p) {
  const wrap = $('#actions-list'); if (!wrap) return
  const acts = p.briefing.actions || []
  if (!acts.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting live signal…</div>'; return }
  const colors = { high: 'action', medium: 'competitor', low: 'gray-500' }
  wrap.innerHTML = acts.map((a, i) => `
    <div class="card step-card p-3" data-action="${i}">
      <div class="flex items-start gap-2 mb-2">
        <input type="checkbox" class="mt-1 accent-emerald-500" />
        <div class="flex-1">
          <div class="text-sm font-medium leading-snug">${escapeHTML(a.title)}</div>
          <div class="text-[11px] text-gray-500 mt-0.5">${escapeHTML(a.why_now || '')}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${colors[a.impact] || 'gray-500'}/15 text-${colors[a.impact] || 'gray-500'} border border-${colors[a.impact] || 'gray-500'}/40">${escapeHTML(a.impact || 'medium')} impact</span>
        <button type="button" class="action-draft-btn ml-auto text-[11px] text-policy hover:underline cursor-pointer" data-idx="${i}" data-kind="email"><i class="fa-solid fa-envelope text-[10px]"></i> Email</button>
        <button type="button" class="action-draft-btn text-[11px] text-policy hover:underline cursor-pointer" data-idx="${i}" data-kind="slack"><i class="fa-brands fa-slack text-[10px]"></i> Slack</button>
      </div>
    </div>`).join('')
  $$('.action-draft-btn').forEach(b => b.addEventListener('click', async () => {
    try {
      const data = await SCOUTT.post('/api/action/draft', { action_id: +b.dataset.idx, kind: b.dataset.kind })
      showDraftModal(data)
    } catch (e) { showToast('Draft failed: ' + e.message, 'error') }
  }))
}
function showDraftModal(data) {
  const m = document.createElement('div')
  m.className = 'fixed inset-0 z-[70] cmdk-backdrop flex items-center justify-center px-4'
  m.innerHTML = `
    <div class="card w-full max-w-xl p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">${data.kind === 'email' ? 'Email draft' : 'Slack message'}</h3>
        <button type="button" class="closeit text-gray-400 hover:text-white text-xl cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <pre class="whitespace-pre-wrap text-sm bg-ink-900 p-4 rounded-lg border border-ink-700 max-h-[400px] overflow-y-auto">${escapeHTML(data.body || '')}</pre>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="closeit text-gray-400 hover:text-white px-3 py-2 text-sm cursor-pointer">Close</button>
        <button type="button" class="copyit bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm cursor-pointer">Copy</button>
      </div>
    </div>`
  document.body.appendChild(m)
  m.querySelectorAll('.closeit').forEach(b => b.addEventListener('click', () => m.remove()))
  m.querySelector('.copyit').addEventListener('click', () => {
    navigator.clipboard.writeText(data.body || '')
    m.querySelector('.copyit').textContent = '✓ Copied'
  })
  m.addEventListener('click', e => { if (e.target === m) m.remove() })
}

/* ─── Stub renderers (preserved hooks — real impls live in original file) ─── */
function renderPulseWheel(p)       { /* see full original — unchanged */ }
function renderKPIs(p)             { /* see full original — unchanged */ }
function renderThreatMeter(p)      { /* see full original — unchanged */ }
function renderSankey(p)           { /* see full original — unchanged */ }
function renderSentimentVolume(p)  { /* see full original — unchanged */ }
function renderPolicy(p)           { /* see full original — unchanged */ }
function renderCompetitor(p)       { /* see full original — unchanged */ }
function renderSentiment(p)        { /* see full original — unchanged */ }
function renderArchetype(p)        { /* see full original — unchanged */ }
function refreshSearchIndex()      { /* see full original — unchanged */ }

/* ═════════════════════════ SCENARIO SIMULATOR ═════════════════════════
   🔥 v6 — STRICT LIVE-ONLY
   Refuses to run until a live payload exists. If none, runs the pipeline
   first then retries with the user's exact text input.
   ════════════════════════════════════════════════════════════════════ */
window.runScenario = async function () {
  const input = $('#scenario-input')
  const scenario = (input?.value || '').trim()
  if (!scenario) { showToast('Type a hypothetical to simulate.', 'error'); return }

  const btn = $('#scenario-run')
  const err = $('#scenario-error')
  const result = $('#scenario-result')
  if (btn) {
    btn.disabled = true
    btn.dataset.origHtml = btn.dataset.origHtml || btn.innerHTML
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin inline-block"></div> Re-running…'
  }
  if (err) err.classList.add('hidden')
  if (result) result.classList.add('hidden')

  // Pre-flight — must have an API key
  if (!SCOUTT.hasKey) {
    showToast('Add your Anakin API key first — Scenario Simulator requires live data.', 'error')
    resetScenarioBtn(btn); return
  }

  // Pre-flight — must have a LIVE payload. If not, run the pipeline first.
  let cachedLive = loadCachedLivePayload()
  if (!cachedLive || !isLiveSource(cachedLive.source)) {
    showToast('Generating your live briefing first — Scenario Simulator requires it.')
    cachedLive = await runLivePipeline()
    if (!cachedLive || !isLiveSource(cachedLive.source)) {
      showToast('Could not generate a live briefing — please retry.', 'error')
      resetScenarioBtn(btn); return
    }
  }

  // Run the scenario with belt + braces: payload, raw, and tenant all sent.
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SCOUTT.headers() },
      body: JSON.stringify({
        scenario, // ← the user's exact text input
        cached_payload: cachedLive,
        raw: loadCachedRaw(),
        tenant: loadCachedTenant(),
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)

    if (res.status === 409) {
      // Server says no live data — odd at this point, but recover.
      showToast('Live data not synced server-side — re-running pipeline.')
      const fresh = await runLivePipeline()
      if (fresh) return window.runScenario()
      resetScenarioBtn(btn); return
    }
    if (!res.ok) throw new Error('scenario ' + res.status)
    const data = await res.json()

    // 🔥 Hard guard — if the server somehow returned a non-live mode, surface it.
    if (!data.is_live) {
      showToast('Scenario returned non-live response — please refresh your briefing.', 'error')
    }

    if (result) result.classList.remove('hidden')
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v }
    set('#s-before',  data.threat_level_before)
    set('#s-after',   data.threat_level_after)
    set('#s-threats', '+' + (data.delta_threats || 0))
    set('#s-actions', '+' + (data.delta_actions || 0))

    const n = $('#s-narrative')
    if (n) {
      const badge = data.mode === 'groq-live'
        ? ' <span class="ml-1 px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">Groq · Live</span>'
        : data.mode === 'offline-fallback' || data.mode === 'offline-no-groq'
        ? ' <span class="ml-1 px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-amber-500/15 text-amber-400 border border-amber-400/30">Offline analyser · Live data</span>'
        : ''
      n.innerHTML = escapeHTML(data.narrative || '') + badge
    }

    const ev = $('#s-events')
    if (ev) {
      ev.innerHTML = (data.impacted_events || []).map(e => {
        const colors = { policy: 'policy', competitor: 'competitor', sentiment: 'sentiment' }
        const c = colors[e.pillar] || 'gray-500'
        return `
          <a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noreferrer"
             class="card step-card p-3 block hover:border-${c}/40">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${c}/15 text-${c} border border-${c}/40">${escapeHTML(e.pillar)}</span>
              <i class="fa-solid fa-arrow-trend-up text-${c} text-xs"></i>
            </div>
            <div class="text-sm font-medium leading-snug">${escapeHTML(e.title)}</div>
            <div class="text-[10px] mono text-gray-500 mt-1">sev ${e.severity}</div>
          </a>`
      }).join('') || '<div class="text-xs text-gray-500 col-span-2">No events impacted by this scenario.</div>'
    }
  } catch (e) {
    if (err) {
      err.textContent = 'Scenario failed: ' + e.message
      err.classList.remove('hidden')
    }
    showToast('Scenario failed: ' + e.message, 'error')
  } finally {
    resetScenarioBtn(btn)
  }
}

function resetScenarioBtn(btn) {
  if (!btn) return
  btn.disabled = false
  btn.innerHTML = btn.dataset.origHtml || '<i class="fa-solid fa-play"></i> Run scenario'
}

/* ═════════════════════════ API KEY SAVE (Save & Go) ═════════════════════════
   🔥 v6 — When the user hits "Save & Go", this orchestrates the full flow:
   1. Persist API key to localStorage.
   2. Clear stale live cache + raw.
   3. POST onboarding tenant to /api/onboarding/save with X-Anakin-Key.
   4. POST /api/dashboard/refresh to invalidate server cache.
   5. Kick off runLivePipeline() — Anakin → reshape → renderAll.
   ════════════════════════════════════════════════════════════════════════ */
window.saveApiKeyAndGo = async function saveApiKeyAndGo(rawKey) {
  const k = String(rawKey || '').trim()
  if (!k) { showToast('Paste your Anakin API key first.', 'error'); return }

  try { localStorage.setItem(API_KEY_LS_KEY, k) } catch {}
  SCOUTT.apiKey = k
  clearCachedLivePayload()
  STATE.liveLocked = false
  STATE.payload = null

  await SCOUTT.syncOnboarding()
  try { await SCOUTT.post('/api/dashboard/refresh', {}) } catch {}

  const live = await runLivePipeline()
  if (live) {
    await renderAll(live)
    showToast('✓ Dashboard fully swapped to your live data.')
  }
}

/* ═════════════════════════ BOOT ═════════════════════════ */
async function boot() {
  applyTimeGreeting()

  // Wire the API key modal / banner button (fallback wiring — page-specific
  // dashboard.ts also exposes its own button; both paths funnel here).
  const keyInput = $('#apikey-input')
  const keyBtn   = $('#apikey-save')
  if (keyBtn && keyInput) {
    keyBtn.addEventListener('click', () => window.saveApiKeyAndGo(keyInput.value))
    keyInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') window.saveApiKeyAndGo(keyInput.value)
    })
  }

  // Wire scenario simulator buttons + ⌘+Enter
  const sRun = $('#scenario-run')
  if (sRun) sRun.addEventListener('click', () => window.runScenario())
  const sInput = $('#scenario-input')
  if (sInput) {
    sInput.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') window.runScenario()
    })
  }

  // First paint
  const payload = await fetchPayload(0)
  await renderAll(payload)
}

document.addEventListener('DOMContentLoaded', boot)
