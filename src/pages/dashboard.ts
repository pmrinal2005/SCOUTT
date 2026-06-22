// src/pages/dashboard.ts
// All hardcoded chart HTML removed — everything is rendered by dashboard.js
// from /api/dashboard?day=N payload.
//
// 🆕 Loads /static/world-map-paths.js BEFORE dashboard.js so the real-world
// map paths constant is available when renderPolicy runs.
import { htmlShell } from './shell'

export const dashboardPage = (isPublicThreatIndex = false) =>
  htmlShell({
    title: isPublicThreatIndex ? 'Public Threat Index — SCOUTT' : 'Command Center — SCOUTT',
    bodyHTML: `
<!-- TOP NAV -->
<nav class="sticky top-0 z-30 backdrop-blur-md bg-ink-950/80 border-b border-ink-700/50">
  <div class="max-w-[1500px] mx-auto px-6 py-3 flex items-center gap-4">
    <a href="/" class="flex items-center gap-2.5 group shrink-0">
      <img src="/static/scoutt_logo.png" alt="SCOUTT"
           class="w-9 h-9 rounded-md object-cover ring-1 ring-policy/40 shadow-glow-cyan"
           onerror="this.onerror=null;this.style.display='none';var fb=document.getElementById('logo-fallback');if(fb){fb.style.display='flex'}" />
      <span id="logo-fallback" class="w-9 h-9 rounded-md bg-policy/15 border border-policy/40 items-center justify-center text-policy font-black text-xs" style="display:none;">S</span>
      <span class="font-bold tracking-tight text-lg">SCOUTT</span>
    </a>

    <div class="flex-1 flex items-center justify-center">
      <button id="cmdk-trigger" type="button"
              class="flex items-center gap-2 bg-ink-800/70 hover:bg-ink-700 border border-ink-600 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition w-full max-w-md">
        <i class="fa-solid fa-magnifying-glass text-xs"></i>
        <span class="flex-1 text-left">Ask SCOUTT</span>
        <kbd class="mono text-[10px] bg-ink-700 px-1.5 py-0.5 rounded border border-ink-600">⌘K</kbd>
      </button>
    </div>

    <button id="apikey-btn" type="button" class="card-hover card px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer">
      <i id="apikey-icon" class="fa-solid fa-key text-policy"></i>
      <span id="apikey-label">Enter API Key</span>
    </button>

    <button id="transparency-trigger" type="button" class="card-hover card px-3 py-1.5 text-xs flex items-center gap-1.5">
      <i class="fa-solid fa-eye text-policy"></i> How we know this
    </button>

    <button id="theme-toggle" type="button" class="card-hover card w-8 h-8 flex items-center justify-center" title="Toggle theme">
      <i class="fa-solid fa-moon text-xs"></i>
    </button>
  </div>

  <div class="max-w-[1500px] mx-auto px-6 flex items-center gap-1 overflow-x-auto">
    ${[
      ['command', 'fa-house-signal', 'Command Center'],
      ['policy', 'fa-scale-balanced', 'Policy Radar'],
      ['competitor', 'fa-chess-knight', 'Competitor Pulse'],
      ['sentiment', 'fa-wave-square', 'Sentiment Storm'],
      ['scenario', 'fa-flask', 'Scenario'],
      ['archetype', 'fa-people-arrows', 'Archetype'],
    ].map(([id, ic, label], i) => `
      <button type="button" data-tab="${id}" class="tab-btn px-4 py-3 text-sm flex items-center gap-2 hover:text-white transition cursor-pointer ${i === 0 ? 'tab-active' : 'text-gray-400'}">
        <i class="fa-solid ${ic} text-xs"></i> ${label}
      </button>
    `).join('')}
  </div>
</nav>

<main id="dashboard-main" class="max-w-[1500px] mx-auto px-6 py-6">
  ${commandCenterTab()}
  ${policyTab()}
  ${competitorTab()}
  ${sentimentTab()}
  ${scenarioTab()}
  ${archetypeTab()}
</main>

${cmdkPalette()}
${transparencyDrawer()}
${audioBriefToast()}
${apiKeyModal()}
${briefModal()}
${liveLoadingOverlay()}

<!-- 🆕 Load real-world-map SVG paths constant BEFORE dashboard.js -->
<script src="/static/world-map-paths.js"></script>
<script src="/static/dashboard.js"></script>
`,
  })

// ════════════════════════════════════════════════════════════════════
// COMMAND CENTER
// ════════════════════════════════════════════════════════════════════
function commandCenterTab() {
  return `
<section data-pane="command" class="tab-pane">
  <div class="card p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 slide-up">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-lg bg-policy/15 border border-policy/40 flex items-center justify-center shrink-0">
        <i id="greeting-icon" class="fa-solid fa-sun text-policy text-xl"></i>
      </div>
      <div>
        <div class="text-xs mono text-gray-500 uppercase mb-1">
          <span id="greeting-text">Good morning</span> — brief generated <span id="brief-time">--:-- UTC</span>
        </div>
        <h1 class="text-xl md:text-2xl font-bold"><span id="banner-events">--</span> high-impact events overnight. Threat level <span class="text-policy mono"><span id="banner-threat">--</span>/100</span>.</h1>
        <p id="banner-summary" class="text-sm text-gray-400 mt-1">Loading live briefing…</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <button id="play-audio" type="button" class="card-hover card px-3 py-2 text-sm flex items-center gap-2 cursor-pointer">
        <span id="play-audio-icon" class="inline-flex items-center justify-center w-4 h-4"><i class="fa-solid fa-headphones text-policy"></i></span>
        <span id="play-audio-label">Listen</span>
        <span class="text-[10px] mono text-gray-500">ELEVENLABS</span>
      </button>
      <button id="read-full-brief" type="button" class="bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg hover:shadow-glow-cyan text-sm cursor-pointer">Read full brief <i class="fa-solid fa-arrow-right ml-1"></i></button>
    </div>
  </div>

  <!-- TIME MACHINE -->
  <div class="card p-3 mb-5 flex items-center gap-4 slide-up">
    <button id="time-machine-reset" type="button" title="Reset to today" class="card-hover w-8 h-8 rounded-md border border-ink-600 flex items-center justify-center hover:border-policy cursor-pointer">
      <i class="fa-solid fa-clock-rotate-left text-policy"></i>
    </button>
    <span class="text-xs text-gray-400 shrink-0 mono">Time Machine</span>
    <input id="time-machine" type="range" min="0" max="7" value="0" step="1" class="flex-1 accent-cyan-500" />
    <span id="time-machine-label" class="text-xs mono text-policy shrink-0 w-36 text-right">Today — live</span>
  </div>

  <div class="grid grid-cols-12 gap-5">
    <aside class="col-span-12 lg:col-span-3 card p-4 slide-up">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm">Last 7 days</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Events</span>
      </div>
      <ol id="timeline-list" class="relative border-l border-ink-600 pl-4 space-y-3">
        <li class="text-xs text-gray-500">Loading timeline…</li>
      </ol>
    </aside>

    <div class="col-span-12 lg:col-span-6 card p-5 relative overflow-hidden slide-up">
      <div class="absolute top-3 left-5 text-xs mono uppercase text-gray-500">The Pulse Wheel — 24h</div>
      <div class="absolute top-3 right-5 flex items-center gap-3 text-[11px] mono">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-policy"></span> Policy</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-competitor"></span> Competitor</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sentiment"></span> Sentiment</span>
      </div>
      <div id="pulse-wheel-container" class="aspect-square max-w-[460px] mx-auto pt-6 pb-2"></div>
      <div id="wheel-tooltip" class="absolute bg-ink-950 border border-policy/50 rounded-lg p-3 text-xs pointer-events-none opacity-0 transition-opacity shadow-glow-cyan max-w-[240px]"></div>
    </div>

    <aside class="col-span-12 lg:col-span-3 card p-4 slide-up">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-action pulse-ring"></span> Today's 3 actions
        </h3>
      </div>
      <div id="actions-list" class="space-y-3">
        <div class="text-xs text-gray-500">Loading actions…</div>
      </div>
    </aside>

    <div class="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
      ${kpiCard('Threats Detected', 'threats', 'text-policy', 'fa-shield-halved')}
      ${kpiCard('Opportunities', 'opps', 'text-action', 'fa-bullseye')}
      ${kpiCard('Action Items', 'actions-kpi', 'text-competitor', 'fa-list-check')}
      ${kpiCard('Avg. Response', 'response', 'text-sentiment', 'fa-stopwatch')}
    </div>

    <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Threat-Level Meter</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Bloomberg style</span>
      </div>
      <div id="threat-meter-container"></div>
    </div>

    <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Sentiment Volume — 14d</h3>
        <span class="text-[10px] mono text-sentiment uppercase">+/- /neutral</span>
      </div>
      <div class="relative" style="height:200px"><canvas id="chart-sentiment-volume"></canvas></div>
    </div>

    <div class="col-span-12 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Threats → Actions Flow</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Sankey</span>
      </div>
      <div id="sankey-container"></div>
    </div>
  </div>
</section>`
}

// ════════════════════════════════════════════════════════════════════
// POLICY RADAR
// ════════════════════════════════════════════════════════════════════
function policyTab() {
  return `
<section data-pane="policy" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 lg:col-span-8 card p-5 relative">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Global Regulatory Heatmap</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Hover a pin</span>
      </div>
      <div id="world-map" class="relative w-full rounded-lg bg-gradient-to-br from-ink-900 to-ink-950 overflow-hidden border border-ink-700" style="aspect-ratio:2/1; min-height:380px;"></div>
      <div id="map-tooltip" class="absolute bg-ink-950 border border-policy/50 rounded-lg p-3 text-xs pointer-events-none opacity-0 transition-opacity shadow-glow-cyan max-w-[240px] z-10"></div>
    </div>

    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Quarter-over-quarter</h3>
        <span id="policy-qoq-delta" class="text-[10px] mono text-policy uppercase">+34% vs Q1</span>
      </div>
      <div class="relative" style="height:280px"><canvas id="chart-policy-trend"></canvas></div>
    </div>

    <div class="col-span-12">
      <div class="flex items-center justify-between mb-3 mt-1">
        <h3 class="font-semibold">Active Regulations</h3>
        <div class="flex items-center gap-2 text-xs mono text-gray-500">
          <span class="px-2 py-0.5 rounded bg-policy/15 text-policy border border-policy/40">High impact</span>
          <span class="px-2 py-0.5 rounded bg-ink-700 border border-ink-600">Deadlines &lt; 30d</span>
        </div>
      </div>
      <div id="reg-cards" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 slide-up-stagger">
        <div class="text-xs text-gray-500 col-span-full">Loading regulations…</div>
      </div>
    </div>
  </div>
</section>`
}

// ════════════════════════════════════════════════════════════════════
// COMPETITOR PULSE
// ════════════════════════════════════════════════════════════════════
function competitorTab() {
  return `
<section data-pane="competitor" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Diff Timeline — 7 days</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Scrub →</span>
      </div>
      <div id="diff-timeline" class="relative h-14 bg-ink-900 rounded-lg border border-ink-700"></div>
    </div>

    <div class="col-span-12 lg:col-span-8 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold" id="diff-title">Pricing Diff — loading…</h3>
        <div class="flex items-center gap-2 text-xs mono">
          <span class="text-gray-500" id="diff-before-time">--</span>
          <i class="fa-solid fa-arrow-right text-policy"></i>
          <span class="text-policy" id="diff-after-time">--</span>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-3">
        <div class="border border-ink-700 rounded-lg overflow-hidden">
          <div class="bg-ink-900 px-3 py-2 text-xs mono text-gray-400 flex items-center justify-between border-b border-ink-700">
            <span>BEFORE — cached snapshot</span><span class="text-[10px] text-gray-500">html_hash: a3f2</span>
          </div>
          <div id="diff-before" class="p-4 font-mono text-xs leading-relaxed space-y-1"></div>
        </div>
        <div class="border border-ink-700 rounded-lg overflow-hidden">
          <div class="bg-ink-900 px-3 py-2 text-xs mono text-gray-400 flex items-center justify-between border-b border-ink-700">
            <span class="text-policy">AFTER — current</span><span class="text-[10px] text-gray-500">html_hash: b9e1</span>
          </div>
          <div id="diff-after" class="p-4 font-mono text-xs leading-relaxed space-y-1"></div>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3 text-xs">
        <span id="diff-fee-pct" class="px-2 py-1 rounded bg-competitor/15 text-competitor border border-competitor/40 mono">--%</span>
        <span class="text-gray-400">Threat level: <strong id="diff-threat" class="text-white mono">--</strong></span>
        <button class="ml-auto text-policy hover:underline">Generate counter-email →</button>
      </div>
    </div>

    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Pricing Race — 30d</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">ACH per-txn</span>
      </div>
      <div class="relative" style="height:260px"><canvas id="chart-pricing-race"></canvas></div>
    </div>

    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Competitor Events Feed</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Live</span>
      </div>
      <div id="competitor-events" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="text-xs text-gray-500">Loading…</div>
      </div>
    </div>

    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Feature Parity Matrix</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Auto-extracted</span>
      </div>
      <div id="feature-matrix" class="overflow-x-auto"></div>
    </div>
  </div>
</section>`
}

// ════════════════════════════════════════════════════════════════════
// SENTIMENT STORM
// ════════════════════════════════════════════════════════════════════
function sentimentTab() {
  return `
<section data-pane="sentiment" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 lg:col-span-8 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Topic Cluster — last 14d</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Size = mentions • color = sentiment</span>
      </div>
      <div id="bubble-chart" class="h-[420px] relative"></div>
    </div>
    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Sentiment Δ vs Competitors</h3>
        <span class="text-[10px] mono text-sentiment uppercase">7d</span>
      </div>
      <div class="relative" style="height:340px"><canvas id="chart-diverging"></canvas></div>
    </div>
    <div class="col-span-12 lg:col-span-6 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Trending Phrases</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Word cloud</span>
      </div>
      <div id="word-cloud" class="min-h-[260px] flex flex-wrap items-center justify-center gap-x-3 gap-y-1"></div>
    </div>
    <div class="col-span-12 lg:col-span-6 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Verbatim quotes</h3>
        <span id="quote-counter" class="text-[10px] mono text-gray-500 uppercase">-- / --</span>
      </div>
      <div id="quote-card" class="min-h-[140px]"></div>
      <div class="flex items-center justify-end gap-2 mt-3">
        <button id="quote-prev" type="button" class="card-hover card w-8 h-8 flex items-center justify-center cursor-pointer"><i class="fa-solid fa-chevron-left text-xs"></i></button>
        <button id="quote-next" type="button" class="card-hover card w-8 h-8 flex items-center justify-center cursor-pointer"><i class="fa-solid fa-chevron-right text-xs"></i></button>
      </div>
    </div>
    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Sentiment Events Feed</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Live</span>
      </div>
      <div id="sentiment-events-feed" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    </div>
  </div>
</section>`
}

// ════════════════════════════════════════════════════════════════════
// SCENARIO
// ════════════════════════════════════════════════════════════════════
function scenarioTab() {
  return `
<section data-pane="scenario" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 card p-6">
      <h3 class="font-semibold mb-2">Scenario Simulator</h3>
      <p class="text-sm text-gray-400 mb-4">Describe a hypothetical — we'll re-run threat math against the current briefing with 0 new credits.</p>
      <textarea id="scenario-input" rows="3" placeholder="What if the EU AI Act enforcement is delayed by 6 months and Stripe lowers ACH back to 0.80?" class="w-full bg-ink-900 border border-ink-600 rounded-lg p-3 text-sm focus:outline-none focus:border-policy mono"></textarea>
      <div class="flex items-center gap-2 mt-3">
        <button id="scenario-run" type="button" class="bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm hover:shadow-glow-cyan cursor-pointer flex items-center gap-2"><i class="fa-solid fa-play"></i> Run scenario</button>
        <span class="text-[11px] text-gray-500 mono">⌘ + Enter</span>
      </div>
      <div id="scenario-error" class="hidden mt-3 text-xs text-red-400"></div>
    </div>

    <div id="scenario-result" class="hidden col-span-12 grid grid-cols-12 gap-5">
      <div class="col-span-12 md:col-span-3 card p-4 text-center">
        <div class="text-[10px] mono uppercase text-gray-500 mb-1">Before</div>
        <div id="s-before" class="mono text-3xl font-semibold">--</div>
      </div>
      <div class="col-span-12 md:col-span-3 card p-4 text-center">
        <div class="text-[10px] mono uppercase text-gray-500 mb-1">After</div>
        <div id="s-after" class="mono text-3xl font-semibold text-policy">--</div>
      </div>
      <div class="col-span-12 md:col-span-3 card p-4 text-center">
        <div class="text-[10px] mono uppercase text-gray-500 mb-1">Δ Threats</div>
        <div id="s-threats" class="mono text-3xl font-semibold text-competitor">--</div>
      </div>
      <div class="col-span-12 md:col-span-3 card p-4 text-center">
        <div class="text-[10px] mono uppercase text-gray-500 mb-1">Δ Actions</div>
        <div id="s-actions" class="mono text-3xl font-semibold text-action">--</div>
      </div>

      <div class="col-span-12 card p-4">
        <div class="text-[10px] mono uppercase text-gray-500 mb-2">Narrative</div>
        <div id="s-narrative" class="text-sm text-gray-300"></div>
      </div>

      <div class="col-span-12">
        <div class="text-[10px] mono uppercase text-gray-500 mb-2">Impacted events</div>
        <div id="s-events" class="grid md:grid-cols-2 gap-3"></div>
      </div>
    </div>
  </div>
</section>`
}

// ════════════════════════════════════════════════════════════════════
// ARCHETYPE
// ════════════════════════════════════════════════════════════════════
function archetypeTab() {
  return `
<section data-pane="archetype" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 lg:col-span-7 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Archetype Comparison</h3>
        <span class="text-[10px] mono text-policy uppercase" id="archetype-industry">--</span>
      </div>
      <div class="relative" style="height:420px"><canvas id="chart-radar"></canvas></div>
    </div>
    <div class="col-span-12 lg:col-span-5 card p-5">
      <h3 class="font-semibold mb-3">Where you stand</h3>
      <dl class="text-sm space-y-3">
        <div><dt class="text-[10px] mono uppercase text-gray-500">Above baseline</dt><dd id="archetype-higher" class="text-action">--</dd></div>
        <div><dt class="text-[10px] mono uppercase text-gray-500">Below baseline</dt><dd id="archetype-lower" class="text-sentiment">--</dd></div>
        <div><dt class="text-[10px] mono uppercase text-gray-500">In line</dt><dd id="archetype-neutral" class="text-gray-300">--</dd></div>
      </dl>
    </div>
  </div>
</section>`
}

// ════════════════════════════════════════════════════════════════════
// MODALS / OVERLAYS
// ════════════════════════════════════════════════════════════════════
function apiKeyModal() {
  return `
<div id="apikey-modal" class="hidden fixed inset-0 z-[60] cmdk-backdrop flex items-center justify-center px-4">
  <div class="card w-full max-w-md p-6 slide-up">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-policy/15 border border-policy/40 flex items-center justify-center"><i class="fa-solid fa-key text-policy"></i></div>
        <h3 class="font-semibold text-lg">Connect your Anakin API key</h3>
      </div>
      <button id="apikey-close" type="button" class="text-gray-400 hover:text-white text-xl cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <p class="text-sm text-gray-400 mb-4">Paste your Anakin API key to switch from demo data to a live Anakin Agentic Search → Groq <code class="mono text-policy">llama-4-scout-17b-16e-instruct</code> reshape pipeline. Every card in every tab becomes dynamic.</p>
    <label class="block text-xs mono uppercase text-gray-500 mb-1">Anakin API Key</label>
    <input id="apikey-input" type="password" placeholder="anakin-live-…" class="w-full bg-ink-900 border border-ink-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-policy mono" autocomplete="off" />
    <div class="mt-3 text-[11px] text-gray-500 leading-relaxed">
      Stored only in your browser (localStorage). Sent to our server as the <code class="mono text-policy">X-Anakin-Key</code> header.
      <a href="https://anakin.io/docs/integrations" target="_blank" rel="noopener" class="text-policy hover:underline">Where do I find this?</a>
    </div>
    <div id="apikey-status" class="hidden mt-3 text-xs"></div>
    <div class="flex justify-between items-center mt-5">
      <button id="apikey-clear" type="button" class="text-xs text-gray-400 hover:text-red-400 cursor-pointer">Clear stored key</button>
      <div class="flex gap-2">
        <button id="apikey-cancel" type="button" class="text-gray-400 hover:text-white px-4 py-2 text-sm cursor-pointer">Cancel</button>
        <button id="apikey-save" type="button" class="bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm hover:shadow-glow-cyan cursor-pointer">Save &amp; go live</button>
      </div>
    </div>
  </div>
</div>`
}

function liveLoadingOverlay() {
  return `
<div id="live-loading" class="hidden fixed inset-0 z-[70] bg-ink-950/80 backdrop-blur-sm flex items-center justify-center">
  <div class="card p-6 flex items-center gap-4 max-w-md">
    <div class="w-8 h-8 border-4 border-policy border-t-transparent rounded-full animate-spin"></div>
    <div>
      <div class="font-semibold text-sm" id="live-loading-title">Generating live briefing…</div>
      <div class="text-[11px] mono text-gray-500 mt-1" id="live-loading-sub">Anakin Agentic Search → Groq reshape.</div>
    </div>
  </div>
</div>`
}

function briefModal() {
  return `
<div id="brief-modal" class="hidden fixed inset-0 z-[55] cmdk-backdrop flex items-center justify-center px-4">
  <div class="card w-full max-w-3xl p-6 slide-up max-h-[85vh] overflow-y-auto">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-policy/15 border border-policy/40 flex items-center justify-center"><i class="fa-solid fa-newspaper text-policy"></i></div>
        <div>
          <div class="text-xs mono uppercase text-policy">Daily Battle Brief</div>
          <h3 class="font-semibold text-lg" id="brief-modal-title">Loading…</h3>
        </div>
      </div>
      <button id="brief-modal-close" type="button" class="text-gray-400 hover:text-white text-xl cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="brief-modal-body" class="text-sm leading-relaxed text-gray-300 space-y-4"></div>
  </div>
</div>`
}

function cmdkPalette() {
  return `
<div id="cmdk" class="hidden fixed inset-0 z-50 cmdk-backdrop flex items-start justify-center pt-24 px-4">
  <div class="card w-full max-w-2xl overflow-hidden slide-up">
    <div class="flex items-center gap-3 border-b border-ink-700 px-4 py-3">
      <i class="fa-solid fa-magnifying-glass text-policy"></i>
      <input id="cmdk-input" placeholder="Search policy, competitors, sentiment, actions… or ask anything" class="flex-1 bg-transparent focus:outline-none text-base" />
      <kbd class="mono text-[10px] bg-ink-700 px-1.5 py-0.5 rounded border border-ink-600">esc</kbd>
    </div>
    <div id="cmdk-results" class="hidden max-h-[440px] overflow-y-auto"></div>
    <div id="cmdk-suggestions" class="px-4 py-3 text-xs text-gray-400">
      <div class="mb-2 mono uppercase tracking-widest">Try</div>
      <div class="space-y-1">
        <button type="button" class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">EU AI Act</button>
        <button type="button" class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Stripe pricing</button>
        <button type="button" class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">fraud sentiment</button>
        <button type="button" class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">→ Ask SCOUTT: "Should I match Stripe's price hike?"</button>
      </div>
    </div>
    <div id="cmdk-output" class="hidden px-4 py-4 border-t border-ink-700 max-h-[440px] overflow-y-auto"></div>
  </div>
</div>`
}

function transparencyDrawer() {
  return `
<div id="transparency-backdrop" class="hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"></div>
<aside id="transparency-drawer" class="drawer fixed top-0 right-0 z-50 h-full w-full max-w-[640px] bg-ink-900 border-l border-ink-700 overflow-y-auto">
  <div class="sticky top-0 bg-ink-900/95 backdrop-blur border-b border-ink-700 px-5 py-4 flex items-center justify-between">
    <div>
      <div class="text-xs mono uppercase text-policy">SCOUTT Transparency Drawer</div>
      <h2 class="text-lg font-bold mt-0.5">How we know this</h2>
    </div>
    <button id="transparency-close" type="button" class="text-gray-400 hover:text-white text-xl cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <div id="transparency-body" class="p-5 space-y-6 text-sm"></div>
</aside>`
}

function audioBriefToast() {
  return `
<div id="audio-toast" class="hidden fixed bottom-6 right-6 z-40 card p-4 flex items-center gap-3 shadow-glow-cyan">
  <div class="w-9 h-9 rounded-full bg-policy/15 border border-policy/40 flex items-center justify-center"><i class="fa-solid fa-volume-high text-policy"></i></div>
  <div>
    <div class="text-sm font-medium" id="audio-toast-title">Reading your brief</div>
    <div class="text-[10px] mono text-gray-500" id="audio-toast-sub">ElevenLabs • streaming</div>
  </div>
  <button id="audio-stop" type="button" class="ml-3 text-gray-400 hover:text-white cursor-pointer"><i class="fa-solid fa-stop"></i></button>
</div>
<audio id="audio-el" class="hidden"></audio>`
}

function kpiCard(label: string, key: string, deltaClass: string, icon: string) {
  return `
  <div class="card step-card p-4 slide-up" data-kpi="${key}">
      <div class="flex items-start justify-between mb-2">
        <span class="text-xs text-gray-500 uppercase tracking-wide">${label}</span>
        <i class="fa-solid ${icon} ${deltaClass} text-xs"></i>
      </div>
      <div class="flex items-end justify-between">
        <div class="mono text-2xl font-bold kpi-value">--</div>
        <div class="mono text-xs text-gray-500 kpi-delta">--</div>
      </div>
      <canvas class="kpi-spark mt-2" height="22"></canvas>
  </div>`
}
