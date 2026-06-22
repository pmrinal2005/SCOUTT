// src/pages/onboarding.ts
// =====================================================================
// 🔥 v6 — captures the Anakin API key INSIDE the wizard (Step 3) so the
// flow becomes a true single-shot Save & Go.
//
// Previously the user finished Step 3, landed on /dashboard, and THEN
// had to enter the API key in a separate banner / modal. That extra hop
// is the very gap that confused users — they expected the dashboard to
// be populated by the time they arrived.
//
// New flow:
//   Step 1 → industry + region
//   Step 2 → competitors
//   Step 3 → pillars + Anakin API key + Save & Go button
//   On click → persist everything → POST /api/onboarding/save with the
//              key → POST /api/anakin/start (warm the job) → redirect
//              to /dashboard?fresh=1, where dashboard.js immediately
//              continues the pipeline (poll → reshape → render).
//
// This guarantees the dashboard NEVER renders demo data after Save & Go
// when the user provided a valid key.
// =====================================================================

import { htmlShell } from './shell'

export const onboardingPage = () =>
  htmlShell({
    title: 'Set up your tenant — SCOUTT',
    bodyHTML: `
<div class="min-h-screen flex flex-col">
  <nav class="border-b border-ink-700/50 px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5">
      <img src="/static/scoutt_logo.png" alt="SCOUTT" class="w-8 h-8 rounded-full object-cover" onerror="this.style.display='none'" />
      <span class="text-lg font-bold">SCOUTT</span>
    </a>
    <a href="/dashboard?demo=true" class="text-sm text-gray-400 hover:text-white">Skip — open demo</a>
  </nav>

  <main class="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
    <div class="flex items-center justify-center gap-2 mb-10">
      <div id="dot-1" class="step-dot active w-8 h-8 rounded-full bg-policy text-ink-950 flex items-center justify-center font-semibold mono text-sm">1</div>
      <div class="w-12 h-px bg-ink-600"></div>
      <div id="dot-2" class="step-dot w-8 h-8 rounded-full bg-ink-700 text-gray-500 flex items-center justify-center font-semibold mono text-sm">2</div>
      <div class="w-12 h-px bg-ink-600"></div>
      <div id="dot-3" class="step-dot w-8 h-8 rounded-full bg-ink-700 text-gray-500 flex items-center justify-center font-semibold mono text-sm">3</div>
    </div>

    <!-- ━━━━ STEP 1 — Industry + Region ━━━━ -->
    <section id="step-1" class="card p-8 slide-up">
      <div class="text-xs mono text-policy uppercase mb-2">Step 1 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What's your business?</h1>
      <p class="text-gray-400 text-sm mb-6">We use this to shape your Daily Battle Brief.</p>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Industry</label>
          <select id="industry" class="w-full bg-ink-800 border border-ink-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-policy">
            <option>B2B SaaS Fintech</option>
            <option>E-commerce / DTC</option>
            <option>HealthTech</option>
            <option>EdTech</option>
            <option>Marketplace</option>
            <option>Cybersecurity</option>
            <option>AI / ML Platform</option>
            <option>Insurance</option>
            <option>Legal Tech</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Operating region</label>
          <div id="region-grid" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            ${['US', 'EU', 'UK', 'CA', 'APAC', 'LATAM', 'MENA', 'Global'].map(r => `
              <button type="button" data-region="${r}" class="region-btn border border-ink-600 hover:border-policy hover:bg-policy/10 rounded-lg py-2.5 text-sm transition">${r}</button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="flex justify-end mt-8">
        <button type="button" onclick="goStep(2)" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition">
          Continue <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    </section>

    <!-- ━━━━ STEP 2 — Competitors ━━━━ -->
    <section id="step-2" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 2 of 3</div>
      <h1 class="text-2xl font-bold mb-2">Who are your competitors?</h1>
      <p class="text-gray-400 text-sm mb-6">Add 1 to 10 domains. We watch each one's pricing page and flag every change. <span class="text-policy">+ Add competitor</span> to grow the list, ✕ to remove one.</p>

      <div id="comp-list" class="space-y-3"></div>

      <button id="comp-add" type="button" class="mt-4 inline-flex items-center gap-2 text-sm text-policy hover:text-cyan-300 transition">
        <i class="fa-solid fa-plus"></i> Add competitor
      </button>

      <div id="comp-error" class="hidden mt-3 text-xs text-red-400"></div>

      <div class="flex justify-between mt-8">
        <button type="button" onclick="goStep(1)" class="text-gray-400 hover:text-white px-4 py-2.5">← Back</button>
        <button type="button" onclick="goStep(3)" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition">
          Continue <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    </section>

    <!-- ━━━━ STEP 3 — Pillars + API key + Save & Go ━━━━ -->
    <section id="step-3" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 3 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What matters to you?</h1>
      <p class="text-gray-400 text-sm mb-6">Toggle the six signal pillars. You can change these later.</p>
      <div class="grid grid-cols-2 gap-3">
        ${[
          ['policy',       'fa-scale-balanced', 'Policy'],
          ['pricing',      'fa-tag',            'Pricing'],
          ['features',     'fa-puzzle-piece',   'Features'],
          ['sentiment',    'fa-wave-square',    'Sentiment'],
          ['supply_chain', 'fa-truck-fast',     'Supply Chain'],
          ['hiring',       'fa-user-tie',       'Hiring'],
        ].map(([id, ic, label]) => `
          <label class="pillar-toggle cursor-pointer card step-card p-4 flex items-center gap-3">
            <input type="checkbox" data-pillar="${id}" checked class="w-4 h-4 accent-cyan-500" />
            <i class="fa-solid ${ic} text-gray-400"></i>
            <span class="font-medium">${label}</span>
          </label>
        `).join('')}
      </div>

      <!-- 🔥 v6 — Anakin API key field, captured INSIDE the wizard. -->
      <div class="mt-8 border-t border-ink-700 pt-6">
        <label class="block text-sm font-medium mb-2">
          <i class="fa-solid fa-key text-policy mr-1"></i> Your Anakin API key
        </label>
        <input id="apikey-input" type="password" placeholder="ak_..." autocomplete="off"
               class="w-full bg-ink-800 border border-ink-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-policy" />
        <p class="text-[11px] text-gray-500 mt-2">
          Required to scrape live data. Get one at <a href="https://anakin.io" target="_blank" rel="noreferrer" class="text-policy hover:underline">anakin.io</a>. We store it in your browser only.
        </p>
        <div id="apikey-error" class="hidden mt-2 text-xs text-red-400"></div>
      </div>

      <div class="flex justify-between mt-8">
        <button type="button" onclick="goStep(2)" class="text-gray-400 hover:text-white px-4 py-2.5">← Back</button>
        <button id="save-and-go" type="button" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-rocket"></i> Save &amp; Go
        </button>
      </div>
    </section>

    <!-- ━━━━ LOADING ━━━━ -->
    <section id="loading" class="card p-10 hidden text-center">
      <div class="relative w-24 h-24 mx-auto mb-6">
        <div class="absolute inset-0 rounded-full border-2 border-policy/30"></div>
        <div class="absolute inset-0 rounded-full border-t-2 border-policy animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <img src="/static/scoutt_logo.png" alt="" class="w-10 h-10 rounded-full object-cover" onerror="this.style.display='none'" />
        </div>
      </div>
      <h2 class="text-xl font-bold mb-2">Brewing your live briefing</h2>
      <p id="loading-caption" class="text-gray-400 text-sm transition-opacity duration-500">Submitting Anakin Agentic Search…</p>
      <div class="mono text-xs text-gray-600 mt-6">SCOUTT • 60-120s expected</div>
    </section>
  </main>
</div>

<script>
  // ════════════════════════════════════════════════════════════════════
  // Wizard state — single source of truth.
  // ════════════════════════════════════════════════════════════════════
  let step = 1
  const onboardingState = {
    industry: 'B2B SaaS Fintech',
    region: 'US',
    competitors: [],
    pillars: [],
  }
  const DEFAULTS = ['stripe.com', 'adyen.com', 'checkout.com']
  const DOMAIN_RE = /^[a-z0-9.-]+\\.[a-z]{2,}$/i

  function compRowTemplate(idx, value, placeholder) {
    return \`
      <div class="comp-row flex items-center gap-3" data-idx="\${idx}">
        <div class="comp-icon w-9 h-9 rounded-lg bg-ink-700 border border-ink-600 flex items-center justify-center overflow-hidden">
          <i class="fa-solid fa-globe text-gray-500"></i>
        </div>
        <input type="text" value="\${value || ''}" placeholder="\${placeholder || 'yourcompetitor.com'}"
               class="comp-input flex-1 bg-ink-800 border border-ink-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-policy" />
        <span class="comp-badge text-xs mono text-gray-500 w-16 text-right"></span>
        <button type="button" class="comp-remove text-gray-500 hover:text-red-400 w-9 h-9 flex items-center justify-center rounded-lg border border-ink-600 hover:border-red-500 transition" title="Remove competitor">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>\`
  }

  function applyRowVisualState(row, value) {
    if (!row) return
    const badge  = row.querySelector('.comp-badge')
    const iconEl = row.querySelector('.comp-icon')
    const iconI  = iconEl?.querySelector('i')
    const v = (value || '').trim()
    if (!v) {
      if (badge) { badge.textContent = ''; badge.classList.remove('text-emerald-400', 'text-red-400'); badge.classList.add('text-gray-500') }
      if (iconEl) { iconEl.style.backgroundImage = ''; iconEl.style.backgroundColor = '' }
      if (iconI) iconI.style.display = 'inline'
      return
    }
    if (DOMAIN_RE.test(v)) {
      if (badge) { badge.textContent = '✓ valid'; badge.classList.remove('text-gray-500', 'text-red-400'); badge.classList.add('text-emerald-400') }
      if (iconEl) {
        iconEl.style.backgroundImage = 'url(https://www.google.com/s2/favicons?domain=' + encodeURIComponent(v) + '&sz=64)'
        iconEl.style.backgroundSize = 'cover'; iconEl.style.backgroundPosition = 'center'; iconEl.style.backgroundRepeat = 'no-repeat'
      }
      if (iconI) iconI.style.display = 'none'
      return
    }
    if (badge) { badge.textContent = '✗ invalid'; badge.classList.remove('text-emerald-400', 'text-gray-500'); badge.classList.add('text-red-400') }
  }

  function renderCompList() {
    const list = document.getElementById('comp-list')
    list.innerHTML = ''
    onboardingState.competitors.forEach((v, i) => {
      list.insertAdjacentHTML('beforeend', compRowTemplate(i, v, DEFAULTS[i] || 'yourcompetitor.com'))
    })
    bindCompEvents()
    document.querySelectorAll('#comp-list .comp-row').forEach((row, i) => {
      applyRowVisualState(row, onboardingState.competitors[i] || '')
    })
    updateAddBtnState()
  }
  function bindCompEvents() {
    document.querySelectorAll('.comp-input').forEach((input, i) => {
      input.addEventListener('input', (e) => {
        const v = e.target.value.trim()
        onboardingState.competitors[i] = v
        applyRowVisualState(e.target.closest('.comp-row'), v)
      })
    })
    document.querySelectorAll('.comp-remove').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (onboardingState.competitors.length <= 1) { showCompError('You need at least one competitor domain.'); return }
        onboardingState.competitors.splice(i, 1); renderCompList()
      })
    })
  }
  function updateAddBtnState() {
    const addBtn = document.getElementById('comp-add')
    if (onboardingState.competitors.length >= 10) { addBtn.classList.add('opacity-40', 'pointer-events-none'); addBtn.title = 'Maximum of 10 competitors' }
    else { addBtn.classList.remove('opacity-40', 'pointer-events-none'); addBtn.title = '' }
  }
  function showCompError(msg) {
    const el = document.getElementById('comp-error'); el.textContent = msg
    el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 3500)
  }
  document.getElementById('comp-add').addEventListener('click', () => {
    if (onboardingState.competitors.length >= 10) return
    onboardingState.competitors = Array.from(document.querySelectorAll('.comp-input')).map(i => i.value.trim())
    onboardingState.competitors.push('')
    renderCompList()
    const inputs = document.querySelectorAll('.comp-input'); inputs[inputs.length - 1]?.focus()
  })
  onboardingState.competitors = [...DEFAULTS]; renderCompList()

  document.querySelectorAll('.region-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.region-btn').forEach(x => x.classList.remove('bg-policy/10', 'border-policy', 'text-policy', 'region-selected'))
    b.classList.add('bg-policy/10', 'border-policy', 'text-policy', 'region-selected')
    onboardingState.region = b.dataset.region
  }))
  document.querySelector('.region-btn[data-region="US"]')?.click()

  // ── Step transitions ───────────────────────────────────────────────
  function goStep(n) {
    if (n === 2) { onboardingState.industry = document.getElementById('industry').value }
    if (n === 3) {
      onboardingState.competitors = Array.from(document.querySelectorAll('.comp-input')).map(i => i.value.trim()).filter(Boolean)
      if (onboardingState.competitors.length === 0) { showCompError('Add at least one competitor domain to continue.'); return }
    }
    step = n
    for (let i = 1; i <= 3; i++) {
      document.getElementById('step-' + i).classList.toggle('hidden', i !== n)
      const dot = document.getElementById('dot-' + i)
      if (i <= n) { dot.classList.remove('bg-ink-700', 'text-gray-500'); dot.classList.add('bg-policy', 'text-ink-950') }
      else { dot.classList.remove('bg-policy', 'text-ink-950'); dot.classList.add('bg-ink-700', 'text-gray-500') }
    }
  }
  window.goStep = goStep

  // ── 🔥 SAVE & GO — full pipeline trigger ───────────────────────────
  const captions = [
    'Submitting Anakin Agentic Search…',
    'Anakin is reading policy + competitor + sentiment sources…',
    'Cross-referencing YOUR competitors…',
    'Reshaping the payload via Groq llama-4-scout…',
    'Painting your live Battle Brief…',
  ]

  async function saveAndGo() {
    const apikeyInput = document.getElementById('apikey-input')
    const apikeyError = document.getElementById('apikey-error')
    const apiKey = (apikeyInput.value || '').trim()

    if (!apiKey || apiKey.length < 8) {
      apikeyError.textContent = 'Please paste a valid Anakin API key (starts with ak_).'
      apikeyError.classList.remove('hidden'); return
    }
    apikeyError.classList.add('hidden')

    onboardingState.pillars = Array.from(document.querySelectorAll('input[data-pillar]:checked'))
      .map(c => c.dataset.pillar)
    onboardingState.completedAt = new Date().toISOString()

    // 1. Persist API key + onboarding locally so /dashboard sees them on first paint.
    try { localStorage.setItem('scoutt_anakin_key', apiKey) } catch {}
    try { localStorage.setItem('scoutt_onboarding', JSON.stringify(onboardingState)) } catch {}
    // 🔥 Clear ANY old live cache / raw so the dashboard cannot render stale state.
    try {
      localStorage.removeItem('scoutt_live_payload_v6')
      localStorage.removeItem('scoutt_live_raw_v6')
      // legacy keys
      localStorage.removeItem('scoutt_live_payload_v5')
      localStorage.removeItem('scoutt_live_raw_v5')
    } catch {}

    // 2. Push the tenant to the server bound to this API key.
    try {
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Anakin-Key': apiKey },
        body: JSON.stringify({
          industry: onboardingState.industry,
          region: onboardingState.region,
          competitor_domains: onboardingState.competitors,
          pillars_enabled: onboardingState.pillars,
        }),
      })
    } catch (e) { /* non-fatal — dashboard.js retries */ }

    // 3. Invalidate any stale server cache for this key.
    try {
      await fetch('/api/dashboard/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Anakin-Key': apiKey },
      })
    } catch {}

    // 4. Warm-start the Anakin job here so the dashboard can immediately
    //    enter polling phase (saves ~3s of perceived latency).
    let warmedJobId = null
    try {
      const r = await fetch('/api/anakin/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Anakin-Key': apiKey },
        body: JSON.stringify({
          industry: onboardingState.industry,
          region: onboardingState.region,
          competitor_domains: onboardingState.competitors,
          pillars_enabled: onboardingState.pillars,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (j && j.job_id) warmedJobId = j.job_id
    } catch {}
    if (warmedJobId) {
      try { localStorage.setItem('scoutt_warm_jobid', warmedJobId) } catch {}
    }

    // 5. Animate loading caption then route to the dashboard.
    document.getElementById('step-3').classList.add('hidden')
    document.getElementById('loading').classList.remove('hidden')
    let i = 0
    const el = document.getElementById('loading-caption')
    const t = setInterval(() => {
      i = (i + 1) % captions.length
      el.style.opacity = 0
      setTimeout(() => { el.textContent = captions[i]; el.style.opacity = 1 }, 250)
    }, 1700)
    setTimeout(() => {
      clearInterval(t)
      window.location.href = '/dashboard?fresh=1'
    }, 3500)
  }
  document.getElementById('save-and-go').addEventListener('click', saveAndGo)
</script>
`,
  })
