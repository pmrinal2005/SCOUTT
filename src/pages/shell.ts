// src/pages/shell.ts
// Shared HTML shell — design tokens + CDN libs + fonts.

export const htmlShell = (opts: {
  title: string
  bodyHTML: string
  bodyClass?: string
  extraScripts?: string
  extraHead?: string
}) => `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${opts.title.replace(/RealityPulse/gi, 'SCOUTT')}</title>
<meta name="description" content="SCOUTT — Bloomberg-grade daily intelligence for small and mid-market businesses. Policy, competitors, sentiment in a single morning brief." />
<link rel="icon" type="image/png" href="/static/scoutt_logo.png" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        },
        colors: {
          ink: { 950: '#05060a', 900: '#0a0c14', 800: '#11141d', 700: '#1a1e2a', 600: '#262b3a', 500: '#3a4055' },
          policy: '#06b6d4',
          competitor: '#f97316',
          sentiment: '#ec4899',
          action: '#10b981',
        },
        boxShadow: {
          'glow-cyan': '0 0 24px rgba(6,182,212,0.35)',
          'glow-orange': '0 0 24px rgba(249,115,22,0.35)',
          'glow-magenta': '0 0 24px rgba(236,72,153,0.35)',
          'glow-emerald': '0 0 24px rgba(16,185,129,0.35)',
        },
      },
    },
  }
</script>

<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>

<style>
  :root { color-scheme: dark; }
  html, body { background: #05060a; color: #e7eaf3; font-family: 'Inter', system-ui, sans-serif; }
  ::selection { background: rgba(6,182,212,0.4); color: #fff; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #0a0c14; }
  ::-webkit-scrollbar-thumb { background: #262b3a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a4055; }

  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(6,182,212,0.55); }
    70% { box-shadow: 0 0 0 16px rgba(6,182,212,0); }
    100% { box-shadow: 0 0 0 0 rgba(6,182,212,0); }
  }
  .pulse-ring { animation: pulse-ring 2.4s infinite cubic-bezier(0.66, 0, 0, 1); }

  @keyframes slide-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .slide-up { animation: slide-up 0.5s ease-out both; }
  .slide-up-stagger > * { animation: slide-up 0.6s ease-out both; }
  .slide-up-stagger > *:nth-child(1) { animation-delay: 0.05s; }
  .slide-up-stagger > *:nth-child(2) { animation-delay: 0.12s; }
  .slide-up-stagger > *:nth-child(3) { animation-delay: 0.19s; }
  .slide-up-stagger > *:nth-child(4) { animation-delay: 0.26s; }
  .slide-up-stagger > *:nth-child(5) { animation-delay: 0.33s; }
  .slide-up-stagger > *:nth-child(6) { animation-delay: 0.40s; }

  .card { background: linear-gradient(180deg, rgba(26,30,42,0.85), rgba(17,20,29,0.85)); border: 1px solid rgba(58,64,85,0.5); border-radius: 14px; backdrop-filter: blur(8px); }
  .card-hover { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
  .card-hover:hover { border-color: rgba(6,182,212,0.5); transform: translateY(-2px); }

  /* Animated colorful border on hover for step cards */
  .step-card { position: relative; overflow: hidden; transition: transform 0.3s ease; }
  .step-card::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 14px;
    padding: 1.5px;
    background: linear-gradient(120deg, #06b6d4, #f97316, #ec4899, #10b981, #06b6d4);
    background-size: 300% 300%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity: 0; transition: opacity 0.35s ease;
    animation: shimmer 4s linear infinite;
    pointer-events: none;
  }
  .step-card:hover::before { opacity: 1; }
  .step-card:hover { transform: translateY(-3px) scale(1.015); }
  @keyframes shimmer { 0% { background-position: 0% 0%; } 100% { background-position: 300% 0%; } }

  .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }

  .grid-bg {
    background-image:
      linear-gradient(rgba(58,64,85,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(58,64,85,0.12) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .glow-border { box-shadow: inset 0 0 0 1px rgba(6,182,212,0.35), 0 0 20px rgba(6,182,212,0.2); }

  @keyframes orbit { from { transform: rotate(0deg) translateX(40px) rotate(0deg); } to { transform: rotate(360deg) translateX(40px) rotate(-360deg); } }
  .orbit { animation: orbit 4s linear infinite; }

  .tab-active { color: #06b6d4; border-bottom: 2px solid #06b6d4; }

  @keyframes needle-sweep { from { transform: rotate(-90deg); } to { transform: rotate(var(--needle-angle, 0deg)); } }
  .needle { transform-origin: bottom center; animation: needle-sweep 1.4s cubic-bezier(.4,2,.2,.9) forwards; }

  pre.code { background: #05060a; border: 1px solid #1a1e2a; border-radius: 10px; padding: 14px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #b3b8c9; }
  pre.code .key { color: #06b6d4; }
  pre.code .str { color: #10b981; }
  pre.code .num { color: #f97316; }

  .map-pin { width: 14px; height: 14px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 0 4px rgba(6,182,212,0.18), 0 0 18px rgba(6,182,212,0.7); }
  .map-pin.orange { background: #f97316; box-shadow: 0 0 0 4px rgba(249,115,22,0.18), 0 0 18px rgba(249,115,22,0.7); }
  .map-pin.magenta { background: #ec4899; box-shadow: 0 0 0 4px rgba(236,72,153,0.18), 0 0 18px rgba(236,72,153,0.7); }

  .drawer { transform: translateX(100%); transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
  .drawer.open { transform: translateX(0); }

  .cmdk-backdrop { backdrop-filter: blur(8px); background: rgba(5,6,10,0.7); }

  /* Globe */
  @keyframes globe-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .globe-rotator { animation: globe-spin 60s linear infinite; transform-origin: center; }
  @keyframes globe-halo { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.04); } }
  .globe-halo { animation: globe-halo 4.5s ease-in-out infinite; transform-origin: center; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  .blink { animation: blink 1.6s ease-in-out infinite; }
  @keyframes drift-1 { from { transform: rotate(0deg) translateX(0) rotate(0deg); } to { transform: rotate(360deg) translateX(0) rotate(-360deg); } }
  @keyframes drift-2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

  /* Count-up reveal */
  .countup { display: inline-block; min-width: 1ch; }

  /* New section reveal */
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal.in { opacity: 1; transform: translateY(0); }
</style>

${opts.extraHead || ''}
</head>
<body class="${opts.bodyClass || 'min-h-screen bg-ink-950 text-gray-100'}">
${opts.bodyHTML}
${opts.extraScripts || ''}
</body>
</html>`
