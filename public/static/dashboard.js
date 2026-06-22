/* =====================================================================
   SCOUTT — dashboard.js  (v3 — Groq edition)
   Drives every tile from /api/dashboard?day=N. When an Anakin key is
   set, the browser orchestrates the async pipeline so we NEVER hit the
   Vercel 60s cap:
     1. POST /api/anakin/start          → {job_id}
     2. GET  /api/anakin/poll/:jobId    → {status, raw?}   (loop here)
     3. POST /api/groq/reshape          → final DashboardPayload
        (Groq `meta-llama/llama-4-scout-17b-16e-instruct`)

   🔥 BUGFIX history:
     • Old NVIDIA `meta/llama-3.2-3b-instruct` could not emit the full
       DashboardPayload JSON within 1024 tokens → server returned demo
       template tagged 'anakin-live' → "green success toast but demo
       data on dashboard". Switched to Groq llama-4-scout (17B-active
       MoE) with JSON-mode + 8192 tokens, split into 2 parallel calls.
     • Frontend now ALWAYS calls renderAll() with the freshly returned
       live payload (previously a render could be skipped if the auto-
       kicked pipeline finished before the initial render).
   ===================================================================== */

const $  = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

const SCOUTT = {
  apiKey: '',
  init() { try { this.apiKey = localStorage.getItem('scoutt_anakin_key') || '' } catch { this.apiKey = '' } },
  get hasKey() { return !!this.apiKey },
  headers() { return this.apiKey ? { 'X-Anakin-Key': this.apiKey } : {} },
  async fetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...this.headers(), ...(opts.headers || {}) },
    })
    if (!res.ok) {
      let body = ''; try { body = await res.text() } catch {}
      throw new Error(`${url} → ${res.status}${body ? ' · ' + body.slice(0, 200) : ''}`)
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  },
  async post(url, body) { return this.fetch(url, { method: 'POST', body: JSON.stringify(body || {}) }) },
}
SCOUTT.init()

const STATE = { payload: null, day: 0, quoteIdx: 0, charts: {}, liveRunInflight: false }
let GLOBAL_INDEX = []

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
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ═════════════════════ GREETING (time-aware) ════════════════════ */
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
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(now.getUTCMinutes()).padStart(2, '0')
    t.textContent = `${hh}:${mm} UTC`
  }
}

/* ═════════════════════════ LIVE PIPELINE ═════════════════════════
   Orchestrates Anakin start → poll → Groq reshape entirely from
   the browser so no single server call exceeds ~15s.
   ════════════════════════════════════════════════════════════════ */
async function runLivePipeline() {
  if (STATE.liveRunInflight) return null
  STATE.liveRunInflight = true
  setLiveLoading(true, 'Generating live briefing…',
    'Step 1/3 — Submitting Anakin Agentic Search…')

  try {
    // 1) START
    const startResp = await SCOUTT.post('/api/anakin/start', {})
    if (!startResp.ok || !startResp.job_id) throw new Error(startResp.error || 'Anakin start failed')
    const jobId = startResp.job_id

    // 2) POLL — every 8s for up to 5 minutes
    setLiveLoading(true, 'Generating live briefing…',
      `Step 2/3 — Anakin job ${jobId.slice(0, 8)}… polling every 8s.`)
    const startedAt = Date.now()
    const MAX_POLL_MS = 5 * 60_000
    let raw = null
    while (Date.now() - startedAt < MAX_POLL_MS) {
      await sleep(8_000)
      let pollData
      try {
        pollData = await SCOUTT.fetch(`/api/anakin/poll/${encodeURIComponent(jobId)}`)
      } catch (e) {
        // Network hiccup — keep trying.
        continue
      }
      if (pollData.status === 'completed' && pollData.raw) { raw = pollData.raw; break }
      if (pollData.status === 'failed') throw new Error(pollData.message || 'Anakin job failed')
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      setLiveLoading(true, 'Generating live briefing…',
        `Step 2/3 — Anakin status: ${pollData.status || '...'} (${elapsed}s elapsed)`)
    }
    if (!raw) throw new Error('Anakin polling exceeded 5 minutes')

    // 3) RESHAPE via Groq llama-4-scout-17b-16e-instruct
    setLiveLoading(true, 'Generating live briefing…',
      'Step 3/3 — Groq meta-llama/llama-4-scout-17b-16e-instruct reshape…')
    const payload = await SCOUTT.post('/api/groq/reshape', { raw })
    if (!payload || !payload.briefing) throw new Error('Groq reshape returned empty payload')

    // 🔥 GUARD: server marks the payload 'demo-fallback' if Groq failed.
    // We surface that to the user instead of falsely claiming success.
    if (payload.source !== 'anakin-live') {
      showToast('Groq reshape produced no fresh data — showing demo template.', 'error')
    } else {
      showToast('✓ Live briefing generated via Anakin → Groq reshape.', 'info')
    }

    STATE.payload = payload
    // 🔥 CRITICAL: force a full re-render of every tab so demo data is
    // immediately replaced by the new live data the user just generated.
    try { await renderAll(payload) } catch (e) { console.warn('renderAll after reshape failed:', e) }
    return payload
  } catch (e) {
    showToast('Live pipeline failed: ' + e.message + ' — showing demo.', 'error')
    // Fall back to cached/demo
    try { STATE.payload = await SCOUTT.fetch(`/api/dashboard?day=${STATE.day}`) } catch {}
    return STATE.payload
  } finally {
    STATE.liveRunInflight = false
    setLiveLoading(false)
  }
}

/* ═════════════════════════ FETCH PAYLOAD ═════════════════════════ */
async function fetchPayload(day = 0) {
  // 1) Always hit /api/dashboard first — returns instantly with either
  //    warm-cache live data, demo data, or 'demo-warming' marker.
  const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`)
  STATE.payload = data; STATE.day = day

  // 2) If user has a key but payload is not live yet, kick off pipeline.
  //    🔥 FIX: ALWAYS re-render after the live payload arrives (regardless
  //    of whether source is 'anakin-live' or 'demo-fallback') so the UI
  //    refreshes with whichever data the server returned. Previously the
  //    render was skipped when the reshape silently returned demo data.
  if (SCOUTT.hasKey && data.source !== 'anakin-live' && day === 0) {
    runLivePipeline().then(live => {
      if (live) {
        STATE.payload = live
        renderAll(live)
      }
    }).catch(e => console.warn('Auto-pipeline error:', e))
  } else if (data.source === 'anakin-live') {
    showToast(day === 0 ? 'Live briefing loaded from cache.' : `Day-${day} snapshot ready.`)
  }
  return data
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

/* ─── Command Center ──────────────────────────────────────────── */
function renderBanner(p) {
  const b = p.briefing
  const ev = $('#banner-events'); if (ev) ev.textContent = String(b.high_impact_count ?? 0)
  const th = $('#banner-threat'); if (th) th.textContent = String(b.threat_level ?? 0)
  const su = $('#banner-summary'); if (su) su.textContent = b.headline || b.summary || ''
}

function renderTimeline(p) {
  const list = $('#timeline-list'); if (!list) return
  const data = p.timeline || []
  if (!data.length) { list.innerHTML = '<li class="text-xs text-gray-500">No events.</li>'; return }
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
  if (!acts.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No actions today.</div>'; return }
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

/* ─── Pulse Wheel ───────────────────────────────── */
function renderPulseWheel(p) {
  const host = $('#pulse-wheel-container'); if (!host) return
  const points = (p.pulse_wheel && p.pulse_wheel.length) ? p.pulse_wheel : []
  const PILLAR = { policy: { ring: 0, color: '#06b6d4' }, competitor: { ring: 1, color: '#f97316' }, sentiment: { ring: 2, color: '#ec4899' } }
  const radii = [165, 130, 95]
  const ringNames = ['POLICY', 'COMPETITOR', 'SENTIMENT']
  const ringColors = ['#06b6d4', '#f97316', '#ec4899']

  const ticks = points.map(e => {
    const meta = PILLAR[e.pillar] || PILLAR.policy
    const angle = (Number(e.hour || 0) / 24) * 360 - 90
    const rad = (angle * Math.PI) / 180
    const r = radii[meta.ring]
    const sev = Math.max(20, Math.min(100, Number(e.severity || 50)))
    const len = 8 + (sev / 100) * 16
    const x1 = 200 + Math.cos(rad) * (r - len / 2), y1 = 200 + Math.sin(rad) * (r - len / 2)
    const x2 = 200 + Math.cos(rad) * (r + len / 2), y2 = 200 + Math.sin(rad) * (r + len / 2)
    const dotX = 200 + Math.cos(rad) * r, dotY = 200 + Math.sin(rad) * r
    return `<g class="wheel-tick cursor-pointer" data-title="${escapeHTML(e.title)}" data-sev="${sev}" data-url="${escapeHTML(e.source_url || '#')}">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${meta.color}" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="${dotX}" cy="${dotY}" r="${4 + sev / 40}" fill="${meta.color}" opacity="0.95" />
      <circle cx="${dotX}" cy="${dotY}" r="${10 + sev / 20}" fill="${meta.color}" opacity="0.18">
        <animate attributeName="r" from="${4 + sev / 40}" to="${18 + sev / 12}" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </g>`
  }).join('')

  const hourLabels = [0, 6, 12, 18].map(h => {
    const angle = (h / 24) * 360 - 90, rad = (angle * Math.PI) / 180
    const x = 200 + Math.cos(rad) * 188, y = 200 + Math.sin(rad) * 188 + 4
    return `<text x="${x}" y="${y}" fill="#3a4055" font-family="JetBrains Mono" font-size="11" text-anchor="middle">${String(h).padStart(2, '0')}h</text>`
  }).join('')

  host.innerHTML = `
    <svg viewBox="0 0 400 400" class="w-full h-full">
      <defs><radialGradient id="wheelGlow" cx="50%" cy="50%"><stop offset="60%" stop-color="#0a0c14" /><stop offset="100%" stop-color="#11141d" /></radialGradient></defs>
      <circle cx="200" cy="200" r="185" fill="url(#wheelGlow)" />
      ${radii.map((r, i) =>
        `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${ringColors[i]}" stroke-opacity="0.15" stroke-width="22" />` +
        `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${ringColors[i]}" stroke-opacity="0.5" stroke-width="0.8" />`
      ).join('')}
      ${hourLabels}${ticks}
      <circle cx="200" cy="200" r="34" fill="#05060a" stroke="#06b6d4" stroke-width="1" />
      <text x="200" y="196" fill="#e7eaf3" font-family="JetBrains Mono" font-size="18" font-weight="700" text-anchor="middle">${p.briefing.threat_level || 0}</text>
      <text x="200" y="212" fill="#3a4055" font-family="JetBrains Mono" font-size="8" text-anchor="middle" letter-spacing="1.5">THREAT</text>
      ${radii.map((r, i) =>
        `<text x="200" y="${200 - r - 4}" fill="${ringColors[i]}" font-family="JetBrains Mono" font-size="9" font-weight="600" text-anchor="middle" letter-spacing="1.5">${ringNames[i]}</text>`
      ).join('')}
    </svg>`

  const tooltip = $('#wheel-tooltip')
  $$('.wheel-tick').forEach(g => {
    g.addEventListener('mouseenter', () => {
      if (!tooltip) return
      tooltip.innerHTML = `<div class="font-semibold text-white">${escapeHTML(g.dataset.title)}</div><div class="text-[10px] mono text-gray-400 mt-1">severity ${g.dataset.sev}</div>`
      tooltip.style.opacity = '1'
    })
    g.addEventListener('mousemove', e => {
      if (!tooltip) return
      const c = host.getBoundingClientRect()
      tooltip.style.left = (e.clientX - c.left + 10) + 'px'
      tooltip.style.top  = (e.clientY - c.top + 10) + 'px'
    })
    g.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.opacity = '0' })
    g.addEventListener('click', () => { const u = g.dataset.url; if (u && u !== '#') window.open(u, '_blank') })
  })
}

/* ─── KPIs ────────────────────────────────────────────────────── */
function renderKPIs(p) {
  const k = p.briefing.kpis || {}
  const set = (key, v) => { const el = document.querySelector(`[data-kpi="${key}"] .kpi-value`); if (el) el.textContent = v }
  set('threats',     String(k.threats_detected ?? '--'))
  set('opps',        String(k.opportunities ?? '--'))
  set('actions-kpi', String(k.action_items ?? '--'))
  set('response',    k.avg_response_time_minutes != null ? `${k.avg_response_time_minutes}m` : '--')

  const series = p.kpi_sparklines || {}
  const map = { threats: series.threats, opps: series.opps, 'actions-kpi': series.actions, response: series.response }
  Object.entries(map).forEach(([key, data], idx) => {
    const card = document.querySelector(`[data-kpi="${key}"] .kpi-spark`); if (!card || !data) return
    drawSparkline(card, data, ['#06b6d4', '#10b981', '#f97316', '#ec4899'][idx % 4])
  })
}
function drawSparkline(cv, data, color) {
  const ctx = cv.getContext('2d')
  cv.width = cv.offsetWidth || 100; cv.height = 22
  ctx.clearRect(0, 0, cv.width, cv.height)
  const grad = ctx.createLinearGradient(0, 0, 0, 22)
  grad.addColorStop(0, color + '66'); grad.addColorStop(1, color + '00')
  ctx.beginPath()
  data.forEach((v, i) => { const x = (i / (data.length - 1)) * cv.width; const y = 22 - v * 22; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
  ctx.lineTo(cv.width, 22); ctx.lineTo(0, 22); ctx.closePath(); ctx.fillStyle = grad; ctx.fill()
  ctx.beginPath()
  data.forEach((v, i) => { const x = (i / (data.length - 1)) * cv.width; const y = 22 - v * 22; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke()
}

/* ─── 🆕 FIXED Threat meter ──────────────────────────────────
   Bugfix: previous code used `transform: rotate(${angle - 90}deg)` which
   sent the needle 90° too far CCW, often pointing OUTSIDE the gauge
   card (as visible in the user's screenshot). The gauge arc sweeps
   from 30,120 (left) → 210,120 (right) over the top, so:
       v = 0   → needle should point LEFT  → rotate -90°
       v = 50  → needle should point UP    → rotate   0°
       v = 100 → needle should point RIGHT → rotate +90°
   Correct formula: rotate = -90 + (v/100) * 180
   ────────────────────────────────────────────────────────────── */
function renderThreatMeter(p) {
  const host = $('#threat-meter-container'); if (!host) return
  const v = Math.max(0, Math.min(100, Number(p.threat_meter?.value ?? p.briefing.threat_level ?? 0)))
  const label = p.threat_meter?.label || labelForThreat(v)
  // ✅ Correct rotation: -90deg (full left) → 0deg (top) → +90deg (full right)
  const needleRotation = -90 + (v / 100) * 180
  // Arc length math: π·r (r=90) ≈ 282.74, dasharray below scales 0..100 → 0..282.74
  const ARC_LEN = 282.74
  const dashOffset = (v / 100) * ARC_LEN

  host.innerHTML = `
  <div class="relative">
    <svg viewBox="0 0 240 150" class="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="threatGrad" x1="0" x2="1">
          <stop offset="0%"  stop-color="#10b981" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
      </defs>

      <!-- Background arc (full sweep) -->
      <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="#1a1e2a"
            stroke-width="18" stroke-linecap="round" />

      <!-- Foreground arc, length proportional to v -->
      <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="url(#threatGrad)"
            stroke-width="18" stroke-linecap="round"
            stroke-dasharray="${dashOffset.toFixed(2)} ${ARC_LEN.toFixed(2)}" />

      <!-- Tick marks every 25% (0 / 25 / 50 / 75 / 100) -->
      ${[0, 25, 50, 75, 100].map(pct => {
        const ang = (-90 + (pct / 100) * 180) * Math.PI / 180
        const x1 = 120 + Math.cos(ang) * 78
        const y1 = 120 + Math.sin(ang) * 78
        const x2 = 120 + Math.cos(ang) * 70
        const y2 = 120 + Math.sin(ang) * 70
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
                      x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                      stroke="#3a4055" stroke-width="1.5" stroke-linecap="round"/>`
      }).join('')}

      <!-- ✅ Needle group, pivoting at gauge center (120,120) -->
      <g transform="rotate(${needleRotation.toFixed(2)} 120 120)">
        <line x1="120" y1="120" x2="120" y2="44" stroke="#e7eaf3"
              stroke-width="2.5" stroke-linecap="round" />
        <circle cx="120" cy="44" r="4" fill="#06b6d4" />
      </g>

      <!-- Hub -->
      <circle cx="120" cy="120" r="9" fill="#0a0c14" stroke="#06b6d4" stroke-width="1.5" />
      <circle cx="120" cy="120" r="3" fill="#06b6d4" />
    </svg>

    <div class="text-center mt-2">
      <div class="mono text-3xl font-semibold text-white">
        ${v}<span class="text-base text-gray-500">/100</span>
      </div>
      <div class="text-[10px] mono uppercase text-gray-500 tracking-widest">${escapeHTML(label)}</div>
    </div>
  </div>`
}
function labelForThreat(v) {
  if (v >= 80) return 'Severe'
  if (v >= 60) return 'Elevated'
  if (v >= 35) return 'Moderate'
  return 'Low'
}

/* ─── 🆕 FIXED Policy — real-world map ───────────────────────────
   Replaces the previous low-poly blobs with real country outlines
   loaded from /static/world-map-paths.js. Coordinates use the same
   equirectangular projection (viewBox 0 0 1000 500) so the existing
   pin math (x = (lng+180)/360 * W, y = (90-lat)/180 * H) continues
   to map regional pins correctly onto the real continents.
   ────────────────────────────────────────────────────────────── */
function renderPolicy(p) {
  const wmap = $('#world-map'); if (!wmap) return
  const regions = p.policy?.regions || []
  const W = 1000, H = 500
  const pins = regions.map(r => {
    const x = ((r.lng + 180) / 360) * W
    const y = ((90 - r.lat)  / 180) * H
    const color = r.activity > 70 ? '#06b6d4' : r.activity > 45 ? '#f97316' : '#ec4899'
    const size = 5 + (r.activity / 100) * 10
    return `
      <g class="map-pin-g" data-country="${escapeHTML(r.country)}"
         data-count="${r.count}" data-activity="${r.activity}" style="cursor:pointer">
        <circle cx="${x}" cy="${y}" r="${size + 12}" fill="${color}" opacity="0.10">
          <animate attributeName="r" from="${size + 6}" to="${size + 18}" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.30" to="0" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="${x}" cy="${y}" r="${size}" fill="${color}" opacity="0.92"
                stroke="#fff" stroke-opacity="0.35" stroke-width="0.8"/>
        <text x="${x}" y="${(y - size - 5).toFixed(1)}" fill="#e7eaf3"
              font-family="JetBrains Mono" font-size="10" text-anchor="middle"
              paint-order="stroke" stroke="#05060a" stroke-width="2">
          ${escapeHTML(r.country)}
        </text>
      </g>`
  }).join('')

  const realPaths = (window.SCOUTT_WORLD_MAP_PATHS || '').trim()

  wmap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
         class="absolute inset-0 w-full h-full">
      <defs>
        <radialGradient id="mapGlow" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stop-color="#0e1626" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#05060a" stop-opacity="1"/>
        </radialGradient>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" fill="none" stroke="#11151f" stroke-width="0.6"/>
        </pattern>
        <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0a1424"/>
          <stop offset="100%" stop-color="#050810"/>
        </linearGradient>
      </defs>

      <!-- Ocean / background -->
      <rect width="${W}" height="${H}" fill="url(#oceanGrad)"/>
      <rect width="${W}" height="${H}" fill="url(#mapGlow)"/>
      <rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.6"/>

      <!-- Latitude reference lines (equator + tropics) -->
      <g stroke="#1a2236" stroke-width="0.6" stroke-dasharray="2,3" fill="none">
        <line x1="0" y1="250" x2="${W}" y2="250" stroke="#2a3550"/>  <!-- Equator -->
        <line x1="0" y1="185" x2="${W}" y2="185"/>                    <!-- Tropic of Cancer -->
        <line x1="0" y1="315" x2="${W}" y2="315"/>                    <!-- Tropic of Capricorn -->
      </g>

      <!-- Real continents -->
      <g fill="#1c2638" stroke="#2f3a55" stroke-width="0.8" stroke-linejoin="round">
        ${realPaths}
      </g>

      <!-- Regional pins -->
      ${pins}
    </svg>`

  const tooltip = $('#map-tooltip')
  $$('.map-pin-g', wmap).forEach(g => {
    g.addEventListener('mouseenter', () => {
      if (!tooltip) return
      tooltip.innerHTML = `<div class="font-semibold text-white">${escapeHTML(g.dataset.country)}</div>
        <div class="text-[10px] mono text-gray-400 mt-1">${g.dataset.count} regulatory changes • activity ${g.dataset.activity}</div>`
      tooltip.style.opacity = '1'
    })
    g.addEventListener('mousemove', e => {
      if (!tooltip) return
      const c = wmap.getBoundingClientRect()
      tooltip.style.left = (e.clientX - c.left + 12) + 'px'
      tooltip.style.top  = (e.clientY - c.top + 12) + 'px'
    })
    g.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.opacity = '0' })
  })

  // QoQ chart
  const qoqCanvas = $('#chart-policy-trend')
  if (qoqCanvas) {
    if (STATE.charts.qoq) STATE.charts.qoq.destroy()
    const qoq = (p.policy?.qoq || []).slice().sort((a, b) => b.q2 - a.q2)
    const total = qoq.reduce((s, r) => s + r.q2, 0) || 1
    const q1total = qoq.reduce((s, r) => s + r.q1, 0) || 1
    const deltaPct = Math.round(((total - q1total) / q1total) * 100)
    const lbl = $('#policy-qoq-delta'); if (lbl) lbl.textContent = `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs Q1`
    STATE.charts.qoq = new Chart(qoqCanvas, {
      type: 'bar',
      data: {
        labels: qoq.map(r => (r.country || '').slice(0, 6)),
        datasets: [
          { label: 'Q1', data: qoq.map(r => r.q1), backgroundColor: '#3a4055', borderRadius: 3 },
          { label: 'Q2', data: qoq.map(r => r.q2), backgroundColor: '#06b6d4', borderRadius: 3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } },
          y: { ticks: { color: '#a1a8bd', font: { size: 10 } }, grid: { display: false } },
        },
      },
    })
  }

  // Active regulations cards
  const cards = $('#reg-cards')
  if (cards) {
    const regs = p.policy?.active_regulations || []
    cards.innerHTML = regs.length
      ? regs.map(regCard).join('')
      : '<div class="col-span-full text-center text-sm text-gray-500 py-8">No active regulations in your scope right now.</div>'
  }
}
function regCard(r) {
  const tags = (r.tags || []).slice(0, 3).map(t =>
    `<span class="px-2 py-0.5 mono text-[9px] uppercase rounded bg-policy/15 text-policy border border-policy/40">${escapeHTML(t)}</span>`).join(' ')
  return `<div class="card step-card p-4">
    <div class="flex items-center gap-2 text-[10px] mono uppercase text-policy mb-2">
      <i class="fa-solid fa-scale-balanced"></i> ${escapeHTML(r.source_name || 'Regulator')}
    </div>
    <h4 class="font-semibold text-sm mb-1">${escapeHTML(r.title)}</h4>
    <p class="text-xs text-gray-400 mb-3">${escapeHTML((r.summary || '').slice(0, 200))}</p>
    <div class="flex flex-wrap items-center gap-1.5 mb-3">${tags}</div>
    <div class="flex items-center justify-between text-[11px] mono text-gray-500">
      <span>sev ${r.severity}${r.deadline ? ' • due ' + r.deadline : ''}</span>
      <a href="${escapeHTML(r.source_url || '#')}" target="_blank" rel="noopener" class="text-policy hover:underline">Source →</a>
    </div>
  </div>`
}

/* ─── Competitor / Sentiment / Archetype / Sankey / SentimentVolume
       (unchanged from original — they were already data-driven) ─── */
function renderCompetitor(p) {
  const dt = $('#diff-timeline')
  if (dt) {
    const arr = p.competitor?.diff_timeline || []
    const colorOf = { pricing: '#f97316', product: '#06b6d4', hiring: '#ec4899' }
    const N = Math.max(1, arr.length - 1)
    dt.innerHTML = `<div class="absolute inset-0 flex items-center px-2"><div class="w-full h-px bg-ink-600"></div></div>
      ${arr.map((m, i) => {
        const x = (i / N) * 96 + 2
        const c = colorOf[m.kind] || '#06b6d4'
        return `<div class="absolute top-1/2 -translate-y-1/2" style="left:${x}%"><div class="w-3 h-3 rounded-full" style="background:${c};box-shadow:0 0 0 3px rgba(255,255,255,0.04),0 0 10px ${c}"></div></div>`
      }).join('')}
      <div class="absolute bottom-1 left-2 text-[10px] mono text-gray-500">7 days ago</div>
      <div class="absolute bottom-1 right-2 text-[10px] mono text-policy">now</div>`
  }

  const d = p.competitor?.pricing_diff
  if (d) {
    const t1 = $('#diff-title'); if (t1) t1.textContent = `Pricing Diff — ${d.url}`
    const b1 = $('#diff-before-time'); if (b1) b1.textContent = d.before_ts || '--'
    const a1 = $('#diff-after-time');  if (a1) a1.textContent = d.after_ts  || '--'
    const before = $('#diff-before'), after = $('#diff-after')
    if (before) before.innerHTML = (d.before_lines || []).map(l => l.startsWith('-')
      ? `<div class="bg-red-500/15 text-red-400 px-2 py-1 rounded">${escapeHTML(l)}</div>`
      : `<div>${escapeHTML(l)}</div>`).join('')
    if (after) after.innerHTML = (d.after_lines || []).map(l => l.startsWith('+')
      ? `<div class="bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded">${escapeHTML(l)}</div>`
      : `<div>${escapeHTML(l)}</div>`).join('')
    const fee = $('#diff-fee-pct'); if (fee) fee.textContent = `${d.fee_change_pct > 0 ? '+' : ''}${d.fee_change_pct}% fee`
    const th = $('#diff-threat'); if (th) th.textContent = String(d.threat_level)
  }

  const ctx = $('#chart-pricing-race')
  if (ctx) {
    if (STATE.charts.pr) STATE.charts.pr.destroy()
    const data = p.competitor?.pricing_race_30d || []
    STATE.charts.pr = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => (d.date || '').slice(5)),
        datasets: [
          { label: 'You',      data: data.map(d => d.you),      borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, pointRadius: 0, borderWidth: 2 },
          { label: 'Stripe',   data: data.map(d => d.stripe),   borderColor: '#f97316', tension: 0, pointRadius: 0, borderWidth: 2, stepped: true },
          { label: 'Adyen',    data: data.map(d => d.adyen),    borderColor: '#06b6d4', tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
          { label: 'Checkout', data: data.map(d => d.checkout), borderColor: '#ec4899', tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: '#3a4055', font: { size: 9 }, callback: v => '$' + (+v).toFixed(2) }, grid: { color: 'rgba(58,64,85,0.15)' } },
        },
      },
    })
  }

  const fm = p.competitor?.feature_matrix
  const fmEl = $('#feature-matrix')
  if (fmEl && fm) {
    fmEl.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-[10px] mono uppercase text-gray-500 border-b border-ink-700"><th class="text-left py-2 px-3 font-normal">Feature</th>${fm.competitors.map((c, i) => `<th class="py-2 px-3 font-normal ${i === 0 ? 'text-policy' : ''}">${escapeHTML(c)}</th>`).join('')}</tr></thead>
      <tbody>${fm.features.map(f => `<tr class="border-b border-ink-700/40 hover:bg-ink-800/30"><td class="py-2.5 px-3">${escapeHTML(f.name)}</td>${f.values.map((v, j) => `<td class="py-2.5 px-3 text-center ${j === 0 ? 'bg-policy/5' : ''}">${v ? '<i class="fa-solid fa-check text-emerald-400"></i>' : '<i class="fa-solid fa-xmark text-gray-600"></i>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  }

  const ce = $('#competitor-events')
  if (ce) {
    const events = p.competitor?.events || []
    ce.innerHTML = events.length ? events.map(e => `
      <div class="card step-card p-4">
        <div class="flex items-center gap-2 text-[10px] mono uppercase text-competitor mb-2"><i class="fa-solid fa-chess-knight"></i> ${escapeHTML((e.tags && e.tags[0]) || 'competitor')}</div>
        <h4 class="font-semibold text-sm mb-1">${escapeHTML(e.title)}</h4>
        <p class="text-xs text-gray-400 mb-3">${escapeHTML(e.summary || '')}</p>
        <div class="flex items-center justify-between text-[11px] mono text-gray-500">
          <span>sev ${e.severity}</span>
          <a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener" class="text-policy hover:underline">Source →</a>
        </div>
      </div>`).join('') : '<div class="col-span-full text-sm text-gray-500">No events.</div>'
  }
}

function renderSentiment(p) {
  const bc = $('#bubble-chart')
  if (bc) {
    const data = p.sentiment?.topic_cluster || []
    const W = bc.clientWidth || 700, H = 420
    const cx = W / 2, cy = H / 2
    const maxM = Math.max(...data.map(d => d.mentions), 1)
    const placed = []
    data.forEach(b => {
      const r = 22 + (b.mentions / maxM) * 36
      let x, y, tries = 0, ok = false
      while (tries++ < 500) {
        const ang = Math.random() * Math.PI * 2
        const dist = Math.random() * (Math.min(W, H) / 2 - r - 12)
        x = cx + Math.cos(ang) * dist
        y = cy + Math.sin(ang) * dist
        if (placed.every(q => Math.hypot(q.x - x, q.y - y) > q.r + r + 6)) { ok = true; break }
      }
      placed.push({ x, y, r, b, ok })
    })
    bc.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full">
      ${placed.map(({ x, y, r, b }) => {
        const c = b.sentiment > 0.2 ? '#10b981' : b.sentiment < -0.2 ? '#ec4899' : '#a1a8bd'
        const maxChars = Math.max(4, Math.floor(r / 4))
        const label = b.topic.length > maxChars ? b.topic.slice(0, maxChars - 1) + '…' : b.topic
        const fontSize = Math.max(9, Math.min(13, r / 4))
        return `<g>
          <circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="1.5"/>
          <text x="${x}" y="${y + 4}" fill="#e7eaf3" font-size="${fontSize}" font-family="Inter" text-anchor="middle">${escapeHTML(label)}</text>
        </g>`
      }).join('')}
    </svg>`
  }

  const div = $('#chart-diverging')
  if (div) {
    if (STATE.charts.dv) STATE.charts.dv.destroy()
    const arr = p.sentiment?.delta_vs_competitors || []
    STATE.charts.dv = new Chart(div, {
      type: 'bar',
      data: {
        labels: arr.map(d => d.name),
        datasets: [{
          data: arr.map(d => d.value),
          backgroundColor: arr.map(d => d.value > 0 ? '#10b981' : '#ec4899'),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#3a4055', font: { size: 10 } }, grid: { color: 'rgba(58,64,85,0.2)' }, min: -30, max: 30 },
          y: { ticks: { color: '#a1a8bd', font: { size: 11 } }, grid: { display: false } },
        },
      },
    })
  }

  const wc = $('#word-cloud')
  if (wc) {
    const words = p.sentiment?.word_cloud || []
    const palette = ['#06b6d4', '#f97316', '#ec4899', '#10b981', '#a1a8bd']
    const maxV = Math.max(...words.map(w => w.value), 1)
    wc.innerHTML = words.map((w, i) => {
      const size = 12 + (w.value / maxV) * 26
      const c = palette[i % palette.length]
      return `<span class="inline-block font-semibold hover:scale-110 transition" style="font-size:${size}px;color:${c}">${escapeHTML(w.text)}</span>`
    }).join('')
  }

  STATE.quoteIdx = 0
  renderQuote(p)

  const sef = $('#sentiment-events-feed')
  if (sef) {
    const events = p.sentiment?.events || []
    sef.innerHTML = events.length ? events.map(e => `
      <div class="card step-card p-4">
        <div class="flex items-center gap-2 text-[10px] mono uppercase text-sentiment mb-2"><i class="fa-solid fa-wave-square"></i> sentiment</div>
        <h4 class="font-semibold text-sm mb-1">${escapeHTML(e.title)}</h4>
        <p class="text-xs text-gray-400 mb-3">${escapeHTML(e.summary || '')}</p>
        <div class="flex items-center justify-between text-[11px] mono text-gray-500">
          <span>sev ${e.severity}</span>
          <a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener" class="text-policy hover:underline">Source →</a>
        </div>
      </div>`).join('') : '<div class="col-span-full text-sm text-gray-500">No sentiment events.</div>'
  }
}

function renderQuote(p) {
  const host = $('#quote-card'); if (!host) return
  const qs = (p || STATE.payload)?.sentiment?.quotes || []
  if (!qs.length) { host.innerHTML = '<div class="text-xs text-gray-500">No quotes.</div>'; return }
  const idx = STATE.quoteIdx % qs.length
  const q = qs[idx]
  const cnt = $('#quote-counter'); if (cnt) cnt.textContent = `${idx + 1} / ${qs.length}`
  host.innerHTML = `
    <div class="text-sm leading-relaxed mb-3">"${escapeHTML(q.text)}"</div>
    <div class="flex items-center justify-between text-[11px] mono text-gray-500">
      <span>${escapeHTML(q.src || '')}</span>
      <span class="text-competitor">${escapeHTML(q.stars || '')}</span>
    </div>`
}

function renderArchetype(p) {
  const a = p.archetype || {}
  const ctx = $('#chart-radar'); if (!ctx) return
  if (STATE.charts.rd) STATE.charts.rd.destroy()
  const ind = $('#archetype-industry'); if (ind) ind.textContent = a.industry || '--'
  const hi = $('#archetype-higher');    if (hi)  hi.textContent  = (a.higher  || []).join(', ') || '--'
  const lo = $('#archetype-lower');     if (lo)  lo.textContent  = (a.lower   || []).join(', ') || '--'
  const ne = $('#archetype-neutral');   if (ne)  ne.textContent  = (a.neutral || []).join(', ') || '--'
  STATE.charts.rd = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: a.axes || [],
      datasets: [
        { label: 'You',               data: a.you      || [], borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.15)', pointBackgroundColor: '#06b6d4' },
        { label: 'Industry baseline', data: a.baseline || [], borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.10)', pointBackgroundColor: '#f97316' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 11 } } } },
      scales: {
        r: {
          angleLines: { color: 'rgba(58,64,85,0.4)' }, grid: { color: 'rgba(58,64,85,0.3)' },
          pointLabels: { color: '#a1a8bd', font: { size: 10 } },
          ticks: { color: '#3a4055', backdropColor: 'transparent', font: { size: 9 } },
          suggestedMin: 0, suggestedMax: 100,
        },
      },
    },
  })
}

function renderSankey(p) {
  const host = $('#sankey-container'); if (!host) return
  const t = p.threats_to_actions || { sources: [], targets: [], links: [] }
  const srcColors = ['#06b6d4', '#f97316', '#ec4899', '#10b981']
  const srcY = t.sources.map((_, i, a) => 30 + (i * (160 / Math.max(a.length, 1))))
  const tgtY = t.targets.map((_, i, a) => 40 + (i * (140 / Math.max(a.length, 1))))

  const srcRects = t.sources.map((n, i) => `
    <rect x="10" y="${srcY[i] - 18}" width="14" height="36" fill="${srcColors[i % 4]}" rx="2" />
    <text x="32" y="${srcY[i] - 2}" fill="#e7eaf3" font-family="Inter" font-size="11" font-weight="500">${escapeHTML(n.label)}</text>
    <text x="32" y="${srcY[i] + 12}" fill="${srcColors[i % 4]}" font-family="JetBrains Mono" font-size="10">${n.count} threats</text>`).join('')

  const tgtRects = t.targets.map((n, i) => `
    <rect x="280" y="${tgtY[i] - 14}" width="14" height="28" fill="#10b981" rx="2" />
    <text x="275" y="${tgtY[i] - 2}" fill="#e7eaf3" font-family="Inter" font-size="11" font-weight="500" text-anchor="end">${escapeHTML(n.label)}</text>`).join('')

  const flows = (t.links || []).map(l => {
    const y1 = srcY[l.from] || 30, y2 = tgtY[l.to] || 50
    const w = Math.max(1.5, Math.min(6, Number(l.value) || 2))
    return `<path d="M 24 ${y1} C 150 ${y1} 150 ${y2} 280 ${y2}" stroke="${srcColors[l.from % 4]}" stroke-width="${w}" fill="none" opacity="0.45" />`
  }).join('')

  host.innerHTML = `<svg viewBox="0 0 320 200" class="w-full">${flows}${srcRects}${tgtRects}</svg>`
}

function renderSentimentVolume(p) {
  const ctx = $('#chart-sentiment-volume'); if (!ctx) return
  const data = p.sentiment_volume_14d || []
  if (STATE.charts.sv) STATE.charts.sv.destroy()
  STATE.charts.sv = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => (d.date || '').slice(5)),
      datasets: [
        { label: 'Positive', data: data.map(d => d.positive), backgroundColor: 'rgba(16,185,129,0.45)', borderColor: '#10b981', fill: true, tension: 0.35, pointRadius: 0 },
        { label: 'Neutral',  data: data.map(d => d.neutral),  backgroundColor: 'rgba(58,64,85,0.45)',  borderColor: '#3a4055', fill: true, tension: 0.35, pointRadius: 0 },
        { label: 'Negative', data: data.map(d => d.negative), backgroundColor: 'rgba(236,72,153,0.45)', borderColor: '#ec4899', fill: true, tension: 0.35, pointRadius: 0 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 10 } } } },
      scales: {
        x: { stacked: true, ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } },
        y: { stacked: true, ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } },
      },
    },
  })
}

/* ─── Tab activation ─────────────────────────────────────────── */
function activateTab(name) {
  $$('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === name))
  $$('.tab-btn').forEach(b => b.classList.toggle('text-gray-400', b.dataset.tab !== name))
  $$('.tab-pane').forEach(s => s.classList.toggle('hidden', s.dataset.pane !== name))
}

/* ─── Time Machine ────────────────────────────────────────────── */
async function updateTimeMachine(day) {
  const lbl = $('#time-machine-label')
  if (lbl) lbl.textContent = day === 0 || day === '0' ? 'Today — live' : `Day −${day}`
  try {
    const data = await SCOUTT.fetch(`/api/dashboard?day=${day}`)
    STATE.payload = data; STATE.day = +day
    renderAll(data)
  } catch (e) { showToast('Time machine error: ' + e.message, 'error') }
}

/* ─── ⌘K palette ────────────────────────────────────────────── */
function openCmdk() {
  const c = $('#cmdk'); if (!c) return
  c.classList.remove('hidden'); setTimeout(() => $('#cmdk-input')?.focus(), 50)
}
function closeCmdk() {
  const c = $('#cmdk'); if (!c) return
  c.classList.add('hidden')
  $('#cmdk-results')?.classList.add('hidden')
  $('#cmdk-output')?.classList.add('hidden')
  $('#cmdk-suggestions')?.classList.remove('hidden')
  const i = $('#cmdk-input'); if (i) i.value = ''
}
async function refreshSearchIndex() {
  try { const { index } = await SCOUTT.fetch('/api/search-index'); GLOBAL_INDEX = index || [] }
  catch { GLOBAL_INDEX = [] }
}
function renderSearchResults(q) {
  const sugg = $('#cmdk-suggestions'); const out = $('#cmdk-output'); const results = $('#cmdk-results')
  if (!q.trim()) { results.classList.add('hidden'); sugg.classList.remove('hidden'); out.classList.add('hidden'); return }
  sugg.classList.add('hidden'); out.classList.add('hidden')
  const term = q.toLowerCase()
  const matches = GLOBAL_INDEX.filter(r => (r.title || '').toLowerCase().includes(term) || (r.subtitle || '').toLowerCase().includes(term)).slice(0, 12)
  results.classList.remove('hidden')
  results.innerHTML = matches.length ? matches.map(m => `
    <button type="button" data-tab="${m.tab}" class="cmdk-result w-full text-left px-4 py-3 hover:bg-ink-700/60 border-b border-ink-700/40 flex items-start gap-3">
      <span class="text-[10px] mono uppercase text-gray-500 shrink-0 pt-0.5">${escapeHTML(m.section)}</span>
      <div class="flex-1">
        <div class="text-sm font-medium">${escapeHTML(m.title)}</div>
        <div class="text-xs text-gray-500 line-clamp-1">${escapeHTML(m.subtitle || '')}</div>
      </div>
    </button>`).join('') + `<div class="px-4 py-2 text-[11px] text-gray-500 mono">Press Enter to Ask SCOUTT instead</div>`
    : '<div class="px-4 py-6 text-xs text-gray-500 text-center">No matches. Press Enter to ask SCOUTT.</div>'
  $$('.cmdk-result').forEach(b => b.addEventListener('click', () => { activateTab(b.dataset.tab); closeCmdk() }))
}
function linkifyCitations(text) {
  return escapeHTML(text || '').replace(/\[(\d+)\]/g, '<span class="text-policy font-semibold">[$1]</span>')
}
async function askIt() {
  const q = $('#cmdk-input')?.value.trim(); if (!q) return
  const sugg = $('#cmdk-suggestions'); const results = $('#cmdk-results'); const out = $('#cmdk-output')
  sugg.classList.add('hidden'); results.classList.add('hidden'); out.classList.remove('hidden')
  out.innerHTML = '<div class="flex items-center gap-2 text-gray-400 text-sm"><div class="w-4 h-4 border-2 border-policy border-t-transparent rounded-full animate-spin"></div> Thinking…</div>'
  try {
    const data = await SCOUTT.post('/api/ask', { question: q })
    out.innerHTML = `<div class="text-sm leading-relaxed">${linkifyCitations(data.answer)}</div>
      <div class="mt-4 border-t border-ink-700 pt-3"><div class="text-[10px] mono uppercase text-gray-500 mb-2">Citations</div>
      <div class="flex flex-wrap gap-1.5">${(data.citations || []).map(c => `<button type="button" data-url="${escapeHTML(c.url)}" class="citation-chip text-[11px] mono px-2 py-1 rounded border border-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'}/50 text-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'} hover:bg-ink-700 cursor-pointer">${c.ref} ${escapeHTML((c.title || '').slice(0, 50))}</button>`).join('')}</div></div>
      <div class="text-[10px] mono text-gray-600 mt-3">model: ${escapeHTML(data.model || '')}</div>`
    $$('.citation-chip').forEach(b => b.addEventListener('click', () => window.open(b.dataset.url, '_blank')))
  } catch (e) {
    out.innerHTML = `<div class="text-red-400 text-sm">Error: ${escapeHTML(e.message)}</div>`
  }
}

/* ─── API key modal helpers ─────────────────────────────────── */
function refreshKeyUI() {
  const label = $('#apikey-label'), icon = $('#apikey-icon')
  if (!label || !icon) return
  if (SCOUTT.hasKey) { label.textContent = 'Live • Anakin'; icon.classList.remove('text-policy'); icon.classList.add('text-emerald-400') }
  else { label.textContent = 'Enter API Key'; icon.classList.add('text-policy'); icon.classList.remove('text-emerald-400') }
}
function openKeyModal() {
  const m = $('#apikey-modal'); if (!m) return
  m.classList.remove('hidden')
  const inp = $('#apikey-input'); if (inp) inp.value = SCOUTT.apiKey
  $('#apikey-status')?.classList.add('hidden')
  setTimeout(() => $('#apikey-input')?.focus(), 50)
}
function closeKeyModal() { $('#apikey-modal')?.classList.add('hidden') }
function showStatus(text, ok) {
  const el = $('#apikey-status'); if (!el) return
  el.classList.remove('hidden')
  el.className = `mt-3 text-xs ${ok ? 'text-emerald-400' : 'text-red-400'}`
  el.textContent = text
}

/* ─── Transparency drawer ─────────────────────────────────── */
function closeDrawer() {
  $('#transparency-backdrop')?.classList.add('hidden')
  $('#transparency-drawer')?.classList.remove('open')
}
function renderTransparency(d) {
  return Object.entries(d).map(([k, v]) => `
    <div>
      <h3 class="text-xs mono uppercase text-policy mb-2">${k}</h3>
      <pre class="bg-ink-900 border border-ink-700 rounded-lg p-3 text-[11px] mono text-gray-300 whitespace-pre-wrap break-words max-h-[280px] overflow-auto">${escapeHTML(JSON.stringify(v, null, 2))}</pre>
    </div>`).join('')
}

/* ─── Brief modal ─────────────────────────────────────────── */
function openBriefModal() {
  const m = $('#brief-modal'); if (!m) return
  m.classList.remove('hidden')
  const p = STATE.payload; if (!p) return
  const title = $('#brief-modal-title'); if (title) title.textContent = p.briefing?.headline || 'Today'
  const body = $('#brief-modal-body'); if (!body) return
  body.innerHTML = (p.briefing?.events || []).map(e => `
    <div class="border-l-2 border-${e.pillar === 'policy' ? 'policy' : e.pillar === 'competitor' ? 'competitor' : 'sentiment'} pl-3">
      <div class="text-[10px] mono uppercase text-gray-500 mb-1">${escapeHTML(e.pillar)} • sev ${e.severity}</div>
      <div class="text-sm font-semibold">${escapeHTML(e.title)}</div>
      <p class="text-xs text-gray-400 mt-1">${escapeHTML(e.summary || '')}</p>
      <a href="${escapeHTML(e.source_url || '#')}" target="_blank" rel="noopener" class="text-[11px] text-policy hover:underline">${escapeHTML(e.source_name || 'source')} →</a>
    </div>`).join('') || '<div class="text-xs text-gray-500">No events.</div>'
}
function closeBriefModal() { $('#brief-modal')?.classList.add('hidden') }

/* ─── Audio TTS ───────────────────────────────────────────── */
let _audioBusy = false, _audioObjUrl = null
function setListenLoading(on) {
  const icon = $('#play-audio-icon'); if (!icon) return
  icon.innerHTML = on
    ? '<div class="w-4 h-4 border-2 border-policy border-t-transparent rounded-full animate-spin"></div>'
    : '<i class="fa-solid fa-headphones text-policy"></i>'
}
function stopAudio() {
  $('#audio-toast')?.classList.add('hidden')
  const a = $('#audio-el'); if (a) { a.pause(); a.currentTime = 0 }
  if (window.speechSynthesis) speechSynthesis.cancel()
}
async function playBriefAudio() {
  if (_audioBusy) return; _audioBusy = true
  const b = STATE.payload?.briefing
  const text = b ? `Threat level ${b.threat_level}. ${b.headline || ''} ${(b.events || []).slice(0, 4).map(e => e.title).join('. ')}.`
                 : 'No briefing loaded.'
  const toast = $('#audio-toast'); const sub = $('#audio-toast-sub'); const title = $('#audio-toast-title')
  setListenLoading(true)
  toast?.classList.remove('hidden')
  if (sub)   sub.textContent = 'Calling ElevenLabs…'
  if (title) title.textContent = 'Generating audio…'
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SCOUTT.headers() },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error('TTS proxy returned ' + res.status)
    const blob = await res.blob()
    if (_audioObjUrl) URL.revokeObjectURL(_audioObjUrl)
    _audioObjUrl = URL.createObjectURL(blob)
    const audio = $('#audio-el'); audio.src = _audioObjUrl
    if (sub)   sub.textContent = 'ElevenLabs • playing'
    if (title) title.textContent = 'Reading your brief'
    setListenLoading(false)
    await audio.play()
    audio.onended = () => { toast?.classList.add('hidden') }
  } catch (e) {
    if (sub) sub.textContent = 'Browser TTS fallback'
    setListenLoading(false)
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.pitch = 1
      speechSynthesis.cancel(); speechSynthesis.speak(u)
      u.onend = () => toast?.classList.add('hidden')
    } else {
      if (title) title.textContent = 'TTS unavailable'
      setTimeout(() => toast?.classList.add('hidden'), 2500)
    }
  } finally { _audioBusy = false }
}

/* ═════════════════════ SCENARIO ══════════════════════════════ */
async function runScenario() {
  const input = $('#scenario-input'); const scenario = input?.value.trim(); if (!scenario) return
  const btn = $('#scenario-run'); const err = $('#scenario-error'); const result = $('#scenario-result')
  if (!btn) return
  btn.disabled = true
  btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin"></div> Re-running…'
  if (err) err.classList.add('hidden')
  if (result) result.classList.add('hidden')

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 25_000)
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SCOUTT.headers() },
      body: JSON.stringify({ scenario }), signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error('scenario ' + res.status)
    const data = await res.json()
    if (result) result.classList.remove('hidden')
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v }
    set('#s-before',  data.threat_level_before)
    set('#s-after',   data.threat_level_after)
    set('#s-threats', '+' + (data.delta_threats || 0))
    set('#s-actions', '+' + (data.delta_actions || 0))
    const n = $('#s-narrative'); if (n) n.textContent = data.narrative || ''
    const ev = $('#s-events')
    if (ev) ev.innerHTML = (data.impacted_events || []).map(e => `
      <div class="card p-3 flex items-start gap-3">
        <i class="fa-solid fa-arrow-trend-up text-action mt-1"></i>
        <div class="flex-1">
          <div class="text-sm font-medium">${escapeHTML(e.title)}</div>
          <div class="text-xs text-gray-500">sev ${e.severity} • ${escapeHTML(e.pillar)}</div>
        </div>
      </div>`).join('')
  } catch (e) {
    if (err) {
      err.classList.remove('hidden')
      err.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2"></i>Scenario failed: ${escapeHTML(e.message || String(e))}.`
    } else { showToast('Scenario failed: ' + e.message, 'error') }
  } finally {
    btn.disabled = false
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Run scenario'
  }
}

/* ═════════════════════ EVENT WIRING ══════════════════════════════ */
function wireEvents() {
  document.addEventListener('click', e => {
    const tabBtn = e.target.closest('.tab-btn')
    if (tabBtn && tabBtn.dataset.tab) activateTab(tabBtn.dataset.tab)
  })

  $('#cmdk-trigger')?.addEventListener('click', openCmdk)
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk() }
    if (e.key === 'Escape') { closeCmdk(); closeBriefModal(); closeKeyModal(); closeDrawer() }
  })
  const inp = $('#cmdk-input')
  inp?.addEventListener('input', debounce(() => renderSearchResults(inp.value), 120))
  inp?.addEventListener('keydown', e => { if (e.key === 'Enter') askIt() })
  $$('.cmdk-suggestion').forEach(b => b.addEventListener('click', () => {
    inp.value = b.textContent.replace(/^→ Ask SCOUTT:\s*/, '').replace(/^"/, '').replace(/"$/, '')
    if (b.classList.contains('ask')) askIt(); else renderSearchResults(inp.value)
  }))
  $('#cmdk')?.addEventListener('click', e => { if (e.target.id === 'cmdk') closeCmdk() })

  // API key modal
  $('#apikey-btn')?.addEventListener('click', openKeyModal)
  $('#apikey-cancel')?.addEventListener('click', closeKeyModal)
  $('#apikey-close')?.addEventListener('click', closeKeyModal)
  $('#apikey-clear')?.addEventListener('click', async () => {
    try { localStorage.removeItem('scoutt_anakin_key') } catch {}
    SCOUTT.apiKey = ''; refreshKeyUI(); showStatus('Key cleared.', true)
    try { await SCOUTT.post('/api/dashboard/refresh', {}) } catch {}
    const data = await fetchPayload(0); await renderAll(data)
    setTimeout(closeKeyModal, 700)
  })
  $('#apikey-save')?.addEventListener('click', async () => {
    const k = $('#apikey-input')?.value.trim() || ''
    if (!k) { showStatus('Paste a key first.', false); return }
    try { localStorage.setItem('scoutt_anakin_key', k) } catch {}
    SCOUTT.apiKey = k; refreshKeyUI(); showStatus('Key saved. Launching live pipeline…', true)
    try { await SCOUTT.post('/api/dashboard/refresh', {}) } catch {}
    try {
      // Kick off the 3-step browser-orchestrated pipeline.
      // 🔥 runLivePipeline() already calls renderAll() on success, but
      //    we ALSO call it here as a belt-and-suspenders guarantee that
      //    every tab gets refreshed with the live data the moment the
      //    user clicks Save. This is what previously failed: the toast
      //    said success but no re-render ran for the demo-fallback path.
      const live = await runLivePipeline()
      if (live) {
        STATE.payload = live
        await renderAll(live)
      }
      if (live && live.source === 'anakin-live') {
        showStatus('✓ Live Anakin → Groq llama-4-scout data flowing.', true)
      } else {
        showStatus('Live call failed — running on demo. Re-try in 10s.', false)
      }
      setTimeout(closeKeyModal, 1500)
    } catch (e) { showStatus('Failed: ' + e.message, false) }
  })
  $('#apikey-modal')?.addEventListener('click', e => { if (e.target.id === 'apikey-modal') closeKeyModal() })

  // Transparency
  $('#transparency-trigger')?.addEventListener('click', async () => {
    $('#transparency-backdrop')?.classList.remove('hidden')
    $('#transparency-drawer')?.classList.add('open')
    try {
      const d = await SCOUTT.fetch('/api/transparency')
      const body = $('#transparency-body'); if (body) body.innerHTML = renderTransparency(d)
    } catch (e) {
      const body = $('#transparency-body'); if (body) body.innerHTML = `<div class="text-red-400">${escapeHTML(e.message)}</div>`
    }
  })
  $('#transparency-close')?.addEventListener('click', closeDrawer)
  $('#transparency-backdrop')?.addEventListener('click', closeDrawer)

  // Read full brief + audio
  $('#read-full-brief')?.addEventListener('click', openBriefModal)
  $('#brief-modal-close')?.addEventListener('click', closeBriefModal)
  $('#brief-modal')?.addEventListener('click', e => { if (e.target.id === 'brief-modal') closeBriefModal() })
  $('#play-audio')?.addEventListener('click', playBriefAudio)
  $('#audio-stop')?.addEventListener('click', stopAudio)

  // Time Machine
  const tm = $('#time-machine')
  tm?.addEventListener('input',  e => updateTimeMachine(e.target.value))
  tm?.addEventListener('change', e => updateTimeMachine(e.target.value))
  $('#time-machine-reset')?.addEventListener('click', () => { if (tm) tm.value = 0; updateTimeMachine(0) })

  // Quotes
  $('#quote-prev')?.addEventListener('click', () => { STATE.quoteIdx = (STATE.quoteIdx - 1 + 1000) % 1000; renderQuote() })
  $('#quote-next')?.addEventListener('click', () => { STATE.quoteIdx = (STATE.quoteIdx + 1) % 1000; renderQuote() })

  // Scenario
  $('#scenario-run')?.addEventListener('click', runScenario)
  $('#scenario-input')?.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runScenario()
  })
}

/* ═════════════════════ BOOT ══════════════════════════════════ */
async function boot() {
  refreshKeyUI()
  wireEvents()
  try {
    const data = await fetchPayload(0)
    await renderAll(data)
  } catch (e) {
    showToast('Initial load failed: ' + e.message, 'error')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}


;(function patchSCOUTT() {
  if (typeof window === 'undefined' || !window.SCOUTT) {
    console.warn('[scoutt-patch] SCOUTT object not found — patch skipped')
    return
  }

  // ── 1. SCOUTT.syncOnboarding() ────────────────────────────────────
  SCOUTT.syncOnboarding = async function () {
    if (!this.apiKey) return null
    let saved = null
    try { saved = JSON.parse(localStorage.getItem('scoutt_onboarding') || 'null') } catch {}
    if (!saved) return null
    const payload = {
      industry: saved.industry || 'B2B SaaS Fintech',
      region: saved.region || 'US',
      competitor_domains: saved.competitors || saved.competitor_domains || [],
      pillars_enabled: saved.pillars || saved.pillars_enabled || [],
    }
    if (!payload.competitor_domains.length) return null
    try {
      const r = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Anakin-Key': this.apiKey },
        body: JSON.stringify(payload),
      })
      return await r.json().catch(() => null)
    } catch (e) {
      console.warn('[scoutt-patch] syncOnboarding failed:', e)
      return null
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel)
  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]))
  }

  // ── 2. Override apikey-save (idempotent — only attach once) ───────
  function rewireApiKeySave() {
    const btn = document.getElementById('apikey-save')
    if (!btn || btn.dataset.patched === '1') return
    btn.dataset.patched = '1'

    // Clone-and-replace removes ALL previous listeners installed by the
    // original wireEvents(), so our handler is the single source of truth.
    const fresh = btn.cloneNode(true)
    btn.parentNode.replaceChild(fresh, btn)

    fresh.addEventListener('click', async () => {
      const input = document.getElementById('apikey-input')
      const k = (input?.value || '').trim()
      const status = document.getElementById('apikey-status')
      const setStatus = (msg, ok) => {
        if (!status) return
        status.classList.remove('hidden', 'text-emerald-400', 'text-red-400')
        status.classList.add(ok ? 'text-emerald-400' : 'text-red-400')
        status.textContent = msg
      }
      if (!k) { setStatus('Paste a key first.', false); return }

      try { localStorage.setItem('scoutt_anakin_key', k) } catch {}
      SCOUTT.apiKey = k
      if (typeof refreshKeyUI === 'function') refreshKeyUI()
      setStatus('Key saved. Syncing your tenant…', true)

      // 🔥 CRITICAL — push onboarding answers BEFORE invalidating the
      //              dashboard cache and running the live pipeline, so
      //              /api/anakin/start picks up the user's competitors.
      try { await SCOUTT.syncOnboarding() } catch {}

      try { await SCOUTT.post('/api/dashboard/refresh', {}) } catch {}

      setStatus('Tenant synced. Launching live pipeline…', true)
      try {
        const live = await runLivePipeline()
        if (live) {
          STATE.payload = live
          if (typeof renderAll === 'function') await renderAll(live)
        }
        if (live && live.source === 'anakin-live') {
          setStatus('✓ Live Anakin → Groq llama-4-scout data flowing.', true)
        } else {
          setStatus('Live call did not complete — showing demo. Try again in 10s.', false)
        }
        setTimeout(() => {
          if (typeof closeKeyModal === 'function') closeKeyModal()
        }, 1500)
      } catch (e) {
        setStatus('Failed: ' + (e.message || e), false)
      }
    })
  }

  // ── 3. Override runScenario() to render Groq-live response ───────
  window.runScenario = async function () {
    const input = $('#scenario-input')
    const scenario = (input?.value || '').trim()
    if (!scenario) return
    const btn = $('#scenario-run')
    const err = $('#scenario-error')
    const result = $('#scenario-result')
    if (!btn) return
    btn.disabled = true
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin inline-block"></div> Re-running…'
    if (err) err.classList.add('hidden')
    if (result) result.classList.add('hidden')

    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 25_000)
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...SCOUTT.headers() },
        body: JSON.stringify({ scenario }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error('scenario ' + res.status)
      const data = await res.json()

      if (result) result.classList.remove('hidden')
      const set = (id, v) => { const el = $(id); if (el) el.textContent = v }
      set('#s-before',  data.threat_level_before)
      set('#s-after',   data.threat_level_after)
      set('#s-threats', '+' + (data.delta_threats || 0))
      set('#s-actions', '+' + (data.delta_actions || 0))

      // Narrative + provenance badge
      const n = $('#s-narrative')
      if (n) {
        const badge = data.mode === 'groq-live'
          ? '<span class="ml-2 inline-block text-[10px] mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">live · ' + escapeHTML(data.model || 'groq') + '</span>'
          : '<span class="ml-2 inline-block text-[10px] mono uppercase px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-300 border border-gray-500/30">' + escapeHTML(data.mode || 'offline') + '</span>'
        n.innerHTML = escapeHTML(data.narrative || '') + badge
      }

      // Impacted events — with optional source URL chip
      const ev = $('#s-events')
      if (ev) {
        ev.innerHTML = (data.impacted_events || []).map((e) => {
          const link = e.source_url
            ? `<a href="${escapeHTML(e.source_url)}" target="_blank" rel="noopener" class="text-[10px] text-policy hover:underline mono ml-2">↗ source</a>`
            : ''
          return `
          <div class="card p-3 flex items-start gap-3">
            <i class="fa-solid fa-arrow-trend-up text-action mt-1"></i>
            <div class="flex-1">
              <div class="text-sm font-medium">${escapeHTML(e.title)} ${link}</div>
              <div class="text-xs text-gray-500">sev ${e.severity} • ${escapeHTML(e.pillar)}</div>
            </div>
          </div>`
        }).join('')
      }
    } catch (e) {
      if (err) {
        err.classList.remove('hidden')
        err.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2"></i>Scenario failed: ${escapeHTML(e.message || String(e))}.`
      } else if (typeof showToast === 'function') {
        showToast('Scenario failed: ' + e.message, 'error')
      }
    } finally {
      btn.disabled = false
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Run scenario'
    }
  }

  // Apply the api-key-save rewiring after DOM is ready.
  function wirePatch() {
    rewireApiKeySave()
    // If the user already had an API key in localStorage from a previous
    // session, sync the (possibly newly-completed) onboarding to the server
    // right now — so the dashboard's first fetch reflects their choices
    // even before they re-open the API-key modal.
    if (SCOUTT.apiKey) {
      SCOUTT.syncOnboarding().catch(() => {})
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wirePatch)
  } else {
    wirePatch()
  }
})()

