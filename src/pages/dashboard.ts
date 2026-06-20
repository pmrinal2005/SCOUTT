// src/pages/dashboard.ts
import { htmlShell } from './shell'

export const dashboardPage = (isPublicThreatIndex = false) =>
  htmlShell({
    title: isPublicThreatIndex
      ? 'Public Threat Index — SCOUTT'
      : 'Command Center — SCOUTT',
    bodyHTML: `
<!-- TOP NAV -->
<nav class="sticky top-0 z-30 backdrop-blur-md bg-ink-950/80 border-b border-ink-700/50">
  <div class="max-w-[1500px] mx-auto px-6 py-3 flex items-center gap-4">
    <a href="/" class="flex items-center gap-2.5 group shrink-0">
      <img src="/static/scoutt_logo.png" alt="SCOUTT" class="w-7 h-7 rounded-full object-cover" onerror="this.style.display='none'" />
      <span class="font-bold tracking-tight">SCOUTT</span>
    </a>

    <div class="flex-1 flex items-center justify-center">
      <button id="cmdk-trigger" class="flex items-center gap-2 bg-ink-800/70 hover:bg-ink-700 border border-ink-600 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition w-full max-w-md">
        <i class="fa-solid fa-magnifying-glass text-xs"></i>
        <span class="flex-1 text-left">Ask SCOUTT</span>
        <kbd class="mono text-[10px] bg-ink-700 px-1.5 py-0.5 rounded border border-ink-600">K</kbd>
      </button>
    </div>

    <!-- API key entry button (replaces credit meter) -->
    <button id="apikey-btn" class="card-hover card px-3 py-1.5 text-xs flex items-center gap-1.5">
      <i id="apikey-icon" class="fa-solid fa-key text-policy"></i>
      <span id="apikey-label">Enter API Key</span>
    </button>

    <button id="transparency-trigger" class="card-hover card px-3 py-1.5 text-xs flex items-center gap-1.5">
      <i class="fa-solid fa-eye text-policy"></i> How we know this
    </button>

    <button id="theme-toggle" class="card-hover card w-8 h-8 flex items-center justify-center" title="Toggle theme">
      <i class="fa-solid fa-moon text-xs"></i>
    </button>
  </div>

  <!-- TAB BAR -->
  <div class="max-w-[1500px] mx-auto px-6 flex items-center gap-1 overflow-x-auto">
    ${[
      ['command', 'fa-house-signal', 'Command Center'],
      ['policy', 'fa-scale-balanced', 'Policy Radar'],
      ['competitor', 'fa-chess-knight', 'Competitor Pulse'],
      ['sentiment', 'fa-wave-square', 'Sentiment Storm'],
      ['scenario', 'fa-flask', 'Scenario'],
      ['archetype', 'fa-people-arrows', 'Archetype'],
    ].map(([id, ic, label], i) => `
      <button data-tab="${id}" class="tab-btn px-4 py-3 text-sm flex items-center gap-2 hover:text-white transition ${i === 0 ? 'tab-active' : 'text-gray-400'}">
        <i class="fa-solid ${ic} text-xs"></i> ${label}
      </button>
    `).join('')}
  </div>
</nav>

<main class="max-w-[1500px] mx-auto px-6 py-6">
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

<script src="/static/dashboard.js"></script>
`,
  })

function commandCenterTab() {
  return `
<section data-pane="command" class="tab-pane">

  <div class="card p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 slide-up">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-lg bg-policy/15 border border-policy/40 flex items-center justify-center shrink-0">
        <i class="fa-solid fa-sun text-policy text-xl"></i>
      </div>
      <div>
        <div class="text-xs mono text-gray-500 uppercase mb-1">Good morning  brief generated <span id="brief-time">06:00 UTC</span></div>
        <h1 class="text-xl md:text-2xl font-bold"><span id="banner-events">4</span> high-impact events overnight. Threat level <span class="text-policy mono"><span id="banner-threat">73</span>/100</span>.</h1>
        <p id="banner-summary" class="text-sm text-gray-400 mt-1">EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <button id="play-audio" class="card-hover card px-3 py-2 text-sm flex items-center gap-2"><i class="fa-solid fa-headphones text-policy"></i> Listen <span class="text-[10px] mono text-gray-500">FREE</span></button>
      <button id="read-full-brief" class="bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg hover:shadow-glow-cyan text-sm">Read full brief <i class="fa-solid fa-arrow-right ml-1"></i></button>
    </div>
  </div>

  <!-- TIME MACHINE -->
  <div class="card p-3 mb-5 flex items-center gap-4 slide-up">
    <button id="time-machine-reset" title="Reset to today" class="card-hover w-8 h-8 rounded-md border border-ink-600 flex items-center justify-center hover:border-policy">
      <i class="fa-solid fa-clock-rotate-left text-policy"></i>
    </button>
    <span class="text-xs text-gray-400 shrink-0 mono">Time Machine</span>
    <input id="time-machine" type="range" min="0" max="7" value="0" step="1" class="flex-1 accent-cyan-500" />
    <span id="time-machine-label" class="text-xs mono text-policy shrink-0 w-32 text-right">Today  live</span>
  </div>

  <div class="grid grid-cols-12 gap-5">
    <aside class="col-span-12 lg:col-span-3 card p-4 slide-up">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm">Last 7 days</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Events</span>
      </div>
      <ol id="timeline-list" class="relative border-l border-ink-600 pl-4 space-y-3"></ol>
    </aside>

    <div class="col-span-12 lg:col-span-6 card p-5 relative overflow-hidden slide-up">
      <div class="absolute top-3 left-5 text-xs mono uppercase text-gray-500">The Pulse Wheel  24h</div>
      <div class="absolute top-3 right-5 flex items-center gap-3 text-[11px] mono">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-policy"></span> Policy</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-competitor"></span> Competitor</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sentiment"></span> Sentiment</span>
      </div>
      <div id="pulse-wheel-container" class="aspect-square max-w-[460px] mx-auto pt-6 pb-2">
        ${pulseWheelSVG()}
      </div>
      <div id="wheel-tooltip" class="absolute bg-ink-950 border border-policy/50 rounded-lg p-3 text-xs pointer-events-none opacity-0 transition-opacity shadow-glow-cyan max-w-[240px]"></div>
    </div>

    <aside class="col-span-12 lg:col-span-3 card p-4 slide-up">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-action pulse-ring"></span> Today's 3 actions</h3>
      </div>
      <div id="actions-list" class="space-y-3"></div>
    </aside>

    <div class="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
      ${kpiCard('Threats Detected', '12', '+3', 'text-policy', 'fa-shield-halved')}
      ${kpiCard('Opportunities', '4', '+1', 'text-action', 'fa-bullseye')}
      ${kpiCard('Action Items', '3', '0', 'text-competitor', 'fa-list-check')}
      ${kpiCard('Avg. Response', '47m', '12m', 'text-sentiment', 'fa-stopwatch')}
    </div>

    <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Threat-Level Meter</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Bloomberg style</span>
      </div>
      ${threatMeterSVG(73)}
    </div>

    <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Sentiment Volume  14d</h3>
        <span class="text-[10px] mono text-sentiment uppercase">+/ /neutral</span>
      </div>
      <canvas id="chart-sentiment-volume" height="180"></canvas>
    </div>

    <div class="col-span-12 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Threats  Actions Flow</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Sankey</span>
      </div>
      ${sankeySVG()}
    </div>
  </div>
</section>`
}

function pulseWheelSVG() {
  const events = [
    { ring: 0, hour: 0.23, sev: 92, title: 'EU AI Act enforcement', color: '#06b6d4', url: 'https://eur-lex.europa.eu' },
    { ring: 0, hour: 4.92, sev: 68, title: 'CFPB BNPL circular', color: '#06b6d4', url: 'https://consumerfinance.gov' },
    { ring: 0, hour: 7.0, sev: 41, title: 'UK FCA stablecoin consult', color: '#06b6d4', url: 'https://fca.org.uk' },
    { ring: 1, hour: 1.33, sev: 54, title: 'Checkout.com hires 4 ML', color: '#f97316', url: 'https://checkout.com' },
    { ring: 1, hour: 3.7, sev: 81, title: 'Stripe ACH +12.5%', color: '#f97316', url: 'https://stripe.com' },
    { ring: 1, hour: 6.18, sev: 76, title: 'Adyen Embedded Finance launch', color: '#f97316', url: 'https://adyen.com' },
    { ring: 2, hour: 2.5, sev: 71, title: 'Reddit fraud-tool sentiment 18', color: '#ec4899', url: 'https://reddit.com' },
    { ring: 2, hour: 5.03, sev: 48, title: 'G2 onboarding-friction +31%', color: '#ec4899', url: 'https://g2.com' },
  ]
  const radii = [165, 130, 95]
  const ringNames = ['POLICY', 'COMPETITOR', 'SENTIMENT']
  const ringColors = ['#06b6d4', '#f97316', '#ec4899']

  const ticks = events.map((e) => {
    const angle = (e.hour / 24) * 360 - 90
    const rad = (angle * Math.PI) / 180
    const r = radii[e.ring]
    const len = 8 + (e.sev / 100) * 16
    const x1 = 200 + Math.cos(rad) * (r - len / 2)
    const y1 = 200 + Math.sin(rad) * (r - len / 2)
    const x2 = 200 + Math.cos(rad) * (r + len / 2)
    const y2 = 200 + Math.sin(rad) * (r + len / 2)
    const dotX = 200 + Math.cos(rad) * r
    const dotY = 200 + Math.sin(rad) * r
    return `<g class="wheel-tick cursor-pointer" data-title="${e.title}" data-sev="${e.sev}" data-url="${e.url}" data-color="${e.color}">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${e.color}" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="${dotX}" cy="${dotY}" r="${4 + e.sev / 40}" fill="${e.color}" opacity="0.95" />
      <circle cx="${dotX}" cy="${dotY}" r="${10 + e.sev / 20}" fill="${e.color}" opacity="0.18">
        <animate attributeName="r" from="${4 + e.sev / 40}" to="${18 + e.sev / 12}" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </g>`
  }).join('')

  const hourLabels = [0, 6, 12, 18].map((h) => {
    const angle = (h / 24) * 360 - 90
    const rad = (angle * Math.PI) / 180
    const x = 200 + Math.cos(rad) * 188
    const y = 200 + Math.sin(rad) * 188 + 4
    return `<text x="${x}" y="${y}" fill="#3a4055" font-family="JetBrains Mono" font-size="11" text-anchor="middle">${h.toString().padStart(2, '0')}h</text>`
  }).join('')

  return `
    <svg viewBox="0 0 400 400" class="w-full h-full">
      <defs>
        <radialGradient id="wheelGlow" cx="50%" cy="50%">
          <stop offset="60%" stop-color="#0a0c14" />
          <stop offset="100%" stop-color="#11141d" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="185" fill="url(#wheelGlow)" />
      ${radii.map((r, i) =>
        `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${ringColors[i]}" stroke-opacity="0.15" stroke-width="22" />` +
        `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${ringColors[i]}" stroke-opacity="0.5" stroke-width="0.8" />`
      ).join('')}
      ${[0, 90, 180, 270].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180
        return `<line x1="200" y1="200" x2="${200 + Math.cos(rad) * 175}" y2="${200 + Math.sin(rad) * 175}" stroke="#262b3a" stroke-width="0.6" />`
      }).join('')}
      ${hourLabels}
      ${ticks}
      <circle cx="200" cy="200" r="34" fill="#05060a" stroke="#06b6d4" stroke-width="1" />
      <circle cx="200" cy="200" r="34" fill="none" stroke="#06b6d4" stroke-opacity="0.3" stroke-width="1">
        <animate attributeName="r" from="34" to="48" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="196" fill="#e7eaf3" font-family="JetBrains Mono" font-size="18" font-weight="700" text-anchor="middle">73</text>
      <text x="200" y="212" fill="#3a4055" font-family="JetBrains Mono" font-size="8" text-anchor="middle" letter-spacing="1.5">THREAT</text>
      ${radii.map((r, i) =>
        `<text x="200" y="${200 - r - 4}" fill="${ringColors[i]}" font-family="JetBrains Mono" font-size="9" font-weight="600" text-anchor="middle" letter-spacing="1.5">${ringNames[i]}</text>`
      ).join('')}
    </svg>`
}

function threatMeterSVG(value: number) {
  const angle = -90 + (value / 100) * 180
  return `
  <div class="relative">
    <svg viewBox="0 0 240 140" class="w-full">
      <defs>
        <linearGradient id="threatGrad" x1="0" x2="1">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
      </defs>
      <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="#1a1e2a" stroke-width="18" stroke-linecap="round" />
      <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="url(#threatGrad)" stroke-width="18" stroke-linecap="round" stroke-dasharray="${(value / 100) * 283}, 283" />
      ${[0, 25, 50, 75, 100].map((v) => {
        const a = ((-180 + (v / 100) * 180) * Math.PI) / 180
        return `<line x1="${120 + Math.cos(a) * 78}" y1="${120 + Math.sin(a) * 78}" x2="${120 + Math.cos(a) * 100}" y2="${120 + Math.sin(a) * 100}" stroke="#3a4055" stroke-width="1.5" /><text x="${120 + Math.cos(a) * 112}" y="${120 + Math.sin(a) * 112 + 4}" fill="#3a4055" font-family="JetBrains Mono" font-size="10" text-anchor="middle">${v}</text>`
      }).join('')}
      <g style="transform-origin:120px 120px; transform: rotate(${angle - 90}deg);" class="needle">
        <line x1="120" y1="120" x2="120" y2="40" stroke="#e7eaf3" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="120" cy="40" r="4" fill="#06b6d4" />
      </g>
      <circle cx="120" cy="120" r="8" fill="#0a0c14" stroke="#06b6d4" stroke-width="1.5" />
    </svg>
    <div class="text-center mt-2">
      <div class="mono text-3xl font-semibold text-white" id="threat-meter-value">${value}<span class="text-base text-gray-500">/100</span></div>
      <div class="text-[10px] mono uppercase text-gray-500 tracking-widest">Elevated</div>
    </div>
  </div>`
}

function sankeySVG() {
  return `
  <svg viewBox="0 0 320 200" class="w-full">
    ${[{ y: 30, label: 'Policy', color: '#06b6d4', count: 4 }, { y: 95, label: 'Competitor', color: '#f97316', count: 5 }, { y: 160, label: 'Sentiment', color: '#ec4899', count: 3 }]
      .map((n) => `<rect x="10" y="${n.y - 18}" width="14" height="36" fill="${n.color}" rx="2" /><text x="32" y="${n.y - 2}" fill="#e7eaf3" font-family="Inter" font-size="11" font-weight="500">${n.label}</text><text x="32" y="${n.y + 12}" fill="${n.color}" font-family="JetBrains Mono" font-size="10">${n.count} threats</text>`).join('')}
    ${[{ y: 50, label: 'Audit', color: '#10b981' }, { y: 100, label: 'Counter-market', color: '#10b981' }, { y: 150, label: 'Ship landing', color: '#10b981' }]
      .map((n) => `<rect x="296" y="${n.y - 14}" width="14" height="28" fill="${n.color}" rx="2" /><text x="290" y="${n.y - 18}" fill="#e7eaf3" font-family="Inter" font-size="10" text-anchor="end">${n.label}</text>`).join('')}
    ${[['#06b6d4', 30, 50, 5], ['#06b6d4', 30, 100, 2], ['#f97316', 95, 100, 6], ['#f97316', 95, 150, 3], ['#ec4899', 160, 150, 4], ['#ec4899', 160, 100, 2]]
      .map(([c, sy, ty, w]) => `<path d="M 24 ${sy} C 150 ${sy}, 170 ${ty}, 296 ${ty}" fill="none" stroke="${c}" stroke-opacity="0.35" stroke-width="${w}" />`).join('')}
  </svg>`
}

function policyTab() {
  return `
<section data-pane="policy" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 lg:col-span-8 card p-5 relative">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Global Regulatory Heatmap</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Hover a region</span>
      </div>
      <div id="world-map" class="relative aspect-[2/1] rounded-lg bg-ink-900 overflow-hidden border border-ink-700">
        <svg viewBox="0 0 1000 500" class="w-full h-full opacity-50">${worldMapPaths()}</svg>
        <div id="map-pins" class="absolute inset-0"></div>
      </div>
    </div>

    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Quarter-over-quarter</h3>
        <span class="text-[10px] mono text-policy uppercase">+34% vs Q1</span>
      </div>
      <canvas id="chart-policy-trend" height="200"></canvas>
    </div>

    <div class="col-span-12">
      <div class="flex items-center justify-between mb-3 mt-1">
        <h3 class="font-semibold">Active Regulations</h3>
        <div class="flex items-center gap-2 text-xs mono text-gray-500">
          <span class="px-2 py-0.5 rounded bg-policy/15 text-policy border border-policy/40">8 high impact</span>
          <span class="px-2 py-0.5 rounded bg-ink-700 border border-ink-600">4 deadlines &lt; 30d</span>
        </div>
      </div>
      <div id="reg-cards" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 slide-up-stagger"></div>
    </div>
  </div>
</section>`
}

function worldMapPaths() {
  return `
    <path d="M120,180 Q150,140 230,150 Q300,160 320,200 Q300,250 240,260 Q160,265 120,220 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M210,290 Q240,280 270,320 Q280,370 250,400 Q210,430 190,400 Q170,350 210,290 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M470,140 Q520,120 580,150 Q600,200 580,230 Q520,250 470,220 Q450,180 470,140 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M490,260 Q540,250 580,290 Q600,360 560,400 Q510,420 480,380 Q460,320 490,260 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M620,180 Q690,160 770,200 Q820,240 800,290 Q720,300 640,280 Q610,230 620,180 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M820,360 Q870,350 900,380 Q890,420 850,420 Q820,400 820,360 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M530,420 Q570,420 580,440 Q570,460 540,460 Q520,450 530,420 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
  `
}

function competitorTab() {
  return `
<section data-pane="competitor" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Diff Timeline  7 days</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Scrub </span>
      </div>
      <div id="diff-timeline" class="relative h-14 bg-ink-900 rounded-lg border border-ink-700"></div>
    </div>

    <div class="col-span-12 lg:col-span-8 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold" id="diff-title">Pricing Diff  stripe.com/pricing</h3>
        <div class="flex items-center gap-2 text-xs mono">
          <span class="text-gray-500" id="diff-before-time">2026-06-19 14:00</span>
          <i class="fa-solid fa-arrow-right text-policy"></i>
          <span class="text-policy" id="diff-after-time">2026-06-20 03:42</span>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-3" id="diff-pane">
        <div class="border border-ink-700 rounded-lg overflow-hidden">
          <div class="bg-ink-900 px-3 py-2 text-xs mono text-gray-400 flex items-center justify-between border-b border-ink-700"><span>BEFORE  cached snapshot</span><span class="text-[10px] text-gray-500">html_hash: a3f2</span></div>
          <div class="p-4 font-mono text-xs leading-relaxed space-y-1">
            <div>ACH payments</div>
            <div class="bg-red-500/15 text-red-400 px-2 py-1 rounded"> $0.80 per transaction</div>
            <div>+ 0.8% capped at $5</div>
            <div>Plan: Standard</div>
          </div>
        </div>
        <div class="border border-ink-700 rounded-lg overflow-hidden">
          <div class="bg-ink-900 px-3 py-2 text-xs mono text-gray-400 flex items-center justify-between border-b border-ink-700"><span class="text-policy">AFTER  current</span><span class="text-[10px] text-gray-500">html_hash: b9e1</span></div>
          <div class="p-4 font-mono text-xs leading-relaxed space-y-1">
            <div>ACH payments</div>
            <div class="bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded">+ $0.90 per transaction</div>
            <div>+ 0.8% capped at $5</div>
            <div>Plan: Standard</div>
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3 text-xs">
        <span class="px-2 py-1 rounded bg-competitor/15 text-competitor border border-competitor/40 mono">+12.5% fee</span>
        <span class="text-gray-400">Threat level: <strong class="text-white mono">81</strong></span>
        <button class="ml-auto text-policy hover:underline">Generate counter-email </button>
      </div>
    </div>

    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Pricing Race  30d</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">ACH per-txn</span>
      </div>
      <canvas id="chart-pricing-race" height="240"></canvas>
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

function sentimentTab() {
  return `
<section data-pane="sentiment" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">
    <div class="col-span-12 lg:col-span-8 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Topic Cluster  last 14d</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Size = mentions  color = sentiment</span>
      </div>
      <div id="bubble-chart" class="h-[420px] relative"></div>
    </div>
    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Sentiment  vs Competitors</h3>
        <span class="text-[10px] mono text-sentiment uppercase">7d</span>
      </div>
      <canvas id="chart-diverging" height="320"></canvas>
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
        <span id="quote-counter" class="text-[10px] mono text-gray-500 uppercase">1 / 5</span>
      </div>
      <div id="quotes-carousel" class="min-h-[200px] flex items-center"></div>
      <div class="flex items-center justify-between mt-3">
        <button id="quote-prev" class="text-gray-400 hover:text-white text-sm"><i class="fa-solid fa-arrow-left"></i> Prev</button>
        <button id="quote-next" class="text-gray-400 hover:text-white text-sm">Next <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>
  </div>
</section>`
}

function scenarioTab() {
  return `
<section data-pane="scenario" class="tab-pane hidden">
  <div class="card p-6 max-w-3xl mx-auto">
    <div class="flex items-start gap-4 mb-6">
      <div class="w-12 h-12 rounded-lg bg-action/15 border border-action/40 flex items-center justify-center shrink-0"><i class="fa-solid fa-flask text-action text-xl"></i></div>
      <div>
        <h2 class="text-xl font-bold mb-1">"What if?" Scenario Simulator</h2>
        <p class="text-sm text-gray-400">Re-runs over your existing briefings. <span class="text-action mono">Zero new credits.</span></p>
      </div>
    </div>
    <textarea id="scenario-input" rows="3" placeholder='Try: "What if EU AI Act enforcement is delayed 6 months?" or "What if Stripe drops ACH back to $0.70?"' class="w-full bg-ink-900 border border-ink-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-action"></textarea>
    <button id="scenario-run" class="mt-3 bg-action text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-emerald transition flex items-center gap-2"><i class="fa-solid fa-play"></i> Run scenario</button>
    <div id="scenario-result" class="hidden mt-6 space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="card p-4 text-center"><div class="text-[10px] mono uppercase text-gray-500 mb-1">Threat Level</div><div class="mono"><span id="s-before" class="text-gray-500 line-through">73</span>  <span id="s-after" class="text-action text-2xl font-bold">--</span></div></div>
        <div class="card p-4 text-center"><div class="text-[10px] mono uppercase text-gray-500 mb-1">New Threats</div><div id="s-threats" class="mono text-2xl font-bold text-competitor">--</div></div>
        <div class="card p-4 text-center"><div class="text-[10px] mono uppercase text-gray-500 mb-1">New Actions</div><div id="s-actions" class="mono text-2xl font-bold text-policy">--</div></div>
      </div>
      <div id="s-events" class="space-y-2"></div>
    </div>
  </div>
</section>`
}

function archetypeTab() {
  return `
<section data-pane="archetype" class="tab-pane hidden">
  <div class="card p-6">
    <h2 class="text-xl font-bold mb-1">Industry Archetype Comparison</h2>
    <p class="text-sm text-gray-400 mb-6">Your <span id="archetype-industry" class="text-policy mono">B2B SaaS Fintech</span> profile vs the synthetic industry baseline.</p>
    <canvas id="chart-radar" height="320"></canvas>
    <div class="mt-6 grid md:grid-cols-3 gap-3">
      <div class="card p-3"><div class="text-[10px] mono uppercase text-gray-500">You score higher on</div><div class="mt-1 text-sm">Compliance, Onboarding speed</div></div>
      <div class="card p-3"><div class="text-[10px] mono uppercase text-gray-500">Industry beats you on</div><div class="mt-1 text-sm">Embedded Finance breadth</div></div>
      <div class="card p-3"><div class="text-[10px] mono uppercase text-gray-500">Coin-flip</div><div class="mt-1 text-sm">Sentiment, Pricing</div></div>
    </div>
  </div>
</section>`
}

function cmdkPalette() {
  return `
<div id="cmdk" class="hidden fixed inset-0 z-50 cmdk-backdrop flex items-start justify-center pt-24 px-4">
  <div class="card w-full max-w-2xl overflow-hidden slide-up">
    <div class="flex items-center gap-3 border-b border-ink-700 px-4 py-3">
      <i class="fa-solid fa-magnifying-glass text-policy"></i>
      <input id="cmdk-input" placeholder="Ask SCOUTT anything" class="flex-1 bg-transparent focus:outline-none text-base" />
      <kbd class="mono text-[10px] bg-ink-700 px-1.5 py-0.5 rounded border border-ink-600">esc</kbd>
    </div>
    <div id="cmdk-suggestions" class="px-4 py-3 text-xs text-gray-400">
      <div class="mb-2 mono uppercase tracking-widest">Try</div>
      <div class="space-y-1">
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Why did our churn spike last week?</button>
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">What's the impact of the EU AI Act on us?</button>
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Should I match Stripe's price hike?</button>
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Summarize Adyen's product launch.</button>
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
    <button id="transparency-close" class="text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <div id="transparency-body" class="p-5 space-y-6 text-sm"></div>
</aside>`
}

function audioBriefToast() {
  return `
<div id="audio-toast" class="hidden fixed bottom-6 right-6 z-40 card p-4 flex items-center gap-3 shadow-glow-cyan">
  <div class="w-9 h-9 rounded-full bg-policy/15 border border-policy/40 flex items-center justify-center"><i class="fa-solid fa-volume-high text-policy"></i></div>
  <div>
    <div class="text-sm font-medium">Reading your brief</div>
    <div class="text-[10px] mono text-gray-500">browser SpeechSynthesis  0 credits</div>
  </div>
  <button id="audio-stop" class="ml-3 text-gray-400 hover:text-white"><i class="fa-solid fa-stop"></i></button>
</div>`
}

function apiKeyModal() {
  return `
<div id="apikey-modal" class="hidden fixed inset-0 z-50 cmdk-backdrop flex items-center justify-center px-4">
  <div class="card w-full max-w-md p-6 slide-up">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-policy/15 border border-policy/40 flex items-center justify-center"><i class="fa-solid fa-key text-policy"></i></div>
        <h3 class="font-semibold text-lg">Connect your Anakin API key</h3>
      </div>
      <button id="apikey-close" class="text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <p class="text-sm text-gray-400 mb-4">Paste your Anakin API key to switch from demo data to live briefings generated from real Agentic Search calls.</p>
    <label class="block text-xs mono uppercase text-gray-500 mb-1">API Key</label>
    <input id="apikey-input" type="password" placeholder="anakin-live-" class="w-full bg-ink-900 border border-ink-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-policy mono" />
    <div class="mt-3 text-[11px] text-gray-500 leading-relaxed">Stored only in your browser. Sent to our server as a header on each request. <a href="https://anakin.io/docs/integrations" target="_blank" class="text-policy hover:underline">Where do I find this?</a></div>
    <div class="flex justify-between items-center mt-5">
      <button id="apikey-clear" class="text-xs text-gray-400 hover:text-red-400">Clear stored key</button>
      <div class="flex gap-2">
        <button id="apikey-cancel" class="text-gray-400 hover:text-white px-4 py-2 text-sm">Cancel</button>
        <button id="apikey-save" class="bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm hover:shadow-glow-cyan">Save & go live</button>
      </div>
    </div>
  </div>
</div>`
}

function kpiCard(label: string, value: string, delta: string, deltaClass: string, icon: string) {
  const positive = delta.startsWith('+') || (delta.startsWith('-') && /response/i.test(label))
  return `
  <div class="card step-card p-4 slide-up">
    <div class="flex items-start justify-between mb-2">
      <span class="text-xs text-gray-500 uppercase tracking-wide">${label}</span>
      <i class="fa-solid ${icon} ${deltaClass} text-xs"></i>
    </div>
    <div class="flex items-end justify-between">
      <div class="mono text-2xl font-bold">${value}</div>
      <div class="mono text-xs ${positive ? 'text-emerald-400' : 'text-gray-500'}">${delta}</div>
    </div>
    <canvas class="kpi-spark mt-2" height="22"></canvas>
  </div>`
}
