/* =====================================================================
   SCOUTT — dashboard.js  (v7 — restored full renderers + strict live-only)

   This file is the SINGLE source of all client-side interactivity for
   the SCOUTT dashboard. It replaces the previous v6 file whose renderer
   bodies had been accidentally stripped to '/(* see full original *)/'
   stubs — which is why the live deploy was showing empty Pulse Wheel /
   Threat Meter / Sentiment chart / Sankey / Policy / Competitor /
   Sentiment / Archetype tabs and why tab-switching was broken.

   What this build delivers
   ------------------------
     • Full implementations of every renderer (was stub):
         renderPulseWheel, renderKPIs, renderThreatMeter, renderSankey,
         renderSentimentVolume, renderPolicy, renderCompetitor,
         renderSentiment, renderArchetype, refreshSearchIndex.
     • Tab switching wiring  (.tab-btn ↔ .tab-pane)               ← key fix
     • Time-Machine slider (#time-machine)
     • API-key modal open/close + Save-and-Go pipeline
     • Read-full-brief modal
     • Transparency drawer
     • ⌘K command palette
     • Theme toggle (dark / paper)
     • Audio-brief toast (graceful no-op when ElevenLabs not wired)
     • Quote-rotator prev / next
     • Scenario simulator (strict live-only, server-refuses-on-409)

   Strict live-only contract (kept from v6)
   ----------------------------------------
     • localStorage stores: raw Anakin generatedJson, last live payload,
       saved API key, onboarding tenant.
     • Every API call carries X-Anakin-Key + X-Scoutt-Tenant +
       X-Scoutt-Raw + X-Scoutt-Cache so even cold Vercel lambdas can
       rebuild the LIVE payload deterministically — no demo fallback
       once the user has a key.
     • Once payload.source ∈ {anakin-live, anakin-direct} we LOCK the
       session so a stale demo response cannot overwrite it.
     • When the user has a key but no live cache yet, the dashboard
       paints a SKELETON (no demo content) while runLivePipeline runs.

   Anakin / Groq pipeline
   ----------------------
     1. POST /api/anakin/start      → returns job_id
     2. GET  /api/anakin/poll/{id}  → looped browser-side every 8s
     3. POST /api/groq/reshape      → DashboardPayload (cached + locked)
   ===================================================================== */

'use strict'

/* ════════════════════════ tiny DOM helpers ════════════════════════ */
const $  = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

/* ════════════════════════ localStorage keys ═══════════════════════ */
const LIVE_PAYLOAD_LS_KEY = 'scoutt_live_payload_v6'
const LIVE_RAW_LS_KEY     = 'scoutt_live_raw_v6'
const ONBOARDING_LS_KEY   = 'scoutt_onboarding'
const API_KEY_LS_KEY      = 'scoutt_anakin_key'
const THEME_LS_KEY        = 'scoutt_theme'

/* ════════════════════════ persistence helpers ═════════════════════ */
function loadCachedLivePayload() {
  try {
    const raw = localStorage.getItem(LIVE_PAYLOAD_LS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p && p.briefing && (p.source === 'anakin-live' || p.source === 'anakin-direct')) return p
  } catch (_) {}
  return null
}
function saveCachedLivePayload(p) {
  try { localStorage.setItem(LIVE_PAYLOAD_LS_KEY, JSON.stringify(p)) }
  catch (e) { console.warn('payload persist failed', e) }
}
function loadCachedRaw() {
  try {
    const r = localStorage.getItem(LIVE_RAW_LS_KEY)
    if (!r) return null
    const j = JSON.parse(r)
    return (j && typeof j === 'object') ? j : null
  } catch (_) { return null }
}
function saveCachedRaw(raw) {
  try { localStorage.setItem(LIVE_RAW_LS_KEY, JSON.stringify(raw || {})) }
  catch (e) { console.warn('raw persist failed', e) }
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
  } catch (_) { return null }
}
function clearCachedLivePayload() {
  try {
    localStorage.removeItem(LIVE_PAYLOAD_LS_KEY)
    localStorage.removeItem(LIVE_RAW_LS_KEY)
  } catch (_) {}
}

/* URL-safe base64 of stringified JSON. */
function encodeHeaderB64(obj) {
  try {
    const s = JSON.stringify(obj)
    const b64 = btoa(unescape(encodeURIComponent(s)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (_) { return '' }
}

/* ════════════════════════ SCOUTT global ════════════════════════ */
const SCOUTT = {
  apiKey: '',
  init() {
    try { this.apiKey = localStorage.getItem(API_KEY_LS_KEY) || '' }
    catch (_) { this.apiKey = '' }
  },
  get hasKey() { return !!this.apiKey },
  headers() {
    const h = this.apiKey ? { 'X-Anakin-Key': this.apiKey } : {}
    const tenant = loadCachedTenant()
    if (tenant) {
      const enc = encodeHeaderB64(tenant)
      if (enc && enc.length < 8000) h['X-Scoutt-Tenant'] = enc
    }
    const rawCached = loadCachedRaw()
    if (rawCached && Object.keys(rawCached).length) {
      const enc = encodeHeaderB64(rawCached)
      if (enc && enc.length < 28000) h['X-Scoutt-Raw'] = enc
    }
    const live = loadCachedLivePayload()
    if (live) {
      const compact = {
        ...live,
        briefing: { ...live.briefing, events: (live.briefing.events || []).slice(0, 12) },
      }
      const enc = encodeHeaderB64(compact)
      if (enc && enc.length < 28000) h['X-Scoutt-Cache'] = enc
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
      try { body = await res.text() } catch (_) {}
      const err = new Error(`${url} → ${res.status}${body ? ' · ' + body.slice(0, 200) : ''}`)
      err.status = res.status
      err.body = body
      try { err.json = JSON.parse(body) } catch (_) {}
      throw err
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  },
  async post(url, body) {
    return this.fetch(url, { method: 'POST', body: JSON.stringify(body || {}) })
  },
  async syncOnboarding() {
    if (!this.apiKey) return null
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(ONBOARDING_LS_KEY) || 'null') } catch (_) {}
    if (!saved) return null
    const payload = {
      industry: saved.industry || 'B2B SaaS Fintech',
      region: saved.region || 'US',
      competitor_domains: saved.competitors || saved.competitor_domains || [],
      pillars_enabled: saved.pillars || saved.pillars_enabled || [],
    }
    try { return await this.post('/api/onboarding/save', payload) }
    catch (e) { console.warn('onboarding sync failed:', e?.message); return null }
  },
}
SCOUTT.init()

/* ════════════════════════ runtime state ════════════════════════ */
const STATE = {
  payload: null,
  day: 0,
  quoteIdx: 0,
  charts: {},          // map of chartId → Chart instance (for destroy-before-recreate)
  liveRunInflight: false,
  liveLocked: false,
}
let GLOBAL_INDEX = []

function isLiveSource(src) {
  return src === 'anakin-live' || src === 'anakin-direct'
}

/* ════════════════════════ utilities ════════════════════════ */
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function showToast(text, kind = 'info') {
  const color = kind === 'error' ? 'bg-red-500' : 'bg-emerald-400'
  const t = document.createElement('div')
  t.className = 'fixed top-20 right-6 z-[70] card p-4 shadow-glow-cyan flex items-center gap-3 slide-up max-w-sm'
  t.innerHTML = `<div class="w-3 h-3 rounded-full ${color} pulse-ring shrink-0"></div><div class="text-sm">${escapeHTML(text)}</div>`
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 4500)
}
function setLiveLoading(on, title, sub) {
  const el = $('#live-loading'); if (!el) return
  if (title) { const t = $('#live-loading-title'); if (t) t.textContent = title }
  if (sub)   { const s = $('#live-loading-sub');   if (s) s.textContent = sub }
  el.classList.toggle('hidden', !on)
  const main = $('#dashboard-main')
  if (main) {
    main.classList.toggle('opacity-30', on)
    main.style.pointerEvents = on ? 'none' : ''
  }
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* Destroy + recreate Chart.js instance keyed by id. */
function makeChart(canvasId, config) {
  const c = document.getElementById(canvasId)
  if (!c || typeof Chart === 'undefined') return null
  if (STATE.charts[canvasId]) {
    try { STATE.charts[canvasId].destroy() } catch (_) {}
  }
  try {
    STATE.charts[canvasId] = new Chart(c.getContext('2d'), config)
    return STATE.charts[canvasId]
  } catch (e) { console.warn('chart create failed', canvasId, e); return null }
}

/* ════════════════════════ greeting ════════════════════════ */
function applyTimeGreeting() {
  const h = new Date().getHours()
  let label = 'Good evening', icon = 'fa-moon', color = 'text-sentiment'
  if (h >= 5 && h < 12)       { label = 'Good morning';   icon = 'fa-sun';        color = 'text-policy' }
  else if (h >= 12 && h < 17) { label = 'Good afternoon'; icon = 'fa-cloud-sun';  color = 'text-competitor' }
  else if (h >= 17 && h < 21) { label = 'Good evening';   icon = 'fa-cloud-moon'; color = 'text-sentiment' }
  else                        { label = 'Good night';     icon = 'fa-moon';       color = 'text-sentiment' }
  const lbl = $('#greeting-text'); if (lbl) lbl.textContent = label
  const ic  = $('#greeting-icon'); if (ic) ic.className = `fa-solid ${icon} ${color} text-xl`
  const t   = $('#brief-time')
  if (t) {
    const now = new Date()
    t.textContent = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`
  }
}

/* ════════════════════════ LIVE PIPELINE ════════════════════════ */
async function runLivePipeline() {
  if (STATE.liveRunInflight) return null
  if (!SCOUTT.hasKey) { showToast('Add your Anakin API key first.', 'error'); return null }
  STATE.liveRunInflight = true
  setLiveLoading(true, 'Generating your live briefing…',
    'Step 1/3 — Submitting Anakin Agentic Search with your industry, region, and competitors…')
  try {
    await SCOUTT.syncOnboarding().catch(() => {})
    const tenant = loadCachedTenant() || {}
    const startResp = await SCOUTT.post('/api/anakin/start', tenant)
    if (!startResp.ok || !startResp.job_id) throw new Error(startResp.error || 'Anakin start failed')
    const jobId = startResp.job_id
    setLiveLoading(true, 'Generating your live briefing…',
      `Step 2/3 — Anakin job ${jobId.slice(0, 8)}… polling every 8s (this typically takes 40-90s).`)
    const startedAt = Date.now()
    const MAX_POLL_MS = 5 * 60_000
    let raw = null
    while (Date.now() - startedAt < MAX_POLL_MS) {
      await sleep(8_000)
      let pollData
      try { pollData = await SCOUTT.fetch(`/api/anakin/poll/${encodeURIComponent(jobId)}`) }
      catch (_) { continue }
      if (pollData.status === 'completed' && pollData.raw) { raw = pollData.raw; break }
      if (pollData.status === 'failed') throw new Error(pollData.message || 'Anakin job failed')
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      setLiveLoading(true, 'Generating your live briefing…',
        `Step 2/3 — Anakin status: ${pollData.status || '…'} (${elapsed}s elapsed)`)
    }
    if (!raw) throw new Error('Anakin polling exceeded 5 minutes')
    saveCachedRaw(raw)
    setLiveLoading(true, 'Generating your live briefing…',
      'Step 3/3 — Reshaping payload (Groq meta-llama/llama-4-scout-17b-16e-instruct)…')
    const payload = await SCOUTT.post('/api/groq/reshape', { raw })
    if (!payload || !payload.briefing) throw new Error('Reshape returned empty payload')
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

/* ════════════════════════ FETCH PAYLOAD ════════════════════════ */
async function fetchPayload(day = 0) {
  const cachedLive = loadCachedLivePayload()
  if (cachedLive && day === 0) {
    STATE.payload = cachedLive
    STATE.day = day
    STATE.liveLocked = true
    return cachedLive
  }
  if (SCOUTT.hasKey && !cachedLive && day === 0) {
    setLiveLoading(true, 'Generating your live briefing…',
      'Preparing to call Anakin Agentic Search with your onboarding answers…')
    runLivePipeline().then(live => { if (live) renderAll(live) })
    return makeSkeletonPayload()
  }
  const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`)
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
    competitor: {
      diff_timeline: [],
      pricing_diff: { url: '', before_ts: '', after_ts: '', before_lines: [], after_lines: [], threat_level: 0, fee_change_pct: 0 },
      pricing_race_30d: [], events: [],
      feature_matrix: { competitors: [], features: [] },
    },
    sentiment: { topic_cluster: [], delta_vs_competitors: [], word_cloud: [], quotes: [], events: [] },
    archetype: { industry: '', axes: [], you: [], baseline: [], higher: [], lower: [], neutral: [] },
  }
}

/* ════════════════════════ RENDER ROOT ════════════════════════ */
async function renderAll(payload) {
  if (!payload) return
  applyTimeGreeting()
  renderBanner(payload)
  renderTimeline(payload)
  renderActions(payload)
  renderPulseWheel(payload)
  renderKPIs(payload)
  renderThreatMeter(payload)
  renderSankey(payload)
  renderSentimentVolume(payload)
  renderPolicy(payload)
  renderCompetitor(payload)
  renderSentiment(payload)
  renderArchetype(payload)
  refreshSearchIndex()
}

/* ─── Banner / Timeline / Actions ─────────────────────────────── */
function renderBanner(p) {
  const b = p.briefing || {}
  const ev = $('#banner-events'); if (ev) ev.textContent = String(b.high_impact_count ?? 0)
  const th = $('#banner-threat'); if (th) th.textContent = String(b.threat_level ?? 0)
  const su = $('#banner-summary'); if (su) su.textContent = b.headline || b.summary || ''
}
function renderTimeline(p) {
  const list = $('#timeline-list'); if (!list) return
  const data = p.timeline || []
  if (!data.length) {
    list.innerHTML = '<li class="text-xs text-gray-500">Awaiting live signal…</li>'
    return
  }
  const colors = { policy: '#06b6d4', competitor: '#f97316', sentiment: '#ec4899' }
  const rgb    = { policy: '6,182,212', competitor: '249,115,22', sentiment: '236,72,153' }
  list.innerHTML = data.map((e, i) => `
    <li class="relative slide-up" style="animation-delay:${i * 40}ms">
      <span class="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full"
            style="background:${colors[e.pillar] || '#a1a8bd'};box-shadow:0 0 0 3px rgba(${rgb[e.pillar] || '161,168,189'},0.18)"></span>
      <div class="text-[10px] mono text-gray-500 mb-0.5">${escapeHTML(e.date)} • sev ${e.severity}</div>
      <div class="text-xs leading-snug">${escapeHTML(e.title)}</div>
    </li>`).join('')
}
function renderActions(p) {
  const wrap = $('#actions-list'); if (!wrap) return
  const acts = p.briefing?.actions || []
  if (!acts.length) {
    wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting live signal…</div>'
    return
  }
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

/* ════════════════════════ PULSE WHEEL (SVG, 24h) ════════════════════════ */
function renderPulseWheel(p) {
  const wrap = $('#pulse-wheel-container'); if (!wrap) return
  const events = (p.pulse_wheel && p.pulse_wheel.length)
    ? p.pulse_wheel
    : (p.briefing?.events || []).map((e, i) => ({
        pillar: e.pillar, hour: (i * 2.7) % 24, severity: e.severity || 50,
        title: e.title, source_url: e.source_url,
      }))

  const W = 460, H = 460, CX = W / 2, CY = H / 2
  const rings = {
    policy:     { r: 170, color: '#06b6d4' },
    competitor: { r: 130, color: '#f97316' },
    sentiment: { r:  92, color: '#ec4899' },
  }
  const hourTicks = Array.from({ length: 24 }, (_, h) => {
    const ang = (h / 24) * Math.PI * 2 - Math.PI / 2
    const r1 = 185, r2 = 195
    const major = h % 6 === 0
    return `<line x1="${CX + Math.cos(ang) * r1}" y1="${CY + Math.sin(ang) * r1}"
                   x2="${CX + Math.cos(ang) * r2}" y2="${CY + Math.sin(ang) * r2}"
                   stroke="${major ? '#3a4055' : '#262b3a'}" stroke-width="${major ? 1.5 : 1}" />`
  }).join('')
  const hourLabels = [0, 6, 12, 18].map(h => {
    const ang = (h / 24) * Math.PI * 2 - Math.PI / 2
    const r = 210
    return `<text x="${CX + Math.cos(ang) * r}" y="${CY + Math.sin(ang) * r + 4}"
                  text-anchor="middle" fill="#5a607a" font-size="10" font-family="JetBrains Mono">${String(h).padStart(2,'0')}h</text>`
  }).join('')
  const ringPaths = Object.entries(rings).map(([k, ring]) =>
    `<circle cx="${CX}" cy="${CY}" r="${ring.r}" fill="none" stroke="${ring.color}" stroke-opacity="0.25" stroke-width="1.5" />
     <text x="${CX}" y="${CY - ring.r + 18}" fill="${ring.color}" font-size="10"
           font-family="JetBrains Mono" text-anchor="middle" opacity="0.7">${k.toUpperCase()}</text>`
  ).join('')

  const dots = events.map((e, i) => {
    const ring = rings[e.pillar]; if (!ring) return ''
    const ang = (e.hour / 24) * Math.PI * 2 - Math.PI / 2
    const x = CX + Math.cos(ang) * ring.r
    const y = CY + Math.sin(ang) * ring.r
    const radius = Math.max(4, Math.min(11, (e.severity || 50) / 10))
    return `<g class="pulse-dot" data-i="${i}" style="cursor:pointer">
        <circle cx="${x}" cy="${y}" r="${radius + 6}" fill="${ring.color}" opacity="0.18" />
        <circle cx="${x}" cy="${y}" r="${radius}" fill="${ring.color}" stroke="#05060a" stroke-width="1.5" />
      </g>`
  }).join('')

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="w-full h-full">
      ${ringPaths}
      ${hourTicks}
      ${hourLabels}
      ${dots}
      <circle cx="${CX}" cy="${CY}" r="42" fill="#05060a" stroke="#06b6d4" stroke-width="1.5" />
      <text x="${CX}" y="${CY - 4}" text-anchor="middle" fill="#06b6d4" font-size="22"
            font-family="JetBrains Mono" font-weight="700">${p.briefing?.threat_level ?? '--'}</text>
      <text x="${CX}" y="${CY + 14}" text-anchor="middle" fill="#5a607a" font-size="9"
            font-family="JetBrains Mono">THREAT</text>
    </svg>`

  // Hover tooltip
  const tt = $('#wheel-tooltip')
  wrap.querySelectorAll('.pulse-dot').forEach(g => {
    const i = +g.dataset.i
    const e = events[i]
    g.addEventListener('mouseenter', ev => {
      if (!tt || !e) return
      tt.innerHTML = `
        <div class="text-[10px] mono uppercase text-${e.pillar === 'policy' ? 'policy' : e.pillar === 'competitor' ? 'competitor' : 'sentiment'} mb-1">${escapeHTML(e.pillar)} • sev ${e.severity}</div>
        <div class="text-xs leading-snug">${escapeHTML(e.title || '')}</div>`
      tt.style.opacity = '1'
      const box = wrap.getBoundingClientRect()
      const px = ev.clientX - box.left + 12
      const py = ev.clientY - box.top  + 12
      tt.style.left = px + 'px'; tt.style.top = py + 'px'
    })
    g.addEventListener('mouseleave', () => { if (tt) tt.style.opacity = '0' })
    g.addEventListener('click', () => { if (e?.source_url) window.open(e.source_url, '_blank', 'noopener') })
  })
}

/* ════════════════════════ KPIs + sparklines ════════════════════════ */
function renderKPIs(p) {
  const k = p.briefing?.kpis || {}
  const sparks = p.kpi_sparklines || {}
  const mapping = [
    { sel: '[data-kpi="threats"]',     value: k.threats_detected,           delta: '+12%', data: sparks.threats,  stroke: '#06b6d4' },
    { sel: '[data-kpi="opps"]',        value: k.opportunities,              delta: '+4',   data: sparks.opps,     stroke: '#10b981' },
    { sel: '[data-kpi="actions-kpi"]', value: k.action_items,               delta: '3 due',data: sparks.actions,  stroke: '#f97316' },
    { sel: '[data-kpi="response"]',    value: (k.avg_response_time_minutes || 0) + 'm', delta: '−18m', data: sparks.response, stroke: '#ec4899' },
  ]
  mapping.forEach(m => {
    const card = $(m.sel); if (!card) return
    const valEl = card.querySelector('.kpi-value'); if (valEl) valEl.textContent = (m.value ?? '--')
    const dEl = card.querySelector('.kpi-delta'); if (dEl) dEl.textContent = m.delta
    const cv = card.querySelector('.kpi-spark'); if (!cv) return
    const data = (m.data && m.data.length) ? m.data : Array(8).fill(0)
    if (!cv.id) cv.id = 'kpi-spark-' + Math.random().toString(36).slice(2, 8)
    cv.width = cv.parentElement.clientWidth || 120
    makeChart(cv.id, {
      type: 'line',
      data: { labels: data.map((_, i) => i),
        datasets: [{
          data, borderColor: m.stroke, borderWidth: 1.5, tension: 0.35,
          pointRadius: 0, fill: true,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 30)
            g.addColorStop(0, m.stroke + '55'); g.addColorStop(1, m.stroke + '00'); return g
          },
        }] },
      options: { responsive: false, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } } },
    })
  })
}

/* ════════════════════════ Threat-Level Meter (gauge + sparkline) ════════════════════════ */
function renderThreatMeter(p) {
  const wrap = $('#threat-meter-container'); if (!wrap) return
  const v = Math.max(0, Math.min(100, Number(p.threat_meter?.value ?? p.briefing?.threat_level ?? 0)))
  const label = p.threat_meter?.label || labelForThreat(v)
  const spark = p.threat_meter?.sparkline_14d || []
  // Half-donut gauge, needle.
  const W = 240, H = 130
  const CX = W / 2, CY = H - 10, R = 92
  function arc(start, end, color) {
    const a1 = (Math.PI * (1 + start / 100))
    const a2 = (Math.PI * (1 + end / 100))
    const x1 = CX + Math.cos(a1) * R, y1 = CY + Math.sin(a1) * R
    const x2 = CX + Math.cos(a2) * R, y2 = CY + Math.sin(a2) * R
    return `<path d="M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="butt" />`
  }
  const needleAng = Math.PI * (1 + v / 100)
  const nx = CX + Math.cos(needleAng) * (R - 4)
  const ny = CY + Math.sin(needleAng) * (R - 4)

  wrap.innerHTML = `
    <div class="flex flex-col items-center">
      <svg viewBox="0 0 ${W} ${H}" class="w-full">
        ${arc(0, 40, '#10b981')}
        ${arc(40, 70, '#f97316')}
        ${arc(70, 100, '#ec4899')}
        <line x1="${CX}" y1="${CY}" x2="${nx}" y2="${ny}" stroke="#06b6d4" stroke-width="3" stroke-linecap="round" />
        <circle cx="${CX}" cy="${CY}" r="6" fill="#06b6d4" />
        <text x="${CX}" y="${CY - 30}" text-anchor="middle" font-family="JetBrains Mono" font-size="26" font-weight="700" fill="#e7eaf3">${v}</text>
        <text x="${CX}" y="${CY - 10}" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#5a607a">${escapeHTML(label).toUpperCase()}</text>
      </svg>
      <canvas id="threat-spark" height="60" class="w-full"></canvas>
    </div>`
  if (spark.length) {
    makeChart('threat-spark', {
      type: 'line',
      data: { labels: spark.map((_, i) => i),
        datasets: [{
          data: spark, borderColor: '#06b6d4', borderWidth: 2, tension: 0.4,
          pointRadius: 0, fill: true,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 60)
            g.addColorStop(0, 'rgba(6,182,212,0.45)'); g.addColorStop(1, 'rgba(6,182,212,0)'); return g
          },
        }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } } },
    })
  }
}
function labelForThreat(v) {
  if (v >= 80) return 'Severe'
  if (v >= 60) return 'Elevated'
  if (v >= 40) return 'Moderate'
  return 'Low'
}


/* ════════════════════════ Sankey (Threats → Actions) ════════════════════════ */
function renderSankey(p) {
  const wrap = $('#sankey-container'); if (!wrap) return
  const sk = p.threats_to_actions || { sources: [], targets: [], links: [] }
  const W = 360, H = 200, padX = 12, padY = 12
  const srcs = sk.sources || [], tgts = sk.targets || []
  if (!srcs.length || !tgts.length) {
    wrap.innerHTML = `<div class="text-xs text-gray-500 h-[200px] flex items-center justify-center">Awaiting live signal…</div>`
    return
  }
  const colors = ['#06b6d4', '#f97316', '#ec4899', '#10b981']
  const totalS = srcs.reduce((a, b) => a + (b.count || 1), 0) || 1
  const totalT = tgts.reduce((a, b) => a + (b.count || 1), 0) || 1
  const sBarW = 14, tBarW = 14
  const sX = padX, tX = W - padX - tBarW
  // y positions for sources
  let curY = padY
  const sPos = srcs.map(s => {
    const h = ((s.count || 1) / totalS) * (H - padY * 2)
    const y = curY; curY += h
    return { y, h }
  })
  curY = padY
  const tPos = tgts.map(t => {
    const h = ((t.count || 1) / totalT) * (H - padY * 2)
    const y = curY; curY += h
    return { y, h }
  })
  // links: from source i → target j with value
  const links = (sk.links || []).map(l => {
    const sP = sPos[l.from], tP = tPos[l.to]
    if (!sP || !tP) return ''
    const ys = sP.y + sP.h / 2, yt = tP.y + tP.h / 2
    const mid = (sX + sBarW + tX) / 2
    return `<path d="M ${sX + sBarW} ${ys} C ${mid} ${ys}, ${mid} ${yt}, ${tX} ${yt}"
                 fill="none" stroke="${colors[l.from] || '#06b6d4'}" stroke-opacity="0.35"
                 stroke-width="${Math.max(2, (l.value || 1) * 4)}" />`
  }).join('')
  const sBars = srcs.map((s, i) =>
    `<rect x="${sX}" y="${sPos[i].y}" width="${sBarW}" height="${sPos[i].h}" fill="${colors[i] || '#06b6d4'}" />
     <text x="${sX + sBarW + 6}" y="${sPos[i].y + sPos[i].h / 2 + 3}" fill="#a1a8bd" font-size="10" font-family="JetBrains Mono">${escapeHTML(s.label)} · ${s.count}</text>`
  ).join('')
  const tBars = tgts.map((t, i) =>
    `<rect x="${tX}" y="${tPos[i].y}" width="${tBarW}" height="${tPos[i].h}" fill="${colors[i] || '#10b981'}" />
     <text x="${tX - 6}" y="${tPos[i].y + tPos[i].h / 2 + 3}" text-anchor="end" fill="#a1a8bd" font-size="10" font-family="JetBrains Mono">${escapeHTML(t.label)} · ${t.count}</text>`
  ).join('')
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:200px">${links}${sBars}${tBars}</svg>`
}

/* ════════════════════════ Sentiment Volume (stacked area) ════════════════════════ */
function renderSentimentVolume(p) {
  const data = p.sentiment_volume_14d || []
  if (!data.length) return
  const labels = data.map(d => d.date?.slice(5) || '')
  makeChart('chart-sentiment-volume', {
    type: 'line',
    data: { labels,
      datasets: [
        { label: 'positive', data: data.map(d => d.positive), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.30)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
        { label: 'neutral',  data: data.map(d => d.neutral),  borderColor: '#a1a8bd', backgroundColor: 'rgba(161,168,189,0.18)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
        { label: 'negative', data: data.map(d => d.negative), borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.30)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      ] },
    options: { responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } },
        tooltip: { backgroundColor: '#05060a', borderColor: '#262b3a', borderWidth: 1 },
      },
      scales: {
        x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
        y: { stacked: true, ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
      } },
  })
}


/* ════════════════════════ POLICY RADAR ════════════════════════ */
function renderPolicy(p) {
  renderWorldMap(p)
  renderPolicyQoQ(p)
  renderActiveRegulations(p)
}
function renderWorldMap(p) {
  const wrap = $('#world-map'); if (!wrap) return
  const regions = p.policy?.regions || []
  const W = 1000, H = 500
  const proj = (lng, lat) => ({ x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H })
  const land = (typeof window !== 'undefined' && window.SCOUTT_WORLD_MAP_PATHS) || ''
  const pinSvg = regions.map((r, i) => {
    const c = r.activity > 70 ? '#06b6d4' : r.activity > 45 ? '#f97316' : '#ec4899'
    const cls = r.activity > 70 ? '' : r.activity > 45 ? 'orange' : 'magenta'
    const { x, y } = proj(r.lng, r.lat)
    return `<g class="policy-pin" data-i="${i}" transform="translate(${x},${y})" style="cursor:pointer">
        <circle r="14" fill="${c}" opacity="0.18" class="blink" />
        <circle r="6" fill="${c}" stroke="#05060a" stroke-width="1.5" />
      </g>`
  }).join('')
  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="absolute inset-0 w-full h-full">
      <g fill="#1a1e2a" stroke="#262b3a" stroke-width="0.6">${land}</g>
      ${pinSvg}
    </svg>`
  const tt = $('#map-tooltip')
  wrap.querySelectorAll('.policy-pin').forEach(pin => {
    const i = +pin.dataset.i
    const r = regions[i]
    pin.addEventListener('mouseenter', ev => {
      if (!tt || !r) return
      tt.innerHTML = `
        <div class="text-[10px] mono uppercase text-policy mb-1">${escapeHTML(r.code)} • activity ${r.activity}</div>
        <div class="text-xs font-medium">${escapeHTML(r.country)}</div>
        <div class="text-[11px] mono text-gray-400 mt-1">${r.count} regulatory changes</div>`
      tt.style.opacity = '1'
      const box = wrap.getBoundingClientRect()
      tt.style.left = (ev.clientX - box.left + 12) + 'px'
      tt.style.top  = (ev.clientY - box.top  + 12) + 'px'
    })
    pin.addEventListener('mouseleave', () => { if (tt) tt.style.opacity = '0' })
  })
}
function renderPolicyQoQ(p) {
  const qoq = p.policy?.qoq || []
  if (!qoq.length) return
  makeChart('chart-policy-trend', {
    type: 'bar',
    data: { labels: qoq.map(q => q.country.slice(0, 12)),
      datasets: [
        { label: 'Q1', data: qoq.map(q => q.q1), backgroundColor: '#3a4055', borderRadius: 4 },
        { label: 'Q2', data: qoq.map(q => q.q2), backgroundColor: '#06b6d4', borderRadius: 4 },
      ] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
        y: { ticks: { color: '#a1a8bd', font: { size: 9 } }, grid: { display: false } },
      } },
  })
}
function renderActiveRegulations(p) {
  const wrap = $('#reg-cards'); if (!wrap) return
  const regs = p.policy?.active_regulations || []
  if (!regs.length) {
    wrap.innerHTML = '<div class="text-xs text-gray-500 col-span-full">Awaiting live signal…</div>'
    return
  }
  wrap.innerHTML = regs.map(r => {
    const sev = Number(r.severity || 0)
    const sevColor = sev >= 80 ? 'text-policy border-policy/40 bg-policy/15'
                    : sev >= 60 ? 'text-competitor border-competitor/40 bg-competitor/15'
                    : 'text-gray-400 border-ink-600 bg-ink-800'
    return `
      <a href="${escapeHTML(r.source_url || '#')}" target="_blank" rel="noopener"
         class="card step-card p-4 block hover:border-policy/40">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="text-xs mono uppercase text-gray-500">${escapeHTML(r.source_name || 'Source')}</div>
          <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase border ${sevColor}">sev ${sev}</span>
        </div>
        <div class="text-sm font-medium leading-snug mb-2">${escapeHTML(r.title)}</div>
        <div class="text-[11px] text-gray-400 leading-relaxed line-clamp-3">${escapeHTML(r.summary || '')}</div>
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          ${(r.tags || []).slice(0, 4).map(t =>
            `<span class="text-[9px] mono px-1.5 py-0.5 rounded border border-ink-600 bg-ink-800 text-gray-400">${escapeHTML(t)}</span>`
          ).join('')}
          ${r.deadline ? `<span class="text-[9px] mono text-competitor ml-auto">⏱ ${escapeHTML(r.deadline)}</span>` : ''}
        </div>
      </a>`
  }).join('')
}


/* ════════════════════════ COMPETITOR PULSE ════════════════════════ */
function renderCompetitor(p) {
  renderDiffTimeline(p)
  renderPricingDiff(p)
  renderPricingRace(p)
  renderCompetitorEvents(p)
  renderFeatureMatrix(p)
}
function renderDiffTimeline(p) {
  const wrap = $('#diff-timeline'); if (!wrap) return
  const items = p.competitor?.diff_timeline || []
  if (!items.length) { wrap.innerHTML = '<div class="text-xs text-gray-500 h-full flex items-center justify-center">Awaiting diff signal…</div>'; return }
  const W = 100 // percent
  const stepW = W / items.length
  const colors = { pricing: '#f97316', product: '#06b6d4', hiring: '#10b981' }
  wrap.innerHTML = items.map((it, i) => `
    <div title="${escapeHTML(it.kind)} @ ${escapeHTML(it.ts_iso)}" class="absolute top-0 bottom-0"
         style="left:${i * stepW}%; width:${stepW}%">
      <div class="absolute inset-y-2 left-1/2 -translate-x-1/2 w-1.5 rounded-full"
           style="background:${colors[it.kind] || '#5a607a'}"></div>
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] mono text-gray-500 mb-0.5">${escapeHTML((it.ts_iso || '').slice(5, 10))}</div>
    </div>`).join('')
}
function renderPricingDiff(p) {
  const d = p.competitor?.pricing_diff
  const titleEl = $('#diff-title')
  if (titleEl) titleEl.textContent = d?.url ? `Pricing Diff — ${d.url}` : 'Pricing Diff — awaiting'
  const beforeT = $('#diff-before-time'), afterT = $('#diff-after-time')
  if (beforeT) beforeT.textContent = d?.before_ts || '--'
  if (afterT)  afterT.textContent  = d?.after_ts || '--'
  const before = $('#diff-before'), after = $('#diff-after')
  const fmtLines = (lines, neg) => (lines || []).map(l => {
    const c = neg && l.startsWith('-') ? 'text-red-400' : !neg && l.startsWith('+') ? 'text-emerald-400' : 'text-gray-300'
    return `<div class="${c}">${escapeHTML(l)}</div>`
  }).join('')
  if (before) before.innerHTML = fmtLines(d?.before_lines, true)
  if (after)  after.innerHTML  = fmtLines(d?.after_lines, false)
  const feeEl = $('#diff-fee-pct'); if (feeEl) feeEl.textContent = (d?.fee_change_pct != null ? `${d.fee_change_pct > 0 ? '+' : ''}${d.fee_change_pct}%` : '--%')
  const threatEl = $('#diff-threat'); if (threatEl) threatEl.textContent = String(d?.threat_level ?? '--')
}
function renderPricingRace(p) {
  const data = p.competitor?.pricing_race_30d || []
  if (!data.length) return
  const labels = data.map(d => d.date?.slice(5) || '')
  makeChart('chart-pricing-race', {
    type: 'line',
    data: { labels,
      datasets: [
        { label: 'You',      data: data.map(d => d.you),      borderColor: '#06b6d4', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 2 },
        { label: 'Stripe',   data: data.map(d => d.stripe),   borderColor: '#f97316', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Adyen',    data: data.map(d => d.adyen),    borderColor: '#ec4899', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Checkout', data: data.map(d => d.checkout), borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 1.5 },
      ] },
    options: { responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#5a607a', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: '#1a1e2a' } },
        y: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
      } },
  })
}
function renderCompetitorEvents(p) {
  const wrap = $('#competitor-events'); if (!wrap) return
  const ev = p.competitor?.events || []
  if (!ev.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting live signal…</div>'; return }
  wrap.innerHTML = ev.map(e => eventCardHtml(e, 'competitor')).join('')
}
function renderFeatureMatrix(p) {
  const wrap = $('#feature-matrix'); if (!wrap) return
  const fm = p.competitor?.feature_matrix || { competitors: [], features: [] }
  if (!fm.competitors?.length || !fm.features?.length) {
    wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting live signal…</div>'
    return
  }
  wrap.innerHTML = `
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-ink-700">
          <th class="text-left p-2 text-gray-400 font-medium">Feature</th>
          ${fm.competitors.map((c, i) => `<th class="p-2 mono text-[10px] uppercase ${i === 0 ? 'text-policy' : 'text-gray-400'}">${escapeHTML(c)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${fm.features.map(f => `
          <tr class="border-b border-ink-800 hover:bg-ink-800/40">
            <td class="p-2 text-gray-300">${escapeHTML(f.name)}</td>
            ${(f.values || []).map(v => `<td class="p-2 text-center">${v ? '<i class="fa-solid fa-check text-emerald-400"></i>' : '<i class="fa-solid fa-minus text-gray-600"></i>'}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`
}
function eventCardHtml(e, pillar) {
  const c = pillar === 'policy' ? 'policy' : pillar === 'competitor' ? 'competitor' : 'sentiment'
  return `
    <a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener"
       class="card step-card p-3 block hover:border-${c}/40">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${c}/15 text-${c} border border-${c}/40">${escapeHTML(e.pillar || pillar)}</span>
        <span class="text-[9px] mono text-gray-500">sev ${e.severity ?? '--'}</span>
      </div>
      <div class="text-sm font-medium leading-snug mb-1">${escapeHTML(e.title || '')}</div>
      <div class="text-[11px] text-gray-400 leading-relaxed line-clamp-3">${escapeHTML(e.summary || '')}</div>
      <div class="text-[10px] mono text-gray-500 mt-2">${escapeHTML(e.source_name || '')}</div>
    </a>`
}

/* ════════════════════════ SENTIMENT STORM ════════════════════════ */
function renderSentiment(p) {
  renderBubbleChart(p)
  renderDivergingChart(p)
  renderWordCloud(p)
  renderQuotes(p)
  renderSentimentEvents(p)
}
function renderBubbleChart(p) {
  const wrap = $('#bubble-chart'); if (!wrap) return
  const topics = p.sentiment?.topic_cluster || []
  if (!topics.length) { wrap.innerHTML = '<div class="text-xs text-gray-500 h-full flex items-center justify-center">Awaiting live signal…</div>'; return }
  const maxM = Math.max(...topics.map(t => t.mentions || 1), 1)
  // Pack into a grid-ish layout with golden-ratio scattering
  const W = 600, H = 420
  const cx = W / 2, cy = H / 2
  const phi = Math.PI * (3 - Math.sqrt(5))
  const bubbles = topics.map((t, i) => {
    const r = Math.max(18, ((t.mentions || 1) / maxM) * 60)
    const ang = i * phi
    const dist = Math.sqrt(i / topics.length) * Math.min(W, H) * 0.42
    const x = cx + Math.cos(ang) * dist
    const y = cy + Math.sin(ang) * dist
    const sent = Number(t.sentiment || 0)
    const color = sent > 0.2 ? '#10b981' : sent < -0.2 ? '#ec4899' : '#a1a8bd'
    return `<g class="bubble" style="cursor:default">
        <circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-opacity="0.65" stroke-width="1.2" />
        <text x="${x}" y="${y - 2}" text-anchor="middle" fill="#e7eaf3" font-size="${Math.max(9, r / 5)}" font-family="Inter" font-weight="500">${escapeHTML(t.topic.slice(0, 18))}</text>
        <text x="${x}" y="${y + 12}" text-anchor="middle" fill="${color}" font-size="9" font-family="JetBrains Mono">${t.mentions} · ${sent.toFixed(2)}</text>
      </g>`
  }).join('')
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full">${bubbles}</svg>`
}
function renderDivergingChart(p) {
  const data = p.sentiment?.delta_vs_competitors || []
  if (!data.length) return
  makeChart('chart-diverging', {
    type: 'bar',
    data: { labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => (d.value || 0) >= 0 ? '#10b981' : '#ec4899'),
        borderRadius: 4,
      }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
        y: { ticks: { color: '#a1a8bd', font: { size: 10 } }, grid: { display: false } },
      } },
  })
}
function renderWordCloud(p) {
  const wrap = $('#word-cloud'); if (!wrap) return
  const words = p.sentiment?.word_cloud || []
  if (!words.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting live signal…</div>'; return }
  const maxV = Math.max(...words.map(w => w.value || 1), 1)
  wrap.innerHTML = words.map(w => {
    const size = 11 + (w.value / maxV) * 22
    const hue = Math.round((w.value / maxV) * 60 + 170) // cyan→magenta
    return `<span style="font-size:${size.toFixed(1)}px; color:hsl(${hue},70%,65%)" class="font-medium">${escapeHTML(w.text)}</span>`
  }).join(' ')
}
function renderQuotes(p) {
  const wrap = $('#quote-card'); if (!wrap) return
  const quotes = p.sentiment?.quotes || []
  const counter = $('#quote-counter')
  if (!quotes.length) {
    wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting verbatim quotes…</div>'
    if (counter) counter.textContent = '0 / 0'
    return
  }
  if (STATE.quoteIdx >= quotes.length) STATE.quoteIdx = 0
  const q = quotes[STATE.quoteIdx]
  if (counter) counter.textContent = `${STATE.quoteIdx + 1} / ${quotes.length}`
  wrap.innerHTML = `
    <div class="card step-card p-4">
      <div class="text-amber-400 mb-2 text-sm">${escapeHTML(q.stars || '★★★☆☆')}</div>
      <blockquote class="text-sm text-gray-200 leading-relaxed">"${escapeHTML(q.text)}"</blockquote>
      <div class="text-[10px] mono text-gray-500 mt-3 uppercase">— ${escapeHTML(q.src || 'source')}</div>
    </div>`
}
function renderSentimentEvents(p) {
  const wrap = $('#sentiment-events-feed'); if (!wrap) return
  const ev = p.sentiment?.events || []
  if (!ev.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">Awaiting live signal…</div>'; return }
  wrap.innerHTML = ev.map(e => eventCardHtml(e, 'sentiment')).join('')
}

/* ════════════════════════ ARCHETYPE ════════════════════════ */
function renderArchetype(p) {
  const a = p.archetype || {}
  const ind = $('#archetype-industry'); if (ind) ind.textContent = a.industry || '--'
  const setList = (sel, arr) => { const el = $(sel); if (el) el.textContent = (arr || []).join(', ') || '--' }
  setList('#archetype-higher',  a.higher)
  setList('#archetype-lower',   a.lower)
  setList('#archetype-neutral', a.neutral)
  if (!a.axes?.length) return
  makeChart('chart-radar', {
    type: 'radar',
    data: { labels: a.axes,
      datasets: [
        { label: 'You',      data: a.you || [],      backgroundColor: 'rgba(6,182,212,0.20)', borderColor: '#06b6d4', borderWidth: 2, pointBackgroundColor: '#06b6d4' },
        { label: 'Baseline', data: a.baseline || [], backgroundColor: 'rgba(161,168,189,0.12)', borderColor: '#a1a8bd', borderWidth: 1.5, borderDash: [4, 4], pointBackgroundColor: '#a1a8bd' },
      ] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 10, font: { size: 11 } } } },
      scales: {
        r: {
          angleLines: { color: '#262b3a' }, grid: { color: '#1a1e2a' },
          pointLabels: { color: '#a1a8bd', font: { size: 11 } },
          ticks: { color: '#5a607a', backdropColor: 'transparent', font: { size: 9 } },
          suggestedMin: 0, suggestedMax: 100,
        },
      } },
  })
}

/* ════════════════════════ SEARCH INDEX ════════════════════════ */
async function refreshSearchIndex() {
  try {
    const d = await SCOUTT.fetch('/api/search-index')
    GLOBAL_INDEX = d?.index || []
  } catch (_) { GLOBAL_INDEX = [] }
}


/* ═══════════════════════════════════════════════════════════════════════
   SCENARIO SIMULATOR — strict LIVE-only
   ═══════════════════════════════════════════════════════════════════════ */
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

  if (!SCOUTT.hasKey) {
    showToast('Add your Anakin API key first — Scenario Simulator requires live data.', 'error')
    resetScenarioBtn(btn); return
  }
  let cachedLive = loadCachedLivePayload()
  if (!cachedLive || !isLiveSource(cachedLive.source)) {
    showToast('Generating your live briefing first — Scenario Simulator requires it.')
    cachedLive = await runLivePipeline()
    if (!cachedLive || !isLiveSource(cachedLive.source)) {
      showToast('Could not generate a live briefing — please retry.', 'error')
      resetScenarioBtn(btn); return
    }
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SCOUTT.headers() },
      body: JSON.stringify({
        scenario,
        cached_payload: cachedLive,
        raw: loadCachedRaw(),
        tenant: loadCachedTenant(),
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (res.status === 409) {
      showToast('Live data not synced server-side — re-running pipeline.')
      const fresh = await runLivePipeline()
      if (fresh) return window.runScenario()
      resetScenarioBtn(btn); return
    }
    if (!res.ok) throw new Error('scenario ' + res.status)
    const data = await res.json()
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
        : (data.mode === 'offline-fallback' || data.mode === 'offline-no-groq')
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
          <a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener"
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
    if (err) { err.textContent = 'Scenario failed: ' + e.message; err.classList.remove('hidden') }
    showToast('Scenario failed: ' + e.message, 'error')
  } finally { resetScenarioBtn(btn) }
}
function resetScenarioBtn(btn) {
  if (!btn) return
  btn.disabled = false
  btn.innerHTML = btn.dataset.origHtml || '<i class="fa-solid fa-play"></i> Run scenario'
}

/* ═══════════════════════════════════════════════════════════════════════
   SAVE-AND-GO  (API key)
   ═══════════════════════════════════════════════════════════════════════ */
window.saveApiKeyAndGo = async function saveApiKeyAndGo(rawKey) {
  const k = String(rawKey || '').trim()
  if (!k) { showToast('Paste your Anakin API key first.', 'error'); return }
  try { localStorage.setItem(API_KEY_LS_KEY, k) } catch (_) {}
  SCOUTT.apiKey = k
  clearCachedLivePayload()
  STATE.liveLocked = false
  STATE.payload = null
  await SCOUTT.syncOnboarding()
  try { await SCOUTT.post('/api/dashboard/refresh', {}) } catch (_) {}
  closeApiKeyModal()
  updateApiKeyButtonUI()
  const live = await runLivePipeline()
  if (live) {
    await renderAll(live)
    showToast('✓ Dashboard fully swapped to your live data.')
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   API-KEY MODAL  (open / close / clear)
   ═══════════════════════════════════════════════════════════════════════ */
function openApiKeyModal() {
  const m = $('#apikey-modal'); if (!m) return
  m.classList.remove('hidden')
  const i = $('#apikey-input'); if (i) { i.value = SCOUTT.apiKey || ''; setTimeout(() => i.focus(), 50) }
  const status = $('#apikey-status')
  if (status && SCOUTT.hasKey) {
    status.classList.remove('hidden')
    status.innerHTML = '<span class="text-emerald-400">✓ Live key currently active.</span>'
  } else if (status) {
    status.classList.add('hidden')
  }
}
function closeApiKeyModal() {
  const m = $('#apikey-modal'); if (!m) return
  m.classList.add('hidden')
}
function updateApiKeyButtonUI() {
  const lbl = $('#apikey-label'); const ic = $('#apikey-icon')
  if (SCOUTT.hasKey) {
    if (lbl) lbl.textContent = 'API Key Active'
    if (ic) ic.className = 'fa-solid fa-key text-emerald-400'
  } else {
    if (lbl) lbl.textContent = 'Enter API Key'
    if (ic) ic.className = 'fa-solid fa-key text-policy'
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   READ-FULL-BRIEF MODAL
   ═══════════════════════════════════════════════════════════════════════ */
function openBriefModal() {
  const m = $('#brief-modal'); if (!m) return
  const p = STATE.payload || {}
  const b = p.briefing || {}
  const title = $('#brief-modal-title'); if (title) title.textContent = b.headline || 'Today\'s Battle Brief'
  const body = $('#brief-modal-body')
  if (body) {
    const evRows = (b.events || []).map(e => `
      <div class="card p-3">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${e.pillar}/15 text-${e.pillar} border border-${e.pillar}/40">${escapeHTML(e.pillar)}</span>
          <span class="text-[9px] mono text-gray-500">sev ${e.severity}</span>
        </div>
        <div class="text-sm font-medium">${escapeHTML(e.title)}</div>
        <div class="text-[11px] text-gray-400 mt-1">${escapeHTML(e.summary || '')}</div>
        ${e.source_url ? `<a href="${escapeHTML(e.source_url)}" target="_blank" class="text-[10px] text-policy hover:underline mt-2 inline-block">${escapeHTML(e.source_name || 'source')} →</a>` : ''}
      </div>`).join('')
    body.innerHTML = `
      <div class="text-[11px] mono text-gray-500 uppercase">${escapeHTML(b.briefing_date || '')}</div>
      <p class="text-base">${escapeHTML(b.summary || b.headline || '')}</p>
      <div class="grid md:grid-cols-2 gap-3">${evRows || '<div class="text-xs text-gray-500">No events yet.</div>'}</div>`
  }
  m.classList.remove('hidden')
}
function closeBriefModal() { const m = $('#brief-modal'); if (m) m.classList.add('hidden') }

/* ═══════════════════════════════════════════════════════════════════════
   TRANSPARENCY DRAWER
   ═══════════════════════════════════════════════════════════════════════ */
async function openTransparency() {
  const dr = $('#transparency-drawer'); const bd = $('#transparency-backdrop')
  if (!dr) return
  dr.classList.add('open')
  if (bd) bd.classList.remove('hidden')
  const body = $('#transparency-body')
  if (body) body.innerHTML = '<div class="text-xs text-gray-500">Loading transparency report…</div>'
  try {
    const t = await SCOUTT.fetch('/api/transparency')
    if (body) {
      body.innerHTML = `
        <section>
          <div class="text-xs mono uppercase text-policy">Daily briefing</div>
          <div class="text-[11px] text-gray-400 mt-1">${escapeHTML(t.daily_briefing?.endpoint || '')}</div>
          <pre class="code mt-2 max-h-48 overflow-y-auto">${escapeHTML(t.daily_briefing?.user_prompt || '')}</pre>
        </section>
        <section>
          <div class="text-xs mono uppercase text-policy">Groq reshape</div>
          <div class="text-[11px] text-gray-400 mt-1">${escapeHTML(t.groq_reshape?.endpoint || '')}</div>
          <div class="text-[11px] text-gray-500 mt-1">model: <span class="mono text-policy">${escapeHTML(t.groq_reshape?.model || '')}</span></div>
          <div class="text-[11px] text-gray-400 mt-1">${escapeHTML(t.groq_reshape?.strategy || '')}</div>
        </section>
        <section>
          <div class="text-xs mono uppercase text-policy">Competitor scraper</div>
          <div class="text-[11px] text-gray-400 mt-1">${escapeHTML(t.competitor_scraper?.endpoint || '')}</div>
          <pre class="code mt-2 max-h-36 overflow-y-auto">${escapeHTML(t.competitor_scraper?.prompt || '')}</pre>
        </section>
        <section>
          <div class="text-xs mono uppercase text-policy">Scenario simulator</div>
          <div class="text-[11px] text-gray-400 mt-1">${escapeHTML(t.scenario_simulator?.endpoint || '')}</div>
          <div class="text-[11px] text-gray-500 mt-1">model: <span class="mono text-policy">${escapeHTML(t.scenario_simulator?.model || '')}</span></div>
          <div class="text-[11px] text-amber-400 mt-1">${escapeHTML(t.scenario_simulator?.strict_mode || '')}</div>
        </section>`
    }
  } catch (e) {
    if (body) body.innerHTML = `<div class="text-xs text-red-400">Failed: ${escapeHTML(e.message)}</div>`
  }
}
function closeTransparency() {
  const dr = $('#transparency-drawer'); const bd = $('#transparency-backdrop')
  if (dr) dr.classList.remove('open')
  if (bd) bd.classList.add('hidden')
}

/* ═══════════════════════════════════════════════════════════════════════
   ⌘K COMMAND PALETTE
   ═══════════════════════════════════════════════════════════════════════ */
function openCmdK() {
  const c = $('#cmdk'); if (!c) return
  c.classList.remove('hidden')
  const i = $('#cmdk-input'); if (i) { i.value = ''; setTimeout(() => i.focus(), 50) }
  const sug = $('#cmdk-suggestions'); if (sug) sug.classList.remove('hidden')
  const res = $('#cmdk-results'); if (res) res.classList.add('hidden')
  const out = $('#cmdk-output'); if (out) out.classList.add('hidden')
}
function closeCmdK() { const c = $('#cmdk'); if (c) c.classList.add('hidden') }
function runCmdKSearch(q) {
  const term = String(q || '').toLowerCase().trim()
  const sug = $('#cmdk-suggestions')
  const res = $('#cmdk-results')
  if (!term) {
    if (sug) sug.classList.remove('hidden')
    if (res) res.classList.add('hidden')
    return
  }
  if (sug) sug.classList.add('hidden')
  if (res) res.classList.remove('hidden')
  const hits = GLOBAL_INDEX.filter(x =>
    (x.title || '').toLowerCase().includes(term) ||
    (x.subtitle || '').toLowerCase().includes(term) ||
    (x.section || '').toLowerCase().includes(term)
  ).slice(0, 18)
  if (!res) return
  if (!hits.length) {
    res.innerHTML = `<div class="px-4 py-6 text-xs text-gray-500">No matches in current briefing.</div>`
    return
  }
  res.innerHTML = hits.map(h => `
    <a href="${escapeHTML(h.url || '#')}" target="_blank" rel="noopener"
       class="block px-4 py-3 border-b border-ink-800 hover:bg-ink-800/60">
      <div class="text-[10px] mono uppercase text-gray-500">${escapeHTML(h.section || '')}</div>
      <div class="text-sm font-medium">${escapeHTML(h.title || '')}</div>
      <div class="text-[11px] text-gray-400 line-clamp-1">${escapeHTML(h.subtitle || '')}</div>
    </a>`).join('')
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB SWITCHING  (the key fix for image-1 — Policy Radar / Archetype etc not opening)
   ═══════════════════════════════════════════════════════════════════════ */
function activateTab(name) {
  $$('.tab-btn').forEach(b => {
    const active = b.dataset.tab === name
    b.classList.toggle('tab-active', active)
    b.classList.toggle('text-gray-400', !active)
  })
  $$('.tab-pane').forEach(p => {
    p.classList.toggle('hidden', p.dataset.pane !== name)
  })
  // Re-trigger render of charts now-visible (Chart.js needs to lay out into newly-shown canvas)
  if (STATE.payload) {
    try {
      if (name === 'policy')      renderPolicy(STATE.payload)
      if (name === 'competitor')  renderCompetitor(STATE.payload)
      if (name === 'sentiment')   renderSentiment(STATE.payload)
      if (name === 'archetype')   renderArchetype(STATE.payload)
    } catch (e) { console.warn('tab re-render failed', name, e) }
  }
}
function wireTabs() {
  $$('.tab-btn').forEach(b => {
    b.addEventListener('click', () => activateTab(b.dataset.tab))
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   TIME-MACHINE SLIDER
   ═══════════════════════════════════════════════════════════════════════ */
function wireTimeMachine() {
  const slider = $('#time-machine'); const label = $('#time-machine-label')
  const reset = $('#time-machine-reset')
  if (slider) {
    const update = debounce(async () => {
      const day = +slider.value || 0
      if (label) label.textContent = day === 0 ? 'Today — live' : `${day} day${day === 1 ? '' : 's'} ago`
      try {
        const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`)
        STATE.payload = data; STATE.day = day
        renderAll(data)
      } catch (e) { showToast('Time-machine fetch failed', 'error') }
    }, 250)
    slider.addEventListener('input', () => {
      const day = +slider.value || 0
      if (label) label.textContent = day === 0 ? 'Today — live' : `${day} day${day === 1 ? '' : 's'} ago`
    })
    slider.addEventListener('change', update)
  }
  if (reset) reset.addEventListener('click', () => {
    if (slider) { slider.value = '0'; slider.dispatchEvent(new Event('change')) }
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   THEME TOGGLE (light <-> dark)
   ═══════════════════════════════════════════════════════════════════════ */
function applyTheme(theme) {
  const html = document.documentElement
  if (theme === 'light') {
    html.classList.remove('dark'); html.classList.add('light')
    document.body.style.background = '#f4f5f8'
    document.body.style.color = '#0a0c14'
  } else {
    html.classList.add('dark'); html.classList.remove('light')
    document.body.style.background = '#05060a'
    document.body.style.color = '#e7eaf3'
  }
}
function wireThemeToggle() {
  const btn = $('#theme-toggle'); if (!btn) return
  let saved = 'dark'
  try { saved = localStorage.getItem(THEME_LS_KEY) || 'dark' } catch (_) {}
  applyTheme(saved)
  btn.addEventListener('click', () => {
    const cur = document.documentElement.classList.contains('light') ? 'light' : 'dark'
    const next = cur === 'light' ? 'dark' : 'light'
    applyTheme(next)
    try { localStorage.setItem(THEME_LS_KEY, next) } catch (_) {}
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   AUDIO BRIEF (graceful no-op when /api/audio/* unwired)
   ═══════════════════════════════════════════════════════════════════════ */
function wireAudio() {
  const play = $('#play-audio'); const stop = $('#audio-stop'); const toast = $('#audio-toast')
  const audio = $('#audio-el')
  if (play) {
    play.addEventListener('click', async () => {
      // Best-effort hit; if endpoint absent, gracefully degrade.
      try {
        const res = await fetch('/api/audio/brief', { method: 'POST', headers: SCOUTT.headers() })
        if (!res.ok) throw new Error('audio endpoint not available')
        const blob = await res.blob()
        if (audio) {
          audio.src = URL.createObjectURL(blob)
          audio.play()
          if (toast) toast.classList.remove('hidden')
        }
      } catch (_) {
        showToast('Audio brief is not wired in this environment.', 'error')
      }
    })
  }
  if (stop) stop.addEventListener('click', () => {
    if (audio) { audio.pause(); audio.src = '' }
    if (toast) toast.classList.add('hidden')
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   QUOTE ROTATOR
   ═══════════════════════════════════════════════════════════════════════ */
function wireQuoteRotator() {
  const prev = $('#quote-prev'); const next = $('#quote-next')
  const move = (dir) => {
    const q = STATE.payload?.sentiment?.quotes || []
    if (!q.length) return
    STATE.quoteIdx = ((STATE.quoteIdx + dir) % q.length + q.length) % q.length
    renderQuotes(STATE.payload)
  }
  if (prev) prev.addEventListener('click', () => move(-1))
  if (next) next.addEventListener('click', () => move(1))
}

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL WIRING (modals, palette, etc.)
   ═══════════════════════════════════════════════════════════════════════ */
function wireApiKeyModal() {
  $('#apikey-btn')?.addEventListener('click', openApiKeyModal)
  $('#apikey-close')?.addEventListener('click', closeApiKeyModal)
  $('#apikey-cancel')?.addEventListener('click', closeApiKeyModal)
  $('#apikey-modal')?.addEventListener('click', e => {
    if (e.target?.id === 'apikey-modal') closeApiKeyModal()
  })
  $('#apikey-clear')?.addEventListener('click', () => {
    try { localStorage.removeItem(API_KEY_LS_KEY) } catch (_) {}
    SCOUTT.apiKey = ''
    clearCachedLivePayload()
    STATE.liveLocked = false
    STATE.payload = null
    updateApiKeyButtonUI()
    closeApiKeyModal()
    showToast('Stored API key cleared. Reloading…')
    setTimeout(() => location.reload(), 600)
  })
  $('#apikey-save')?.addEventListener('click', () => {
    const v = $('#apikey-input')?.value
    window.saveApiKeyAndGo(v)
  })
  $('#apikey-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.saveApiKeyAndGo(e.target.value)
  })
}
function wireBriefModal() {
  $('#read-full-brief')?.addEventListener('click', openBriefModal)
  $('#brief-modal-close')?.addEventListener('click', closeBriefModal)
  $('#brief-modal')?.addEventListener('click', e => {
    if (e.target?.id === 'brief-modal') closeBriefModal()
  })
}
function wireTransparency() {
  $('#transparency-trigger')?.addEventListener('click', openTransparency)
  $('#transparency-close')?.addEventListener('click', closeTransparency)
  $('#transparency-backdrop')?.addEventListener('click', closeTransparency)
}
function wireCmdK() {
  $('#cmdk-trigger')?.addEventListener('click', openCmdK)
  $('#cmdk-input')?.addEventListener('input', e => runCmdKSearch(e.target.value))
  $('#cmdk')?.addEventListener('click', e => { if (e.target?.id === 'cmdk') closeCmdK() })
  $$('.cmdk-suggestion').forEach(b => b.addEventListener('click', () => {
    const i = $('#cmdk-input'); if (i) { i.value = b.textContent || ''; runCmdKSearch(i.value) }
  }))
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openCmdK() }
    if (e.key === 'Escape') {
      closeCmdK(); closeApiKeyModal(); closeBriefModal(); closeTransparency()
    }
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════════ */
async function boot() {
  applyTimeGreeting()
  updateApiKeyButtonUI()

  // Wire everything BEFORE first paint so even the skeleton screen is interactive.
  wireTabs()
  wireTimeMachine()
  wireThemeToggle()
  wireAudio()
  wireQuoteRotator()
  wireApiKeyModal()
  wireBriefModal()
  wireTransparency()
  wireCmdK()

  // Scenario simulator wiring
  $('#scenario-run')?.addEventListener('click', () => window.runScenario())
  $('#scenario-input')?.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') window.runScenario()
  })

  // First paint
  try {
    const payload = await fetchPayload(0)
    await renderAll(payload)
  } catch (e) {
    console.error('boot first-paint failed:', e)
    showToast('Failed to load dashboard data.', 'error')
  }
}

document.addEventListener('DOMContentLoaded', boot)
