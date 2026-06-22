/* SCOUTT dashboard.js v8 — bulletproof boot, isolated renderers, demo+live both work */
'use strict'

const $  = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

const LIVE_PAYLOAD_LS_KEY = 'scoutt_live_payload_v6'
const LIVE_RAW_LS_KEY     = 'scoutt_live_raw_v6'
const ONBOARDING_LS_KEY   = 'scoutt_onboarding'
const API_KEY_LS_KEY      = 'scoutt_anakin_key'
const THEME_LS_KEY        = 'scoutt_theme'

const LOG = (...a) => { try { console.log('[SCOUTT]', ...a) } catch (_) {} }
const WARN = (...a) => { try { console.warn('[SCOUTT]', ...a) } catch (_) {} }
const ERR = (...a) => { try { console.error('[SCOUTT]', ...a) } catch (_) {} }

function safe(label, fn) {
  try { return fn() } catch (e) { ERR(label + ' failed:', e); return null }
}
async function safeAsync(label, fn) {
  try { return await fn() } catch (e) { ERR(label + ' failed:', e); return null }
}

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
  try { localStorage.setItem(LIVE_PAYLOAD_LS_KEY, JSON.stringify(p)) } catch (e) { WARN('payload persist', e) }
}
function loadCachedRaw() {
  try {
    const r = localStorage.getItem(LIVE_RAW_LS_KEY); if (!r) return null
    const j = JSON.parse(r); return (j && typeof j === 'object') ? j : null
  } catch (_) { return null }
}
function saveCachedRaw(raw) {
  try { localStorage.setItem(LIVE_RAW_LS_KEY, JSON.stringify(raw || {})) } catch (e) { WARN('raw persist', e) }
}
function loadCachedTenant() {
  try {
    const s = localStorage.getItem(ONBOARDING_LS_KEY); if (!s) return null
    const t = JSON.parse(s); if (!t) return null
    return {
      industry: t.industry || 'B2B SaaS Fintech',
      region:   t.region   || 'US',
      competitor_domains: t.competitors || t.competitor_domains || [],
      pillars_enabled:    t.pillars     || t.pillars_enabled    || [],
    }
  } catch (_) { return null }
}
function clearCachedLivePayload() {
  try { localStorage.removeItem(LIVE_PAYLOAD_LS_KEY); localStorage.removeItem(LIVE_RAW_LS_KEY) } catch (_) {}
}
function encodeHeaderB64(obj) {
  try {
    const s = JSON.stringify(obj)
    const b64 = btoa(unescape(encodeURIComponent(s)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (_) { return '' }
}

const SCOUTT = {
  apiKey: '',
  init() { try { this.apiKey = localStorage.getItem(API_KEY_LS_KEY) || '' } catch (_) { this.apiKey = '' } },
  get hasKey() { return !!this.apiKey },
  headers() {
    const h = this.apiKey ? { 'X-Anakin-Key': this.apiKey } : {}
    const tenant = loadCachedTenant()
    if (tenant) { const enc = encodeHeaderB64(tenant); if (enc && enc.length < 8000) h['X-Scoutt-Tenant'] = enc }
    const rawCached = loadCachedRaw()
    if (rawCached && Object.keys(rawCached).length) { const enc = encodeHeaderB64(rawCached); if (enc && enc.length < 28000) h['X-Scoutt-Raw'] = enc }
    const live = loadCachedLivePayload()
    if (live) {
      const compact = { ...live, briefing: { ...live.briefing, events: (live.briefing.events || []).slice(0, 12) } }
      const enc = encodeHeaderB64(compact); if (enc && enc.length < 28000) h['X-Scoutt-Cache'] = enc
    }
    return h
  },
  async fetch(url, opts = {}) {
    const ctrl = new AbortController()
    const tm = setTimeout(() => ctrl.abort(), opts.timeoutMs || 15000)
    let res
    try {
      res = await fetch(url, {
        ...opts,
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', ...this.headers(), ...(opts.headers || {}) },
      })
    } finally { clearTimeout(tm) }
    if (!res.ok) {
      let body = ''; try { body = await res.text() } catch (_) {}
      const err = new Error(`${url} → ${res.status}${body ? ' · ' + body.slice(0, 200) : ''}`)
      err.status = res.status; err.body = body
      try { err.json = JSON.parse(body) } catch (_) {}
      throw err
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  },
  async post(url, body, opts = {}) {
    return this.fetch(url, { ...opts, method: 'POST', body: JSON.stringify(body || {}) })
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
    catch (e) { WARN('onboarding sync failed:', e?.message); return null }
  },
}
SCOUTT.init()

const STATE = {
  payload: null,
  day: 0,
  quoteIdx: 0,
  charts: {},
  liveRunInflight: false,
  liveLocked: false,
}
let GLOBAL_INDEX = []

function isLiveSource(src) { return src === 'anakin-live' || src === 'anakin-direct' }
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

function makeChart(canvasId, config) {
  const c = document.getElementById(canvasId)
  if (!c || typeof Chart === 'undefined') return null
  if (STATE.charts[canvasId]) { try { STATE.charts[canvasId].destroy() } catch (_) {} }
  try { STATE.charts[canvasId] = new Chart(c.getContext('2d'), config); return STATE.charts[canvasId] }
  catch (e) { WARN('chart create failed', canvasId, e); return null }
}

function applyTimeGreeting() {
  const now = new Date()
  const h = now.getUTCHours()
  const greet = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const icon  = h < 5 ? 'fa-moon' : h < 12 ? 'fa-sun' : h < 17 ? 'fa-cloud-sun' : 'fa-cloud-moon'
  const gt = $('#greeting-text'); if (gt) gt.textContent = greet
  const gi = $('#greeting-icon'); if (gi) gi.className = `fa-solid ${icon} text-policy text-xl`
  const bt = $('#brief-time')
  if (bt) bt.textContent = `${String(h).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')} UTC`
}

async function runLivePipeline() {
  if (STATE.liveRunInflight) return null
  if (!SCOUTT.hasKey) { showToast('Add your Anakin API key first.', 'error'); return null }
  STATE.liveRunInflight = true
  setLiveLoading(true, 'Generating your live briefing…',
    'Step 1/3 — Submitting Anakin Agentic Search…')
  try {
    await SCOUTT.syncOnboarding().catch(() => {})
    const tenant = loadCachedTenant() || {}
    const startResp = await SCOUTT.post('/api/anakin/start', tenant, { timeoutMs: 25000 })
    if (!startResp.ok || !startResp.job_id) throw new Error(startResp.error || 'Anakin start failed')
    const jobId = startResp.job_id
    setLiveLoading(true, 'Generating your live briefing…',
      `Step 2/3 — Anakin job ${jobId.slice(0, 8)}… polling every 8s.`)
    const startedAt = Date.now()
    const MAX_POLL_MS = 5 * 60_000
    let raw = null
    while (Date.now() - startedAt < MAX_POLL_MS) {
      await sleep(8_000)
      let pollData
      try { pollData = await SCOUTT.fetch(`/api/anakin/poll/${encodeURIComponent(jobId)}`, { timeoutMs: 15000 }) }
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
      'Step 3/3 — Reshaping payload via Groq…')
    const payload = await SCOUTT.post('/api/groq/reshape', { raw }, { timeoutMs: 45000 })
    if (!payload || !payload.briefing) throw new Error('Reshape returned empty payload')
    if (!isLiveSource(payload.source)) {
      WARN('Unexpected non-live source from reshape:', payload.source)
      payload.source = 'anakin-direct'
    }
    STATE.liveLocked = true
    saveCachedLivePayload(payload)
    STATE.payload = payload
    showToast(payload.source === 'anakin-live' ? '✓ Live briefing generated.' : '✓ Live briefing rendered (direct mapper).')
    await safeAsync('renderAll(live)', () => renderAll(payload))
    return payload
  } catch (e) {
    ERR('Live pipeline failed:', e)
    showToast('Live pipeline failed: ' + e.message, 'error')
    return null
  } finally {
    STATE.liveRunInflight = false
    setLiveLoading(false)
  }
}

async function fetchPayload(day = 0) {
  const cachedLive = loadCachedLivePayload()
  if (cachedLive && day === 0) {
    LOG('Using cached live payload')
    STATE.payload = cachedLive; STATE.day = day; STATE.liveLocked = true
    return cachedLive
  }
  if (SCOUTT.hasKey && !cachedLive && day === 0) {
    setLiveLoading(true, 'Generating your live briefing…',
      'Preparing Anakin Agentic Search…')
    runLivePipeline().then(live => { if (live) safeAsync('renderAll(live-bg)', () => renderAll(live)) })
  }
  // Always also fetch /api/dashboard so we have SOMETHING to render immediately
  try {
    const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`, { timeoutMs: 12000 })
    if (STATE.liveLocked && !isLiveSource(data.source) && STATE.payload && isLiveSource(STATE.payload.source)) {
      return STATE.payload
    }
    STATE.payload = data; STATE.day = day
    if (isLiveSource(data.source)) { STATE.liveLocked = true; saveCachedLivePayload(data) }
    return data
  } catch (e) {
    WARN('fetchPayload /api/dashboard failed:', e?.message)
    return makeSkeletonPayload()
  }
}

function makeSkeletonPayload() {
  return {
    source: 'skeleton',
    generated_at_iso: new Date().toISOString(),
    briefing: {
      briefing_date: new Date().toISOString().slice(0, 10),
      headline: 'Loading your briefing…',
      summary: 'Fetching live policy, competitor, and sentiment signals…',
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

async function renderAll(payload) {
  if (!payload) return
  LOG('renderAll start, source=', payload.source)
  safe('applyTimeGreeting',     () => applyTimeGreeting())
  safe('renderBanner',          () => renderBanner(payload))
  safe('renderTimeline',        () => renderTimeline(payload))
  safe('renderActions',         () => renderActions(payload))
  safe('renderPulseWheel',      () => renderPulseWheel(payload))
  safe('renderKPIs',            () => renderKPIs(payload))
  safe('renderThreatMeter',     () => renderThreatMeter(payload))
  safe('renderSankey',          () => renderSankey(payload))
  safe('renderSentimentVolume', () => renderSentimentVolume(payload))
  safe('renderPolicy',          () => renderPolicy(payload))
  safe('renderCompetitor',      () => renderCompetitor(payload))
  safe('renderSentiment',       () => renderSentiment(payload))
  safe('renderArchetype',       () => renderArchetype(payload))
  await safeAsync('refreshSearchIndex', () => refreshSearchIndex())
  LOG('renderAll done')
}

function renderBanner(p) {
  const b = p.briefing || {}
  const ev = $('#banner-events'); if (ev) ev.textContent = b.high_impact_count ?? (b.events?.length || 0)
  const th = $('#banner-threat'); if (th) th.textContent = b.threat_level ?? 0
  const sm = $('#banner-summary'); if (sm) sm.textContent = b.headline || b.summary || ''
}

function renderTimeline(p) {
  const list = $('#timeline-list'); if (!list) return
  const items = p.timeline || []
  if (!items.length) { list.innerHTML = '<li class="text-xs text-gray-500">No events.</li>'; return }
  list.innerHTML = items.slice(0, 10).map(it => {
    const c = it.pillar === 'policy' ? 'policy' : it.pillar === 'competitor' ? 'competitor' : 'sentiment'
    return `<li class="relative">
      <span class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-${c}"></span>
      <div class="text-[10px] mono text-gray-500">${escapeHTML(it.date || '')} • sev ${it.severity ?? '--'}</div>
      <div class="text-xs leading-snug">${escapeHTML(it.title || '')}</div>
    </li>`
  }).join('')
}

function renderActions(p) {
  const wrap = $('#actions-list'); if (!wrap) return
  const acts = (p.briefing?.actions || []).slice(0, 3)
  if (!acts.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No actions yet.</div>'; return }
  wrap.innerHTML = acts.map((a, i) => {
    const impactColor = a.impact === 'high' ? 'text-policy bg-policy/15 border-policy/40'
                      : a.impact === 'medium' ? 'text-competitor bg-competitor/15 border-competitor/40'
                      : 'text-gray-400 bg-ink-800 border-ink-600'
    return `<label class="card step-card p-3 block cursor-pointer">
      <div class="flex items-start gap-2">
        <input type="checkbox" class="mt-1" />
        <div class="flex-1">
          <div class="text-sm font-medium">${escapeHTML(a.title || 'Action ' + (i+1))}</div>
          <div class="text-[11px] text-gray-400 mt-0.5">${escapeHTML(a.description || '')}</div>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase border ${impactColor}">${escapeHTML(a.impact || 'low')} impact</span>
            <button type="button" data-act-email="${i}" class="text-[10px] text-policy hover:underline"><i class="fa-solid fa-envelope"></i> Email</button>
            <button type="button" data-act-slack="${i}" class="text-[10px] text-policy hover:underline"><i class="fa-brands fa-slack"></i> Slack</button>
          </div>
        </div>
      </div>
    </label>`
  }).join('')
  wrap.querySelectorAll('[data-act-email]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); showDraftModal({ kind: 'email', action: acts[+b.dataset.actEmail] })
  }))
  wrap.querySelectorAll('[data-act-slack]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); showDraftModal({ kind: 'slack', action: acts[+b.dataset.actSlack] })
  }))
}

function showDraftModal({ kind, action }) {
  const body = `${kind === 'email' ? 'Email' : 'Slack'} draft for: ${action?.title || ''}\n\n${action?.description || ''}`
  showToast(`${kind === 'email' ? '✉️ Email' : '💬 Slack'} draft copied to clipboard.`)
  try { navigator.clipboard?.writeText(body) } catch (_) {}
}

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
    sentiment:  { r:  92, color: '#ec4899' },
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
      ${ringPaths}${hourTicks}${hourLabels}${dots}
      <circle cx="${CX}" cy="${CY}" r="42" fill="#05060a" stroke="#06b6d4" stroke-width="1.5" />
      <text x="${CX}" y="${CY - 4}" text-anchor="middle" fill="#06b6d4" font-size="22"
            font-family="JetBrains Mono" font-weight="700">${p.briefing?.threat_level ?? '--'}</text>
      <text x="${CX}" y="${CY + 14}" text-anchor="middle" fill="#5a607a" font-size="9"
            font-family="JetBrains Mono">THREAT</text>
    </svg>`
  const tt = $('#wheel-tooltip')
  wrap.querySelectorAll('.pulse-dot').forEach(g => {
    const i = +g.dataset.i; const e = events[i]
    g.addEventListener('mouseenter', ev => {
      if (!tt || !e) return
      tt.innerHTML = `
        <div class="text-[10px] mono uppercase text-${e.pillar === 'policy' ? 'policy' : e.pillar === 'competitor' ? 'competitor' : 'sentiment'} mb-1">${escapeHTML(e.pillar)} • sev ${e.severity}</div>
        <div class="text-xs leading-snug">${escapeHTML(e.title || '')}</div>`
      tt.style.opacity = '1'
      const box = wrap.getBoundingClientRect()
      tt.style.left = (ev.clientX - box.left + 12) + 'px'
      tt.style.top  = (ev.clientY - box.top  + 12) + 'px'
    })
    g.addEventListener('mouseleave', () => { if (tt) tt.style.opacity = '0' })
    g.addEventListener('click', () => { if (e?.source_url) window.open(e.source_url, '_blank', 'noopener') })
  })
}

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

function renderThreatMeter(p) {
  const wrap = $('#threat-meter-container'); if (!wrap) return
  const v = Math.max(0, Math.min(100, Number(p.threat_meter?.value ?? p.briefing?.threat_level ?? 0)))
  const label = p.threat_meter?.label || labelForThreat(v)
  const spark = p.threat_meter?.sparkline_14d || []
  const W = 240, H = 130
  const CX = W / 2, CY = H - 10, R = 92
  function arc(start, end, color) {
    const a1 = Math.PI * (1 + start / 100), a2 = Math.PI * (1 + end / 100)
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
        ${arc(0, 40, '#10b981')}${arc(40, 70, '#f97316')}${arc(70, 100, '#ec4899')}
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

function renderSankey(p) {
  const wrap = $('#sankey-container'); if (!wrap) return
  const sk = p.threats_to_actions || { sources: [], targets: [], links: [] }
  const W = 360, H = 200, padX = 12, padY = 12
  const srcs = sk.sources || [], tgts = sk.targets || []
  if (!srcs.length || !tgts.length) {
    wrap.innerHTML = `<div class="text-xs text-gray-500 h-[200px] flex items-center justify-center">Awaiting signal…</div>`
    return
  }
  const colors = ['#06b6d4', '#f97316', '#ec4899', '#10b981']
  const totalS = srcs.reduce((a, b) => a + (b.count || 1), 0) || 1
  const totalT = tgts.reduce((a, b) => a + (b.count || 1), 0) || 1
  const sBarW = 14, tBarW = 14, sX = padX, tX = W - padX - tBarW
  let curY = padY
  const sPos = srcs.map(s => { const h = ((s.count || 1) / totalS) * (H - padY * 2); const y = curY; curY += h; return { y, h } })
  curY = padY
  const tPos = tgts.map(t => { const h = ((t.count || 1) / totalT) * (H - padY * 2); const y = curY; curY += h; return { y, h } })
  const links = (sk.links || []).map(l => {
    const sP = sPos[l.from], tP = tPos[l.to]; if (!sP || !tP) return ''
    const ys = sP.y + sP.h / 2, yt = tP.y + tP.h / 2, mid = (sX + sBarW + tX) / 2
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
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } },
                 tooltip: { backgroundColor: '#05060a', borderColor: '#262b3a', borderWidth: 1 } },
      scales: { x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
                y: { stacked: true, ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } } } },
  })
}

function renderPolicy(p) {
  safe('renderWorldMap',           () => renderWorldMap(p))
  safe('renderPolicyQoQ',          () => renderPolicyQoQ(p))
  safe('renderActiveRegulations',  () => renderActiveRegulations(p))
}
function renderWorldMap(p) {
  const wrap = $('#world-map'); if (!wrap) return
  const regions = p.policy?.regions || []
  const W = 1000, H = 500
  const proj = (lng, lat) => ({ x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H })
  const land = (typeof window !== 'undefined' && window.SCOUTT_WORLD_MAP_PATHS) || ''
  const pinSvg = regions.map((r, i) => {
    const c = r.activity > 70 ? '#06b6d4' : r.activity > 45 ? '#f97316' : '#ec4899'
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
    const i = +pin.dataset.i; const r = regions[i]
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
    data: { labels: qoq.map(q => (q.country || '').slice(0, 12)),
      datasets: [
        { label: 'Q1', data: qoq.map(q => q.q1), backgroundColor: '#3a4055', borderRadius: 4 },
        { label: 'Q2', data: qoq.map(q => q.q2), backgroundColor: '#06b6d4', borderRadius: 4 },
      ] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } } },
      scales: { x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
                y: { ticks: { color: '#a1a8bd', font: { size: 9 } }, grid: { display: false } } } },
  })
}
function renderActiveRegulations(p) {
  const wrap = $('#reg-cards'); if (!wrap) return
  const regs = p.policy?.active_regulations || []
  if (!regs.length) { wrap.innerHTML = '<div class="text-xs text-gray-500 col-span-full">Awaiting signal…</div>'; return }
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

function renderCompetitor(p) {
  safe('renderDiffTimeline',     () => renderDiffTimeline(p))
  safe('renderPricingDiff',      () => renderPricingDiff(p))
  safe('renderPricingRace',      () => renderPricingRace(p))
  safe('renderCompetitorEvents', () => renderCompetitorEvents(p))
  safe('renderFeatureMatrix',    () => renderFeatureMatrix(p))
}
function renderDiffTimeline(p) {
  const wrap = $('#diff-timeline'); if (!wrap) return
  const items = p.competitor?.diff_timeline || []
  if (!items.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No recent diffs.</div>'; return }
  wrap.innerHTML = items.slice(0, 10).map(it => `
    <div class="text-xs flex items-start gap-2 py-1.5 border-b border-ink-700 last:border-0">
      <span class="mono text-[10px] text-gray-500 shrink-0 w-16">${escapeHTML(it.date || '')}</span>
      <span class="flex-1">${escapeHTML(it.title || '')}</span>
      <span class="text-[10px] mono text-${it.delta > 0 ? 'competitor' : 'action'}">${it.delta > 0 ? '+' : ''}${it.delta ?? 0}</span>
    </div>`).join('')
}
function renderPricingDiff(p) {
  const wrap = $('#pricing-diff'); if (!wrap) return
  const d = p.competitor?.pricing_diff || {}
  const bL = d.before_lines || [], aL = d.after_lines || []
  wrap.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-xs mono">
      <div>
        <div class="text-[10px] uppercase text-gray-500 mb-1">Before · ${escapeHTML(d.before_ts || '')}</div>
        <pre class="bg-ink-900 border border-ink-700 rounded p-2 overflow-auto max-h-48">${bL.map(l => escapeHTML(l)).join('\n')}</pre>
      </div>
      <div>
        <div class="text-[10px] uppercase text-gray-500 mb-1">After · ${escapeHTML(d.after_ts || '')}</div>
        <pre class="bg-ink-900 border border-ink-700 rounded p-2 overflow-auto max-h-48">${aL.map(l => escapeHTML(l)).join('\n')}</pre>
      </div>
    </div>`
}
function renderPricingRace(p) {
  const series = p.competitor?.pricing_race_30d || []
  if (!series.length) return
  const colors = ['#06b6d4', '#f97316', '#ec4899', '#10b981', '#a78bfa']
  makeChart('chart-pricing-race', {
    type: 'line',
    data: { labels: series[0]?.points?.map(pt => pt.date?.slice(5) || '') || [],
      datasets: series.map((s, i) => ({
        label: s.competitor, data: s.points.map(pt => pt.price),
        borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length] + '22',
        borderWidth: 2, tension: 0.35, pointRadius: 0, fill: false,
      })) },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } } },
      scales: { x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
                y: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } } } },
  })
}
function renderCompetitorEvents(p) {
  const wrap = $('#competitor-events'); if (!wrap) return
  const events = p.competitor?.events || []
  if (!events.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No events.</div>'; return }
  wrap.innerHTML = events.map(e => eventCardHtml(e, 'competitor')).join('')
}
function renderFeatureMatrix(p) {
  const wrap = $('#feature-matrix'); if (!wrap) return
  const m = p.competitor?.feature_matrix || { competitors: [], features: [] }
  if (!m.competitors.length || !m.features.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No data.</div>'; return }
  wrap.innerHTML = `
    <table class="w-full text-xs">
      <thead><tr class="text-[10px] mono uppercase text-gray-500">
        <th class="text-left p-2">Feature</th>
        ${m.competitors.map(c => `<th class="p-2">${escapeHTML(c)}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${m.features.map(f => `
          <tr class="border-t border-ink-700">
            <td class="p-2 text-gray-300">${escapeHTML(f.name)}</td>
            ${(f.values || []).map(v => `<td class="p-2 text-center"><i class="fa-solid ${v ? 'fa-check text-action' : 'fa-xmark text-gray-600'}"></i></td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`
}
function eventCardHtml(e, pillar) {
  const c = pillar || e.pillar || 'policy'
  return `<a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener"
     class="card step-card p-3 block hover:border-${c}/40">
    <div class="flex items-center justify-between gap-2 mb-1">
      <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${c}/15 text-${c} border border-${c}/40">${escapeHTML(c)}</span>
      <span class="text-[9px] mono text-gray-500">sev ${e.severity ?? '--'}</span>
    </div>
    <div class="text-sm font-medium leading-snug">${escapeHTML(e.title || '')}</div>
    <div class="text-[11px] text-gray-400 mt-1 line-clamp-2">${escapeHTML(e.summary || '')}</div>
  </a>`
}

function renderSentiment(p) {
  safe('renderBubbleChart',     () => renderBubbleChart(p))
  safe('renderDivergingChart',  () => renderDivergingChart(p))
  safe('renderWordCloud',       () => renderWordCloud(p))
  safe('renderQuotes',          () => renderQuotes(p))
  safe('renderSentimentEvents', () => renderSentimentEvents(p))
}
function renderBubbleChart(p) {
  const data = p.sentiment?.topic_cluster || []
  if (!data.length) return
  makeChart('chart-bubbles', {
    type: 'bubble',
    data: { datasets: [{
      data: data.map(d => ({ x: d.x, y: d.y, r: Math.max(6, Math.min(30, (d.size || 10))), label: d.label })),
      backgroundColor: data.map(d => d.sentiment > 0 ? 'rgba(16,185,129,0.45)' : d.sentiment < 0 ? 'rgba(236,72,153,0.45)' : 'rgba(161,168,189,0.35)'),
      borderColor: '#262b3a', borderWidth: 1,
    }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
                 tooltip: { callbacks: { label: c => c.raw.label + ' (' + c.raw.r + ')' } } },
      scales: { x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
                y: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } } } },
  })
}
function renderDivergingChart(p) {
  const data = p.sentiment?.delta_vs_competitors || []
  if (!data.length) return
  makeChart('chart-diverging', {
    type: 'bar',
    data: { labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.delta),
        backgroundColor: data.map(d => d.delta >= 0 ? '#10b981' : '#ec4899'),
        borderRadius: 4,
      }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: '#5a607a', font: { size: 9 } }, grid: { color: '#1a1e2a' } },
                y: { ticks: { color: '#a1a8bd', font: { size: 9 } }, grid: { display: false } } } },
  })
}
function renderWordCloud(p) {
  const wrap = $('#word-cloud'); if (!wrap) return
  const words = p.sentiment?.word_cloud || []
  if (!words.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No words yet.</div>'; return }
  wrap.innerHTML = words.map(w => {
    const size = Math.max(11, Math.min(28, (w.weight || 10)))
    const color = w.sentiment > 0 ? '#10b981' : w.sentiment < 0 ? '#ec4899' : '#a1a8bd'
    return `<span class="inline-block mx-1.5 my-1 align-middle" style="font-size:${size}px;color:${color}">${escapeHTML(w.text)}</span>`
  }).join('')
}
function renderQuotes(p) {
  const quotes = p.sentiment?.quotes || []
  const wrap = $('#quote-display'); if (!wrap) return
  if (!quotes.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No quotes.</div>'; return }
  const q = quotes[STATE.quoteIdx % quotes.length]
  wrap.innerHTML = `
    <div class="text-sm italic leading-relaxed">"${escapeHTML(q.text)}"</div>
    <div class="text-[11px] mono text-gray-500 mt-2">— ${escapeHTML(q.source || 'anon')} · ${escapeHTML(q.date || '')}</div>`
  const counter = $('#quote-counter'); if (counter) counter.textContent = `${(STATE.quoteIdx % quotes.length) + 1} / ${quotes.length}`
}
function renderSentimentEvents(p) {
  const wrap = $('#sentiment-events'); if (!wrap) return
  const events = p.sentiment?.events || []
  if (!events.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No events.</div>'; return }
  wrap.innerHTML = events.map(e => eventCardHtml(e, 'sentiment')).join('')
}

function renderArchetype(p) {
  const a = p.archetype || {}
  const indEl = $('#archetype-industry'); if (indEl) indEl.textContent = a.industry || '--'
  const hi = $('#archetype-higher'); if (hi) hi.textContent = (a.higher || []).join(', ') || '—'
  const lo = $('#archetype-lower');  if (lo) lo.textContent = (a.lower  || []).join(', ') || '—'
  const ne = $('#archetype-neutral'); if (ne) ne.textContent = (a.neutral || []).join(', ') || '—'
  const axes = a.axes || []
  if (!axes.length) return
  makeChart('chart-radar', {
    type: 'radar',
    data: { labels: axes,
      datasets: [
        { label: 'You',      data: a.you || [],      backgroundColor: 'rgba(6,182,212,0.20)', borderColor: '#06b6d4', borderWidth: 2, pointBackgroundColor: '#06b6d4' },
        { label: 'Baseline', data: a.baseline || [], backgroundColor: 'rgba(161,168,189,0.10)', borderColor: '#a1a8bd', borderWidth: 1.5, borderDash: [4,4], pointBackgroundColor: '#a1a8bd' },
      ] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', boxWidth: 8, font: { size: 10 } } } },
      scales: { r: {
        angleLines: { color: '#262b3a' }, grid: { color: '#1a1e2a' },
        pointLabels: { color: '#a1a8bd', font: { size: 10 } },
        ticks: { color: '#5a607a', backdropColor: 'transparent', font: { size: 9 } },
        suggestedMin: 0, suggestedMax: 100,
      } } },
  })
}

async function refreshSearchIndex() {
  try { const d = await SCOUTT.fetch('/api/search-index', { timeoutMs: 8000 }); GLOBAL_INDEX = d?.index || [] }
  catch (_) { GLOBAL_INDEX = [] }
}

window.runScenario = async function () {
  const input = $('#scenario-input')
  const scenario = (input?.value || '').trim()
  if (!scenario) { showToast('Type a hypothetical to simulate.', 'error'); return }
  const btn = $('#scenario-run'), err = $('#scenario-error'), result = $('#scenario-result')
  if (btn) {
    btn.disabled = true
    btn.dataset.origHtml = btn.dataset.origHtml || btn.innerHTML
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin inline-block"></div> Re-running…'
  }
  if (err) err.classList.add('hidden')
  if (result) result.classList.add('hidden')
  const cachedLive = loadCachedLivePayload()
  const payloadForScenario = (cachedLive && isLiveSource(cachedLive.source)) ? cachedLive : (STATE.payload || makeSkeletonPayload())
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SCOUTT.headers() },
      body: JSON.stringify({ scenario, cached_payload: payloadForScenario, raw: loadCachedRaw(), tenant: loadCachedTenant() }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (res.status === 409) {
      if (!SCOUTT.hasKey) {
        showToast('Scenario unavailable — backend requires live data. Add API key to enable.', 'error')
        resetScenarioBtn(btn); return
      }
      showToast('Live data not synced — re-running pipeline.')
      const fresh = await runLivePipeline()
      if (fresh) return window.runScenario()
      resetScenarioBtn(btn); return
    }
    if (!res.ok) throw new Error('scenario ' + res.status)
    const data = await res.json()
    if (result) result.classList.remove('hidden')
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v }
    set('#s-before',  data.threat_level_before ?? '--')
    set('#s-after',   data.threat_level_after  ?? '--')
    set('#s-threats', '+' + (data.delta_threats || 0))
    set('#s-actions', '+' + (data.delta_actions || 0))
    const n = $('#s-narrative')
    if (n) {
      const badge = data.mode === 'groq-live'
        ? ' <span class="ml-1 px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">Groq · Live</span>'
        : (data.mode === 'offline-fallback' || data.mode === 'offline-no-groq')
        ? ' <span class="ml-1 px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-amber-500/15 text-amber-400 border border-amber-400/30">Offline · Demo data</span>'
        : ''
      n.innerHTML = escapeHTML(data.narrative || '') + badge
    }
    const ev = $('#s-events')
    if (ev) {
      ev.innerHTML = (data.impacted_events || []).map(e => {
        const colors = { policy: 'policy', competitor: 'competitor', sentiment: 'sentiment' }
        const c = colors[e.pillar] || 'gray-500'
        return `<a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener"
           class="card step-card p-3 block hover:border-${c}/40">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${c}/15 text-${c} border border-${c}/40">${escapeHTML(e.pillar)}</span>
            <i class="fa-solid fa-arrow-trend-up text-${c} text-xs"></i>
          </div>
          <div class="text-sm font-medium leading-snug">${escapeHTML(e.title)}</div>
          <div class="text-[10px] mono text-gray-500 mt-1">sev ${e.severity}</div>
        </a>`
      }).join('') || '<div class="text-xs text-gray-500 col-span-2">No events impacted.</div>'
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
  if (live) { await safeAsync('renderAll(after-save)', () => renderAll(live)); showToast('✓ Dashboard swapped to your live data.') }
}

function openApiKeyModal() {
  const m = $('#apikey-modal'); if (!m) return
  m.classList.remove('hidden')
  const i = $('#apikey-input'); if (i) { i.value = SCOUTT.apiKey || ''; setTimeout(() => i.focus(), 50) }
  const status = $('#apikey-status')
  if (status && SCOUTT.hasKey) { status.classList.remove('hidden'); status.innerHTML = '<span class="text-emerald-400">✓ Live key currently active.</span>' }
  else if (status) status.classList.add('hidden')
}
function closeApiKeyModal() { const m = $('#apikey-modal'); if (m) m.classList.add('hidden') }
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

function openBriefModal() {
  const m = $('#brief-modal'); if (!m) return
  const p = STATE.payload || {}, b = p.briefing || {}
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

async function openTransparency() {
  const dr = $('#transparency-drawer'), bd = $('#transparency-backdrop')
  if (!dr) return
  dr.classList.add('open')
  if (bd) bd.classList.remove('hidden')
  const body = $('#transparency-body')
  if (body) body.innerHTML = '<div class="text-xs text-gray-500">Loading transparency report…</div>'
  try {
    const t = await SCOUTT.fetch('/api/transparency', { timeoutMs: 8000 })
    if (body) {
      body.innerHTML = `
        <div class="space-y-3 text-sm">
          <div><div class="text-[10px] mono uppercase text-gray-500">Source</div><div>${escapeHTML(t?.source || 'unknown')}</div></div>
          <div><div class="text-[10px] mono uppercase text-gray-500">Generated</div><div class="mono text-xs">${escapeHTML(t?.generated_at || '')}</div></div>
          <div><div class="text-[10px] mono uppercase text-gray-500">Pipeline</div><pre class="text-[11px] mono bg-ink-900 border border-ink-700 rounded p-2 overflow-auto">${escapeHTML(JSON.stringify(t || {}, null, 2))}</pre></div>
        </div>`
    }
  } catch (e) {
    if (body) body.innerHTML = `<div class="text-xs text-red-400">Could not load transparency: ${escapeHTML(e.message)}</div>`
  }
}
function closeTransparency() {
  const dr = $('#transparency-drawer'), bd = $('#transparency-backdrop')
  if (dr) dr.classList.remove('open')
  if (bd) bd.classList.add('hidden')
}

function openCmdK() {
  const c = $('#cmdk'); if (!c) return
  c.classList.remove('hidden')
  setTimeout(() => $('#cmdk-input')?.focus(), 30)
}
function closeCmdK() { const c = $('#cmdk'); if (c) c.classList.add('hidden') }
function runCmdKSearch(q) {
  const list = $('#cmdk-results'); if (!list) return
  const query = String(q || '').toLowerCase().trim()
  if (!query) { list.classList.add('hidden'); return }
  const hits = GLOBAL_INDEX.filter(it => (it.text || '').toLowerCase().includes(query)).slice(0, 12)
  if (!hits.length) {
    list.classList.remove('hidden')
    list.innerHTML = '<div class="px-4 py-3 text-xs text-gray-500">No matches.</div>'
    return
  }
  list.classList.remove('hidden')
  list.innerHTML = hits.map(h => `
    <a href="${escapeHTML(h.url || '#')}" target="_blank" rel="noopener" class="block px-4 py-2.5 border-b border-ink-700 hover:bg-ink-800">
      <div class="text-[10px] mono uppercase text-gray-500">${escapeHTML(h.kind || '')}</div>
      <div class="text-sm">${escapeHTML(h.text || '')}</div>
    </a>`).join('')
}

function activateTab(name) {
  $$('.tab-btn').forEach(b => {
    const active = b.dataset.tab === name
    b.classList.toggle('tab-active', active)
    b.classList.toggle('text-gray-400', !active)
  })
  $$('.tab-pane').forEach(p => {
    p.classList.toggle('hidden', p.dataset.pane !== name)
  })
  if (STATE.payload) {
    if (name === 'policy')     safe('renderPolicy(tab)',     () => renderPolicy(STATE.payload))
    if (name === 'competitor') safe('renderCompetitor(tab)', () => renderCompetitor(STATE.payload))
    if (name === 'sentiment')  safe('renderSentiment(tab)',  () => renderSentiment(STATE.payload))
    if (name === 'archetype')  safe('renderArchetype(tab)',  () => renderArchetype(STATE.payload))
  }
}
function wireTabs() {
  $$('.tab-btn').forEach(b => {
    b.addEventListener('click', () => safe('activateTab', () => activateTab(b.dataset.tab)))
  })
  LOG('wireTabs done, tabs=', $$('.tab-btn').length)
}

function wireTimeMachine() {
  const slider = $('#time-machine'), label = $('#time-machine-label'), reset = $('#time-machine-reset')
  if (slider) {
    const update = debounce(async () => {
      const day = +slider.value || 0
      if (label) label.textContent = day === 0 ? 'Today — live' : `${day} day${day === 1 ? '' : 's'} ago`
      try {
        const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`, { timeoutMs: 12000 })
        STATE.payload = data; STATE.day = day
        await safeAsync('renderAll(time-machine)', () => renderAll(data))
      } catch (e) { showToast('Time-machine fetch failed', 'error') }
    }, 250)
    slider.addEventListener('input', () => {
      const day = +slider.value || 0
      if (label) label.textContent = day === 0 ? 'Today — live' : `${day} day${day === 1 ? '' : 's'} ago`
    })
    slider.addEventListener('change', update)
  }
  if (reset) reset.addEventListener('click', () => { if (slider) { slider.value = '0'; slider.dispatchEvent(new Event('change')) } })
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('paper', theme === 'paper')
  try { localStorage.setItem(THEME_LS_KEY, theme) } catch (_) {}
  const btn = $('#theme-toggle'); if (btn) {
    const ic = btn.querySelector('i')
    if (ic) ic.className = theme === 'paper' ? 'fa-solid fa-sun text-xs' : 'fa-solid fa-moon text-xs'
  }
}
function wireThemeToggle() {
  let theme = 'dark'; try { theme = localStorage.getItem(THEME_LS_KEY) || 'dark' } catch (_) {}
  applyTheme(theme)
  $('#theme-toggle')?.addEventListener('click', () => {
    let t = 'dark'; try { t = localStorage.getItem(THEME_LS_KEY) || 'dark' } catch (_) {}
    applyTheme(t === 'dark' ? 'paper' : 'dark')
  })
}

function wireAudio() {
  const btn = $('#play-audio'); const audio = $('#audio-el'); const toast = $('#audio-toast')
  if (!btn) return
  btn.addEventListener('click', async () => {
    if (toast) toast.classList.remove('hidden')
    try {
      const r = await SCOUTT.post('/api/audio/brief', {}, { timeoutMs: 30000 })
      if (r?.url && audio) {
        audio.src = r.url; audio.classList.remove('hidden')
        await audio.play().catch(() => {})
      } else {
        showToast('Audio brief not available (ElevenLabs key not configured).', 'error')
      }
    } catch (e) {
      showToast('Audio fetch failed', 'error')
    } finally {
      setTimeout(() => toast?.classList.add('hidden'), 3000)
    }
  })
}

function wireQuoteRotator() {
  $('#quote-prev')?.addEventListener('click', () => { STATE.quoteIdx = Math.max(0, STATE.quoteIdx - 1); safe('renderQuotes', () => renderQuotes(STATE.payload || {})) })
  $('#quote-next')?.addEventListener('click', () => { STATE.quoteIdx += 1; safe('renderQuotes', () => renderQuotes(STATE.payload || {})) })
}

function wireApiKeyModal() {
  $('#apikey-btn')?.addEventListener('click', openApiKeyModal)
  $('#apikey-close')?.addEventListener('click', closeApiKeyModal)
  $('#apikey-modal')?.addEventListener('click', e => { if (e.target?.id === 'apikey-modal') closeApiKeyModal() })
  $('#apikey-save')?.addEventListener('click', () => { const i = $('#apikey-input'); window.saveApiKeyAndGo(i?.value || '') })
  $('#apikey-clear')?.addEventListener('click', () => {
    try { localStorage.removeItem(API_KEY_LS_KEY) } catch (_) {}
    SCOUTT.apiKey = ''
    clearCachedLivePayload()
    updateApiKeyButtonUI()
    closeApiKeyModal()
    showToast('API key cleared.')
  })
  $('#apikey-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); window.saveApiKeyAndGo(e.target.value || '') }
  })
}

function wireBriefModal() {
  $('#read-full-brief')?.addEventListener('click', openBriefModal)
  $('#brief-modal-close')?.addEventListener('click', closeBriefModal)
  $('#brief-modal')?.addEventListener('click', e => { if (e.target?.id === 'brief-modal') closeBriefModal() })
}

function wireTransparency() {
  $('#transparency-trigger')?.addEventListener('click', openTransparency)
  $('#transparency-backdrop')?.addEventListener('click', closeTransparency)
  $('#transparency-close')?.addEventListener('click', closeTransparency)
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
    if (e.key === 'Escape') { closeCmdK(); closeApiKeyModal(); closeBriefModal(); closeTransparency() }
  })
}

function wireScenario() {
  $('#scenario-run')?.addEventListener('click', () => window.runScenario())
  $('#scenario-input')?.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') window.runScenario()
  })
}

async function boot() {
  LOG('boot start, hasKey=', SCOUTT.hasKey)
  safe('applyTimeGreeting',  () => applyTimeGreeting())
  safe('updateApiKeyButtonUI', () => updateApiKeyButtonUI())
  safe('wireTabs',           () => wireTabs())
  safe('wireTimeMachine',    () => wireTimeMachine())
  safe('wireThemeToggle',    () => wireThemeToggle())
  safe('wireAudio',          () => wireAudio())
  safe('wireQuoteRotator',   () => wireQuoteRotator())
  safe('wireApiKeyModal',    () => wireApiKeyModal())
  safe('wireBriefModal',     () => wireBriefModal())
  safe('wireTransparency',   () => wireTransparency())
  safe('wireCmdK',           () => wireCmdK())
  safe('wireScenario',       () => wireScenario())
  LOG('wiring complete')

  let payload = null
  try {
    payload = await Promise.race([
      fetchPayload(0),
      new Promise(resolve => setTimeout(() => resolve(null), 14000)),
    ])
  } catch (e) { ERR('fetchPayload threw', e) }

  if (!payload) {
    WARN('fetchPayload timed out / failed — rendering skeleton')
    payload = makeSkeletonPayload()
    showToast('Backend slow — rendering skeleton. Will refresh when available.', 'error')
  }
  STATE.payload = payload
  await safeAsync('renderAll(first-paint)', () => renderAll(payload))

  if (payload?.source === 'skeleton' || payload?.source === 'demo-warming') {
    setTimeout(async () => {
      try {
        const fresh = await SCOUTT.fetch('/api/dashboard?day=0', { timeoutMs: 15000 })
        if (fresh && fresh.briefing) {
          STATE.payload = fresh
          await safeAsync('renderAll(refresh)', () => renderAll(fresh))
        }
      } catch (_) {}
    }, 6000)
  }
}

document.addEventListener('DOMContentLoaded', () => safeAsync('boot', boot))
