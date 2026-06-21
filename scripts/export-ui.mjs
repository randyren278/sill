// Export every screen of Sill as a self-contained static HTML file.
// Mirrors src/lib/sprites.ts, src/lib/derive.ts, src/lib/calendar.ts so the
// emitted markup looks identical to the running React app — but with no
// React, no Supabase, and no runtime dependencies. Mock plant data is baked in.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUT = resolve(ROOT, 'ui-export')

// ── pinned "today" so the export is deterministic ────────────────────────────
const TODAY = '2026-06-20'
const MS = 86400000
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parse(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
function isoOf(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') }
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate()+n); return isoOf(d) }
function diff(a, b) { return Math.round((parse(a).getTime() - parse(b).getTime()) / MS) }
function fmt(s) { const d = parse(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] }

// ── palette + colors (copied from src/lib/palette.ts) ────────────────────────
const greenSets = {
  forest: { D:'#1c3a2c', G:'#3f6b4a', L:'#76995f', H:'#b6cf90' },
  deep:   { D:'#173024', G:'#345a3f', L:'#5f8a53', H:'#9cc080' },
  bright: { D:'#26452f', G:'#4a7a4f', L:'#86a85f', H:'#c3d893' },
  jade:   { D:'#2a4636', G:'#4c7158', L:'#83a06f', H:'#bcd29a' },
}
const COLORS = {
  overdue: '#b5613a',
  overdueDot: '#d98a5b',
  dueSoon: '#b8862f',
  dueSoonDot: '#d8ab4a',
  happy: '#3f6b4a',
  happyDot: '#7fae6a',
  wateredDot: '#9bb98a',
}

// ── sprite maps (verbatim from src/lib/sprites.ts) ───────────────────────────
const sprites = {
  'broad-md': ['                  ','        DD        ','      DGLLD       ','  DD DGLLLGD DD   ',' DGLD GLLLLG DLGD ',' DLLLGGLLHLLGGLLD ',' DLLLLLLLLLLLLLLD ','  DLLHLLLLLLHLLD  ','  DDLLLLLLLLLLDD  ','    DDGLLLLGDD    ','       DGGD       ','        SS        ','        SS        ','      rrTTrr      ','      TTTTTT      ','      tTTTTt      ','      ttTTtt      ','       tooo       '],
  'cane-md':  ['                  ','    D        D    ','   DLD      DLD   ','   DLLD    DLLD   ','    DLLD  DLLD    ','   D DLLDDLLD D   ','  DLD DLLLLD DLD  ','  DLLD DLLLD DLD  ','   DLLD DLD DLD   ','    DLLD S DLLD   ','     DLD S DLD    ','      D SS D      ','        SS        ','      rrTTrr      ','      TTTTTT      ','      tTTTTt      ','      ttTTtt      ','       tooo       '],
  'trail-md': ['                  ','       DGGD       ','      DLHHLD      ','  DGD DLLLD DGD   ',' DLHLD DGGD DLHLD ',' DLLLD  SS  DLLLD ','  DGD   SS   DGD  ',' DGD    SS    DGD ','DLHLD  rTTr  DLHLD','DLLLD  TTTT  DLLLD',' DGD   TTTT   DGD ','       tTTt       ','  DGD  tttt  DGD  ',' DLHLD      DLHLD ',' DLLLD      DLLLD ','  DGD        DGD  ','                  ','                  '],
  'succ-md':  ['                  ','   DGD      DGD   ','  DLHGD    DGHLD  ','  DLLGD    DGLLD  ','   DGDD    DDGD   ','    D  DGGD  D    ','      DLHHLD      ','      DLLLLD      ','      DDGGDD      ','        SS        ','       DSSD       ','        SS        ','      rrTTrr      ','      TTTTTT      ','      TTTTTT      ','      tTTTTt      ','      ttTTtt      ','       tooo       '],
  'fan-md':   ['                  ','   D    DD    D   ','   LD  DLLD  DL   ','   LLD DLLD DLL   ','   LLLDDLLDDLLL   ','   LLLLGLLGLLLL   ','    LLLGLLGLLL    ','     LLGLLGLL     ','      LGLLGL      ','       GLLG       ','        SS        ','        SS        ','        SS        ','      rrTTrr      ','      TTTTTT      ','      tTTTTt      ','      ttTTtt      ','       tooo       '],
  'broad-xl': ['        DMMD      ','       DGMMGD     ','     DDLMMLDD     ','   DDGLLMMLLGDD   ','  DGLLHLMMLHLLGD  ','  DLLLLLMMLLLLLD  ','   DDLLGMMGLLDD   ','    DGLLMMLLGD    ','  DDLLLGMMGLLLDD  ','  DLLHLLMMLLHLLD  ','   DDLLLMMLLLDD   ','        SS        ','      rrTTrr      ','      TTTTTT      ','      TTTTTT      ','      tTTTTt      ','      ttTTtt      ','       tooo       '],
  'broad-sm': ['                  ','                  ','                  ','        DD        ','       DLLD       ','     DDGLLGDD     ','    DGLLLLLLGD    ','    DLLLHLLLLD    ','     DDGLLGDD     ','        SS        ','        SS        ','       rTTr       ','       TTTT       ','       tTTt       ','       ttTt       ','        too       ','                  ','                  '],
  'broad-xs': ['                  ','                  ','     DD     DD    ','    DGLD   DGLD   ','    DLHD   DLHD   ','     DSD   DSD    ','      SS   SS     ','       SS SS      ','        SSS       ','     DDDDDDDD     ','     DWWwWWWD     ','     DWWRWWWD     ','     DWRWWWRD     ','     DWWWRWWD     ','     DRWWWWRD     ','     DWWWWWWD     ','     DDDDDDDD     ','                  '],
  'cane-xl':  ['    D        D    ','   DLD      DLD   ','   DLLD    DLLD   ','    DLD    DLD    ','    DSD    DSD    ','   D S      S D   ','  DLD S    S DLD  ','  DLLD S  S DLLD  ','   DLD S  S DLD   ','    D  S  S  D    ','       S  S       ','       S  S       ','        SS        ','      rrTTrr      ','      TTTTTT      ','      tTTTTt      ','      ttTTtt      ','       tooo       '],
  'fan-xl':   ['D   D   DD   D   D','LD  LD  LL  DL  DL',' LD  LD LL DL  DL ','  LD  LDLLDL  DL  ','   LD  LDDL  DL   ','    LD LDDL DL    ','     LDDLLDDL     ','      LDLLDL      ','        GG        ','        GG        ','        DD        ','        SS        ','        SS        ','     rrTTrr       ','     TTTTTT       ','     tTTTTt       ','     ttTTtt       ','      tooo        '],
}
sprites.broad = sprites['broad-md']
sprites.cane = sprites['cane-md']
sprites.trail = sprites['trail-md']
sprites.succ = sprites['succ-md']
sprites.fan = sprites['fan-md']

function lookup(arch, size) {
  return sprites[arch+'-'+size] ?? sprites[arch+'-md'] ?? sprites['broad-md']
}

function buildPalette(greens) {
  const g = greenSets[greens] ?? greenSets.forest
  return {
    D: g.D, G: g.G, L: g.L, H: g.H,
    S: '#7a5c3a',
    T: '#c8895b', t: '#ad6e44', r: '#dba87a', o: '#5b4636',
    M: '#6b4a2a',
    W: '#b8d7e0', w: '#d8ecf2',
    R: '#f6f1da',
  }
}

// Produce an inline <svg> string (used as background-image data URL or direct).
function spriteSvg(arch, greens, size = 'md') {
  const pal = buildPalette(greens)
  const map = lookup(arch, size)
  const cols = map[0].length
  const rows = map.length
  let rects = ''
  for (let y = 0; y < rows; y++) {
    let x = 0
    while (x < cols) {
      const ch = map[y][x]
      if (ch === ' ' || !pal[ch]) { x++; continue }
      let w = 1
      while (x + w < cols && map[y][x + w] === ch) w++
      rects += `<rect x='${x}' y='${y}' width='${w}' height='1' fill='${pal[ch]}'/>`
      x += w
    }
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${cols} ${rows}' shape-rendering='crispEdges'>${rects}</svg>`
}

function spriteDataUrl(arch, greens, size = 'md') {
  return `url("data:image/svg+xml,${encodeURIComponent(spriteSvg(arch, greens, size))}")`
}

// ── species + mock plants ────────────────────────────────────────────────────
const SPECIES = {
  monstera:  { common:'Monstera',   latin:'Monstera deliciosa', arch:'broad', greens:'forest', size:'md', light:'Bright indirect', freq:7,  fact:'The holes in its leaves — fenestrations — let light and rain reach the leaves below.' },
  dracaena:  { common:'Dracaena',   latin:'Dracaena fragrans',  arch:'cane',  greens:'deep',   size:'md', light:'Low–medium',      freq:11, fact:'Nicknamed the corn plant for its thick cane stalks and long arching leaves.' },
  pothos:    { common:'Pothos',     latin:'Epipremnum aureum',  arch:'trail', greens:'forest', size:'md', light:'Low light OK',    freq:7,  fact:'Nearly unkillable — its vines can grow over 12 metres long indoors.' },
  jade:      { common:'Jade',       latin:'Crassula ovata',     arch:'succ',  greens:'jade',   size:'md', light:'Bright direct',   freq:21, fact:'A succulent that stores water in its plump leaves — long seen as a symbol of prosperity.' },
  strelit:   { common:'Strelitzia', latin:'Strelitzia reginae', arch:'fan',   greens:'bright', size:'md', light:'Bright direct',   freq:7,  fact:'Its flower mimics a tropical bird to lure sunbirds in to pollinate it.' },
}

// Pin lastWatered so we get a mix of statuses against TODAY = 2026-06-20.
const PLANTS = [
  { id:'p1', name:'Monstera by the window', loc:'living room', ...SPECIES.monstera,
    lastWatered:'2026-06-11', history:['2026-06-11','2026-06-04','2026-05-28','2026-05-21','2026-05-14'] },
  { id:'p2', name:'Pothos in the hallway',  loc:'hallway',     ...SPECIES.pothos,
    lastWatered:'2026-06-14', history:['2026-06-14','2026-06-07','2026-05-31','2026-05-24','2026-05-17'] },
  { id:'p3', name:'Dracaena',               loc:'bedroom',     ...SPECIES.dracaena,
    lastWatered:'2026-06-17', history:['2026-06-17','2026-06-06','2026-05-26','2026-05-15','2026-05-04'] },
  { id:'p4', name:'Little jade',            loc:'kitchen sill',...SPECIES.jade,
    lastWatered:'2026-06-15', history:['2026-06-15','2026-05-25','2026-05-04','2026-04-13'] },
  { id:'p5', name:'Bird of paradise',       loc:'bay window',  ...SPECIES.strelit,
    lastWatered:'2026-06-20', history:['2026-06-20','2026-06-13','2026-06-06','2026-05-30','2026-05-23'] },
]

// Translate freqDays → freq for parity with the React Plant shape.
for (const p of PLANTS) {
  p.freqDays = p.freq
  delete p.freq
}

// ── derive (mirrors src/lib/derive.ts) ───────────────────────────────────────
function derive(p) {
  const since = diff(TODAY, p.lastWatered)
  const nextDue = addDays(p.lastWatered, p.freqDays)
  const nextIn = diff(nextDue, TODAY)
  let statusColor, statusLabel, bigNum, bigSub, statusLine, dotColor
  if (nextIn < 0) {
    statusColor = COLORS.overdue
    dotColor = COLORS.overdueDot
    statusLabel = Math.abs(nextIn) + 'd overdue'
    bigNum = Math.abs(nextIn); bigSub = 'days overdue'; statusLine = 'Needs water now'
  } else if (nextIn === 0) {
    statusColor = COLORS.overdue; dotColor = COLORS.overdueDot
    statusLabel = 'Water today'; bigNum = 0; bigSub = 'water today'; statusLine = 'Water today'
  } else if (nextIn <= 2) {
    statusColor = COLORS.dueSoon; dotColor = COLORS.dueSoonDot
    statusLabel = 'In ' + nextIn + 'd'; bigNum = nextIn; bigSub = 'days to water'; statusLine = 'Due soon'
  } else {
    statusColor = COLORS.happy; dotColor = COLORS.happyDot
    statusLabel = 'Happy'; bigNum = nextIn; bigSub = 'days to water'; statusLine = 'Looking healthy'
  }
  const progress = Math.min(118, Math.round((since / p.freqDays) * 100))
  const historyDerived = p.history.slice().sort().reverse().slice(0, 5).map((h) => {
    const a = diff(TODAY, h)
    return { iso: h, dateFmt: fmt(h), ago: a === 0 ? 'today' : a + 'd ago', color: COLORS.happyDot, ring: 'rgba(127,174,106,.18)' }
  })
  return {
    ...p, since, nextIn, nextDue,
    statusColor, statusLabel, bigNum, bigSub, statusLine, dotColor,
    progress,
    freqLabel: 'Every ' + p.freqDays + ' days',
    lastWateredAgo: since === 0 ? 'today' : since + ' days ago',
    nextDueFmt: fmt(nextDue),
    historyDerived,
  }
}

// ── tiny HTML helpers ────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))

function spriteDiv(arch, greens, size, px, extraClass = '', extraStyle = '') {
  return `<div class="${extraClass}" style="width:${px}px;height:${px}px;background-image:${spriteDataUrl(arch, greens, size)};background-size:contain;background-repeat:no-repeat;background-position:center;${extraStyle}"></div>`
}

// ── shared <head> + global CSS (mirrors src/index.css) ───────────────────────
const GLOBAL_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; background: #f3f1e9; font-family: 'Hanken Grotesk', sans-serif; -webkit-font-smoothing: antialiased; color: #1b211c; overflow-x: hidden; }

@keyframes pulse  { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.78); } }
@keyframes floaty { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes popIn  { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
@keyframes sway   { 0%{transform:rotate(0)} 18%{transform:rotate(4deg)} 46%{transform:rotate(-4deg)} 72%{transform:rotate(2.5deg)} 100%{transform:rotate(0)} }

.sway-on-mount { animation: sway 1.1s cubic-bezier(.45,.05,.55,.95) both; transform-origin: 50% 90%; }
@media (prefers-reduced-motion: reduce) { .sway-on-mount { animation: none; } }
.fade-up { animation: fadeUp .5s cubic-bezier(.2,.8,.2,1) both; }
.pix { image-rendering: pixelated; image-rendering: crisp-edges; }
.pulse-dot { animation: pulse 1.9s infinite; }

input, select, button { font-family: 'Hanken Grotesk', sans-serif; }
input:focus, select:focus { outline: none; border-color: #3f6b4a !important; box-shadow: 0 0 0 3px rgba(63,107,74,.14); }
button:focus-visible { outline: 2px solid #3f6b4a; outline-offset: 2px; border-radius: 999px; }
.chip { min-width: 44px; min-height: 36px; }
input[type=range] { accent-color: #3f6b4a; }
button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; cursor: pointer; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #dcd8c9; border-radius: 6px; border: 2px solid #f3f1e9; }

.hov-row:hover { transform: translateX(5px); box-shadow: -8px 14px 34px rgba(30,61,47,.11); border-color: #d8d3c2; }
.hov-tile:hover { transform: translateY(-1px); }
.hov-scale:hover { transform: scale(1.04); }
.hov-darken:hover { background: rgba(238,240,228,.1); }
.hov-gap:hover { gap: 11px; }
.hov-roster:hover { transform: translateX(3px); box-shadow: -5px 10px 22px rgba(30,61,47,.09); }
.hov-cal-nav:hover { background: #1e3d2f; color: #eef0e4; }

@media (hover: none) {
  .hov-row:hover, .hov-tile:hover, .hov-scale:hover,
  .hov-darken:hover, .hov-gap:hover, .hov-roster:hover, .hov-cal-nav:hover {
    transform: none !important; box-shadow: none !important; background: revert; color: revert; border-color: revert; gap: revert;
  }
}

@media (max-width: 720px) {
  .app-container { padding: 0 16px 64px !important; }
  .hdr-subtitle, .hdr-add-label { display: none; }
  .hdr-btn { padding: 8px 11px !important; font-size: 12px !important; }
  .hdr-actions { gap: 4px !important; }
  .dash-hero { flex-direction: column; align-items: flex-start !important; gap: 12px !important; }
  .dash-hero-stats { text-align: left !important; }
  .dash-hero-title { font-size: 36px !important; }
  .plant-row { flex-wrap: wrap; gap: 14px !important; padding: 14px 16px !important; }
  .plant-row-name { width: auto !important; flex: 1 1 auto !important; min-width: 0; }
  .plant-row-name .pr-name { font-size: 19px !important; }
  .plant-row-big { width: auto !important; flex: 0 0 auto !important; order: 2; }
  .plant-row-big .pr-big { font-size: 36px !important; }
  .plant-row-meter { flex: 0 0 100% !important; order: 3; }
  .pd-hero { flex-direction: column; }
  .pd-hero-text { padding: 24px 22px !important; }
  .pd-hero-name { font-size: 32px !important; }
  .pd-hero-count { font-size: 56px !important; }
  .pd-hero-sprite { width: 100% !important; padding: 24px 0 !important; }
  .pd-grid { grid-template-columns: 1fr !important; }
  .pf-wrap { flex-direction: column; align-items: stretch !important; }
  .pf-sprite { align-self: center; }
  .pf-pair { flex-direction: column !important; }
  .pf-actions { flex-direction: column; }
  .pf-actions > button { width: 100%; }
  .cal-wrap { grid-template-columns: 1fr !important; }
  .cal-month { font-size: 36px !important; }
  .cal-grid { gap: 4px !important; }
  .cal-cell { padding: 4px 5px !important; min-height: 36px; }
  .cal-legend { flex-wrap: wrap; gap: 12px !important; }
}
`

function pageShell({ title, screenLabel, body }) {
  // screenLabel is one of 'plants' | 'calendar' (controls which header tab is active)
  const onPlants = screenLabel === 'plants'
  const onCalendar = screenLabel === 'calendar'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)} · Sill</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
<style>${GLOBAL_CSS}</style>
</head>
<body>
<div style="min-height:100vh;background:#f3f1e9;color:#1b211c;">
  <div class="app-container" style="max-width:1060px;margin:0 auto;padding:0 28px 80px;">
    <header style="position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:22px 0 18px;background:linear-gradient(#f3f1e9 78%, rgba(243,241,233,0));margin-bottom:8px;">
      <a href="dashboard.html" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;">
        ${spriteDiv('broad','forest','md',34)}
        <div>
          <div style="font-family:'Newsreader',serif;font-size:23px;line-height:.95;letter-spacing:-.01em;">Sill</div>
          <div class="hdr-subtitle" style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:#9aa093;margin-top:1px;">Plant care</div>
        </div>
      </a>
      <div class="hdr-actions" style="display:flex;align-items:center;gap:8px;">
        <a href="dashboard.html" class="hdr-btn" style="text-decoration:none;border:none;font-size:13.5px;font-weight:600;padding:9px 18px;border-radius:999px;transition:all .25s;background:${onPlants?'#1e3d2f':'transparent'};color:${onPlants?'#eef0e4':'#6b736a'};">Plants</a>
        <a href="calendar.html" class="hdr-btn" style="text-decoration:none;border:none;font-size:13.5px;font-weight:600;padding:9px 18px;border-radius:999px;transition:all .25s;background:${onCalendar?'#1e3d2f':'transparent'};color:${onCalendar?'#eef0e4':'#6b736a'};">Calendar</a>
        <a href="plant-form-new.html" class="hdr-btn hov-tile" style="text-decoration:none;border:none;font-size:13.5px;font-weight:600;padding:9px 18px 9px 15px;border-radius:999px;background:#1e3d2f;color:#eef0e4;display:flex;align-items:center;gap:6px;transition:transform .25s;">
          <span style="font-size:16px;line-height:1;margin-top:-1px;">＋</span>
          <span class="hdr-add-label">Add plant</span>
        </a>
      </div>
    </header>
    ${body}
  </div>
</div>
</body>
</html>`
}

// ── individual screen renderers ──────────────────────────────────────────────
function dashboardHtml() {
  const derived = PLANTS.map(derive).sort((a,b) => a.nextIn - b.nextIn)
  const thirstyCount = derived.filter((d) => d.nextIn <= 2).length
  const total = PLANTS.length

  const d = parse(TODAY)
  const todayLabel = `${WEEKDAYS_LONG[d.getDay()]} · ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`

  const rows = derived.map((p) => `
    <a href="plant-detail.html" class="plant-row hov-row" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:22px;background:#fbfaf5;border:1px solid #e6e3d7;border-radius:20px;padding:16px 22px;cursor:pointer;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s,border-color .35s;">
      <div style="flex:none;width:74px;height:74px;border-radius:16px;background:#eef0e4;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${spriteDiv(p.arch, p.greens, p.size, 62)}
      </div>
      <div class="plant-row-name" style="flex:none;width:184px;">
        <div class="pr-name" style="font-family:'Newsreader',serif;font-size:23px;line-height:1.02;">${esc(p.name)}</div>
        <div style="font-family:'Newsreader',serif;font-style:italic;font-size:13px;color:#9aa093;margin-top:1px;">${esc(p.common)}</div>
        <div style="font-size:11px;color:#8a907f;margin-top:8px;font-family:ui-monospace,monospace;letter-spacing:.02em;">${esc(p.loc)}</div>
      </div>
      <div class="plant-row-meter" style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <span style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9aa093;font-family:ui-monospace,monospace;">Watering cycle</span>
          <span style="font-size:12px;color:#6b736a;">${esc(p.freqLabel)}</span>
        </div>
        <div style="height:9px;border-radius:999px;background:#e9e6d9;overflow:hidden;">
          <div style="height:100%;border-radius:999px;width:${Math.min(p.progress,100)}%;background:${p.statusColor};transition:width .9s cubic-bezier(.2,.8,.2,1);"></div>
        </div>
        <div style="font-size:11.5px;color:#8a907f;margin-top:8px;">Last watered ${esc(p.lastWateredAgo)}</div>
      </div>
      <div class="plant-row-big" style="flex:none;width:96px;text-align:right;">
        <div class="pr-big" style="font-family:'Newsreader',serif;font-size:46px;line-height:.85;color:${p.statusColor};">${p.bigNum}</div>
        <div style="font-size:10.5px;color:#8a907f;text-transform:uppercase;letter-spacing:.07em;font-family:ui-monospace,monospace;margin-top:5px;">${esc(p.bigSub)}</div>
      </div>
    </a>`).join('')

  const body = `
    <div class="fade-up">
      <div class="dash-hero" style="display:flex;justify-content:space-between;align-items:flex-end;margin:24px 0 26px;">
        <div>
          <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9aa093;margin-bottom:10px;">${esc(todayLabel)}</div>
          <div class="dash-hero-title" style="font-family:'Newsreader',serif;font-size:48px;line-height:1;letter-spacing:-.02em;">My plants</div>
        </div>
        <div class="dash-hero-stats" style="text-align:right;">
          <div style="font-family:'Newsreader',serif;font-size:34px;line-height:1;color:#b5613a;">${thirstyCount}</div>
          <div style="font-size:12px;color:#6b736a;margin-top:3px;">need water soon · ${total} total</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap;">
        <button style="border:1px solid #e6e3d7;font-size:12.5px;font-weight:600;padding:7px 16px;border-radius:999px;transition:all .25s;background:#1e3d2f;color:#eef0e4;">All plants</button>
        <button style="border:1px solid #e6e3d7;font-size:12.5px;font-weight:600;padding:7px 16px;border-radius:999px;transition:all .25s;background:#fbfaf5;color:#6b736a;">Needs water</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">${rows}</div>
    </div>`
  return pageShell({ title: 'My plants', screenLabel: 'plants', body })
}

function plantDetailHtml() {
  // showcase the overdue Monstera
  const sel = derive(PLANTS[0])
  const tilesGrid = `
    ${tile('Light', sel.light)}
    ${tile('Watering', sel.freqLabel)}
    ${tile('Last watered', sel.lastWateredAgo)}
    ${tile('Next due', sel.nextDueFmt, sel.statusColor)}`

  const historyRows = sel.historyDerived.map((h) => `
    <div style="display:flex;align-items:center;gap:14px;padding:9px 0;">
      <span style="flex:none;width:11px;height:11px;border-radius:50%;background:${h.color};box-shadow:0 0 0 4px ${h.ring};"></span>
      <span style="flex:1;font-size:14.5px;color:#1b211c;">${esc(h.dateFmt)}</span>
      <span style="font-size:12px;color:#9aa093;font-family:ui-monospace,monospace;">${esc(h.ago)}</span>
    </div>`).join('')

  const body = `
    <div class="fade-up">
      <a href="dashboard.html" class="hov-gap" style="text-decoration:none;border:none;background:none;color:#6b736a;font-size:13px;font-weight:600;padding:6px 0;margin:14px 0 18px;display:inline-flex;align-items:center;gap:7px;transition:gap .25s;">‹ All plants</a>

      <div class="pd-hero" style="display:flex;background:#1e3d2f;border-radius:26px;overflow:hidden;color:#eef0e4;min-height:262px;">
        <div class="pd-hero-text" style="flex:1;padding:38px 40px;display:flex;flex-direction:column;justify-content:center;">
          <div style="display:flex;align-items:center;gap:8px;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b6cf90;margin-bottom:16px;">
            <span class="pulse-dot" style="width:8px;height:8px;border-radius:50%;background:${sel.dotColor};display:inline-block;"></span>
            ${esc(sel.statusLine)}
          </div>
          <div class="pd-hero-name" style="font-family:'Newsreader',serif;font-size:44px;line-height:1;letter-spacing:-.01em;">${esc(sel.name)}</div>
          <div style="font-family:'Newsreader',serif;font-style:italic;font-size:16px;color:#9bb98a;margin-top:5px;">${esc(sel.latin)} · ${esc(sel.loc)}</div>
          <div style="display:flex;align-items:baseline;gap:11px;margin-top:24px;">
            <span class="pd-hero-count" style="font-family:'Newsreader',serif;font-size:74px;line-height:.8;">${sel.bigNum}</span>
            <span style="font-size:14px;color:#9bb98a;max-width:96px;line-height:1.2;">${esc(sel.bigSub)}</span>
          </div>
          <div style="display:flex;gap:10px;margin-top:26px;">
            <button class="hov-scale" style="border:none;background:#eef0e4;color:#1e3d2f;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px;display:flex;align-items:center;gap:7px;transition:transform .25s;">💧 Water now</button>
            <a href="plant-form-edit.html" class="hov-darken" style="text-decoration:none;border:1px solid rgba(238,240,228,.35);background:transparent;color:#eef0e4;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px;transition:background .25s;">Edit</a>
          </div>
        </div>
        <div class="pd-hero-sprite" style="flex:none;width:300px;background:#274a39;display:flex;align-items:center;justify-content:center;">
          <div style="width:188px;height:188px;border-radius:50%;background:#2f5743;display:flex;align-items:center;justify-content:center;">
            ${spriteDiv(sel.arch, sel.greens, sel.size, 150, 'sway-on-mount')}
          </div>
        </div>
      </div>

      <div class="pd-grid" style="display:grid;grid-template-columns:1.05fr .95fr;gap:18px;margin-top:18px;">
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${tilesGrid}</div>
          <div style="background:#fbfaf5;border:1px solid #e6e3d7;border-radius:18px;padding:20px 22px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:11px;">
              <span style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9aa093;font-family:ui-monospace,monospace;">Until next watering</span>
              <span style="font-size:12px;color:${sel.statusColor};font-weight:600;">${esc(sel.statusLabel)}</span>
            </div>
            <div style="height:11px;border-radius:999px;background:#e9e6d9;overflow:hidden;">
              <div style="height:100%;border-radius:999px;width:${Math.min(sel.progress,100)}%;background:${sel.statusColor};transition:width .9s cubic-bezier(.2,.8,.2,1);"></div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div style="background:#eef0e4;border:1px solid #e0e4d2;border-radius:18px;padding:22px 24px;">
            <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#7c9b6b;margin-bottom:10px;">🌿 Did you know?</div>
            <div style="font-family:'Newsreader',serif;font-size:19px;line-height:1.42;color:#2a3a2c;text-wrap:pretty;">${esc(sel.fact)}</div>
          </div>
          <div style="background:#fbfaf5;border:1px solid #e6e3d7;border-radius:18px;padding:20px 24px;">
            <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#9aa093;margin-bottom:16px;">Watering history</div>
            <div style="display:flex;flex-direction:column;">${historyRows}</div>
          </div>
        </div>
      </div>
    </div>`
  return pageShell({ title: sel.name, screenLabel: 'plants', body })
}

function tile(label, value, valueColor) {
  return `<div style="background:#fbfaf5;border:1px solid #e6e3d7;border-radius:18px;padding:18px 20px;">
    <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#9aa093;margin-bottom:9px;">${esc(label)}</div>
    <div style="font-family:'Newsreader',serif;font-size:21px;${valueColor?`color:${valueColor};`:''}">${esc(value)}</div>
  </div>`
}

function plantFormHtml({ mode }) {
  const editing = mode === 'edit' ? PLANTS[0] : null
  const sp = editing
    ? { ...SPECIES.monstera, freq: editing.freqDays }
    : { ...SPECIES.monstera, freq: SPECIES.monstera.freq }
  const title = mode === 'edit' ? 'Edit plant' : 'Add a plant'
  const saveLabel = mode === 'edit' ? 'Save changes' : 'Add to my plants'
  const name = editing ? editing.name : ''
  const loc = editing ? editing.loc : ''
  const light = editing ? editing.light : sp.light
  const freq = editing ? editing.freqDays : sp.freq
  const size = editing ? editing.size : sp.size
  const lastWatered = editing ? editing.lastWatered : TODAY

  const SPECIES_LIST = ['Monstera','Dracaena','Pothos','Jade','Strelitzia','Other plant']
  const LIGHT_LIST = ['Bright direct','Bright indirect','Medium','Low–medium','Low light OK']
  const SIZE_LIST = [
    { value:'xs', label:'Tiny (cutting in water)' },
    { value:'sm', label:'Small (young / cutting)' },
    { value:'md', label:'Medium (regular pot)' },
    { value:'lg', label:'Large' },
    { value:'xl', label:'Huge (mature / floor)' },
  ]

  const inputStyle = `width:100%;font-size:15px;padding:13px 15px;border-radius:13px;border:1px solid #e0ddce;background:#fbfaf5;color:#1b211c;transition:all .2s;`

  const backHref = editing ? 'plant-detail.html' : 'dashboard.html'

  const body = `
    <div class="fade-up" style="max-width:760px;margin:0 auto;">
      <a href="${backHref}" class="hov-gap" style="text-decoration:none;border:none;background:none;color:#6b736a;font-size:13px;font-weight:600;padding:6px 0;margin:14px 0 18px;display:inline-flex;align-items:center;gap:7px;transition:gap .25s;">‹ Cancel</a>
      <div style="font-family:'Newsreader',serif;font-size:40px;letter-spacing:-.01em;margin-bottom:28px;">${esc(title)}</div>

      <div class="pf-wrap" style="display:flex;gap:26px;align-items:flex-start;">
        <div class="pf-sprite" style="flex:none;width:172px;">
          <div style="width:172px;height:172px;border-radius:22px;background:#eef0e4;border:1px solid #e0e4d2;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${spriteDiv(sp.arch, sp.greens, size, 128, '', 'animation:popIn .4s both;')}
          </div>
          <div style="text-align:center;font-size:11px;color:#9aa093;margin-top:10px;font-family:ui-monospace,monospace;">pixel sprite preview</div>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;gap:18px;">
          ${field('Nickname', `<input value="${esc(name)}" placeholder="e.g. Monstera by the window" style="${inputStyle}" />`)}
          <div class="pf-pair" style="display:flex;gap:14px;">
            ${field('Species', `<select style="${inputStyle}cursor:pointer;">${SPECIES_LIST.map((s,i)=>`<option ${i===0?'selected':''}>${esc(s)} · ${esc([SPECIES.monstera,SPECIES.dracaena,SPECIES.pothos,SPECIES.jade,SPECIES.strelit,{latin:'Houseplant'}][i].latin)}</option>`).join('')}</select>`, 'flex:1;')}
            ${field('Location', `<input value="${esc(loc)}" placeholder="living room" style="${inputStyle}" />`, 'flex:1;')}
          </div>
          <div class="pf-pair" style="display:flex;gap:14px;">
            ${field('Light', `<select style="${inputStyle}cursor:pointer;">${LIGHT_LIST.map((l)=>`<option ${l===light?'selected':''}>${esc(l)}</option>`).join('')}</select>`, 'flex:1;')}
            ${field('Size', `<select style="${inputStyle}cursor:pointer;">${SIZE_LIST.map((s)=>`<option value="${s.value}" ${s.value===size?'selected':''}>${esc(s.label)}</option>`).join('')}</select>`, 'flex:1;')}
            ${field('Last watered', `<input type="date" value="${esc(lastWatered)}" style="${inputStyle}padding:12px 15px;" />`, 'flex:1;')}
          </div>
          <div>
            <label style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9aa093;font-family:ui-monospace,monospace;margin-bottom:10px;">
              <span>Water every</span><span style="color:#3f6b4a;">${freq} days</span>
            </label>
            <input type="range" min="1" max="30" value="${freq}" style="width:100%;" />
          </div>
          <div class="pf-actions" style="display:flex;gap:10px;margin-top:6px;">
            <button class="hov-tile" style="border:none;background:#1e3d2f;color:#eef0e4;font-weight:600;font-size:14.5px;padding:13px 28px;border-radius:999px;transition:transform .25s;">${esc(saveLabel)}</button>
            <a href="${backHref}" style="text-decoration:none;border:1px solid #e0ddce;background:transparent;color:#6b736a;font-weight:600;font-size:14.5px;padding:13px 24px;border-radius:999px;display:inline-flex;align-items:center;">Cancel</a>
          </div>
        </div>
      </div>
    </div>`
  return pageShell({ title, screenLabel: 'plants', body })
}

function field(label, inner, extraStyle = '') {
  return `<div style="${extraStyle}">
    <label style="display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9aa093;font-family:ui-monospace,monospace;margin-bottom:8px;">${esc(label)}</label>
    ${inner}
  </div>`
}

function calendarHtml() {
  // Mirror buildCalendar — base date is (2026, 5, 1) since offset = 0.
  const base = new Date(2026, 5, 1)
  const year = base.getFullYear()
  const month = base.getMonth()
  const monthLabel = MONTHS[month] + ' ' + year
  const daysIn = new Date(year, month + 1, 0).getDate()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7

  const ev = {}
  const push = (iso, color) => { (ev[iso] ??= []).push(color) }
  for (const p of PLANTS) {
    const d = derive(p)
    for (const h of p.history) {
      const dt = parse(h)
      if (dt.getFullYear() === year && dt.getMonth() === month) push(h, COLORS.wateredDot)
    }
    const nd = parse(d.nextDue)
    if (nd.getFullYear() === year && nd.getMonth() === month) push(d.nextDue, d.statusColor)
  }

  const cells = []
  for (let i = 0; i < lead; i++) cells.push({ day: '', bg: 'transparent', border: 'none', numColor: 'transparent', dots: [] })
  for (let dn = 1; dn <= daysIn; dn++) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(dn).padStart(2,'0')}`
    const isToday = iso === TODAY
    const dots = (ev[iso] ?? []).slice(0, 4)
    cells.push({
      day: dn,
      bg: isToday ? '#1e3d2f' : (dots.length ? '#f1efe5' : '#fbfaf5'),
      border: isToday ? 'none' : '1px solid #ece9dd',
      numColor: isToday ? '#eef0e4' : '#1b211c',
      dots,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ day: '', bg: 'transparent', border: 'none', numColor: 'transparent', dots: [] })

  const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const cellsHtml = cells.map((c) => `
    <div class="cal-cell" style="aspect-ratio:1;border-radius:12px;background:${c.bg};border:${c.border};padding:7px 8px;display:flex;flex-direction:column;justify-content:space-between;min-height:0;">
      <span style="font-size:12px;font-weight:600;color:${c.numColor};">${c.day === '' ? '' : c.day}</span>
      <div style="display:flex;gap:3px;flex-wrap:wrap;">${c.dots.map((d)=>`<span style="width:7px;height:7px;border-radius:50%;background:${d};"></span>`).join('')}</div>
    </div>`).join('')

  const comingUp = PLANTS.map(derive).filter((d) => d.nextIn <= 21).sort((a,b)=>a.nextIn-b.nextIn)
  const comingHtml = comingUp.map((u) => {
    const rel = u.nextIn < 0 ? Math.abs(u.nextIn)+'d late' : u.nextIn === 0 ? 'today' : 'in '+u.nextIn+'d'
    return `<a href="plant-detail.html" class="hov-roster" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:13px;background:#fbfaf5;border:1px solid #e6e3d7;border-radius:16px;padding:11px 14px;transition:transform .3s,box-shadow .3s;">
      <div style="flex:none;width:46px;height:46px;border-radius:12px;background:#eef0e4;display:flex;align-items:center;justify-content:center;overflow:hidden;">${spriteDiv(u.arch, u.greens, u.size, 38)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Newsreader',serif;font-size:17px;line-height:1.05;">${esc(u.name)}</div>
        <div style="font-size:11.5px;color:#9aa093;margin-top:2px;">${esc(u.nextDueFmt)}</div>
      </div>
      <div style="flex:none;text-align:right;">
        <div style="font-size:12.5px;font-weight:700;color:${u.statusColor};">${esc(rel)}</div>
      </div>
    </a>`
  }).join('')

  const body = `
    <div class="fade-up">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:24px 0 26px;">
        <div>
          <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9aa093;margin-bottom:10px;">Watering schedule</div>
          <div class="cal-month" style="font-family:'Newsreader',serif;font-size:48px;line-height:1;letter-spacing:-.02em;">${esc(monthLabel)}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="hov-cal-nav" style="border:1px solid #e6e3d7;background:#fbfaf5;width:44px;height:44px;border-radius:50%;font-size:18px;color:#1b211c;transition:all .25s;">‹</button>
          <button class="hov-cal-nav" style="border:1px solid #e6e3d7;background:#fbfaf5;width:44px;height:44px;border-radius:50%;font-size:18px;color:#1b211c;transition:all .25s;">›</button>
        </div>
      </div>

      <div class="cal-wrap" style="display:grid;grid-template-columns:1.55fr .9fr;gap:22px;align-items:start;">
        <div style="background:#fbfaf5;border:1px solid #e6e3d7;border-radius:22px;padding:22px;">
          <div class="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:10px;">
            ${WEEKDAYS.map((w)=>`<div style="text-align:center;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9aa093;">${w}</div>`).join('')}
          </div>
          <div class="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">${cellsHtml}</div>
          <div class="cal-legend" style="display:flex;gap:20px;margin-top:18px;padding-top:16px;border-top:1px solid #ece9dd;">
            ${legend('#9bb98a','Watered')} ${legend('#b8862f','Due soon')} ${legend('#b5613a','Overdue')}
          </div>
        </div>

        <div>
          <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#9aa093;margin-bottom:14px;">Coming up</div>
          <div style="display:flex;flex-direction:column;gap:10px;">${comingHtml}</div>
        </div>
      </div>
    </div>`
  return pageShell({ title: 'Calendar', screenLabel: 'calendar', body })
}

function legend(color, label) {
  return `<div style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:#6b736a;"><span style="width:9px;height:9px;border-radius:50%;background:${color};"></span>${esc(label)}</div>`
}

function indexHtml() {
  const card = (href, title, sub) => `
    <a href="${href}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:12px;background:#fbfaf5;border:1px solid #e6e3d7;border-radius:20px;padding:22px;transition:transform .25s, box-shadow .25s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='-6px 14px 30px rgba(30,61,47,.08)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
      <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9aa093;">${esc(href)}</div>
      <div style="font-family:'Newsreader',serif;font-size:26px;line-height:1.05;letter-spacing:-.01em;">${esc(title)}</div>
      <div style="font-size:13.5px;color:#6b736a;line-height:1.5;">${esc(sub)}</div>
    </a>`

  const body = `
    <div class="fade-up">
      <div style="margin:24px 0 26px;">
        <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9aa093;margin-bottom:10px;">UI export · static HTML mockups</div>
        <div style="font-family:'Newsreader',serif;font-size:48px;line-height:1;letter-spacing:-.02em;">Sill — screens</div>
        <div style="margin-top:14px;font-size:15px;color:#6b736a;max-width:640px;line-height:1.55;">Self-contained HTML for each screen. No React, no data layer — pixel sprites are inline SVG, plant data is mocked, dates are pinned to ${esc(TODAY)}.</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
        ${card('dashboard.html', 'Dashboard', 'All plants list, filter chips, status meters, big numbers per plant.')}
        ${card('plant-detail.html', 'Plant detail', 'Hero card with sprite, stat tiles, watering meter, fact callout, history timeline.')}
        ${card('plant-form-new.html', 'Add plant form', 'Empty form for adding a new plant — species picker, range slider, date input.')}
        ${card('plant-form-edit.html', 'Edit plant form', 'Same form, prefilled with the Monstera record.')}
        ${card('calendar.html', 'Calendar', 'Month grid with watered + due dots, "coming up" sidebar.')}
      </div>
    </div>`
  return pageShell({ title: 'UI export', screenLabel: 'plants', body })
}

// ── write everything ─────────────────────────────────────────────────────────
await mkdir(OUT, { recursive: true })
const files = [
  ['index.html',            indexHtml()],
  ['dashboard.html',        dashboardHtml()],
  ['plant-detail.html',     plantDetailHtml()],
  ['plant-form-new.html',   plantFormHtml({ mode: 'new' })],
  ['plant-form-edit.html',  plantFormHtml({ mode: 'edit' })],
  ['calendar.html',         calendarHtml()],
]
for (const [name, html] of files) {
  await writeFile(resolve(OUT, name), html, 'utf8')
  console.log('wrote ui-export/' + name + '  (' + html.length.toLocaleString() + ' bytes)')
}
console.log('\nDone. Open ui-export/index.html in a browser.')
