import type { ArchKey, GreensKey, SizeKey } from '../data/types'
import { greenSets } from './palette'

// Pixel-art row maps. 18 rows × 18 cols; each char maps to a palette key:
//   D=darkest, G=mid, L=light, H=highlight, S=stem, T/r=pot front, t=pot side, o=pot rim,
//   M=moss pole (brown), W=water (jar), w=water highlight, R=root (white)
//
// Keyed by `${arch}-${size}`. Lookup falls back from the exact key to `${arch}-md`,
// then to `broad-md` as a final safety net.
export const sprites: Record<string, string[]> = {
  // ── medium (default) sprites — these are the canonical 5 from the original artifact ──
  'broad-md': ['                  ', '        DD        ', '      DGLLD       ', '  DD DGLLLGD DD   ', ' DGLD GLLLLG DLGD ', ' DLLLGGLLHLLGGLLD ', ' DLLLLLLLLLLLLLLD ', '  DLLHLLLLLLHLLD  ', '  DDLLLLLLLLLLDD  ', '    DDGLLLLGDD    ', '       DGGD       ', '        SS        ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  'cane-md':  ['                  ', '    D        D    ', '   DLD      DLD   ', '   DLLD    DLLD   ', '    DLLD  DLLD    ', '   D DLLDDLLD D   ', '  DLD DLLLLD DLD  ', '  DLLD DLLLD DLD  ', '   DLLD DLD DLD   ', '    DLLD S DLLD   ', '     DLD S DLD    ', '      D SS D      ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  'trail-md': ['                  ', '       DGGD       ', '      DLHHLD      ', '  DGD DLLLD DGD   ', ' DLHLD DGGD DLHLD ', ' DLLLD  SS  DLLLD ', '  DGD   SS   DGD  ', ' DGD    SS    DGD ', 'DLHLD  rTTr  DLHLD', 'DLLLD  TTTT  DLLLD', ' DGD   TTTT   DGD ', '       tTTt       ', '  DGD  tttt  DGD  ', ' DLHLD      DLHLD ', ' DLLLD      DLLLD ', '  DGD        DGD  ', '                  ', '                  '],
  'succ-md':  ['                  ', '   DGD      DGD   ', '  DLHGD    DGHLD  ', '  DLLGD    DGLLD  ', '   DGDD    DDGD   ', '    D  DGGD  D    ', '      DLHHLD      ', '      DLLLLD      ', '      DDGGDD      ', '        SS        ', '       DSSD       ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  'fan-md':   ['                  ', '   D    DD    D   ', '   LD  DLLD  DL   ', '   LLD DLLD DLL   ', '   LLLDDLLDDLLL   ', '   LLLLGLLGLLLL   ', '    LLLGLLGLLL    ', '     LLGLLGLL     ', '      LGLLGL      ', '       GLLG       ', '        SS        ', '        SS        ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],

  // ── size-variants designed and adjudicated by the sprite-design-panel workflow ──
  'broad-xl': ['        DMMD      ', '       DGMMGD     ', '     DDLMMLDD     ', '   DDGLLMMLLGDD   ', '  DGLLHLMMLHLLGD  ', '  DLLLLLMMLLLLLD  ', '   DDLLGMMGLLDD   ', '    DGLLMMLLGD    ', '  DDLLLGMMGLLLDD  ', '  DLLHLLMMLLHLLD  ', '   DDLLLMMLLLDD   ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  'broad-sm': ['                  ', '                  ', '                  ', '        DD        ', '       DLLD       ', '     DDGLLGDD     ', '    DGLLLLLLGD    ', '    DLLLHLLLLD    ', '     DDGLLGDD     ', '        SS        ', '        SS        ', '       rTTr       ', '       TTTT       ', '       tTTt       ', '       ttTt       ', '        too       ', '                  ', '                  '],
  'broad-xs': ['                  ', '                  ', '     DD     DD    ', '    DGLD   DGLD   ', '    DLHD   DLHD   ', '     DSD   DSD    ', '      SS   SS     ', '       SS SS      ', '        SSS       ', '     DDDDDDDD     ', '     DWWwWWWD     ', '     DWWRWWWD     ', '     DWRWWWRD     ', '     DWWWRWWD     ', '     DRWWWWRD     ', '     DWWWWWWD     ', '     DDDDDDDD     ', '                  '],
  'cane-xl':  ['    D        D    ', '   DLD      DLD   ', '   DLLD    DLLD   ', '    DLD    DLD    ', '    DSD    DSD    ', '   D S      S D   ', '  DLD S    S DLD  ', '  DLLD S  S DLLD  ', '   DLD S  S DLD   ', '    D  S  S  D    ', '       S  S       ', '       S  S       ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  'fan-xl':   ['D   D   DD   D   D', 'LD  LD  LL  DL  DL', ' LD  LD LL DL  DL ', '  LD  LDLLDL  DL  ', '   LD  LDDL  DL   ', '    LD LDDL DL    ', '     LDDLLDDL     ', '      LDLLDL      ', '        GG        ', '        GG        ', '        DD        ', '        SS        ', '        SS        ', '     rrTTrr       ', '     TTTTTT       ', '     tTTTTt       ', '     ttTTtt       ', '      tooo        '],
}

// Aliases — keep the old direct-by-arch keys working in case anything outside this module reads them.
sprites.broad = sprites['broad-md']
sprites.cane = sprites['cane-md']
sprites.trail = sprites['trail-md']
sprites.succ = sprites['succ-md']
sprites.fan = sprites['fan-md']

function lookup(arch: ArchKey, size: SizeKey): string[] {
  return sprites[arch + '-' + size] ?? sprites[arch + '-md'] ?? sprites['broad-md']
}

const svgCache: Record<string, string> = {}
const iconCache: Record<string, string> = {}

function buildPalette(greens: GreensKey) {
  const g = greenSets[greens] ?? greenSets.forest
  return {
    D: g.D, G: g.G, L: g.L, H: g.H,
    S: '#7a5c3a',
    T: '#c8895b', t: '#ad6e44', r: '#dba87a', o: '#5b4636',
    M: '#6b4a2a',                  // moss-pole stake (brown)
    W: '#b8d7e0', w: '#d8ecf2',    // water + highlight (glass jar)
    R: '#f6f1da',                  // exposed root (cream)
  } as Record<string, string>
}

/** CSS background-image url() for a sprite (SVG data URL). */
export function bg(arch: ArchKey, greens: GreensKey, size: SizeKey = 'md'): string {
  const key = arch + '|' + size + '|' + greens
  if (svgCache[key]) return svgCache[key]
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
      rects += "<rect x='" + x + "' y='" + y + "' width='" + w + "' height='1' fill='" + pal[ch] + "'/>"
      x += w
    }
  }
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + cols + ' ' + rows + "' shape-rendering='crispEdges'>" + rects + '</svg>'
  const url = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
  svgCache[key] = url
  return url
}

/** Pixel-perfect canvas data URL (for <img> tags). */
export function icon(arch: ArchKey, greens: GreensKey, size: SizeKey = 'md'): string {
  const key = arch + '|' + size + '|' + greens
  if (iconCache[key]) return iconCache[key]
  const pal = buildPalette(greens)
  const map = lookup(arch, size)
  const cols = map[0].length
  const rows = map.length
  const c = document.createElement('canvas')
  c.width = cols
  c.height = rows
  const ctx = c.getContext('2d')!
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = map[y][x]
      if (ch === ' ' || !pal[ch]) continue
      ctx.fillStyle = pal[ch]
      ctx.fillRect(x, y, 1, 1)
    }
  }
  const url = c.toDataURL()
  iconCache[key] = url
  return url
}
