// src/pages/onboarding.ts
// =====================================================================
// 🔥 REWRITTEN — fixes onboarding bug #1 from the user's report:
//
//   "when i add more competitor links in the onboarding process step2,
//    the logos of previous competitor links disappears"
//
// Root cause
// ──────────
// The previous version set the favicon `background-image` ONLY inside
// the `input` event handler. When `renderCompList()` rebuilt the DOM
// (after Add / Remove), all rows were re-created with empty styles —
// no favicon, no "✓ valid" badge — because `input` never fires on a
// freshly-rendered <input>. Existing valid domains therefore lost
// their logos the moment the user added a new row.
//
// Fix
// ─────
// `applyRowVisualState(row, value)` is now a single source of truth
// that paints favicon + badge for whatever value the row currently
// holds, and it is invoked
//   (a) immediately after every renderCompList() rebuild, AND
//   (b) from the `input` handler on every keystroke.
// So the visual state is always derived from `onboardingState.competitors`
// and never lost across re-renders.
//
// Also preserved from previous fix
// ──────────────────────────────────
// 1. Server-side tenant overlay: choices are POSTed to /api/onboarding/save
//    whenever an Anakin key is already set, so the very next /api/anakin/start
//    uses the user's competitors / industry / region / pillars.
// 2. Region-button "selected" state captured properly via .region-selected.
// 3. Dynamic add/remove (1-10 competitor cap) — unchanged.
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

    <!-- ━━━━ STEP 1 ━━━━ -->
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

    <!-- ━━━━ STEP 2 ━━━━ -->
    <section id="step-2" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 2 of 3</div>
      <h1 class="text-2xl font-bold mb-2">Who are your competitors?</h1>
      <p class="text-gray-400 text-sm mb-6">Add 1 to 10 domains. We watch each one's pricing page and flag every change. <span class="text-policy">+ Add competitor</span> to grow the list, ✕ to remove one.</p>

      <div id="comp-list" class="space-y-3">
        <!-- Three starter rows; JS handles add/remove dynamically. -->
      </div>

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

    <!-- ━━━━ STEP 3 ━━━━ -->
    <section id="step-3" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 3 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What matters to you?</h1>
      <p class="text-gray-400 text-sm mb-6">Toggle the six signal pillars. You can change these later.</p>
      <div class="grid grid-cols-2 gap-3">
        ${[
          ['policy', 'fa-scale-balanced', 'Policy'],
          ['pricing', 'fa-tag', 'Pricing'],
          ['features', 'fa-puzzle-piece', 'Features'],
          ['sentiment', 'fa-wave-square', 'Sentiment'],
          ['supply_chain', 'fa-truck-fast', 'Supply Chain'],
          ['hiring', 'fa-user-tie', 'Hiring'],
        ].map(([id, ic, label]) => `
          <label class="pillar-toggle cursor-pointer card step-card p-4 flex items-center gap-3">
            <input type="checkbox" data-pillar="${id}" checked class="w-4 h-4 accent-cyan-500" />
            <i class="fa-solid ${ic} text-gray-400"></i>
            <span class="font-medium">${label}</span>
          </label>
        `).join('')}
      </div>

      <div class="flex justify-between mt-8">
        <button type="button" onclick="goStep(2)" class="text-gray-400 hover:text-white px-4 py-2.5">← Back</button>
        <button type="button" onclick="launchBrief()" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-rocket"></i> Generate My Briefing
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
      <h2 class="text-xl font-bold mb-2">Brewing your first briefing</h2>
      <p id="loading-caption" class="text-gray-400 text-sm transition-opacity duration-500">Reading 1,247 regulations…</p>
      <div class="mono text-xs text-gray-600 mt-6">SCOUTT • ~12s expected</div>
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

  // ── Competitor list (dynamic add/remove) ──────────────────────────
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

  // 🔥 FIX (bug #1) — single source of truth for the favicon/badge visual
  //                  state. Applied AFTER every renderCompList() so that
  //                  existing valid domains keep their logos when the user
  //                  clicks "+ Add competitor" or removes a row.
  function applyRowVisualState(row, value) {
    if (!row) return
    const badge = row.querySelector('.comp-badge')
    const iconEl = row.querySelector('.comp-icon')
    const iconI = iconEl?.querySelector('i')
    const v = (value || '').trim()

    // Empty → reset.
    if (!v) {
      if (badge) {
        badge.textContent = ''
        badge.classList.remove('text-emerald-400', 'text-red-400')
        badge.classList.add('text-gray-500')
      }
      if (iconEl) {
        iconEl.style.backgroundImage = ''
        iconEl.style.backgroundColor = ''
      }
      if (iconI) iconI.style.display = 'inline'
      return
    }

    // Valid domain → paint favicon + ✓ badge.
    if (DOMAIN_RE.test(v)) {
      if (badge) {
        badge.textContent = '✓ valid'
        badge.classList.remove('text-gray-500', 'text-red-400')
        badge.classList.add('text-emerald-400')
      }
      if (iconEl) {
        // Cache-bust safe Google s2 favicon. sz=64 covers HiDPI.
        iconEl.style.backgroundImage = 'url(https://www.google.com/s2/favicons?domain=' + encodeURIComponent(v) + '&sz=64)'
        iconEl.style.backgroundSize = 'cover'
        iconEl.style.backgroundPosition = 'center'
        iconEl.style.backgroundRepeat = 'no-repeat'
      }
      if (iconI) iconI.style.display = 'none'
      return
    }

    // Invalid syntax → ✗ badge but DON'T wipe favicon (user is still typing).
    if (badge) {
      badge.textContent = '✗ invalid'
      badge.classList.remove('text-emerald-400', 'text-gray-500')
      badge.classList.add('text-red-400')
    }
  }

  function renderCompList() {
    const list = document.getElementById('comp-list')
    list.innerHTML = ''
    onboardingState.competitors.forEach((v, i) => {
      list.insertAdjacentHTML('beforeend', compRowTemplate(i, v, DEFAULTS[i] || 'yourcompetitor.com'))
    })
    bindCompEvents()
    // 🔥 FIX (bug #1) — repaint EVERY row's favicon + badge from current state
    //                  so logos survive Add / Remove operations.
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
        if (onboardingState.competitors.length <= 1) {
          showCompError('You need at least one competitor domain.')
          return
        }
        onboardingState.competitors.splice(i, 1)
        renderCompList()
      })
    })
  }

  function updateAddBtnState() {
    const addBtn = document.getElementById('comp-add')
    if (onboardingState.competitors.length >= 10) {
      addBtn.classList.add('opacity-40', 'pointer-events-none')
      addBtn.title = 'Maximum of 10 competitors'
    } else {
      addBtn.classList.remove('opacity-40', 'pointer-events-none')
      addBtn.title = ''
    }
  }

  function showCompError(msg) {
    const el = document.getElementById('comp-error')
    el.textContent = msg
    el.classList.remove('hidden')
    setTimeout(() => el.classList.add('hidden'), 3500)
  }

  document.getElementById('comp-add').addEventListener('click', () => {
    if (onboardingState.competitors.length >= 10) return
    // Sync DOM values into state BEFORE re-render so existing rows survive.
    onboardingState.competitors = Array.from(document.querySelectorAll('.comp-input'))
      .map(i => i.value.trim())
    onboardingState.competitors.push('')
    renderCompList()
    // Focus the new (last) input.
    const inputs = document.querySelectorAll('.comp-input')
    inputs[inputs.length - 1]?.focus()
  })

  // Seed the initial 3 rows.
  onboardingState.competitors = [...DEFAULTS]
  renderCompList()

  // ── Region buttons ────────────────────────────────────────────────
  document.querySelectorAll('.region-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.region-btn').forEach(x => {
      x.classList.remove('bg-policy/10', 'border-policy', 'text-policy', 'region-selected')
    })
    b.classList.add('bg-policy/10', 'border-policy', 'text-policy', 'region-selected')
    onboardingState.region = b.dataset.region
  }))
  // Default-select US so step 2 always has a valid region even if user hits Continue immediately.
  document.querySelector('.region-btn[data-region="US"]')?.click()

  // ── Step transitions ──────────────────────────────────────────────
  function goStep(n) {
    if (n === 2) {
      onboardingState.industry = document.getElementById('industry').value
      // region already captured by the click handler; keep last selection
    }
    if (n === 3) {
      // Sync from inputs (in case user typed but didn't blur)
      onboardingState.competitors = Array.from(document.querySelectorAll('.comp-input'))
        .map(i => i.value.trim()).filter(Boolean)
      if (onboardingState.competitors.length === 0) {
        showCompError('Add at least one competitor domain to continue.')
        return
      }
    }
    step = n
    for (let i = 1; i <= 3; i++) {
      document.getElementById('step-' + i).classList.toggle('hidden', i !== n)
      const dot = document.getElementById('dot-' + i)
      if (i <= n) { dot.classList.remove('bg-ink-700', 'text-gray-500'); dot.classList.add('bg-policy', 'text-ink-950') }
      else { dot.classList.remove('bg-policy', 'text-ink-950'); dot.classList.add('bg-ink-700', 'text-gray-500') }
    }
  }
  window.goStep = goStep  // expose for inline onclick

  // ── Final launch ──────────────────────────────────────────────────
  const captions = [
    'Reading regulations for your industry…',
    'Cross-referencing YOUR competitors…',
    'Scoring policy impact for your region…',
    'Synthesising sentiment from the open web…',
    'Composing your Daily Battle Brief…',
  ]

  async function launchBrief() {
    onboardingState.pillars = Array.from(document.querySelectorAll('input[data-pillar]:checked'))
      .map(c => c.dataset.pillar)
    onboardingState.completedAt = new Date().toISOString()

    // Persist locally so the dashboard reads it on first paint.
    try { localStorage.setItem('scoutt_onboarding', JSON.stringify(onboardingState)) } catch (e) {}

    // 🔥 If an API key is already saved, push the tenant straight to the server
    // so the very next /api/anakin/start uses the user's choices.
    try {
      const key = localStorage.getItem('scoutt_anakin_key') || ''
      if (key) {
        await fetch('/api/onboarding/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Anakin-Key': key },
          body: JSON.stringify({
            industry: onboardingState.industry,
            region: onboardingState.region,
            competitor_domains: onboardingState.competitors,
            pillars_enabled: onboardingState.pillars,
          }),
        })
      }
    } catch (e) { /* non-fatal */ }

    document.getElementById('step-3').classList.add('hidden')
    document.getElementById('loading').classList.remove('hidden')
    let i = 0
    const el = document.getElementById('loading-caption')
    const t = setInterval(() => {
      i = (i + 1) % captions.length
      el.style.opacity = 0
      setTimeout(() => { el.textContent = captions[i]; el.style.opacity = 1 }, 250)
    }, 1700)

    // Route the user into the live dashboard — the dashboard's boot()
    // will read the persisted onboarding payload and finish syncing it.
    setTimeout(() => {
      clearInterval(t)
      window.location.href = '/dashboard?fresh=1'
    }, 6500)
  }
  window.launchBrief = launchBrief
</script>
`,
  })
