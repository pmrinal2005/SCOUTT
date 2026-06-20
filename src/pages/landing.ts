import { htmlShell } from './shell'

export const landingPage = () =>
  htmlShell({
    title: 'RealityPulse — Bloomberg Terminal for SMBs',
    bodyHTML: `
<!-- Navbar -->
<nav class="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-ink-700/50">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5 group">
      <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-policy to-sentiment flex items-center justify-center">
        <div class="absolute inset-0 rounded-full pulse-ring"></div>
        <i class="fa-solid fa-satellite-dish text-white text-sm"></i>
      </div>
      <span class="text-lg font-bold tracking-tight">RealityPulse</span>
      <span class="text-[10px] mono uppercase text-policy border border-policy/40 rounded px-1.5 py-0.5">v1.0</span>
    </a>
    <div class="hidden md:flex items-center gap-7 text-sm text-gray-400">
      <a href="#features" class="hover:text-white">Features</a>
      <a href="#how" class="hover:text-white">How it works</a>
      <a href="/threat-index" class="hover:text-white">Threat Index</a>
      <a href="https://anakin.io/docs" target="_blank" class="hover:text-white">Docs <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ml-0.5"></i></a>
    </div>
    <a href="/dashboard?demo=true" class="bg-policy text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg hover:shadow-glow-cyan transition">
      See it in action <i class="fa-solid fa-arrow-right ml-1"></i>
    </a>
  </div>
</nav>

<!-- HERO -->
<section class="relative overflow-hidden">
  <div class="absolute inset-0 grid-bg opacity-40"></div>
  <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-policy/20 rounded-full blur-[120px]"></div>
  <div class="absolute top-40 right-0 w-[400px] h-[400px] bg-sentiment/15 rounded-full blur-[100px]"></div>

  <div class="relative max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
    <div class="slide-up">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-policy/10 border border-policy/30 text-policy text-xs mono mb-6">
        <span class="w-1.5 h-1.5 rounded-full bg-policy pulse-ring"></span>
        LIVE — 3,247 changes detected in the last 24h
      </div>
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
        The Bloomberg Terminal<br>
        <span class="bg-gradient-to-r from-policy via-sentiment to-competitor bg-clip-text text-transparent">for small business.</span>
      </h1>
      <p class="text-lg text-gray-400 leading-relaxed mb-8 max-w-xl">
        A single Daily Battle Brief that tells you exactly which regulations, competitor moves, and customer sentiment shifts will affect <em>your</em> business — and what to do about each one before lunch.
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-10">
        <a href="/dashboard?demo=true" class="bg-policy text-ink-950 font-semibold px-5 py-3 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-bolt"></i> See it in action — no signup
        </a>
        <a href="/onboarding" class="bg-ink-700/70 border border-ink-600 px-5 py-3 rounded-lg hover:bg-ink-700 transition flex items-center gap-2">
          <i class="fa-solid fa-rocket"></i> Set up your tenant
        </a>
      </div>
      <div class="grid grid-cols-3 gap-6 max-w-md">
        <div>
          <div class="mono text-2xl font-semibold text-white">12</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Affect you today</div>
        </div>
        <div>
          <div class="mono text-2xl font-semibold text-white">06:00 UTC</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Daily brief</div>
        </div>
        <div>
          <div class="mono text-2xl font-semibold text-white">~15 ¢</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Per briefing</div>
        </div>
      </div>
    </div>

    <!-- HERO VISUAL: SVG globe with pulse dots -->
    <div class="relative slide-up" style="animation-delay: .2s">
      <div class="aspect-square max-w-[520px] mx-auto relative">
        <svg viewBox="0 0 400 400" class="w-full h-full">
          <defs>
            <radialGradient id="globeGrad" cx="50%" cy="40%">
              <stop offset="0%" stop-color="#1a1e2a" />
              <stop offset="100%" stop-color="#05060a" />
            </radialGradient>
            <radialGradient id="glow" cx="50%" cy="50%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.5" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
            </radialGradient>
          </defs>
          <!-- Outer glow -->
          <circle cx="200" cy="200" r="190" fill="url(#glow)" />
          <!-- Globe sphere -->
          <circle cx="200" cy="200" r="160" fill="url(#globeGrad)" stroke="#262b3a" stroke-width="1" />
          <!-- Meridians -->
          ${[0, 30, 60, 90, 120, 150].map((deg) => `
            <ellipse cx="200" cy="200" rx="${Math.abs(160 * Math.cos((deg * Math.PI) / 180))}" ry="160" fill="none" stroke="#3a4055" stroke-width="0.6" opacity="0.55" />
          `).join('')}
          <!-- Parallels -->
          ${[0.3, 0.55, 0.78, 0.93].map((f) => `
            <ellipse cx="200" cy="200" rx="${160 * f}" ry="${160 * f * 0.4}" fill="none" stroke="#3a4055" stroke-width="0.5" opacity="0.45" />
          `).join('')}
          <!-- Pulse dots (regulation hot spots) -->
          ${[
            { x: 250, y: 145, c: '#06b6d4' }, // Europe
            { x: 130, y: 165, c: '#06b6d4' }, // US east
            { x: 105, y: 185, c: '#f97316' }, // US west
            { x: 295, y: 235, c: '#ec4899' }, // India
            { x: 320, y: 220, c: '#06b6d4' }, // SE Asia
            { x: 235, y: 175, c: '#f97316' }, // UK
            { x: 270, y: 260, c: '#06b6d4' }, // Africa
            { x: 165, y: 270, c: '#ec4899' }, // S America
            { x: 340, y: 280, c: '#f97316' }, // Australia
          ].map((p, i) => `
            <g>
              <circle cx="${p.x}" cy="${p.y}" r="14" fill="${p.c}" opacity="0.15">
                <animate attributeName="r" from="3" to="22" dur="2.8s" begin="${i * 0.25}s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2.8s" begin="${i * 0.25}s" repeatCount="indefinite" />
              </circle>
              <circle cx="${p.x}" cy="${p.y}" r="3" fill="${p.c}" />
            </g>
          `).join('')}
        </svg>
        <!-- Caption -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-gray-500 mono">
          <span class="text-policy">●</span> Policy &nbsp;
          <span class="text-competitor">●</span> Competitor &nbsp;
          <span class="text-sentiment">●</span> Sentiment
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 3-PILLAR FEATURE BLOCKS -->
<section id="features" class="max-w-7xl mx-auto px-6 py-20">
  <div class="text-center mb-14 slide-up">
    <h2 class="text-3xl md:text-4xl font-bold mb-3">Three pillars. One brief. Every morning.</h2>
    <p class="text-gray-400 max-w-2xl mx-auto">RealityPulse fuses Anakin's Agentic Search with NVIDIA-powered reasoning to deliver a Bloomberg-grade view of your operating reality.</p>
  </div>
  <div class="grid md:grid-cols-3 gap-6 slide-up-stagger">
    ${pillarCard({
      color: 'policy',
      icon: 'fa-scale-balanced',
      title: 'Policy Radar',
      desc: 'New regulations, enforcement actions, agency guidance — globally. Each card includes a plain-English summary, deadline countdown, and a "what you must do" checklist.',
      stat: '14 EU events overnight',
      glow: 'glow-cyan',
    })}
    ${pillarCard({
      color: 'competitor',
      icon: 'fa-chess-knight',
      title: 'Competitor Pulse',
      desc: 'Hourly diffs of competitor pricing pages, feature launches, hires, funding. Side-by-side red/green snapshots are judge-bait — you literally watched them change their price.',
      stat: '+12.5% Stripe ACH overnight',
      glow: 'glow-orange',
    })}
    ${pillarCard({
      color: 'sentiment',
      icon: 'fa-wave-square',
      title: 'Sentiment Storm',
      desc: 'Topic-cluster bubble charts, sample quotes, and sentiment-delta-vs-competitors charts pulled from reviews, social, and forums.',
      stat: '-18pt fraud-tool sentiment',
      glow: 'glow-magenta',
    })}
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="how" class="max-w-7xl mx-auto px-6 py-20 border-t border-ink-700/40">
  <div class="grid lg:grid-cols-5 gap-10 items-start">
    <div class="lg:col-span-2">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">How a Battle Brief is born.</h2>
      <p class="text-gray-400 mb-6">Six steps. Two AI models. Fifteen credits. Every business day at 06:00 UTC.</p>
      <a href="/dashboard?demo=true" class="inline-flex items-center gap-2 text-policy hover:underline">
        Open the live demo dashboard <i class="fa-solid fa-arrow-right text-xs"></i>
      </a>
    </div>
    <div class="lg:col-span-3 space-y-3">
      ${[
        ['Vercel Cron @ 06:00 UTC', 'Enqueues one Inngest job per active tenant.'],
        ['Inngest worker', 'Submits Anakin Agentic Search with templated prompt + JSON schema; polls every 10s.'],
        ['Briefing JSON', 'Written to <code class="mono text-policy">briefings</code> as JSONB. Sources embedded via NVIDIA NV-Embed-v2 → pgvector.'],
        ['Supabase Realtime', 'INSERT event broadcasts → dashboard live-updates with Framer Motion entrance.'],
        ['Hourly pg_cron', 'Runs <code class="mono text-policy">/v1/url-scraper</code> against competitor pages; diff → alert via Resend/Slack.'],
        ['Ask RealityPulse', '<code class="mono text-policy">Cmd+K</code> opens a RAG chat over your briefing history. Inline citations scroll to source.'],
      ].map(([h, b], i) => `
        <div class="card p-4 flex items-start gap-4 card-hover">
          <div class="mono text-policy text-xs w-8 shrink-0">0${i + 1}</div>
          <div>
            <div class="font-semibold mb-1">${h}</div>
            <div class="text-sm text-gray-400">${b}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</section>

<!-- TECH STACK STRIP -->
<section class="border-t border-ink-700/40 py-12">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center text-xs text-gray-500 uppercase tracking-widest mb-6 mono">Powered by</div>
    <div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-gray-400">
      <span class="flex items-center gap-2"><i class="fa-solid fa-magnifying-glass-chart text-policy"></i> Anakin Agentic Search</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-microchip text-emerald-400"></i> NVIDIA meta/llama-3.2-3b-instruct</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-database text-competitor"></i> Supabase + pgvector</span>
      <span class="flex items-center gap-2"><i class="fa-brands fa-cloudflare text-orange-400"></i> Cloudflare Pages</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Inngest + Vercel Cron</span>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="max-w-4xl mx-auto px-6 py-20 text-center">
  <h2 class="text-3xl md:text-4xl font-bold mb-4">Stop reading the news. Start running on it.</h2>
  <p class="text-gray-400 mb-8">One briefing. Every morning. Built for operators who don't have time to read the news.</p>
  <a href="/dashboard?demo=true" class="bg-policy text-ink-950 font-semibold px-6 py-3.5 rounded-lg hover:shadow-glow-cyan transition inline-flex items-center gap-2">
    <i class="fa-solid fa-rocket"></i> Open the live demo
  </a>
</section>

<footer class="border-t border-ink-700/40 py-8 text-center text-xs text-gray-500">
  RealityPulse · Built with Hono · Cloudflare Pages · Anakin · NVIDIA NIM · Supabase
</footer>
`,
  })

const pillarCard = (p: { color: string; icon: string; title: string; desc: string; stat: string; glow: string }) => `
  <div class="card card-hover p-6 relative overflow-hidden">
    <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-${p.color}/20 blur-2xl"></div>
    <div class="relative">
      <div class="w-11 h-11 rounded-lg bg-${p.color}/15 border border-${p.color}/40 flex items-center justify-center mb-4 hover:shadow-${p.glow} transition">
        <i class="fa-solid ${p.icon} text-${p.color} text-lg"></i>
      </div>
      <h3 class="text-xl font-semibold mb-2">${p.title}</h3>
      <p class="text-sm text-gray-400 leading-relaxed mb-4">${p.desc}</p>
      <div class="mono text-xs text-${p.color} inline-flex items-center gap-2 bg-${p.color}/10 border border-${p.color}/30 rounded px-2 py-1">
        <span class="w-1.5 h-1.5 rounded-full bg-${p.color} pulse-ring"></span> ${p.stat}
      </div>
    </div>
  </div>
`
