// =====================================================================
// SCOUTT — Dashboard interactivity (FULL REWRITE — fixes tab switching,
// API key modal, Listen/Read brief, Time Machine, logo, ⌘K search, TTS.)
// =====================================================================

const $  = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

// ─── API KEY STATE ───────────────────────────────────────────────────
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
    if (!res.ok) throw new Error(`${url} → ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  },
  async post(url, body) {
    return this.fetch(url, { method: 'POST', body: JSON.stringify(body || {}) })
  },
}
SCOUTT.init()

// ─── Cached datasets used by global search ───────────────────────────
let GLOBAL_INDEX = []
const STATE = { briefing: null, timeline: null, actions: null, sentimentVolume: null }

// =====================================================================
// API KEY UI
// =====================================================================
function refreshKeyUI() {
  const label = $('#apikey-label'), icon = $('#apikey-icon')
  if (!label || !icon) return
  if (SCOUTT.hasKey) {
    label.textContent = 'Live • Anakin'
    icon.classList.remove('text-policy'); icon.classList.add('text-emerald-400')
  } else {
    label.textContent = 'Enter API Key'
    icon.classList.add('text-policy'); icon.classList.remove('text-emerald-400')
  }
}

function openKeyModal() {
  const m = $('#apikey-modal'); if (!m) return
  m.classList.remove('hidden')
  const inp = $('#apikey-input')
  if (inp) inp.value = SCOUTT.apiKey
  $('#apikey-status')?.classList.add('hidden')
  setTimeout(() => $('#apikey-input')?.focus(), 50)
}
function closeKeyModal() { $('#apikey-modal')?.classList.add('hidden') }

function showStatus(msg, ok = true) {
  const el = $('#apikey-status'); if (!el) return
  el.classList.remove('hidden')
  el.className = `mt-3 text-xs ${ok ? 'text-emerald-400' : 'text-red-400'}`
  el.textContent = msg
}

function showToast(text = 'Live mode active. Regenerating briefing from Anakin…', kind = 'info') {
  const color = kind === 'error' ? 'bg-red-500' : 'bg-emerald-400'
  const t = document.createElement('div')
  t.className = 'fixed top-20 right-6 z-[70] card p-4 shadow-glow-cyan flex items-center gap-3 slide-up max-w-sm'
  t.innerHTML = `<div class="w-3 h-3 rounded-full ${color} pulse-ring shrink-0"></div><div class="text-sm">${text}</div>`
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 4500)
}

// =====================================================================
// TAB SWITCHING  (fixes Issue #1 + #a + #f)
// =====================================================================
function activateTab(target) {
  if (!target) return
  $$('.tab-btn').forEach(b => {
    if (b.dataset.tab === target) { b.classList.add('tab-active'); b.classList.remove('text-gray-400') }
    else { b.classList.remove('tab-active'); b.classList.add('text-gray-400') }
  })
  $$('.tab-pane').forEach(p => p.classList.add('hidden'))
  const pane = document.querySelector(`[data-pane="${target}"]`)
  if (pane) pane.classList.remove('hidden')
  // Charts inside a hidden container don't size correctly — force re-layout.
  window.dispatchEvent(new Event('resize'))
  if (target === 'policy')     ensurePolicyLoaded()
  if (target === 'competitor') ensureCompetitorLoaded()
  if (target === 'sentiment')  ensureSentimentLoaded()
  if (target === 'archetype')  ensureArchetypeLoaded()
  if (target === 'command')    { /* command center always pre-loaded */ }
}

// =====================================================================
// BRIEFING / TIMELINE / ACTIONS  (fills Last 7 days + Today's actions)
// =====================================================================
async function loadBriefing() {
  try {
    const data = await SCOUTT.fetch('/api/briefing/today')
    STATE.briefing = data
    const hi = (data.events || []).filter(e => e.high_impact).length || (data.events || []).length || 4
    const be = $('#banner-events'); if (be) be.textContent = hi
    const bt = $('#banner-threat'); if (bt) bt.textContent = data.threat_level ?? 73
    const bs = $('#banner-summary'); if (bs && data.headline) bs.textContent = data.headline
    // Update KPI cards from briefing when available
    const k = data.kpis
    if (k) {
      const setKpi = (key, v) => { const card = document.querySelector(`[data-kpi="${key}"] .kpi-value`); if (card) card.textContent = v }
      if (k.threats_detected != null) setKpi('threats', String(k.threats_detected))
      if (k.opportunities    != null) setKpi('opps',     String(k.opportunities))
      if (k.action_items     != null) setKpi('actions-kpi', String(k.action_items))
      if (k.avg_response_time_minutes != null) setKpi('response', `${k.avg_response_time_minutes}m`)
    }
    return data
  } catch (e) {
    console.warn('loadBriefing failed', e); return null
  }
}

async function loadTimeline() {
  const list = $('#timeline-list'); if (!list) return
  try {
    const data = await SCOUTT.fetch('/api/timeline')
    STATE.timeline = data
    const colors = { policy: '#06b6d4', competitor: '#f97316', sentiment: '#ec4899' }
    const rgb    = { policy: '6,182,212', competitor: '249,115,22', sentiment: '236,72,153' }
    if (!data || !data.length) { list.innerHTML = '<li class="text-xs text-gray-500">No events.</li>'; return }
    list.innerHTML = data.map((e, i) => `
      <li class="relative" style="animation-delay:${i * 40}ms">
        <span class="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full"
              style="background:${colors[e.pillar] || '#a1a8bd'};box-shadow:0 0 0 3px rgba(${rgb[e.pillar] || '161,168,189'},0.18)"></span>
        <div class="text-[10px] mono text-gray-500 mb-0.5">${e.date} • sev ${e.severity}</div>
        <div class="text-xs leading-snug">${escapeHTML(e.title)}</div>
      </li>`).join('')
  } catch (e) {
    list.innerHTML = '<li class="text-xs text-red-400">Failed to load timeline.</li>'
  }
}

async function loadActions() {
  const wrap = $('#actions-list'); if (!wrap) return
  try {
    // Always pull from the dedicated endpoint — works in both demo & live mode.
    const acts = await SCOUTT.fetch('/api/actions/today')
    STATE.actions = acts
    if (!acts || !acts.length) { wrap.innerHTML = '<div class="text-xs text-gray-500">No actions today.</div>'; return }
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
          <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${colors[a.impact] || 'gray-500'}/15 text-${colors[a.impact] || 'gray-500'} border border-${colors[a.impact] || 'gray-500'}/40">${a.impact || 'medium'} impact</span>
          <button type="button" class="action-draft-btn ml-auto text-[11px] text-policy hover:underline cursor-pointer" data-action="${i}" data-kind="email"><i class="fa-solid fa-envelope text-[10px]"></i> Email</button>
          <button type="button" class="action-draft-btn text-[11px] text-policy hover:underline cursor-pointer" data-action="${i}" data-kind="slack"><i class="fa-brands fa-slack text-[10px]"></i> Slack</button>
        </div>
      </div>`).join('')

    $$('.action-draft-btn').forEach(b => b.addEventListener('click', async () => {
      try {
        const data = await SCOUTT.post('/api/action/draft', { action_id: +b.dataset.action, kind: b.dataset.kind })
        showDraftModal(data)
      } catch (e) { showToast('Draft failed: ' + e.message, 'error') }
    }))
  } catch (e) {
    wrap.innerHTML = '<div class="text-xs text-red-400">Could not load actions.</div>'
  }
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

// =====================================================================
// READ FULL BRIEF modal  (fixes Issue #4 — Read brief button)
// =====================================================================
function openBriefModal() {
  const m = $('#brief-modal'); if (!m) return
  m.classList.remove('hidden')
  const b = STATE.briefing
  $('#brief-modal-title').textContent = b?.headline || 'Daily briefing'
  const events = b?.events || []
  const actions = b?.actions || STATE.actions || []
  $('#brief-modal-body').innerHTML = `
    <div class="flex items-center gap-3 text-xs">
      <span class="px-2 py-1 rounded bg-policy/15 text-policy border border-policy/40 mono">Threat ${b?.threat_level ?? 73}/100</span>
      <span class="text-gray-500">${events.length} events • ${actions.length} actions</span>
      <span class="ml-auto text-[10px] mono text-gray-500 uppercase">${SCOUTT.hasKey ? 'Anakin live' : 'Demo data'}</span>
    </div>
    <div>
      <h4 class="font-semibold text-base mb-2">Overnight events</h4>
      <ul class="space-y-2">
        ${events.slice(0, 12).map(e => `
          <li class="border-l-2 pl-3 ${e.pillar === 'policy' ? 'border-policy' : e.pillar === 'competitor' ? 'border-competitor' : 'border-sentiment'}">
            <div class="text-sm font-medium">${escapeHTML(e.title)}</div>
            <div class="text-xs text-gray-400 mt-0.5">${escapeHTML(e.summary || '')}</div>
            <div class="text-[10px] mono text-gray-500 mt-1">sev ${e.severity} • <a href="${e.source_url || '#'}" target="_blank" rel="noopener" class="text-policy hover:underline">source ↗</a></div>
          </li>`).join('')}
      </ul>
    </div>
    <div>
      <h4 class="font-semibold text-base mb-2">Today's 3 actions</h4>
      <ol class="space-y-2 list-decimal list-inside">
        ${actions.map(a => `
          <li>
            <span class="font-medium">${escapeHTML(a.title)}</span>
            <div class="text-xs text-gray-400 ml-5">${escapeHTML(a.why_now || '')}</div>
          </li>`).join('')}
      </ol>
    </div>`
}
function closeBriefModal() { $('#brief-modal')?.classList.add('hidden') }

// =====================================================================
// KPI SPARKLINES + helpers
// =====================================================================
function drawSparklines() {
  $$('.kpi-spark').forEach((cv, idx) => {
    const ctx = cv.getContext('2d')
    cv.width = cv.offsetWidth || 100; cv.height = 22
    const colors = ['#06b6d4', '#10b981', '#f97316', '#ec4899']
    const c = colors[idx % 4]
    const data = Array.from({ length: 14 }, () => Math.random() * 0.6 + 0.2)
    const grad = ctx.createLinearGradient(0, 0, 0, 22)
    grad.addColorStop(0, c + '66'); grad.addColorStop(1, c + '00')
    ctx.beginPath()
    data.forEach((v, i) => { const x = (i / (data.length - 1)) * cv.width; const y = 22 - v * 22; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
    ctx.lineTo(cv.width, 22); ctx.lineTo(0, 22); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    ctx.beginPath()
    data.forEach((v, i) => { const x = (i / (data.length - 1)) * cv.width; const y = 22 - v * 22; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
    ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke()
  })
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

// =====================================================================
// CHARTS
// =====================================================================
const CHART_REGISTRY = {}

async function chartSentimentVolume() {
  const ctx = $('#chart-sentiment-volume'); if (!ctx) return
  try {
    const data = await SCOUTT.fetch('/api/charts/sentiment-volume')
    STATE.sentimentVolume = data
    if (CHART_REGISTRY.sv) CHART_REGISTRY.sv.destroy()
    CHART_REGISTRY.sv = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date.slice(5)),
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
  } catch (e) { console.warn('sentiment chart fail', e) }
}

async function chartPricingRace() {
  const ctx = $('#chart-pricing-race'); if (!ctx) return
  try {
    const data = await SCOUTT.fetch('/api/charts/pricing-race')
    if (CHART_REGISTRY.pr) CHART_REGISTRY.pr.destroy()
    CHART_REGISTRY.pr = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date.slice(5)),
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
          y: { ticks: { color: '#3a4055', font: { size: 9 }, callback: v => '$' + v.toFixed(2) }, grid: { color: 'rgba(58,64,85,0.15)' } },
        },
      },
    })
  } catch (e) { console.warn('pricing chart fail', e) }
}

// =====================================================================
// POLICY
// =====================================================================
let _policyLoaded = false
async function ensurePolicyLoaded() {
  if (_policyLoaded) return
  _policyLoaded = true
  await loadPolicyMap()
}
async function loadPolicyMap() {
  try {
    const data = await SCOUTT.fetch('/api/charts/policy-regions')
    const pins = $('#map-pins'); const trend = $('#chart-policy-trend')
    if (pins) {
      pins.innerHTML = data.map(r => {
        const x = ((r.lng + 180) / 360) * 100
        const y = ((90 - r.lat) / 180) * 100
        const color = r.activity > 70 ? '' : r.activity > 45 ? 'orange' : 'magenta'
        return `<div class="absolute" style="left:${x}%;top:${y}%;transform:translate(-50%,-50%)" title="${escapeHTML(r.country)}: ${r.count} changes (activity ${r.activity})">
          <div class="map-pin ${color}"></div>
          <div class="absolute -top-6 left-1/2 -translate-x-1/2 mono text-[10px] text-gray-300 whitespace-nowrap">${escapeHTML(r.country.slice(0, 12))}</div>
        </div>`
      }).join('')
    }
    if (trend) {
      if (CHART_REGISTRY.pt) CHART_REGISTRY.pt.destroy()
      CHART_REGISTRY.pt = new Chart(trend, {
        type: 'bar',
        data: { labels: data.map(d => d.country.slice(0, 6)), datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => d.activity > 70 ? '#06b6d4' : d.activity > 45 ? '#f97316' : '#ec4899'), borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } }, y: { ticks: { color: '#a1a8bd', font: { size: 9 } }, grid: { display: false } } } },
      })
    }
    const regs = await SCOUTT.fetch('/api/policy/active')
    const cards = $('#reg-cards')
    if (cards) cards.innerHTML = regs.length
      ? regs.map(regCard).join('')
      : '<div class="col-span-full text-center text-sm text-gray-500 py-8">No active regulations in your scope right now.</div>'
  } catch (e) {
    const el = $('#reg-cards'); if (el) el.innerHTML = '<div class="col-span-full text-sm text-red-400 py-8">Failed to load policy data.</div>'
  }
}
function regCard(r) {
  const sev = r.severity
  const sevColor = sev >= 80 ? 'text-red-400' : sev >= 60 ? 'text-competitor' : 'text-policy'
  return `<div class="card step-card p-5">
    <div class="flex items-start justify-between mb-2">
      <div class="flex items-center gap-2 text-[10px] mono uppercase text-policy"><i class="fa-solid fa-scale-balanced"></i> ${escapeHTML((r.tags && r.tags[0]) || 'Policy')}</div>
      <div class="text-right"><div class="mono text-xl font-bold ${sevColor}">${sev}</div><div class="text-[9px] mono uppercase text-gray-500">impact</div></div>
    </div>
    <h4 class="font-semibold mb-1 leading-snug">${escapeHTML(r.title)}</h4>
    <p class="text-xs text-gray-400 leading-relaxed mb-3">${escapeHTML(r.summary || '')}</p>
    <div class="border-t border-ink-700 pt-3 flex items-center justify-between text-[11px]">
      <span class="text-gray-500 mono">${escapeHTML(r.source_name || '')}</span>
      <a href="${r.source_url || '#'}" target="_blank" rel="noopener" class="text-policy hover:underline">Source →</a>
    </div>
  </div>`
}

// =====================================================================
// COMPETITOR
// =====================================================================
let _competitorLoaded = false
async function ensureCompetitorLoaded() {
  if (_competitorLoaded) return
  _competitorLoaded = true
  loadDiffTimeline()
  await chartPricingRace()
  await loadFeatureMatrix()
  await loadCompetitorEvents()
}
function loadDiffTimeline() {
  const el = $('#diff-timeline'); if (!el) return
  const markers = [
    { x: 5,  c: '#f97316' }, { x: 18, c: '#f97316' }, { x: 32, c: '#f97316' },
    { x: 51, c: '#ec4899' }, { x: 68, c: '#f97316' }, { x: 79, c: '#f97316' }, { x: 93, c: '#06b6d4' },
  ]
  el.innerHTML = `<div class="absolute inset-0 flex items-center px-2"><div class="w-full h-px bg-ink-600"></div></div>${markers.map(m => `<div class="absolute top-1/2 -translate-y-1/2" style="left:${m.x}%"><div class="w-3 h-3 rounded-full" style="background:${m.c};box-shadow:0 0 0 3px rgba(255,255,255,0.04),0 0 10px ${m.c}"></div></div>`).join('')}<div class="absolute bottom-1 left-2 text-[10px] mono text-gray-500">7 days ago</div><div class="absolute bottom-1 right-2 text-[10px] mono text-policy">now</div>`
}
async function loadFeatureMatrix() {
  try {
    const { competitors, features } = await SCOUTT.fetch('/api/charts/feature-matrix')
    const el = $('#feature-matrix'); if (!el) return
    el.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-[10px] mono uppercase text-gray-500 border-b border-ink-700"><th class="text-left py-2 px-3 font-normal">Feature</th>${competitors.map((c, i) => `<th class="py-2 px-3 font-normal ${i === 0 ? 'text-policy' : ''}">${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${features.map(f => `<tr class="border-b border-ink-700/40 hover:bg-ink-800/30"><td class="py-2.5 px-3">${escapeHTML(f.name)}</td>${f.values.map((v, j) => `<td class="py-2.5 px-3 text-center ${j === 0 ? 'bg-policy/5' : ''}">${v ? '<i class="fa-solid fa-check text-emerald-400"></i>' : '<i class="fa-solid fa-xmark text-gray-600"></i>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  } catch (e) { console.warn('matrix fail', e) }
}
async function loadCompetitorEvents() {
  try {
    const events = await SCOUTT.fetch('/api/competitor/events')
    const el = $('#competitor-events'); if (!el) return
    el.innerHTML = events.length ? events.map(e => `
      <div class="card step-card p-4">
        <div class="flex items-center gap-2 text-[10px] mono uppercase text-competitor mb-2"><i class="fa-solid fa-chess-knight"></i> ${escapeHTML((e.tags && e.tags[0]) || 'competitor')}</div>
        <h4 class="font-semibold text-sm mb-1">${escapeHTML(e.title)}</h4>
        <p class="text-xs text-gray-400 mb-3">${escapeHTML(e.summary || '')}</p>
        <div class="flex items-center justify-between text-[11px] mono text-gray-500">
          <span>sev ${e.severity}</span>
          <a href="${e.source_url || '#'}" target="_blank" rel="noopener" class="text-policy hover:underline">Source →</a>
        </div>
      </div>`).join('') : '<div class="col-span-full text-sm text-gray-500">No events.</div>'
  } catch (e) { console.warn('comp events fail', e) }
}

// =====================================================================
// SENTIMENT
// =====================================================================
let _sentimentLoaded = false
async function ensureSentimentLoaded() {
  if (_sentimentLoaded) return
  _sentimentLoaded = true
  await loadBubbles()
  chartDiverging()
  await loadWordCloud()
  renderQuote()
  await loadSentimentEvents()
}
async function loadBubbles() {
  try {
    const el = $('#bubble-chart'); if (!el) return
    const data = await SCOUTT.fetch('/api/charts/topic-bubbles')
    const W = el.clientWidth || 700, H = 420
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full">${data.map((b, i) => {
      const r = 18 + (b.mentions / 240) * 38
      const angle = (i / data.length) * Math.PI * 2
      const cx = W / 2 + Math.cos(angle) * (Math.min(W, H) / 3.5)
      const cy = H / 2 + Math.sin(angle) * (Math.min(W, H) / 3.5)
      const c = b.sentiment > 0.2 ? '#10b981' : b.sentiment < -0.2 ? '#ec4899' : '#a1a8bd'
      return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="1.5" /><text x="${cx}" y="${cy + 4}" fill="#e7eaf3" font-size="11" font-family="Inter" text-anchor="middle">${escapeHTML(b.topic.slice(0, 18))}</text></g>`
    }).join('')}</svg>`
  } catch (e) { console.warn('bubbles fail', e) }
}
function chartDiverging() {
  const ctx = $('#chart-diverging'); if (!ctx) return
  if (CHART_REGISTRY.dv) CHART_REGISTRY.dv.destroy()
  const labels = ['You', 'Stripe', 'Adyen', 'Checkout']
  const vals = [+24, -8, +6, -14]
  CHART_REGISTRY.dv = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: vals, backgroundColor: vals.map(v => v > 0 ? '#10b981' : '#ec4899'), borderRadius: 4 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#3a4055', font: { size: 10 } }, grid: { color: 'rgba(58,64,85,0.2)' }, min: -30, max: 30 }, y: { ticks: { color: '#a1a8bd', font: { size: 11 } }, grid: { display: false } } } },
  })
}
async function loadWordCloud() {
  try {
    const el = $('#word-cloud'); if (!el) return
    const words = await SCOUTT.fetch('/api/charts/wordcloud')
    const palette = ['#06b6d4', '#f97316', '#ec4899', '#10b981', '#a1a8bd']
    el.innerHTML = words.map((w, i) => {
      const size = 12 + (w.value / 90) * 28
      const c = palette[i % palette.length]
      return `<span class="inline-block font-semibold hover:scale-110 transition" style="font-size:${size}px;color:${c}">${escapeHTML(w.text)}</span>`
    }).join('')
  } catch (e) { console.warn('wc fail', e) }
}
const QUOTES = [
  { text: 'Switched our ACH from Stripe to a competitor after the silent fee hike. $14k a year saved.', src: 'Reddit r/fintech', stars: '★★★★★' },
  { text: 'Fraud false-positives blocking 8% of real transactions. Support is the worst part.', src: 'G2 Crowd', stars: '★★☆☆☆' },
  { text: 'Instant KYC is the killer feature. We onboarded a marketplace in 4 hours.', src: 'Product Hunt', stars: '★★★★★' },
  { text: 'Pricing transparency on their site changed overnight without notice. Not great.', src: 'Trustpilot', stars: '★★☆☆☆' },
  { text: 'Adyen Embedded Finance just dropped. Clean docs but priced for $100M+ companies.', src: 'Hacker News', stars: '★★★★☆' },
]
let qi = 0
function renderQuote() {
  const el = $('#quotes-carousel'); if (!el) return
  const q = QUOTES[qi]
  el.innerHTML = `<div class="w-full slide-up"><div class="text-sentiment text-2xl mono mb-2">"</div><p class="text-base leading-relaxed mb-3">${escapeHTML(q.text)}</p><div class="flex items-center justify-between text-xs text-gray-500"><span class="mono">${escapeHTML(q.src)}</span><span class="text-yellow-400">${q.stars}</span></div></div>`
  const c = $('#quote-counter'); if (c) c.textContent = `${qi + 1} / ${QUOTES.length}`
}
async function loadSentimentEvents() {
  try {
    const events = await SCOUTT.fetch('/api/sentiment/events')
    const el = $('#sentiment-events-feed'); if (!el) return
    el.innerHTML = events.length ? events.map(e => `
      <div class="card step-card p-4">
        <div class="flex items-center gap-2 text-[10px] mono uppercase text-sentiment mb-2"><i class="fa-solid fa-wave-square"></i> sentiment</div>
        <h4 class="font-semibold text-sm mb-1">${escapeHTML(e.title)}</h4>
        <p class="text-xs text-gray-400 mb-3">${escapeHTML(e.summary || '')}</p>
        <div class="flex items-center justify-between text-[11px] mono text-gray-500">
          <span>sev ${e.severity}</span>
          <a href="${e.source_url || '#'}" target="_blank" rel="noopener" class="text-policy hover:underline">Source →</a>
        </div>
      </div>`).join('') : '<div class="col-span-full text-sm text-gray-500">No sentiment events.</div>'
  } catch (e) { console.warn('sent events fail', e) }
}

// =====================================================================
// ARCHETYPE
// =====================================================================
let _archetypeLoaded = false
function ensureArchetypeLoaded() { if (_archetypeLoaded) return; _archetypeLoaded = true; chartRadar() }
function chartRadar() {
  const ctx = $('#chart-radar'); if (!ctx) return
  if (CHART_REGISTRY.rd) CHART_REGISTRY.rd.destroy()
  CHART_REGISTRY.rd = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Compliance', 'Pricing', 'Onboarding', 'Sentiment', 'Embedded Finance', 'Innovation Speed'],
      datasets: [
        { label: 'You', data: [88, 72, 95, 70, 45, 80], borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.15)', pointBackgroundColor: '#06b6d4' },
        { label: 'Industry baseline', data: [65, 75, 60, 68, 78, 65], borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.10)', pointBackgroundColor: '#f97316' },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 11 } } } }, scales: { r: { angleLines: { color: 'rgba(58,64,85,0.4)' }, grid: { color: 'rgba(58,64,85,0.3)' }, pointLabels: { color: '#a1a8bd', font: { size: 10 } }, ticks: { color: '#3a4055', backdropColor: 'transparent', font: { size: 9 } }, suggestedMin: 0, suggestedMax: 100 } } },
  })
}

// =====================================================================
// GLOBAL SEARCH (⌘K) — categorized + debounced + ask-fallback
// =====================================================================
let SEARCH_DEBOUNCE = null
async function refreshSearchIndex() {
  try {
    const { index } = await SCOUTT.fetch('/api/search-index')
    GLOBAL_INDEX = index || []
  } catch { GLOBAL_INDEX = [] }
}
function debounce(fn, wait) {
  return (...args) => { clearTimeout(SEARCH_DEBOUNCE); SEARCH_DEBOUNCE = setTimeout(() => fn(...args), wait) }
}
const SECTION_ICON = {
  'Policy Radar':      'fa-scale-balanced text-policy',
  'Competitor Pulse':  'fa-chess-knight text-competitor',
  'Sentiment Storm':   'fa-wave-square text-sentiment',
  "Today's Actions":   'fa-list-check text-action',
  'Overnight Brief':   'fa-sun text-policy',
}

function renderSearchResults(q) {
  const results = $('#cmdk-results'); const sugg = $('#cmdk-suggestions'); const out = $('#cmdk-output')
  if (!results || !sugg || !out) return
  if (!q.trim()) { results.classList.add('hidden'); sugg.classList.remove('hidden'); out.classList.add('hidden'); return }
  sugg.classList.add('hidden'); out.classList.add('hidden'); results.classList.remove('hidden')
  const needle = q.toLowerCase()
  const matches = GLOBAL_INDEX.filter(it =>
    (it.title || '').toLowerCase().includes(needle) ||
    (it.subtitle || '').toLowerCase().includes(needle) ||
    (it.section || '').toLowerCase().includes(needle),
  )
  const grouped = matches.reduce((m, r) => { (m[r.section] = m[r.section] || []).push(r); return m }, {})
  const order = ['Overnight Brief', 'Policy Radar', 'Competitor Pulse', 'Sentiment Storm', "Today's Actions"]
  let html = ''
  order.forEach(sec => {
    const arr = grouped[sec]; if (!arr || !arr.length) return
    html += `<div class="px-4 py-2 text-[10px] mono uppercase tracking-widest text-gray-500 bg-ink-900 border-y border-ink-700">Found in ${escapeHTML(sec)} (${arr.length})</div>`
    html += arr.slice(0, 6).map(r => `
      <button type="button" data-tab="${r.tab}" data-url="${r.url || ''}" class="search-hit w-full text-left px-4 py-3 hover:bg-ink-700 flex items-start gap-3 border-b border-ink-800 cursor-pointer">
        <i class="fa-solid ${SECTION_ICON[sec] || 'fa-circle text-gray-500'} mt-1 text-xs"></i>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${escapeHTML(r.title)}</div>
          <div class="text-[11px] text-gray-500 truncate">${escapeHTML(r.subtitle || '')}</div>
        </div>
        <span class="mono text-[10px] text-gray-500 shrink-0">sev ${r.severity ?? '–'}</span>
      </button>`).join('')
  })
  if (!matches.length) {
    html = `<div class="px-4 py-6 text-center text-sm text-gray-500">No matches in dashboard data.</div>
      <button id="cmdk-ask-instead" type="button" class="w-full text-left px-4 py-3 bg-policy/10 hover:bg-policy/20 border-t border-policy/30 text-sm cursor-pointer">
        <i class="fa-solid fa-sparkles text-policy mr-2"></i> Ask SCOUTT: "<strong>${escapeHTML(q)}</strong>"
      </button>`
  } else {
    html += `<button id="cmdk-ask-instead" type="button" class="w-full text-left px-4 py-3 bg-policy/5 hover:bg-policy/15 border-t border-ink-700 text-sm cursor-pointer">
        <i class="fa-solid fa-sparkles text-policy mr-2"></i> Or ask SCOUTT: "<strong>${escapeHTML(q)}</strong>"
      </button>`
  }
  results.innerHTML = html

  $$('.search-hit').forEach(b => b.addEventListener('click', () => {
    const tab = b.dataset.tab
    closeCmdk()
    if (tab) activateTab(tab)
  }))
  $('#cmdk-ask-instead')?.addEventListener('click', () => { $('#cmdk-input').value = q; askIt() })
}

function openCmdk() {
  $('#cmdk')?.classList.remove('hidden')
  setTimeout(() => $('#cmdk-input')?.focus(), 50)
}
function closeCmdk() {
  $('#cmdk')?.classList.add('hidden')
  const inp = $('#cmdk-input'); if (inp) inp.value = ''
  $('#cmdk-output')?.classList.add('hidden'); $('#cmdk-results')?.classList.add('hidden'); $('#cmdk-suggestions')?.classList.remove('hidden')
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
      <div class="flex flex-wrap gap-1.5">${(data.citations || []).map(c => `<button type="button" data-url="${c.url}" class="citation-chip text-[11px] mono px-2 py-1 rounded border border-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'}/50 text-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'} hover:bg-ink-700 cursor-pointer">${c.ref} ${escapeHTML(c.title.slice(0, 50))}</button>`).join('')}</div></div>
      <div class="text-[10px] mono text-gray-600 mt-3">model: ${escapeHTML(data.model || '')}</div>`
    $$('.citation-chip').forEach(b => b.addEventListener('click', () => window.open(b.dataset.url, '_blank')))
  } catch (e) {
    out.innerHTML = `<div class="text-red-400 text-sm">Error: ${escapeHTML(e.message)}</div>`
  }
}
function linkifyCitations(s) { return (s || '').replace(/\[(\d+)\]/g, '<sup class="text-policy mono">[$1]</sup>') }

// =====================================================================
// TRANSPARENCY DRAWER
// =====================================================================
function closeDrawer() { $('#transparency-drawer')?.classList.remove('open'); $('#transparency-backdrop')?.classList.add('hidden') }
function renderTransparency(d) {
  const section = (t, b) => `<section><h3 class="font-semibold text-sm mb-2 flex items-center gap-2"><span class="w-1 h-4 bg-policy"></span> ${t}</h3>${b}</section>`
  const code = (s, max = 4000) => `<pre class="code">${escapeHTML((typeof s === 'string' ? s : JSON.stringify(s, null, 2)).slice(0, max))}</pre>`
  return `${section('1. Daily Battle Brief — Anakin call', `<p class="text-gray-400 mb-2">${escapeHTML(d.daily_briefing.endpoint)}</p><div class="text-[10px] mono uppercase text-gray-500 mb-1">System prompt</div>${code(d.daily_briefing.system_prompt)}<div class="text-[10px] mono uppercase text-gray-500 mb-1 mt-3">Templated user prompt</div>${code(d.daily_briefing.user_prompt)}<div class="text-[10px] mono uppercase text-gray-500 mb-1 mt-3">Custom JSON schema</div>${code(d.daily_briefing.json_schema)}`)}
  ${section('2. Hourly competitor scraper', `<p class="text-gray-400 mb-2">${escapeHTML(d.competitor_scraper.endpoint)}</p>${code(d.competitor_scraper.prompt)}`)}
  ${section('3. Ask SCOUTT', `<p class="text-gray-400 mb-2">${escapeHTML(d.ask_realitypulse.endpoint)}</p>${code(d.ask_realitypulse.prompt_template)}`)}
  ${section('4. Raw response sample', code(d.raw_response_sample, 6000))}`
}

// =====================================================================
// ELEVENLABS TTS  (with loader + browser fallback)
// Reference: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/text-to-speech
// =====================================================================
let _audioBusy = false
let _audioObjUrl = null
function setListenLoading(loading) {
  const icon = $('#play-audio-icon'); const label = $('#play-audio-label'); const btn = $('#play-audio')
  if (!icon || !label || !btn) return
  if (loading) {
    btn.setAttribute('disabled', 'true'); btn.classList.add('opacity-70', 'pointer-events-none')
    icon.innerHTML = '<span class="w-4 h-4 border-2 border-policy border-t-transparent rounded-full animate-spin inline-block"></span>'
    label.textContent = 'Generating…'
  } else {
    btn.removeAttribute('disabled'); btn.classList.remove('opacity-70', 'pointer-events-none')
    icon.innerHTML = '<i class="fa-solid fa-headphones text-policy"></i>'
    label.textContent = 'Listen'
  }
}

async function playBriefAudio() {
  if (_audioBusy) return
  _audioBusy = true
  const brief = STATE.briefing || await loadBriefing()
  const text = brief
    ? `Good morning. Threat level ${brief.threat_level}. ${brief.headline || ''} ${(brief.events || []).slice(0, 4).map(e => e.title).join('. ')}.`
    : 'Good morning. No briefing loaded.'

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
    const audio = $('#audio-el')
    audio.src = _audioObjUrl
    if (sub)   sub.textContent = 'ElevenLabs • playing'
    if (title) title.textContent = 'Reading your brief'
    setListenLoading(false)
    await audio.play()
    audio.onended = () => { toast?.classList.add('hidden') }
  } catch (e) {
    // Fallback to browser SpeechSynthesis when proxy fails (e.g. no ELEVENLABS_API_KEY)
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
  } finally {
    _audioBusy = false
  }
}
function stopAudio() {
  const audio = $('#audio-el')
  if (audio) { audio.pause(); audio.currentTime = 0 }
  if (window.speechSynthesis) speechSynthesis.cancel()
  $('#audio-toast')?.classList.add('hidden')
  setListenLoading(false)
}

// =====================================================================
// TIME MACHINE — slider + reset (fixes Issue #d)
// =====================================================================
function updateTimeMachine(v) {
  const label = $('#time-machine-label'); if (!label) return
  const num = Number(v)
  if (num === 0) {
    label.textContent = 'Today — live'
    label.classList.add('text-policy'); label.classList.remove('text-competitor')
  } else {
    const d = new Date(); d.setDate(d.getDate() - num)
    label.textContent = d.toISOString().slice(0, 10) + ' — cached'
    label.classList.remove('text-policy'); label.classList.add('text-competitor')
  }
}

// =====================================================================
// SCENARIO
// =====================================================================
async function runScenario() {
  const input = $('#scenario-input'); const scenario = input?.value.trim(); if (!scenario) return
  const btn = $('#scenario-run'); if (!btn) return
  btn.disabled = true
  btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin"></div> Re-running…'
  try {
    const data = await SCOUTT.post('/api/scenario', { scenario })
    await new Promise(r => setTimeout(r, 400))
    $('#scenario-result')?.classList.remove('hidden')
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v }
    set('#s-before',  data.threat_level_before)
    set('#s-after',   data.threat_level_after)
    set('#s-threats', '+' + data.delta_threats)
    set('#s-actions', '+' + data.delta_actions)
    const ev = $('#s-events'); if (ev) ev.innerHTML = (data.impacted_events || []).map(e => `<div class="card p-3 flex items-start gap-3"><i class="fa-solid fa-arrow-trend-up text-action mt-1"></i><div class="flex-1"><div class="text-sm font-medium">${escapeHTML(e.title)}</div><div class="text-xs text-gray-500">sev ${e.severity} • ${e.pillar}</div></div></div>`).join('')
  } catch (e) {
    showToast('Scenario failed: ' + e.message, 'error')
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run scenario'
  }
}

// =====================================================================
// MASTER RELOAD (after key save/clear)
// =====================================================================
async function reloadAllPanes() {
  _policyLoaded = _competitorLoaded = _sentimentLoaded = _archetypeLoaded = false
  STATE.briefing = null; STATE.timeline = null; STATE.actions = null
  await loadBriefing(); await loadTimeline(); await loadActions(); await chartSentimentVolume()
  drawSparklines()
  await refreshSearchIndex()
  const active = document.querySelector('.tab-btn.tab-active')?.dataset.tab
  if (active === 'policy')     ensurePolicyLoaded()
  if (active === 'competitor') ensureCompetitorLoaded()
  if (active === 'sentiment')  ensureSentimentLoaded()
  if (active === 'archetype')  ensureArchetypeLoaded()
}

// =====================================================================
// EVENT WIRING  (event delegation = resilient to dynamic content)
// =====================================================================
function wireEvents() {
  // ── Tabs (event delegation guarantees clicks always reach the handler) ──
  document.addEventListener('click', e => {
    const tabBtn = e.target.closest('.tab-btn')
    if (tabBtn) { e.preventDefault(); activateTab(tabBtn.dataset.tab) }
  })

  // ── API KEY MODAL ──
  $('#apikey-btn')?.addEventListener('click', openKeyModal)
  $('#apikey-close')?.addEventListener('click', closeKeyModal)
  $('#apikey-cancel')?.addEventListener('click', closeKeyModal)
  $('#apikey-modal')?.addEventListener('click', e => { if (e.target.id === 'apikey-modal') closeKeyModal() })
  $('#apikey-save')?.addEventListener('click', async () => {
    const k = $('#apikey-input')?.value.trim()
    if (!k) { showStatus('Please paste a key first.', false); return }
    SCOUTT.apiKey = k
    try { localStorage.setItem('scoutt_anakin_key', k) } catch {}
    showStatus('✓ Saved. Switching to live mode…', true)
    refreshKeyUI(); showToast('Live mode active. Regenerating briefing from Anakin…')
    setTimeout(closeKeyModal, 600)
    await reloadAllPanes()
  })
  $('#apikey-clear')?.addEventListener('click', async () => {
    SCOUTT.apiKey = ''
    try { localStorage.removeItem('scoutt_anakin_key') } catch {}
    showStatus('Cleared — back to demo data.', true); refreshKeyUI()
    setTimeout(closeKeyModal, 400)
    await reloadAllPanes()
  })

  // ── ⌘K  (global keyboard shortcut + focus) ──
  $('#cmdk-trigger')?.addEventListener('click', openCmdk)
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase()
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); openCmdk() }
    if (e.key === 'Escape') {
      if (!$('#cmdk')?.classList.contains('hidden'))           closeCmdk()
      else if (!$('#apikey-modal')?.classList.contains('hidden')) closeKeyModal()
      else if (!$('#brief-modal')?.classList.contains('hidden')) closeBriefModal()
    }
  })
  $('#cmdk')?.addEventListener('click', e => { if (e.target.id === 'cmdk') closeCmdk() })
  $$('.cmdk-suggestion').forEach(b => b.addEventListener('click', () => {
    const inp = $('#cmdk-input'); if (!inp) return
    inp.value = b.textContent.replace(/^→\s*Ask SCOUTT:\s*"|"$/g, '').trim()
    if (b.classList.contains('ask')) askIt()
    else renderSearchResults(inp.value)
  }))
  $('#cmdk-input')?.addEventListener('input', debounce(e => renderSearchResults(e.target.value), 120))
  $('#cmdk-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = $('#cmdk-input')?.value.trim()
      if (!q) return
      const hits = $$('.search-hit')
      if (hits.length === 1) hits[0].click()
      else askIt()
    }
  })

  // ── Transparency drawer ──
  $('#transparency-trigger')?.addEventListener('click', async () => {
    $('#transparency-backdrop')?.classList.remove('hidden')
    $('#transparency-drawer')?.classList.add('open')
    const drawer = $('#transparency-drawer')
    if (drawer && !drawer.dataset.loaded) {
      try {
        const data = await SCOUTT.fetch('/api/transparency')
        $('#transparency-body').innerHTML = renderTransparency(data)
        drawer.dataset.loaded = '1'
      } catch (e) {
        $('#transparency-body').innerHTML = '<p class="text-red-400">Failed to load.</p>'
      }
    }
  })
  $('#transparency-close')?.addEventListener('click', closeDrawer)
  $('#transparency-backdrop')?.addEventListener('click', closeDrawer)

  // ── Listen + Read full brief  (fixes Issue #4) ──
  $('#play-audio')?.addEventListener('click', playBriefAudio)
  $('#audio-stop')?.addEventListener('click', stopAudio)
  $('#read-full-brief')?.addEventListener('click', openBriefModal)
  $('#brief-modal-close')?.addEventListener('click', closeBriefModal)
  $('#brief-modal')?.addEventListener('click', e => { if (e.target.id === 'brief-modal') closeBriefModal() })

  // ── TIME MACHINE  (fixes Issue #d) ──
  const tmSlider = $('#time-machine'); const tmReset = $('#time-machine-reset')
  tmSlider?.addEventListener('input', e => updateTimeMachine(e.target.value))
  tmSlider?.addEventListener('change', e => updateTimeMachine(e.target.value))
  tmReset?.addEventListener('click', () => {
    if (!tmSlider) return
    tmSlider.value = '0'
    tmSlider.dispatchEvent(new Event('input', { bubbles: true }))
    updateTimeMachine(0)
    tmReset.classList.add('shadow-glow-cyan')
    setTimeout(() => tmReset.classList.remove('shadow-glow-cyan'), 600)
  })
  // Initial render
  if (tmSlider) updateTimeMachine(tmSlider.value)

  // ── Scenario ──
  $('#scenario-run')?.addEventListener('click', runScenario)

  // ── Quotes ──
  $('#quote-next')?.addEventListener('click', () => { qi = (qi + 1) % QUOTES.length; renderQuote() })
  $('#quote-prev')?.addEventListener('click', () => { qi = (qi - 1 + QUOTES.length) % QUOTES.length; renderQuote() })

  // ── Theme toggle (icon only — page is already dark) ──
  $('#theme-toggle')?.addEventListener('click', () => document.documentElement.classList.toggle('dark'))

  // ── Pulse-wheel tooltip + click-through ──
  const tooltip = $('#wheel-tooltip')
  $$('.wheel-tick').forEach(g => {
    g.addEventListener('mouseenter', () => {
      if (!tooltip) return
      const t = g.dataset.title; const s = g.dataset.sev
      tooltip.innerHTML = `<div class="font-semibold text-white">${escapeHTML(t)}</div><div class="text-[10px] mono text-gray-400 mt-1">severity ${s}</div>`
      tooltip.style.opacity = '1'
    })
    g.addEventListener('mousemove', e => {
      if (!tooltip) return
      const c = $('#pulse-wheel-container').getBoundingClientRect()
      tooltip.style.left = (e.clientX - c.left + 10) + 'px'
      tooltip.style.top  = (e.clientY - c.top + 10)  + 'px'
    })
    g.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.opacity = '0' })
    g.addEventListener('click', () => { if (g.dataset.url && g.dataset.url !== '#') window.open(g.dataset.url, '_blank') })
  })
}

// =====================================================================
// BOOT
// =====================================================================
;(async function init() {
  refreshKeyUI()
  wireEvents()
  try {
    await loadBriefing()
    await loadTimeline()
    await loadActions()
    await chartSentimentVolume()
    drawSparklines()
    setTimeout(drawSparklines, 250)
    window.addEventListener('resize', () => { drawSparklines() })
    await refreshSearchIndex()
  } catch (e) {
    console.error('SCOUTT boot error:', e)
  }
})()
