import { htmlShell } from './shell'

export const onboardingPage = () =>
  htmlShell({
    title: 'Set up your tenant — RealityPulse',
    bodyHTML: `
<div class="min-h-screen flex flex-col">
  <nav class="border-b border-ink-700/50 px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5">
      <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-policy to-sentiment flex items-center justify-center">
        <i class="fa-solid fa-satellite-dish text-white text-sm"></i>
      </div>
      <span class="text-lg font-bold">RealityPulse</span>
    </a>
    <a href="/dashboard?demo=true" class="text-sm text-gray-400 hover:text-white">Skip — open demo →</a>
  </nav>

  <main class="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
    <!-- Step indicator -->
    <div class="flex items-center justify-center gap-2 mb-10">
      <div id="dot-1" class="step-dot active w-8 h-8 rounded-full bg-policy text-ink-950 flex items-center justify-center font-semibold mono text-sm">1</div>
      <div class="w-12 h-px bg-ink-600"></div>
      <div id="dot-2" class="step-dot w-8 h-8 rounded-full bg-ink-700 text-gray-500 flex items-center justify-center font-semibold mono text-sm">2</div>
      <div class="w-12 h-px bg-ink-600"></div>
      <div id="dot-3" class="step-dot w-8 h-8 rounded-full bg-ink-700 text-gray-500 flex items-center justify-center font-semibold mono text-sm">3</div>
    </div>

    <!-- STEP 1 -->
    <section id="step-1" class="card p-8 slide-up">
      <div class="text-xs mono text-policy uppercase mb-2">Step 1 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What's your business?</h1>
      <p class="text-gray-400 text-sm mb-6">We use this to template your Daily Battle Brief prompt.</p>
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
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            ${['US', 'EU', 'UK', 'CA', 'APAC', 'LATAM', 'MENA', 'Global'].map(r => `
              <button type="button" class="region-btn border border-ink-600 hover:border-policy hover:bg-policy/10 rounded-lg py-2.5 text-sm transition">${r}</button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="flex justify-end mt-8">
        <button onclick="goStep(2)" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition">
          Continue <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    </section>

    <!-- STEP 2 -->
    <section id="step-2" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 2 of 3</div>
      <h1 class="text-2xl font-bold mb-2">Who are your competitors?</h1>
      <p class="text-gray-400 text-sm mb-6">Paste 1–3 domains. We'll hourly-scrape their pricing pages and diff them.</p>
      <div class="space-y-3">
        ${[1, 2, 3].map(i => `
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-ink-700 border border-ink-600 flex items-center justify-center">
              <i class="fa-solid fa-globe text-gray-500"></i>
            </div>
            <input type="text" placeholder="${['stripe.com', 'adyen.com', 'checkout.com'][i - 1]}" class="comp-input flex-1 bg-ink-800 border border-ink-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-policy" />
            <span class="comp-badge text-xs mono text-gray-500">—</span>
          </div>
        `).join('')}
      </div>
      <div class="flex justify-between mt-8">
        <button onclick="goStep(1)" class="text-gray-400 hover:text-white px-4 py-2.5">← Back</button>
        <button onclick="goStep(3)" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition">
          Continue <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    </section>

    <!-- STEP 3 -->
    <section id="step-3" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 3 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What matters to you?</h1>
      <p class="text-gray-400 text-sm mb-6">Toggle the six signal pillars. You can change these later.</p>
      <div class="grid grid-cols-2 gap-3">
        ${[
          ['policy', 'fa-scale-balanced', 'Policy', 'cyan'],
          ['pricing', 'fa-tag', 'Pricing', 'orange'],
          ['features', 'fa-puzzle-piece', 'Features', 'orange'],
          ['sentiment', 'fa-wave-square', 'Sentiment', 'pink'],
          ['supply_chain', 'fa-truck-fast', 'Supply Chain', 'cyan'],
          ['hiring', 'fa-user-tie', 'Hiring', 'orange'],
        ].map(([id, ic, label]) => `
          <label class="pillar-toggle cursor-pointer card p-4 flex items-center gap-3 card-hover">
            <input type="checkbox" data-pillar="${id}" checked class="w-4 h-4 accent-cyan-500" />
            <i class="fa-solid ${ic} text-gray-400"></i>
            <span class="font-medium">${label}</span>
          </label>
        `).join('')}
      </div>

      <div class="flex justify-between mt-8">
        <button onclick="goStep(2)" class="text-gray-400 hover:text-white px-4 py-2.5">← Back</button>
        <button onclick="launchBrief()" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-rocket"></i> Generate my first briefing
        </button>
      </div>
    </section>

    <!-- LOADING -->
    <section id="loading" class="card p-10 hidden text-center">
      <div class="relative w-24 h-24 mx-auto mb-6">
        <div class="absolute inset-0 rounded-full border-2 border-policy/30"></div>
        <div class="absolute inset-0 rounded-full border-t-2 border-policy animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <i class="fa-solid fa-satellite-dish text-policy text-2xl"></i>
        </div>
      </div>
      <h2 class="text-xl font-bold mb-2">Brewing your first briefing</h2>
      <p id="loading-caption" class="text-gray-400 text-sm transition-opacity duration-500">Reading 1,247 regulations…</p>
      <div class="mono text-xs text-gray-600 mt-6">Anakin job · ~15 credits · ~12s expected</div>
    </section>
  </main>
</div>

<script>
  let step = 1
  function goStep(n) {
    step = n
    for (let i = 1; i <= 3; i++) {
      document.getElementById('step-' + i).classList.toggle('hidden', i !== n)
      const dot = document.getElementById('dot-' + i)
      if (i <= n) { dot.classList.remove('bg-ink-700','text-gray-500'); dot.classList.add('bg-policy','text-ink-950') }
      else { dot.classList.remove('bg-policy','text-ink-950'); dot.classList.add('bg-ink-700','text-gray-500') }
    }
  }
  // Region buttons
  document.querySelectorAll('.region-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.region-btn').forEach(x => x.classList.remove('bg-policy/10','border-policy','text-policy'))
    b.classList.add('bg-policy/10','border-policy','text-policy')
  }))
  // Validate competitor domains (preview favicon)
  document.querySelectorAll('.comp-input').forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const v = e.target.value.trim()
      const badge = e.target.parentElement.querySelector('.comp-badge')
      const icon = e.target.parentElement.querySelector('i')
      if (/^[a-z0-9.-]+\\.[a-z]{2,}$/i.test(v)) {
        badge.textContent = '✓ valid'
        badge.classList.remove('text-gray-500'); badge.classList.add('text-emerald-400')
        icon.parentElement.style.backgroundImage = 'url(https://www.google.com/s2/favicons?domain=' + v + '&sz=64)'
        icon.parentElement.style.backgroundSize = 'cover'
        icon.style.display = 'none'
      } else {
        badge.textContent = '—'; badge.classList.add('text-gray-500'); badge.classList.remove('text-emerald-400')
        icon.parentElement.style.backgroundImage = ''
        icon.style.display = 'inline'
      }
    })
  })
  // Loading captions cycling
  const captions = [
    'Reading 1,247 regulations…',
    'Cross-referencing your competitors…',
    'Embedding source documents into pgvector…',
    'Asking NVIDIA meta/llama-3.2-3b-instruct to synthesize…',
    'Composing your Daily Battle Brief…',
  ]
  function launchBrief() {
    document.getElementById('step-3').classList.add('hidden')
    document.getElementById('loading').classList.remove('hidden')
    let i = 0
    const el = document.getElementById('loading-caption')
    const t = setInterval(() => {
      i = (i + 1) % captions.length
      el.style.opacity = 0
      setTimeout(() => { el.textContent = captions[i]; el.style.opacity = 1 }, 250)
    }, 1700)
    setTimeout(() => { clearInterval(t); window.location.href = '/dashboard?demo=true&fresh=1' }, 8500)
  }
</script>
`,
  })
