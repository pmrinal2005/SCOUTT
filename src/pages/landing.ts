// src/pages/landing.ts
import { htmlShell } from './shell'

const YOUTUBE_DEMO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // <-- replace with your real demo URL

export const landingPage = () =>
  htmlShell({
    title: 'SCOUTT — Bloomberg-grade intelligence for small business',
    bodyHTML: `
<!-- Navbar -->
<nav class="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-ink-700/50">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5 group">
      <img src="/static/scoutt_logo.png" alt="SCOUTT" class="w-8 h-8 rounded-full object-cover" onerror="this.style.display='none'" />
      <span class="text-lg font-bold tracking-tight">SCOUTT</span>
      <span class="text-[10px] mono uppercase text-policy border border-policy/40 rounded px-1.5 py-0.5">v1.0</span>
    </a>
    <div class="hidden md:flex items-center gap-7 text-sm text-gray-400">
      <a href="#features" class="hover:text-white">Features</a>
      <a href="#how" class="hover:text-white">How it works</a>
      <a href="/threat-index" class="hover:text-white">Threat Index</a>
      <a href="https://anakin.io/docs" target="_blank" class="hover:text-white">Docs <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ml-0.5"></i></a>
    </div>
    <a href="/onboarding" class="bg-policy text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg hover:shadow-glow-cyan transition">
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
        LIVE GLOBAL INTELLIGENCE MONITOR  <span id="live-count">3,247</span> changes detected in the last 24h
      </div>
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
        The Bloomberg Terminal<br>
        <span class="bg-gradient-to-r from-policy via-sentiment to-competitor bg-clip-text text-transparent">for small business.</span>
      </h1>
      <p class="text-lg text-gray-400 leading-relaxed mb-8 max-w-xl">
        Every morning at 06:00 UTC, SCOUTT reads the entire internet so you don't have to. Regulations that target <em>your</em> stack, competitor moves that threaten <em>your</em> pricing, sentiment shifts that move <em>your</em> revenue. All distilled into one decisive briefing before your first coffee.
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-10">
        <a href="/onboarding" class="bg-policy text-ink-950 font-semibold px-5 py-3 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-bolt"></i> See it in action  no signup
        </a>
        <a href="${YOUTUBE_DEMO_URL}" target="_blank" rel="noopener" class="bg-ink-700/70 border border-ink-600 px-5 py-3 rounded-lg hover:bg-ink-700 transition flex items-center gap-2">
          <i class="fa-brands fa-youtube text-red-500"></i> Watch demo
        </a>
      </div>
      <div class="grid grid-cols-3 gap-6 max-w-md">
        <div>
          <div class="mono text-2xl font-semibold text-white countup" data-target="12" data-suffix="">0</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Affect you today</div>
        </div>
        <div>
          <div class="mono text-2xl font-semibold text-white">06:00 UTC</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Daily brief</div>
        </div>
        <div>
          <div class="mono text-2xl font-semibold text-white"><span class="countup" data-target="847" data-suffix="">0</span>+</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Sources scanned</div>
        </div>
      </div>
    </div>

    <!-- HERO VISUAL: high-tech dotted globe -->
    <div class="relative slide-up" style="animation-delay: .2s">
      <div class="aspect-square max-w-[520px] mx-auto relative">
        <div id="globe-stage" class="absolute inset-0"></div>
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-center mono text-[11px] text-gray-400 blink">
          THREAT LEVEL: MODERATING
        </div>
      </div>
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-gray-500 mono">
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-policy"></span> Policy</span>
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-competitor"></span> Competitor</span>
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-sentiment"></span> Sentiment</span>
      </div>
    </div>
  </div>
</section>

<!-- 3-PILLAR FEATURE BLOCKS -->
<section id="features" class="max-w-7xl mx-auto px-6 py-20">
  <div class="text-center mb-14 slide-up">
    <h2 class="text-3xl md:text-4xl font-bold mb-3">Three pillars. One brief. Every morning.</h2>
    <p class="text-gray-400 max-w-2xl mx-auto">SCOUTT fuses live policy filings, competitor surface changes, and consumer sentiment into a single dashboard that respects your time.</p>
  </div>
  <div class="grid md:grid-cols-3 gap-6 slide-up-stagger">
    ${pillarCard({ color: 'policy', icon: 'fa-scale-balanced', title: 'Policy Radar', desc: 'New regulations, enforcement windows, agency guidance worldwide. Each card includes a plain-English summary, a deadline countdown, and a checklist of what you must do next.', stat: '14 EU events overnight', glow: 'glow-cyan' })}
    ${pillarCard({ color: 'competitor', icon: 'fa-chess-knight', title: 'Competitor Pulse', desc: 'Hourly diffs of competitor pricing pages, feature launches, hires, and funding events. Side-by-side red and green snapshots so you literally watch the market move.', stat: '+12.5% Stripe ACH overnight', glow: 'glow-orange' })}
    ${pillarCard({ color: 'sentiment', icon: 'fa-wave-square', title: 'Sentiment Storm', desc: 'Topic clusters, verbatim quotes, and sentiment-versus-competitor charts pulled from reviews, social posts, and community forums in your industry.', stat: '18pt fraud-tool sentiment', glow: 'glow-magenta' })}
  </div>
</section>

<!-- HOW IT WORKS (general, no technical jargon) -->
<section id="how" class="max-w-7xl mx-auto px-6 py-20 border-t border-ink-700/40">
  <div class="grid lg:grid-cols-5 gap-10 items-start">
    <div class="lg:col-span-2">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">How a Battle Brief is born.</h2>
      <p class="text-gray-400 mb-6">A quiet, automated pipeline runs overnight so a complete briefing is waiting on your screen when you sit down with coffee.</p>
      <a href="/dashboard?demo=true" class="inline-flex items-center gap-2 text-policy hover:underline">
        Open the live demo dashboard <i class="fa-solid fa-arrow-right text-xs"></i>
      </a>
    </div>
    <div class="lg:col-span-3 space-y-3">
      ${[
        ['Schedule fires at dawn', 'Every business day at 06:00 UTC the briefing pipeline wakes up and starts working for every active workspace.'],
        ['Intelligence is gathered', 'A research agent scans regulatory filings, competitor pages, and public discussions across your industry and region.'],
        ['Findings are structured', 'Raw signals are organised into the three pillars that matter to operators: policy, competitor, and sentiment.'],
        ['Dashboard updates live', 'Your Command Center refreshes automatically with new events, severity scores, and recommended actions.'],
        ['Competitor surfaces are watched', 'Throughout the day, key competitor pages are revisited and any change is flagged on the spot.'],
        ['Ask anything, anytime', 'A built-in assistant answers follow-up questions over your full briefing history with sources you can click through to.'],
      ].map(([h, b], i) => `
        <div class="card step-card p-4 flex items-start gap-4">
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

<!-- NEW SECTION 1 — Who SCOUTT is built for -->
<section class="border-t border-ink-700/40 py-20 reveal">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-12">
      <div class="text-xs mono uppercase tracking-widest text-policy mb-2">Who this is for</div>
      <h2 class="text-3xl md:text-4xl font-bold">Built for operators who run on signal, not noise.</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-5">
      ${[
        { ic: 'fa-rocket', color: 'policy', title: 'Founders and CEOs', desc: 'Walk into every Monday already knowing what changed in your market, your policy landscape, and your customer voice.' },
        { ic: 'fa-chart-line', color: 'competitor', title: 'Heads of Growth and RevOps', desc: 'See competitor pricing moves the moment they ship so your team responds in hours, not weeks.' },
        { ic: 'fa-shield-halved', color: 'sentiment', title: 'Compliance and Legal Leads', desc: 'Stay ahead of enforcement windows without drowning in regulator newsletters and dense PDFs.' },
      ].map(c => `
        <div class="card step-card p-6">
          <div class="w-12 h-12 rounded-xl bg-${c.color}/15 border border-${c.color}/40 flex items-center justify-center mb-4">
            <i class="fa-solid ${c.ic} text-${c.color} text-lg"></i>
          </div>
          <h3 class="text-lg font-semibold mb-2">${c.title}</h3>
          <p class="text-sm text-gray-400 leading-relaxed">${c.desc}</p>
        </div>
      `).join('')}
    </div>
  </div>
</section>

<!-- NEW SECTION 2 — What lands on your screen -->
<section class="border-t border-ink-700/40 py-20 reveal">
  <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
    <div>
      <div class="text-xs mono uppercase tracking-widest text-competitor mb-2">What you actually see</div>
      <h2 class="text-3xl md:text-4xl font-bold mb-5">A single screen that replaces ten browser tabs.</h2>
      <p class="text-gray-400 mb-6">Forget switching between regulator portals, competitor pricing pages, and social listening tools. SCOUTT distils everything into one Command Center built for fast decisions.</p>
      <ul class="space-y-3 text-sm">
        ${[
          ['fa-circle-dot', 'A live Pulse Wheel that maps the last 24 hours of risk in a single glance.'],
          ['fa-list-check', 'Today\'s top three actions, drafted as ready-to-send emails and team messages.'],
          ['fa-arrow-trend-up', 'Side-by-side before and after snapshots of every competitor change.'],
          ['fa-comment-dots', 'Verbatim customer quotes and trending phrases from across the web.'],
          ['fa-magnifying-glass', 'A natural-language assistant that answers any follow-up question with sources.'],
        ].map(([ic, txt]) => `
          <li class="flex items-start gap-3"><i class="fa-solid ${ic} text-policy mt-1"></i><span class="text-gray-300">${txt}</span></li>
        `).join('')}
      </ul>
    </div>
    <div class="card p-6">
      <div class="grid grid-cols-2 gap-4">
        ${[
          ['Threat level', '73', 'policy'],
          ['Actions today', '3', 'action'],
          ['Sources scanned', '847', 'competitor'],
          ['Verbatim quotes', '124', 'sentiment'],
        ].map(([l, v, c]) => `
          <div class="card step-card p-5 text-center">
            <div class="mono text-3xl font-bold text-${c}"><span class="countup" data-target="${v}">0</span></div>
            <div class="text-[11px] mono uppercase text-gray-500 mt-1">${l}</div>
          </div>
        `).join('')}
      </div>
      <div class="mt-5 text-xs text-gray-500 mono text-center">SAMPLE NUMBERS  YOUR LIVE BRIEFING WILL LOOK LIKE THIS</div>
    </div>
  </div>
</section>

<!-- NEW SECTION 3 — Why teams trust SCOUTT -->
<section class="border-t border-ink-700/40 py-20 reveal">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-12">
      <div class="text-xs mono uppercase tracking-widest text-sentiment mb-2">Why operators stick with SCOUTT</div>
      <h2 class="text-3xl md:text-4xl font-bold">Designed to earn its place on your morning routine.</h2>
    </div>
    <div class="grid md:grid-cols-4 gap-5">
      ${[
        { v: '8', s: 'min', t: 'Average time to read a full daily briefing.' },
        { v: '24', s: '/7', t: 'Continuous watch on competitor pricing pages.' },
        { v: '3', s: 'pillars', t: 'Policy, competitor, and sentiment in one view.' },
        { v: '0', s: 'noise', t: 'Only events that affect your specific business.' },
      ].map(c => `
        <div class="card step-card p-6 text-center">
          <div class="mono text-4xl font-bold bg-gradient-to-r from-policy via-sentiment to-competitor bg-clip-text text-transparent">
            <span class="countup" data-target="${c.v}">0</span><span class="text-2xl text-gray-400">${c.s}</span>
          </div>
          <p class="text-sm text-gray-400 mt-3 leading-relaxed">${c.t}</p>
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
      <span class="flex items-center gap-2"><i class="fa-solid fa-microchip text-emerald-400"></i> NVIDIA NIM</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-database text-competitor"></i> Supabase</span>
      <span class="flex items-center gap-2"><i class="fa-brands fa-vercel text-white"></i> Vercel</span>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="max-w-4xl mx-auto px-6 py-20 text-center">
  <h2 class="text-3xl md:text-4xl font-bold mb-4">Stop reading the news. Start running on it.</h2>
  <p class="text-gray-400 mb-8">One briefing. Every morning. Built for the operators who refuse to start the day reactively.</p>
  <a href="/onboarding" class="bg-policy text-ink-950 font-semibold px-6 py-3.5 rounded-lg hover:shadow-glow-cyan transition inline-flex items-center gap-2">
    <i class="fa-solid fa-rocket"></i> Open the live demo
  </a>
</section>

<footer class="border-t border-ink-700/40 py-8 text-center text-xs text-gray-500">
  SCOUTT  Built with Hono  Vercel  Anakin  NVIDIA NIM  Supabase
</footer>

<!-- Globe + count-up + reveal scripts -->
<script>
(function() {
  /* ============ DOTTED HIGH-TECH GLOBE ============ */
  const stage = document.getElementById('globe-stage');
  if (stage) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 500 500');
    svg.setAttribute('class', 'w-full h-full');
    stage.appendChild(svg);

    // Halo
    const haloDefs = document.createElementNS(SVG_NS, 'defs');
    haloDefs.innerHTML = \`
      <radialGradient id="haloGrad" cx="50%" cy="50%">
        <stop offset="35%" stop-color="#06b6d4" stop-opacity="0.18" />
        <stop offset="70%" stop-color="#06b6d4" stop-opacity="0.05" />
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
      </radialGradient>\`;
    svg.appendChild(haloDefs);

    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('cx', '250'); halo.setAttribute('cy', '250'); halo.setAttribute('r', '240');
    halo.setAttribute('fill', 'url(#haloGrad)');
    halo.setAttribute('class', 'globe-halo');
    svg.appendChild(halo);

    // Rotating group with dotted sphere
    const rotor = document.createElementNS(SVG_NS, 'g');
    rotor.setAttribute('class', 'globe-rotator');
    rotor.setAttribute('style', 'transform-origin: 250px 250px;');
    svg.appendChild(rotor);

    // Build a Fibonacci-distributed dot sphere (project to 2D)
    const R = 180, CX = 250, CY = 250;
    const N = 1100;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      // Front-hemisphere bias (fake depth)
      const depth = (z + 1) / 2; // 0..1
      const px = CX + x * R;
      const py = CY + y * R;
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', px.toFixed(1));
      dot.setAttribute('cy', py.toFixed(1));
      dot.setAttribute('r', (0.6 + depth * 1.1).toFixed(2));
      dot.setAttribute('fill', depth > 0.55 ? '#22d3ee' : '#0e7490');
      dot.setAttribute('opacity', (0.25 + depth * 0.7).toFixed(2));
      rotor.appendChild(dot);
    }

    // Continent emphasis dots — denser clusters approximating land masses
    const landClusters = [
      // [centerLon°, centerLat°, density, radiusDeg]
      [0, 50, 90, 28],   // Europe
      [20, 5, 110, 32],  // Africa
      [-95, 40, 110, 30],// N America
      [-60, -15, 80, 26],// S America
      [100, 30, 130, 36],// Asia
      [135, -25, 50, 18],// Australia
    ];
    landClusters.forEach(([lon, lat, n, rd]) => {
      for (let i = 0; i < n; i++) {
        const dl = (Math.random() - 0.5) * 2 * rd;
        const db = (Math.random() - 0.5) * 2 * rd * 0.7;
        const la = (lat + db) * Math.PI / 180;
        const lo = (lon + dl) * Math.PI / 180;
        const x = Math.cos(la) * Math.sin(lo);
        const y = Math.sin(la);
        const z = Math.cos(la) * Math.cos(lo);
        const depth = (z + 1) / 2;
        const px = CX + x * R;
        const py = CY - y * R;
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', px.toFixed(1));
        dot.setAttribute('cy', py.toFixed(1));
        dot.setAttribute('r', (0.9 + depth * 1.3).toFixed(2));
        dot.setAttribute('fill', depth > 0.5 ? '#67e8f9' : '#0891b2');
        dot.setAttribute('opacity', (0.35 + depth * 0.6).toFixed(2));
        rotor.appendChild(dot);
      }
    });

    // Orbital data points (Policy/Competitor/Sentiment)
    const orbitGroup = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(orbitGroup);
    const orbits = [
      { r: 195, tilt: 18, color: '#06b6d4', count: 3, speed: 22 },
      { r: 215, tilt: -12, color: '#f97316', count: 3, speed: 30 },
      { r: 235, tilt: 24, color: '#ec4899', count: 3, speed: 38 },
    ];
    orbits.forEach((o, idx) => {
      const ring = document.createElementNS(SVG_NS, 'ellipse');
      ring.setAttribute('cx', CX); ring.setAttribute('cy', CY);
      ring.setAttribute('rx', o.r); ring.setAttribute('ry', o.r * 0.32);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', o.color);
      ring.setAttribute('stroke-opacity', '0.18');
      ring.setAttribute('stroke-dasharray', '2 4');
      ring.setAttribute('transform', \`rotate(\${o.tilt} \${CX} \${CY})\`);
      orbitGroup.appendChild(ring);

      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', \`rotate(\${o.tilt} \${CX} \${CY})\`);
      g.setAttribute('style', \`transform-origin: \${CX}px \${CY}px; animation: drift-2 \${o.speed}s linear infinite \${idx % 2 ? 'reverse' : ''};\`);
      for (let i = 0; i < o.count; i++) {
        const angle = (i / o.count) * Math.PI * 2 + idx;
        const px = CX + Math.cos(angle) * o.r;
        const py = CY + Math.sin(angle) * o.r * 0.32;
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('r', 4);
        dot.setAttribute('fill', o.color);
        dot.setAttribute('filter', 'drop-shadow(0 0 6px ' + o.color + ')');
        g.appendChild(dot);

        const pulse = document.createElementNS(SVG_NS, 'circle');
        pulse.setAttribute('cx', px); pulse.setAttribute('cy', py); pulse.setAttribute('r', 4);
        pulse.setAttribute('fill', o.color); pulse.setAttribute('opacity', '0.3');
        pulse.innerHTML = \`
          <animate attributeName="r" from="4" to="14" dur="2.4s" begin="\${i * 0.4}s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2.4s" begin="\${i * 0.4}s" repeatCount="indefinite" />\`;
        g.appendChild(pulse);
      }
      svg.appendChild(g);
    });
  }

  /* ============ COUNT-UP ============ */
  function animateCount(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    const isInt = Number.isInteger(target);
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = (isInt ? Math.round(val).toLocaleString() : val.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll && e.target.querySelectorAll('.countup').forEach(animateCount);
        if (e.target.classList.contains('countup')) animateCount(e.target);
        e.target.classList && e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.countup, .reveal').forEach(el => io.observe(el));
})();
</script>
`,
  })

const pillarCard = (p: { color: string; icon: string; title: string; desc: string; stat: string; glow: string }) => `
  <div class="card step-card p-6 relative overflow-hidden">
    <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-${p.color}/20 blur-2xl"></div>
    <div class="relative">
      <div class="w-11 h-11 rounded-lg bg-${p.color}/15 border border-${p.color}/40 flex items-center justify-center mb-4">
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
