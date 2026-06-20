// =====================================================================
// RealityPulse — Dashboard interactivity
// Tabs, Pulse Wheel tooltip, Cmd+K, Transparency Drawer, Charts,
// Audio brief (SpeechSynthesis), Time Machine, Scenario simulator.
// =====================================================================

const $ = (s, p = document) => p.querySelector(s)
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s))

// ---------- 1. TAB SWITCHING ----------
$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab
    $$('.tab-btn').forEach((b) => {
      b.classList.remove('tab-active')
      b.classList.add('text-gray-400')
    })
    btn.classList.add('tab-active')
    btn.classList.remove('text-gray-400')
    $$('.tab-pane').forEach((p) => p.classList.add('hidden'))
    $(`[data-pane="${target}"]`).classList.remove('hidden')
    // Trigger chart re-render when revealed (Chart.js handles container sizing)
    window.dispatchEvent(new Event('resize'))
  })
})

// ---------- 2. PULSE WHEEL TOOLTIP ----------
const wheel = $('#pulse-wheel-container')
const tooltip = $('#wheel-tooltip')
if (wheel && tooltip) {
  wheel.addEventListener('mouseover', (e) => {
    const g = e.target.closest('.wheel-tick')
    if (!g) return
    tooltip.innerHTML = `
      <div class="font-semibold mb-1" style="color:${g.dataset.color}">${g.dataset.title}</div>
      <div class="text-gray-400 mono text-[11px]">Severity ${g.dataset.sev}/100</div>
      <a href="${g.dataset.url}" target="_blank" class="text-policy text-[11px] hover:underline pointer-events-auto inline-block mt-1">Open source ↗</a>
    `
    tooltip.style.opacity = '1'
  })
  wheel.addEventListener('mousemove', (e) => {
    const rect = wheel.getBoundingClientRect()
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px'
    tooltip.style.top = (e.clientY - rect.top + 12) + 'px'
  })
  wheel.addEventListener('mouseleave', () => (tooltip.style.opacity = '0'))
}

// ---------- 3. TIMELINE (left rail) ----------
async function loadTimeline() {
  const data = await axios.get('/api/timeline').then((r) => r.data)
  const colors = { policy: '#06b6d4', competitor: '#f97316', sentiment: '#ec4899' }
  $('#timeline-list').innerHTML = data
    .map(
      (e, i) => `
      <li class="relative" style="animation-delay:${i * 40}ms">
        <span class="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full" style="background:${colors[e.pillar]};box-shadow:0 0 0 3px rgba(${e.pillar === 'policy' ? '6,182,212' : e.pillar === 'competitor' ? '249,115,22' : '236,72,153'},0.18)"></span>
        <div class="text-[10px] mono text-gray-500 mb-0.5">${e.date} · sev ${e.severity}</div>
        <div class="text-xs leading-snug">${e.title}</div>
      </li>`,
    )
    .join('')
}
loadTimeline()

// ---------- 4. TODAY'S 3 ACTIONS ----------
async function loadActions() {
  const brief = await axios.get('/api/briefing/today').then((r) => r.data)
  const colors = { high: 'action', medium: 'competitor', low: 'gray-500' }
  $('#actions-list').innerHTML = brief.actions
    .map(
      (a, i) => `
      <div class="card p-3 hover:border-action/50 transition" data-action="${i}">
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
      </div>`,
    )
    .join('')

  // Draft buttons
  $$('.action-draft-btn').forEach((b) =>
    b.addEventListener('click', async () => {
      const { data } = await axios.post('/api/action/draft', {
        action_id: +b.dataset.action,
        kind: b.dataset.kind,
      })
      showDraftModal(data)
    }),
  )
}
loadActions()

function showDraftModal(data) {
  const m = document.createElement('div')
  m.className = 'fixed inset-0 z-50 cmdk-backdrop flex items-center justify-center px-4'
  m.innerHTML = `
    <div class="card w-full max-w-xl p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">${data.kind === 'email' ? 'Email draft' : 'Slack message'}</h3>
        <div class="flex items-center gap-2">
          <span class="text-[10px] mono text-action">${data.credits_used} credits</span>
          <button class="closeit text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <pre class="whitespace-pre-wrap text-sm bg-ink-900 p-4 rounded-lg border border-ink-700 max-h-[400px] overflow-y-auto">${data.body.replace(/</g, '&lt;')}</pre>
      <div class="text-[10px] mono text-gray-500 mt-3">Generated by ${data.generated_by}</div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="closeit text-gray-400 hover:text-white px-3 py-2 text-sm">Close</button>
        <button class="copyit bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm">Copy</button>
      </div>
    </div>`
  document.body.appendChild(m)
  m.querySelectorAll('.closeit').forEach((b) => b.addEventListener('click', () => m.remove()))
  m.querySelector('.copyit').addEventListener('click', () => {
    navigator.clipboard.writeText(data.body)
    m.querySelector('.copyit').textContent = '✓ Copied'
  })
  m.addEventListener('click', (e) => { if (e.target === m) m.remove() })
}

// ---------- 5. KPI SPARKLINES ----------
function drawSparklines() {
  const sparks = $$('.kpi-spark')
  sparks.forEach((cv, idx) => {
    const ctx = cv.getContext('2d')
    cv.width = cv.offsetWidth
    cv.height = 22
    const colors = ['#06b6d4', '#10b981', '#f97316', '#ec4899']
    const c = colors[idx % 4]
    const data = Array.from({ length: 14 }, () => Math.random() * 0.6 + 0.2)
    const grad = ctx.createLinearGradient(0, 0, 0, 22)
    grad.addColorStop(0, c + '66')
    grad.addColorStop(1, c + '00')
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * cv.width
      const y = 22 - v * 22
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(cv.width, 22); ctx.lineTo(0, 22); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * cv.width
      const y = 22 - v * 22
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke()
  })
}
setTimeout(drawSparklines, 100)
window.addEventListener('resize', drawSparklines)

// ---------- 6. CHART.JS: SENTIMENT VOLUME (stacked area) ----------
async function chartSentimentVolume() {
  const data = await axios.get('/api/charts/sentiment-volume').then((r) => r.data)
  const ctx = $('#chart-sentiment-volume')
  if (!ctx) return
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((d) => d.date.slice(5)),
      datasets: [
        { label: 'Positive', data: data.map((d) => d.positive), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10b981', fill: true, tension: 0.35, pointRadius: 0 },
        { label: 'Neutral', data: data.map((d) => d.neutral), backgroundColor: 'rgba(58,64,85,0.5)', borderColor: '#3a4055', fill: true, tension: 0.35, pointRadius: 0 },
        { label: 'Negative', data: data.map((d) => d.negative), backgroundColor: 'rgba(236,72,153,0.5)', borderColor: '#ec4899', fill: true, tension: 0.35, pointRadius: 0 },
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
chartSentimentVolume()

// ---------- 7. PRICING RACE (animated line) ----------
async function chartPricingRace() {
  const data = await axios.get('/api/charts/pricing-race').then((r) => r.data)
  const ctx = $('#chart-pricing-race')
  if (!ctx) return
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((d) => d.date.slice(5)),
      datasets: [
        { label: 'You', data: data.map((d) => d.you), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, pointRadius: 0, borderWidth: 2 },
        { label: 'Stripe', data: data.map((d) => d.stripe), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', tension: 0.0, pointRadius: 0, borderWidth: 2, stepped: true },
        { label: 'Adyen', data: data.map((d) => d.adyen), borderColor: '#06b6d4', tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Checkout', data: data.map((d) => d.checkout), borderColor: '#ec4899', tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: '#3a4055', font: { size: 9 }, callback: (v) => '$' + v.toFixed(2) }, grid: { color: 'rgba(58,64,85,0.15)' } },
      },
    },
  })
}
chartPricingRace()

// ---------- 8. POLICY HEATMAP MAP PINS ----------
async function loadPolicyMap() {
  const data = await axios.get('/api/charts/policy-regions').then((r) => r.data)
  const pins = $('#map-pins')
  const trend = $('#chart-policy-trend')
  const cards = $('#reg-cards')
  if (!pins) return
  // Equirectangular projection on container
  pins.innerHTML = data
    .map((r) => {
      const x = ((r.lng + 180) / 360) * 100
      const y = ((90 - r.lat) / 180) * 100
      const color = r.activity > 70 ? '' : r.activity > 45 ? 'orange' : 'magenta'
      return `
        <div class="absolute" style="left:${x}%; top:${y}%; transform: translate(-50%,-50%)" title="${r.country}: ${r.count} changes (activity ${r.activity})">
          <div class="map-pin ${color}"></div>
          <div class="absolute -top-6 left-1/2 -translate-x-1/2 mono text-[10px] text-gray-300 whitespace-nowrap">${r.country.slice(0, 12)}</div>
        </div>`
    })
    .join('')
  // Trend chart
  if (trend) {
    new Chart(trend, {
      type: 'bar',
      data: { labels: data.map((d) => d.country.slice(0, 6)), datasets: [{ data: data.map((d) => d.count), backgroundColor: data.map((d) => d.activity > 70 ? '#06b6d4' : d.activity > 45 ? '#f97316' : '#ec4899'), borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: '#3a4055', font: { size: 9 } }, grid: { color: 'rgba(58,64,85,0.15)' } }, y: { ticks: { color: '#a1a8bd', font: { size: 9 } }, grid: { display: false } } },
      },
    })
  }
  // Regulation cards
  if (cards) {
    const brief = await axios.get('/api/briefing/today').then((r) => r.data)
    const regs = brief.events.filter((e) => e.pillar === 'policy')
    cards.innerHTML = regs.map((r) => regCard(r)).join('')
  }
}
loadPolicyMap()

function regCard(r) {
  const sev = r.severity
  const sevColor = sev >= 80 ? 'text-red-400' : sev >= 60 ? 'text-competitor' : 'text-policy'
  return `
    <div class="card p-5 card-hover">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2 text-[10px] mono uppercase text-policy">
          <i class="fa-solid fa-scale-balanced"></i> ${r.tags?.[0] || 'Policy'}
        </div>
        <div class="text-right">
          <div class="mono text-xl font-bold ${sevColor}">${sev}</div>
          <div class="text-[9px] mono uppercase text-gray-500">impact</div>
        </div>
      </div>
      <h4 class="font-semibold mb-1 leading-snug">${r.title}</h4>
      <p class="text-xs text-gray-400 leading-relaxed mb-3">${r.summary}</p>
      <div class="border-t border-ink-700 pt-3 flex items-center justify-between text-[11px]">
        <span class="text-gray-500 mono">${r.source_name}</span>
        <a href="${r.source_url}" target="_blank" class="text-policy hover:underline">Source ↗</a>
      </div>
    </div>`
}

// ---------- 9. DIFF TIMELINE markers ----------
function loadDiffTimeline() {
  const el = $('#diff-timeline')
  if (!el) return
  const markers = [
    { x: 5, sev: 33, c: '#f97316' },
    { x: 18, sev: 55, c: '#f97316' },
    { x: 32, sev: 71, c: '#f97316' },
    { x: 51, sev: 62, c: '#ec4899' },
    { x: 68, sev: 81, c: '#f97316' },
    { x: 79, sev: 76, c: '#f97316' },
    { x: 93, sev: 92, c: '#06b6d4' },
  ]
  el.innerHTML = `
    <div class="absolute inset-0 flex items-center px-2">
      <div class="w-full h-px bg-ink-600"></div>
    </div>
    ${markers
      .map(
        (m) => `
        <div class="absolute top-1/2 -translate-y-1/2" style="left:${m.x}%">
          <div class="w-3 h-3 rounded-full" style="background:${m.c};box-shadow:0 0 0 3px rgba(255,255,255,0.04), 0 0 10px ${m.c}"></div>
        </div>`,
      )
      .join('')}
    <div class="absolute bottom-1 left-2 text-[10px] mono text-gray-500">7 days ago</div>
    <div class="absolute bottom-1 right-2 text-[10px] mono text-policy">now</div>
  `
}
loadDiffTimeline()

// ---------- 10. FEATURE MATRIX ----------
async function loadFeatureMatrix() {
  const el = $('#feature-matrix')
  if (!el) return
  const { competitors, features } = await axios.get('/api/charts/feature-matrix').then((r) => r.data)
  el.innerHTML = `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-[10px] mono uppercase text-gray-500 border-b border-ink-700">
          <th class="text-left py-2 px-3 font-normal">Feature</th>
          ${competitors.map((c, i) => `<th class="py-2 px-3 font-normal ${i === 0 ? 'text-policy' : ''}">${c}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${features
          .map(
            (f, i) => `
            <tr class="border-b border-ink-700/40 hover:bg-ink-800/30">
              <td class="py-2.5 px-3">${f.name}</td>
              ${f.values
                .map(
                  (v, j) => `
                  <td class="py-2.5 px-3 text-center ${j === 0 ? 'bg-policy/5' : ''}">
                    ${v ? '<i class="fa-solid fa-check text-emerald-400"></i>' : '<i class="fa-solid fa-xmark text-gray-600"></i>'}
                  </td>`,
                )
                .join('')}
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>`
}
loadFeatureMatrix()

// ---------- 11. SENTIMENT BUBBLE CHART (custom layout) ----------
async function loadBubbles() {
  const el = $('#bubble-chart')
  if (!el) return
  const data = await axios.get('/api/charts/topic-bubbles').then((r) => r.data)
  const W = el.clientWidth || 700
  const H = 420
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full">${
    data.map((b, i) => {
      const r = 18 + (b.mentions / 240) * 38
      const angle = (i / data.length) * Math.PI * 2
      const cx = W / 2 + Math.cos(angle) * (W / 4.5) * (0.6 + (i % 3) * 0.2)
      const cy = H / 2 + Math.sin(angle) * (H / 3.5) * (0.6 + (i % 3) * 0.2)
      const color = b.sentiment > 0.3 ? '#10b981' : b.sentiment > -0.2 ? '#a1a8bd' : '#ec4899'
      return `<g class="cursor-pointer">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-opacity="0.55" stroke-width="1.4" />
        <text x="${cx}" y="${cy + 4}" fill="#e7eaf3" text-anchor="middle" font-size="11" font-family="Inter">${b.topic.length > 18 ? b.topic.slice(0, 16) + '…' : b.topic}</text>
        <text x="${cx}" y="${cy + 17}" fill="${color}" text-anchor="middle" font-size="9" font-family="JetBrains Mono">${b.mentions}</text>
      </g>`
    }).join('')
  }</svg>`
}
loadBubbles()

// ---------- 12. DIVERGING BAR ----------
function chartDiverging() {
  const ctx = $('#chart-diverging')
  if (!ctx) return
  const labels = ['You', 'Stripe', 'Adyen', 'Checkout']
  const vals = [+24, -8, +6, -14]
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: vals, backgroundColor: vals.map((v) => v > 0 ? '#10b981' : '#ec4899'), borderRadius: 4 }] },
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
chartDiverging()

// ---------- 13. WORD CLOUD ----------
async function loadWordCloud() {
  const el = $('#word-cloud')
  if (!el) return
  const words = await axios.get('/api/charts/wordcloud').then((r) => r.data)
  const palette = ['#06b6d4', '#f97316', '#ec4899', '#10b981', '#a1a8bd']
  el.innerHTML = words
    .map((w, i) => {
      const size = 12 + (w.value / 90) * 28
      const c = palette[i % palette.length]
      return `<span class="inline-block font-semibold hover:scale-110 transition" style="font-size:${size}px;color:${c}">${w.text}</span>`
    })
    .join('')
}
loadWordCloud()

// ---------- 14. QUOTES CAROUSEL ----------
const QUOTES = [
  { text: 'Switched our ACH from Stripe to a competitor after the silent fee hike. $14k/yr savings.', src: 'Reddit r/fintech', stars: '★★★★★' },
  { text: 'Fraud false-positives blocking 8% of real txns. Support response time is the worst part.', src: 'G2 Crowd', stars: '★★☆☆☆' },
  { text: 'Instant KYC is the killer feature. We onboarded a marketplace in 4 hours.', src: 'Product Hunt', stars: '★★★★★' },
  { text: 'Pricing transparency on their site changed overnight without notice. Not great.', src: 'Trustpilot', stars: '★★★☆☆' },
  { text: 'Adyen Embedded Finance just dropped — clean docs but priced for $100M+ companies.', src: 'Hacker News', stars: '★★★★☆' },
]
let qi = 0
function renderQuote() {
  const el = $('#quotes-carousel')
  if (!el) return
  const q = QUOTES[qi]
  el.innerHTML = `
    <div class="w-full slide-up">
      <div class="text-sentiment text-2xl mono mb-2">"</div>
      <p class="text-base leading-relaxed mb-3">${q.text}</p>
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span class="mono">${q.src}</span>
        <span class="text-yellow-400">${q.stars}</span>
      </div>
    </div>`
  $('#quote-counter').textContent = `${qi + 1} / ${QUOTES.length}`
}
renderQuote()
$('#quote-next')?.addEventListener('click', () => { qi = (qi + 1) % QUOTES.length; renderQuote() })
$('#quote-prev')?.addEventListener('click', () => { qi = (qi - 1 + QUOTES.length) % QUOTES.length; renderQuote() })

// ---------- 15. ARCHETYPE RADAR ----------
function chartRadar() {
  const ctx = $('#chart-radar')
  if (!ctx) return
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Compliance', 'Pricing', 'Onboarding', 'Sentiment', 'Embedded Finance', 'Innovation Speed'],
      datasets: [
        { label: 'You', data: [88, 72, 95, 70, 45, 80], borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.15)', pointBackgroundColor: '#06b6d4' },
        { label: 'Industry baseline', data: [65, 75, 60, 68, 78, 65], borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.10)', pointBackgroundColor: '#f97316' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#a1a8bd', font: { size: 11 } } } },
      scales: { r: { angleLines: { color: 'rgba(58,64,85,0.4)' }, grid: { color: 'rgba(58,64,85,0.3)' }, pointLabels: { color: '#a1a8bd', font: { size: 10 } }, ticks: { color: '#3a4055', backdropColor: 'transparent', font: { size: 9 } }, suggestedMin: 0, suggestedMax: 100 } },
    },
  })
}
chartRadar()

// ---------- 16. Cmd+K ----------
const cmdk = $('#cmdk')
const cmdkInput = $('#cmdk-input')
const cmdkOutput = $('#cmdk-output')
const cmdkSugg = $('#cmdk-suggestions')
function openCmdk() { cmdk.classList.remove('hidden'); setTimeout(() => cmdkInput.focus(), 50) }
function closeCmdk() { cmdk.classList.add('hidden'); cmdkInput.value = ''; cmdkOutput.classList.add('hidden'); cmdkSugg.classList.remove('hidden') }
$('#cmdk-trigger')?.addEventListener('click', openCmdk)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk() }
  if (e.key === 'Escape') closeCmdk()
})
cmdk?.addEventListener('click', (e) => { if (e.target === cmdk) closeCmdk() })
$$('.cmdk-suggestion').forEach((b) => b.addEventListener('click', () => { cmdkInput.value = b.textContent; askIt() }))
cmdkInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') askIt() })

async function askIt() {
  const q = cmdkInput.value.trim()
  if (!q) return
  cmdkSugg.classList.add('hidden')
  cmdkOutput.classList.remove('hidden')
  cmdkOutput.innerHTML = '<div class="flex items-center gap-2 text-gray-400 text-sm"><div class="w-4 h-4 border-2 border-policy border-t-transparent rounded-full animate-spin"></div> NVIDIA meta/llama-3.2-3b-instruct is thinking…</div>'
  try {
    const { data } = await axios.post('/api/ask', { question: q })
    cmdkOutput.innerHTML = `
      <div class="text-sm leading-relaxed">${linkifyCitations(data.answer)}</div>
      <div class="mt-4 border-t border-ink-700 pt-3">
        <div class="text-[10px] mono uppercase text-gray-500 mb-2">Citations · click to scroll to source</div>
        <div class="flex flex-wrap gap-1.5">
          ${data.citations.map((c) => `
            <button data-url="${c.url}" class="citation-chip text-[11px] mono px-2 py-1 rounded border border-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'}/50 text-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'} hover:bg-${c.pillar === 'policy' ? 'policy' : c.pillar === 'competitor' ? 'competitor' : 'sentiment'}/15">
              ${c.ref} ${c.title.slice(0, 50)}${c.title.length > 50 ? '…' : ''}
            </button>`).join('')}
        </div>
      </div>
      <div class="text-[10px] mono text-gray-600 mt-3">model: ${data.model} · ${data.credits_used} credits</div>`
    $$('.citation-chip').forEach((b) => b.addEventListener('click', () => { window.open(b.dataset.url, '_blank') }))
  } catch (e) {
    cmdkOutput.innerHTML = '<div class="text-red-400 text-sm">Error reaching API: ' + e.message + '</div>'
  }
}
function linkifyCitations(s) { return s.replace(/\[(\d+)\]/g, '<sup class="text-policy mono">[$1]</sup>') }

// ---------- 17. TRANSPARENCY DRAWER ----------
const drawer = $('#transparency-drawer')
const drawerBd = $('#transparency-backdrop')
$('#transparency-trigger')?.addEventListener('click', async () => {
  drawerBd.classList.remove('hidden')
  drawer.classList.add('open')
  if (!drawer.dataset.loaded) {
    const data = await axios.get('/api/transparency').then((r) => r.data)
    $('#transparency-body').innerHTML = renderTransparency(data)
    drawer.dataset.loaded = '1'
  }
})
$('#transparency-close')?.addEventListener('click', closeDrawer)
drawerBd?.addEventListener('click', closeDrawer)
function closeDrawer() { drawer.classList.remove('open'); drawerBd.classList.add('hidden') }

function renderTransparency(d) {
  const section = (title, body) => `
    <section>
      <h3 class="font-semibold text-sm mb-2 flex items-center gap-2"><span class="w-1 h-4 bg-policy"></span> ${title}</h3>
      ${body}
    </section>`
  const code = (s, max = 4000) => `<pre class="code">${(typeof s === 'string' ? s : JSON.stringify(s, null, 2)).slice(0, max).replace(/</g, '&lt;')}</pre>`
  return `
    ${section('1. Daily Battle Brief — Anakin call', `
      <p class="text-gray-400 mb-2">${d.daily_briefing.endpoint}</p>
      <div class="text-[10px] mono uppercase text-gray-500 mb-1">System prompt</div>
      ${code(d.daily_briefing.system_prompt)}
      <div class="text-[10px] mono uppercase text-gray-500 mb-1 mt-3">Templated user prompt</div>
      ${code(d.daily_briefing.user_prompt)}
      <div class="text-[10px] mono uppercase text-gray-500 mb-1 mt-3">Custom JSON schema</div>
      ${code(d.daily_briefing.json_schema)}
      <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span class="card px-2 py-1 mono">job_id: ${d.daily_briefing.anakin_job_id}</span>
        <span class="card px-2 py-1 mono text-policy">${d.daily_briefing.credits_spent} credits</span>
        <span class="card px-2 py-1 mono text-gray-400">poll every ${d.daily_briefing.poll_interval_ms / 1000}s</span>
        <span class="card px-2 py-1 mono text-emerald-400">cache: ${d.daily_briefing.cache_hours}h free</span>
      </div>
    `)}
    ${section('2. Hourly competitor scraper', `
      <p class="text-gray-400 mb-2">${d.competitor_scraper.endpoint}</p>
      ${code(d.competitor_scraper.prompt)}
      <div class="mt-2 flex gap-3 text-xs">
        <span class="card px-2 py-1 mono text-competitor">${d.competitor_scraper.credits_per_call} credit / call</span>
        <span class="card px-2 py-1 mono">${d.competitor_scraper.cron}</span>
      </div>
    `)}
    ${section('3. Ask RealityPulse', `
      <p class="text-gray-400 mb-2">${d.ask_realitypulse.endpoint}</p>
      ${code(d.ask_realitypulse.prompt_template)}
      <div class="mt-2 flex gap-3 text-xs">
        <span class="card px-2 py-1 mono text-sentiment">${d.ask_realitypulse.credits_per_call} credits</span>
        <span class="card px-2 py-1 mono text-emerald-400">${d.ask_realitypulse.rag_layer}</span>
      </div>
    `)}
    ${section('4. Raw response sample (briefings.generated_json)', code(d.raw_response_sample, 6000))}
  `
}

// ---------- 18. AUDIO BRIEF (SpeechSynthesis, free) ----------
$('#play-audio')?.addEventListener('click', () => {
  if (!window.speechSynthesis) return alert('SpeechSynthesis not supported')
  const toast = $('#audio-toast')
  toast.classList.remove('hidden')
  const text = `Good morning. Threat level seventy-three. Four high impact events overnight.
    First: EU AI Act Article six enforcement begins today. Your underwriting models likely require conformity assessment.
    Second: Stripe quietly raised ACH transaction fees from eighty cents to ninety cents — a twelve-and-a-half percent hike.
    Third: Adyen launched their Embedded Finance API targeting your SMB segment.
    Fourth: Reddit sentiment around fraud detection dropped eighteen points week over week.
    Today's top action: audit your underwriting models for EU AI Act compliance by end of week.`
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.05; u.pitch = 1.0
  speechSynthesis.cancel(); speechSynthesis.speak(u)
  u.onend = () => toast.classList.add('hidden')
})
$('#audio-stop')?.addEventListener('click', () => {
  speechSynthesis.cancel()
  $('#audio-toast').classList.add('hidden')
})

// ---------- 19. TIME MACHINE slider ----------
$('#time-machine')?.addEventListener('input', (e) => {
  const v = +e.target.value
  const label = $('#time-machine-label')
  if (v === 0) { label.textContent = 'Today · live'; label.classList.add('text-policy'); label.classList.remove('text-competitor') }
  else { const d = new Date(); d.setDate(d.getDate() - v); label.textContent = d.toISOString().slice(0, 10) + ' · cached'; label.classList.remove('text-policy'); label.classList.add('text-competitor') }
})

// ---------- 20. SCENARIO SIMULATOR ----------
$('#scenario-run')?.addEventListener('click', async () => {
  const scenario = $('#scenario-input').value.trim()
  if (!scenario) return
  const btn = $('#scenario-run')
  btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 border-2 border-ink-950 border-t-transparent rounded-full animate-spin"></div> Re-running RAG…'
  const { data } = await axios.post('/api/scenario', { scenario })
  await new Promise((r) => setTimeout(r, 700))
  $('#scenario-result').classList.remove('hidden')
  $('#s-before').textContent = data.threat_level_before
  $('#s-after').textContent = data.threat_level_after
  $('#s-threats').textContent = '+' + data.delta_threats
  $('#s-actions').textContent = '+' + data.delta_actions
  $('#s-events').innerHTML = data.impacted_events.map((e) => `
    <div class="card p-3 flex items-start gap-3">
      <i class="fa-solid fa-arrow-trend-up text-action mt-1"></i>
      <div class="flex-1">
        <div class="text-sm font-medium">${e.title}</div>
        <div class="text-xs text-gray-500">sev ${e.severity} · ${e.pillar}</div>
      </div>
    </div>`).join('')
  btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run scenario'
})

// ---------- 21. CREDIT METER live ----------
async function loadCredits() {
  const c = await axios.get('/api/credit-ledger').then((r) => r.data)
  $('#credit-used').textContent = c.used
  const pct = (c.used / c.budget) * 100
  $('#credit-arc').setAttribute('stroke-dasharray', `${pct.toFixed(0)}, 100`)
}
loadCredits()

// ---------- 22. LIVE NEW-EVENT SIMULATION (Supabase Realtime stand-in) ----------
setTimeout(() => {
  const toast = document.createElement('div')
  toast.className = 'fixed bottom-6 left-6 z-40 card p-4 flex items-start gap-3 shadow-glow-cyan max-w-sm slide-up'
  toast.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-policy/15 border border-policy/40 flex items-center justify-center shrink-0">
      <span class="w-2 h-2 rounded-full bg-policy pulse-ring"></span>
    </div>
    <div class="flex-1">
      <div class="text-xs mono uppercase text-policy">New event · realtime</div>
      <div class="text-sm font-medium mt-1">CFPB filing detected — BNPL pay-in-4 circular</div>
      <div class="text-[11px] text-gray-500 mt-1">via Supabase Realtime · INSERT on events</div>
    </div>
    <button onclick="this.parentElement.remove()" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 7000)
}, 5000)
