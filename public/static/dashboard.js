// =====================================================================
// SCOUTT — Dashboard interactivity
// =====================================================================

const $ = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

// ---------- API KEY STATE ----------
const SCOUTT = {
  apiKey: localStorage.getItem('scoutt_anakin_key') || '',
  get hasKey() { return !!this.apiKey },
  axios() {
    return axios.create({
      headers: this.apiKey ? { 'X-Anakin-Key': this.apiKey } : {}
    })
  }
}

function refreshKeyUI() {
  const label = $('#apikey-label')
  const icon = $('#apikey-icon')
  if (SCOUTT.hasKey) {
    label.textContent = 'Live  Anakin connected'
    icon.classList.remove('text-policy'); icon.classList.add('text-emerald-400')
  } else {
    label.textContent = 'Enter API Key'
    icon.classList.add('text-policy'); icon.classList.remove('text-emerald-400')
  }
}
refreshKeyUI()

// ---------- API KEY MODAL ----------
const apikeyModal = $('#apikey-modal')
function openKeyModal() { apikeyModal.classList.remove('hidden'); $('#apikey-input').value = SCOUTT.apiKey; setTimeout(() => $('#apikey-input').focus(), 50) }
function closeKeyModal() { apikeyModal.classList.add('hidden') }
$('#apikey-btn')?.addEventListener('click', openKeyModal)
$('#apikey-close')?.addEventListener('click', closeKeyModal)
$('#apikey-cancel')?.addEventListener('click', closeKeyModal)
apikeyModal?.addEventListener('click', (e) => { if (e.target === apikeyModal) closeKeyModal() })
$('#apikey-save')?.addEventListener('click', async () => {
  const k = $('#apikey-input').value.trim()
  if (!k) return
  SCOUTT.apiKey = k
  localStorage.setItem('scoutt_anakin_key', k)
  refreshKeyUI(); closeKeyModal()
  // Trigger live regen
  showRegenToast()
  await reloadAllPanes()
})
$('#apikey-clear')?.addEventListener('click', () => {
  SCOUTT.apiKey = ''
  localStorage.removeItem('scoutt_anakin_key')
  refreshKeyUI(); closeKeyModal()
  reloadAllPanes()
})

function showRegenToast() {
  const t = document.createElement('div')
  t.className = 'fixed top-20 right-6 z-50 card p-4 shadow-glow-cyan flex items-center gap-3 slide-up'
  t.innerHTML = '<div class="w-3 h-3 rounded-full bg-emerald-400 pulse-ring"></div><div class="text-sm">Live mode active. Regenerating briefing from Anakin</div>'
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 4500)
}

// ---------- TAB SWITCHING ----------

$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab

    $$('.tab-btn').forEach((b) => { b.classList.remove('tab-active'); b.classList.add('text-gray-400') })
    btn.classList.add('tab-active'); btn.classList.remove('text-gray-400')

    $$('.tab-pane').forEach((p) => p.classList.add('hidden'))
    $(`[data-pane="${target}"]`).classList.remove('hidden')
    window.dispatchEvent(new Event('resize'))
    // Ensure each pane has its data
    if (target === 'policy') ensurePolicyLoaded()
    if (target === 'competitor') ensureCompetitorLoaded()
    if (target === 'sentiment') ensureSentimentLoaded()
    if (target === 'archetype') ensureArchetypeLoaded()
  })
})

// ---------- BRIEFING (banner + actions + timeline) ----------
async function loadBriefing() {
  try {
    const { data } = await SCOUTT.axios().get('/api/briefing/today')
    $('#banner-events') && ($('#banner-events').textContent = data.events?.filter(e => e.high_impact).length || data.events?.length || 4)
    $('#banner-threat') && ($('#banner-threat').textContent = data.threat_level ?? 73)
    $('#banner-summary') && data.headline && ($('#banner-summary').textContent = data.headline)
    return data
  } catch (e) { return null }
}

async function loadTimeline() {
  const data = await SCOUTT.axios().get('/api/timeline').then(r => r.data).catch(() => [])
  const colors = { policy: '#06b6d4', competitor: '#f97316', sentiment: '#ec4899' }
  $('#timeline-list').innerHTML = data.map((e, i) => `
    <li class="relative" style="animation-delay:${i * 40}ms">
      <span class="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full" style="background:${colors[e.pillar]};box-shadow:0 0 0 3px rgba(${e.pillar === 'policy' ? '6,182,212' : e.pillar === 'competitor' ? '249,115,22' : '236,72,153'},0.18)"></span>
      <div class="text-[10px] mono text-gray-500 mb-0.5">${e.date}  sev ${e.severity}</div>
      <div class="text-xs leading-snug">${e.title}</div>
    </li>`).join('')
}

async function loadActions() {
  const brief = await SCOUTT.axios().get('/api/briefing/today').then(r => r.data).catch(() => null)
  if (!brief) return
  const colors = { high: 'action', medium: 'competitor', low: 'gray-500' }
  $('#actions-list').innerHTML = (brief.actions || []).map((a, i) => `
    <div class="card step-card p-3" data-action="${i}">
      <div class="flex items-start gap-2 mb-2">
        <input type="checkbox" class="mt-1 accent-emerald-500" />
        <div class="flex-1">
          <div class="text-sm font-medium leading-snug">${a.title}</div>
          <div class="text-[11px] text-gray-500 mt-0.5">${a.why_now}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <span class="px-1.5 py-0.5 rounded mono text-[9px] uppercase bg-${colors[a.impact]}/15 text-${colors[a.impact]} border border-${colors[a.impact]}/40">${a.impact} impact</span>
        <button class="action-draft-btn ml-auto text-[11px] text-policy hover:underline" data-action="${i}" data-kind="email"><i class="fa-solid fa-envelope text-[10px]"></i> Email</button>
        <button class="action-draft-btn text-[11px] text-policy hover:underline" data-action="${i}" data-kind="slack"><i class="fa-brands fa-slack text-[10px]"></i> Slack</button>
      </div>
    </div>`).join('')


  $$('.action-draft-btn').forEach((b) => b.addEventListener('click', async () => {
    const { data } = await SCOUTT.axios().post('/api/action/draft', { action_id: +b.dataset.action, kind: b.dataset.kind })
    showDraftModal(data)
  }))
}

function showDraftModal(data) {
  const m = document.createElement('div')
  m.className = 'fixed inset-0 z-50 cmdk-backdrop flex items-center justify-center px-4'
  m.innerHTML = `
    <div class="card w-full max-w-xl p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">${data.kind === 'email' ? 'Email draft' : 'Slack message'}</h3>
        <button class="closeit text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <pre class="whitespace-pre-wrap text-sm bg-ink-900 p-4 rounded-lg border border-ink-700 max-h-[400px] overflow-y-auto">${(data.body || '').replace(/</g, '&lt;')}</pre>
      <div class="flex justify-end gap-2 mt-4">
        <button class="closeit text-gray-400 hover:text-white px-3 py-2 text-sm">Close</button>
        <button class="copyit bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm">Copy</button>
      </div>
    </div>`
  document.body.appendChild(m)
  m.querySelectorAll('.closeit').forEach((b) => b.addEventListener('click', () => m.remove()))
  m.querySelector('.copyit').addEventListener('click', () => {
    navigator.clipboard.writeText(data.body || '')
    m.querySelector('.copyit').textContent = ' Copied'
  })
  m.addEventListener('click', (e) => { if (e.target === m) m.remove() })
}

// ---------- KPI SPARKLINES ----------
function drawSparklines() {

  $$('.kpi-spark').forEach((cv, idx) => {
    const ctx = cv.getContext('2d')
    cv.width = cv.offsetWidth; cv.height = 22
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

// ---------- CHARTS ----------
const CHART_REGISTRY = {}

async function chartSentimentVolume() {
  const data = await SCOUTT.axios().get('/api/charts/sentiment-volume').then(r => r.data).catch(() => [])
  const ctx = $('#chart-sentiment-volume'); if (!ctx) return
  if (CHART_REGISTRY.sv) CHART_REGISTRY.sv.destroy()
  CHART_REGISTRY.sv = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.slice(5)),
      datasets: [
        { label: 'Positive', data: data.map(d => d.positive), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10b981', fill: true, tension: 0.35, pointRadius: 0 },
        { label: 'Neutral', data: data.map(d => d.neutral), backgroundColor: 'rgba(58,64,85,0.5)', borderColor: '#3a4055', fill: true, tension: 0.35, pointRadius: 0 },
        { label: 'Negative', data: data.map(d => d.negative), backgroundColor: 'rgba(236,72,153,0.5)', borderColor: '#ec4899', fill: true, tension: 0.35, pointRadius: 0 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 10 } } } }, scales: { x: { stacked: true, ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } }, y: { stacked: true, ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } } } },
  })
}

async function chartPricingRace() {
  const data = await SCOUTT.axios().get('/api/charts/pricing-race').then(r => r.data).catch(() => [])
  const ctx = $('#chart-pricing-race'); if (!ctx) return
  if (CHART_REGISTRY.pr) CHART_REGISTRY.pr.destroy()
  CHART_REGISTRY.pr = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.slice(5)),
      datasets: [
        { label: 'You', data: data.map(d => d.you), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, pointRadius: 0, borderWidth: 2 },
        { label: 'Stripe', data: data.map(d => d.stripe), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', tension: 0, pointRadius: 0, borderWidth: 2, stepped: true },
        { label: 'Adyen', data: data.map(d => d.adyen), borderColor: '#06b6d4', tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Checkout', data: data.map(d => d.checkout), borderColor: '#ec4899', tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#3a4055', font: { size: 9 }, callback: v => '$' + v.toFixed(2) }, grid: { color: 'rgba(58,64,85,0.15)' } } } },
  })
}

// ---------- POLICY ----------
let _policyLoaded = false
async function ensurePolicyLoaded() { if (!_policyLoaded) { await loadPolicyMap(); _policyLoaded = true } }
async function loadPolicyMap() {
  const data = await SCOUTT.axios().get('/api/charts/policy-regions').then(r => r.data).catch(() => [])
  const pins = $('#map-pins'); const trend = $('#chart-policy-trend'); const cards = $('#reg-cards')
  if (!pins) return
  pins.innerHTML = data.map(r => {
    const x = ((r.lng + 180) / 360) * 100
    const y = ((90 - r.lat) / 180) * 100
    const color = r.activity > 70 ? '' : r.activity > 45 ? 'orange' : 'magenta'
    return `<div class="absolute" style="left:${x}%;top:${y}%;transform:translate(-50%,-50%)" title="${r.country}: ${r.count} changes (activity ${r.activity})"><div class="map-pin ${color}"></div><div class="absolute -top-6 left-1/2 -translate-x-1/2 mono text-[10px] text-gray-300 whitespace-nowrap">${r.country.slice(0, 12)}</div></div>`
  }).join('')
  if (trend) {
    if (CHART_REGISTRY.pt) CHART_REGISTRY.pt.destroy()
    CHART_REGISTRY.pt = new Chart(trend, {
      type: 'bar',
      data: { labels: data.map(d => d.country.slice(0, 6)), datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => d.activity > 70 ? '#06b6d4' : d.activity > 45 ? '#f97316' : '#ec4899'), borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } }, y: { ticks: { color: '#a1a8bd', font: { size: 9 } }, grid: { display: false } } } },
    })
  }
  if (cards) {
    const brief = await SCOUTT.axios().get('/api/briefing/today').then(r => r.data).catch(() => ({ events: [] }))
    const regs = (brief.events || []).filter(e => e.pillar === 'policy')
    cards.innerHTML = regs.length ? regs.map(regCard).join('') : '<div class="col-span-full text-center text-sm text-gray-500 py-8">No active regulations in your scope right now.</div>'
  }
}
function regCard(r) {
  const sev = r.severity
  const sevColor = sev >= 80 ? 'text-red-400' : sev >= 60 ? 'text-competitor' : 'text-policy'
  return `<div class="card step-card p-5">
    <div class="flex items-start justify-between mb-2">
      <div class="flex items-center gap-2 text-[10px] mono uppercase text-policy"><i class="fa-solid fa-scale-balanced"></i> ${r.tags?.[0] || 'Policy'}</div>
      <div class="text-right"><div class="mono text-xl font-bold ${sevColor}">${sev}</div><div class="text-[9px] mono uppercase text-gray-500">impact</div></div>
    </div>
    <h4 class="font-semibold mb-1 leading-snug">${r.title}</h4>
    <p class="text-xs text-gray-400 leading-relaxed mb-3">${r.summary}</p>
    <div class="border-t border-ink-700 pt-3 flex items-center justify-between text-[11px]">
      <span class="text-gray-500 mono">${r.source_name}</span>
      <a href="${r.source_url}" target="_blank" class="text-policy hover:underline">Source </a>
    </div>
  </div>`
}

// ---------- COMPETITOR ----------
let _competitorLoaded = false
async function ensureCompetitorLoaded() {
  if (_competitorLoaded) return
  loadDiffTimeline(); await chartPricingRace(); await loadFeatureMatrix()
  _competitorLoaded = true
}
function loadDiffTimeline() {
  const el = $('#diff-timeline'); if (!el) return
  const markers = [
    { x: 5, c: '#f97316' }, { x: 18, c: '#f97316' }, { x: 32, c: '#f97316' },
    { x: 51, c: '#ec4899' }, { x: 68, c: '#f97316' }, { x: 79, c: '#f97316' }, { x: 93, c: '#06b6d4' },
  ]
  el.innerHTML = `<div class="absolute inset-0 flex items-center px-2"><div class="w-full h-px bg-ink-600"></div></div>${markers.map(m => `<div class="absolute top-1/2 -translate-y-1/2" style="left:${m.x}%"><div class="w-3 h-3 rounded-full" style="background:${m.c};box-shadow:0 0 0 3px rgba(255,255,255,0.04),0 0 10px ${m.c}"></div></div>`).join('')}<div class="absolute bottom-1 left-2 text-[10px] mono text-gray-500">7 days ago</div><div class="absolute bottom-1 right-2 text-[10px] mono text-policy">now</div>`
}
async function loadFeatureMatrix() {
  const el = $('#feature-matrix'); if (!el) return
  const { competitors, features } = await SCOUTT.axios().get('/api/charts/feature-matrix').then(r => r.data).catch(() => ({ competitors: [], features: [] }))
  el.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-[10px] mono uppercase text-gray-500 border-b border-ink-700"><th class="text-left py-2 px-3 font-normal">Feature</th>${competitors.map((c, i) => `<th class="py-2 px-3 font-normal ${i === 0 ? 'text-policy' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${features.map(f => `<tr class="border-b border-ink-700/40 hover:bg-ink-800/30"><td class="py-2.5 px-3">${f.name}</td>${f.values.map((v, j) => `<td class="py-2.5 px-3 text-center ${j === 0 ? 'bg-policy/5' : ''}">${v ? '<i class="fa-solid fa-check text-emerald-400"></i>' : '<i class="fa-solid fa-xmark text-gray-600"></i>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

// ---------- SENTIMENT ----------
let _sentimentLoaded = false
async function ensureSentimentLoaded() {
  if (_sentimentLoaded) return
  await loadBubbles(); chartDiverging(); await loadWordCloud(); renderQuote()
  _sentimentLoaded = true
}
async function loadBubbles() {
  const el = $('#bubble-chart'); if (!el) return
  const data = await SCOUTT.axios().get('/api/charts/topic-bubbles').then(r => r.data).catch(() => [])
  const W = el.clientWidth || 700, H = 420
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full">${data.map((b, i) => {
    const r = 18 + (b.mentions / 240) * 38
    const angle = (i / data.length) * Math.PI * 2
    const cx = W / 2 + Math.cos(angle) * (W / 4.5) * (0.6 + (i % 3) * 0.2)
    const cy = H / 2 + Math.sin(angle) * (H / 3.5) * (0.6 + (i % 3) * 0.2)
    const color = b.sentiment > 0.3 ? '#10b981' : b.sentiment > -0.2 ? '#a1a8bd' : '#ec4899'
    return `<g class="cursor-pointer"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-opacity="0.55" stroke-width="1.4" /><text x="${cx}" y="${cy + 4}" fill="#e7eaf3" text-anchor="middle" font-size="11" font-family="Inter">${b.topic.length > 18 ? b.topic.slice(0, 16) + '' : b.topic}</text><text x="${cx}" y="${cy + 17}" fill="${color}" text-anchor="middle" font-size="9" font-family="JetBrains Mono">${b.mentions}</text></g>`
  }).join('')}</svg>`
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
  const el = $('#word-cloud'); if (!el) return
  const words = await SCOUTT.axios().get('/api/charts/wordcloud').then(r => r.data).catch(() => [])
  const palette = ['#06b6d4', '#f97316', '#ec4899', '#10b981', '#a1a8bd']
  el.innerHTML = words.map((w, i) => {
    const size = 12 + (w.value / 90) * 28
    const c = palette[i % palette.length]
    return `<span class="inline-block font-semibold hover:scale-110 transition" style="font-size:${size}px;color:${c}">${w.text}</span>`
  }).join('')
}
const QUOTES = [
  { text: 'Switched our ACH from Stripe to a competitor after the silent fee hike. $14k a year saved.', src: 'Reddit r/fintech', stars: '' },
  { text: 'Fraud false-positives blocking 8% of real transactions. Support is the worst part.', src: 'G2 Crowd', stars: '' },
  { text: 'Instant KYC is the killer feature. We onboarded a marketplace in 4 hours.', src: 'Product Hunt', stars: '' },
  { text: 'Pricing transparency on their site changed overnight without notice. Not great.', src: 'Trustpilot', stars: '' },
  { text: 'Adyen Embedded Finance just dropped. Clean docs but priced for $100M+ companies.', src: 'Hacker News', stars: '' },
]
let qi = 0
function renderQuote() {
  const el = $('#quotes-carousel'); if (!el) return
  const q = QUOTES[qi]
  el.innerHTML = `<div class="w-full slide-up"><div class="text-sentiment text-2xl mono mb-2">"</div><p class="text-base leading-relaxed mb-3">${q.text}</p><div class="flex items-center justify-between text-xs text-gray-500"><span class="mono">${q.src}</span><span class="text-yellow-400">${q.stars}</span></div></div>`
  $('#quote-counter').textContent = `${qi + 1} / ${QUOTES.length}`
}
$('#quote-next')?.addEventListener('click', () => { qi = (qi + 1) % QUOTES.length; renderQuote() })
$('#quote-prev')?.addEventListener('click', () => { qi = (qi - 1 + QUOTES.length) % QUOTES.length; renderQuote() })

// ---------- ARCHETYPE ----------
let _archetypeLoaded = false
function ensureArchetypeLoaded() { if (_archetypeLoaded) return; chartRadar(); _archetypeLoaded = true }
function chartRadar() {
  const ctx = $('#chart-radar'); if (!ctx) return
  if (CHART_REGISTRY.rd) CHART_REGISTRY.rd.destroy()
  // Read industry from onboarding if available
  try {
    const ob = JSON.parse(localStorage.getItem('scoutt_onboarding') || '{}')
    if (ob.industry && $('#archetype-industry')) $('#archetype-industry').textContent = ob.industry
  } catch (e) {}
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

// ---------- Cmd+K ----------
const cmdk = $('#cmdk'), cmdkInput = $('#cmdk-input'), cmdkOutput = $('#cmdk-output'), cmdkSugg = $('#cmdk-suggestions')
function openCmdk() { cmdk.classList.remove('hidden'); setTimeout(() => cmdkInput.focus(), 50) }
function closeCmdk() { cmdk.classList.add('hidden'); cmdkInput.value = ''; cmdkOutput.classList.add('hidden'); cmdkSugg.classList.remove('hidden') }
$('#cmdk-trigger')?.addEventListener('click', openCmdk)
document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk() } if (e.key === 'Escape') closeCmdk() })
cmdk?.addEventListener('click', (e) => { if (e.target === cmdk) closeCmdk() })

$$('.cmdk-suggestion').forEach((b) => b.addEventListener('click', () => { cmdkInput.value = b.textContent; askIt() }))
cmdkInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') askIt() })

async function askIt() {
  const q = cmdkInput.value.trim(); if (!q) return
  cmdkSugg.classList.add('hidden'); cmdkOutput.classList.remove('hidden')
  cmdkOutput.innerHTML = '<div class="flex items-center gap-2 text-gray-400 text-sm"><div class="w-4 h-4 border-2 border-policy border-t-transparent rounded-full animate-spin"></div> Thinking</div>'
  try {
    const { data } = await SCOUTT.axios().post('/api/ask', { question: q })
    cmdkOutput.innerHTML = `<div class="text-sm leading-relaxed">${linkifyCitations(data.answer)}</div>
      <div class="mt-4 border-t border-ink-700 pt-3"><div class="text-[10px] mono uppercase text-gray-500 mb-2">Citations  click to scroll to source</div>
      <div class="flex flex-wrap gap-1.5">${(data.citations || []).map(c => `<button data-url="${c.url}" class="citation-chip text-[11px] mono px-2 py-1 rounded border border-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'}/50 text-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'} hover:bg-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'}/15">${c.ref} ${c.title.slice(0, 50)}${c.title.length > 50 ? '' : ''}</button>`).join('')}</div></div>
      <div class="text-[10px] mono text-gray-600 mt-3">model: ${data.model}</div>`

    $$('.citation-chip').forEach((b) => b.addEventListener('click', () => window.open(b.dataset.url, '_blank')))
  } catch (e) { cmdkOutput.innerHTML = '<div class="text-red-400 text-sm">Error reaching API: ' + e.message + '</div>' }
}
function linkifyCitations(s) { return s.replace(/\[(\d+)\]/g, '<sup class="text-policy mono">[$1]</sup>') }

// ---------- TRANSPARENCY DRAWER ----------
const drawer = $('#transparency-drawer'), drawerBd = $('#transparency-backdrop')
$('#transparency-trigger')?.addEventListener('click', async () => {
  drawerBd.classList.remove('hidden'); drawer.classList.add('open')
  if (!drawer.dataset.loaded) {
    const data = await SCOUTT.axios().get('/api/transparency').then(r => r.data)
    $('#transparency-body').innerHTML = renderTransparency(data); drawer.dataset.loaded = '1'
  }
})
$('#transparency-close')?.addEventListener('click', closeDrawer); drawerBd?.addEventListener('click', closeDrawer)
function closeDrawer() { drawer.classList.remove('open'); drawerBd.classList.add('hidden') }
function renderTransparency(d) {
  const section = (t, b) => `<section><h3 class="font-semibold text-sm mb-2 flex items-center gap-2"><span class="w-1 h-4 bg-policy"></span> ${t}</h3>${b}</section>`
  const code = (s, max = 4000) => `<pre class="code">${(typeof s === 'string' ? s : JSON.stringify(s, null, 2)).slice(0, max).replace(/</g, '&lt;')}</pre>`
  return `${section('1. Daily Battle Brief  Anakin call', `<p class="text-gray-400 mb-2">${d.daily_briefing.endpoint}</p><div class="text-[10px] mono uppercase text-gray-500 mb-1">System prompt</div>${code(d.daily_briefing.system_prompt)}<div class="text-[10px] mono uppercase text-gray-500 mb-1 mt-3">Templated user prompt</div>${code(d.daily_briefing.user_prompt)}<div class="text-[10px] mono uppercase text-gray-500 mb-1 mt-3">Custom JSON schema</div>${code(d.daily_briefing.json_schema)}`)}
  ${section('2. Hourly competitor scraper', `<p class="text-gray-400 mb-2">${d.competitor_scraper.endpoint}</p>${code(d.competitor_scraper.prompt)}`)}
  ${section('3. Ask SCOUTT', `<p class="text-gray-400 mb-2">${d.ask_realitypulse.endpoint}</p>${code(d.ask_realitypulse.prompt_template)}`)}
  ${section('4. Raw response sample', code(d.raw_response_sample, 6000))}`
}

// ---------- AUDIO BRIEF ----------
$('#play-audio')?.addEventListener('click', () => {
  if (!window.speechSynthesis) return alert('SpeechSynthesis not supported')
  const toast = $('#audio-toast'); toast.classList.remove('hidden')
  const text = `Good morning. Threat level seventy three. Four high impact events overnight. First the EU AI Act enforcement begins today. Second Stripe quietly raised ACH transaction fees from eighty cents to ninety cents. Third Adyen launched Embedded Finance targeting your segment. Fourth Reddit sentiment around fraud detection dropped eighteen points week over week.`
  const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.pitch = 1
  speechSynthesis.cancel(); speechSynthesis.speak(u)
  u.onend = () => toast.classList.add('hidden')
})
$('#audio-stop')?.addEventListener('click', () => { speechSynthesis.cancel(); $('#audio-toast').classList.add('hidden') })

// ---------- TIME MACHINE (optimized + reset) ----------
const tmSlider = $('#time-machine'), tmLabel = $('#time-machine-label'), tmReset = $('#time-machine-reset')
let tmDebounce = null
function updateTimeMachine(v) {
  if (v === 0) { tmLabel.textContent = 'Today  live'; tmLabel.classList.add('text-policy'); tmLabel.classList.remove('text-competitor') }
  else { const d = new Date(); d.setDate(d.getDate() - v); tmLabel.textContent = d.toISOString().slice(0, 10) + '  cached'; tmLabel.classList.remove('text-policy'); tmLabel.classList.add('text-competitor') }
}
tmSlider?.addEventListener('input', (e) => {
  const v = +e.target.value
  // Snap to integer ticks instantly for label
  updateTimeMachine(v)
  // Debounced fetch (would refresh data in live mode)
  clearTimeout(tmDebounce)
  tmDebounce = setTimeout(() => { /* hook for live-mode data refresh */ }, 250)
})
tmReset?.addEventListener('click', () => {
  tmSlider.value = 0
  updateTimeMachine(0)
  // Subtle confirmation pulse
  tmReset.classList.add('shadow-glow-cyan')
  setTimeout(() => tmReset.classList.remove('shadow-glow-cyan'), 600)
})

// ---------- SCENARIO ----------
$('#scenario-run')?.addEventListener('click', async () => {
  const scenario = $('#scenario-input').value.trim(); if (!scenario) return
  const btn = $('#scenario-run'); btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin"></div> Re-running'
  const { data } = await SCOUTT.axios().post('/api/scenario', { scenario })
  await new Promise(r => setTimeout(r, 700))
  $('#scenario-result').classList.remove('hidden')
  $('#s-before').textContent = data.threat_level_before; $('#s-after').textContent = data.threat_level_after
  $('#s-threats').textContent = '+' + data.delta_threats; $('#s-actions').textContent = '+' + data.delta_actions
  $('#s-events').innerHTML = (data.impacted_events || []).map(e => `<div class="card p-3 flex items-start gap-3"><i class="fa-solid fa-arrow-trend-up text-action mt-1"></i><div class="flex-1"><div class="text-sm font-medium">${e.title}</div><div class="text-xs text-gray-500">sev ${e.severity}  ${e.pillar}</div></div></div>`).join('')
  btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run scenario'
})

// ---------- PULSE WHEEL TOOLTIP ----------
const wheel = $('#pulse-wheel-container'), tooltip = $('#wheel-tooltip')
if (wheel && tooltip) {
  wheel.addEventListener('mouseover', (e) => {
    const g = e.target.closest('.wheel-tick'); if (!g) return
    tooltip.innerHTML = `<div class="font-semibold mb-1" style="color:${g.dataset.color}">${g.dataset.title}</div><div class="text-gray-400 mono text-[11px]">Severity ${g.dataset.sev}/100</div><a href="${g.dataset.url}" target="_blank" class="text-policy text-[11px] hover:underline pointer-events-auto inline-block mt-1">Open source </a>`
    tooltip.style.opacity = '1'
  })
  wheel.addEventListener('mousemove', (e) => { const rect = wheel.getBoundingClientRect(); tooltip.style.left = (e.clientX - rect.left + 12) + 'px'; tooltip.style.top = (e.clientY - rect.top + 12) + 'px' })
  wheel.addEventListener('mouseleave', () => tooltip.style.opacity = '0')
}

// ---------- INIT ----------
async function reloadAllPanes() {
  _policyLoaded = _competitorLoaded = _sentimentLoaded = _archetypeLoaded = false
  await loadBriefing()
  await loadTimeline()
  await loadActions()
  await chartSentimentVolume()
  drawSparklines()
  // The active pane gets its content immediately
  const active = $('.tab-btn.tab-active')?.dataset.tab
  if (active === 'policy') ensurePolicyLoaded()
  if (active === 'competitor') ensureCompetitorLoaded()
  if (active === 'sentiment') ensureSentimentLoaded()
  if (active === 'archetype') ensureArchetypeLoaded()
}

;(async function init() {
  await loadBriefing()
  await loadTimeline()
  await loadActions()
  await chartSentimentVolume()
  setTimeout(drawSparklines, 100)
  window.addEventListener('resize', drawSparklines)
})()
