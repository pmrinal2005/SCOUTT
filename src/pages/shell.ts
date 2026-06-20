// Shared HTML shell — design tokens + CDN libs + Geist fonts.
// Returns a function that wraps inner body markup.

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
<title>${opts.title}</title>
<meta name="description" content="RealityPulse — Bloomberg-Terminal-for-SMBs. Daily Battle Brief on policy, competitors, and sentiment." />
<link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />


<!-- Geist Sans + Mono from Vercel CDN -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

<!-- Tailwind via CDN -->
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
          policy: '#06b6d4',     // cyan
          competitor: '#f97316', // orange
          sentiment: '#ec4899',  // magenta
          action: '#10b981',     // emerald
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

<!-- Icons -->
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />

<!-- Charts: Chart.js (covers line/area/bar/radar/bubble/doughnut) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

<!-- HTTP -->
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>

<!-- Date -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>

<style>
  :root { color-scheme: dark; }
  html, body { background: #05060a; color: #e7eaf3; font-family: 'Inter', system-ui, sans-serif; }
  ::selection { background: rgba(6,182,212,0.4); color: #fff; }
  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #0a0c14; }
  ::-webkit-scrollbar-thumb { background: #262b3a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a4055; }
  /* Pulse animation */
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
  /* Card hover lift */
  .card { background: linear-gradient(180deg, rgba(26,30,42,0.85), rgba(17,20,29,0.85)); border: 1px solid rgba(58,64,85,0.5); border-radius: 14px; backdrop-filter: blur(8px); }
  .card-hover:hover { border-color: rgba(6,182,212,0.5); transform: translateY(-2px); transition: all 0.2s ease; }
  /* Mono numbers */
  .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  /* Grid bg */
  .grid-bg {
    background-image:
      linear-gradient(rgba(58,64,85,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(58,64,85,0.12) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  /* Glow border */
  .glow-border { box-shadow: inset 0 0 0 1px rgba(6,182,212,0.35), 0 0 20px rgba(6,182,212,0.2); }
  /* Spinning satellite (loading) */
  @keyframes orbit { from { transform: rotate(0deg) translateX(40px) rotate(0deg); } to { transform: rotate(360deg) translateX(40px) rotate(-360deg); } }
  .orbit { animation: orbit 4s linear infinite; }
  /* Tab underline */
  .tab-active { color: #06b6d4; border-bottom: 2px solid #06b6d4; }
  /* Threat needle */
  @keyframes needle-sweep { from { transform: rotate(-90deg); } to { transform: rotate(var(--needle-angle, 0deg)); } }
  .needle { transform-origin: bottom center; animation: needle-sweep 1.4s cubic-bezier(.4,2,.2,.9) forwards; }
  /* Code block */
  pre.code { background: #05060a; border: 1px solid #1a1e2a; border-radius: 10px; padding: 14px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #b3b8c9; }
  pre.code .key { color: #06b6d4; }
  pre.code .str { color: #10b981; }
  pre.code .num { color: #f97316; }
  /* Marker on world map */
  .map-pin { width: 14px; height: 14px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 0 4px rgba(6,182,212,0.18), 0 0 18px rgba(6,182,212,0.7); }
  .map-pin.orange { background: #f97316; box-shadow: 0 0 0 4px rgba(249,115,22,0.18), 0 0 18px rgba(249,115,22,0.7); }
  .map-pin.magenta { background: #ec4899; box-shadow: 0 0 0 4px rgba(236,72,153,0.18), 0 0 18px rgba(236,72,153,0.7); }
  /* Slide-in drawer */
  .drawer { transform: translateX(100%); transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
  .drawer.open { transform: translateX(0); }
  /* cmdk */
  .cmdk-backdrop { backdrop-filter: blur(8px); background: rgba(5,6,10,0.7); }
</style>

${opts.extraHead || ''}
</head>
<body class="${opts.bodyClass || 'min-h-screen bg-ink-950 text-gray-100'}">
${opts.bodyHTML}
${opts.extraScripts || ''}
</body>
</html>`
