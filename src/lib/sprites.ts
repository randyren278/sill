import type { ArchKey, GreensKey } from '../data/types'
import { greenSets } from './palette'

// Pixel-art row maps. 18 rows × 18 cols; each char maps to a palette key:
//   D=darkest, G=mid, L=light, H=highlight, S=stem, T/r=pot front, t=pot side, o=pot rim
export const sprites: Record<ArchKey, string[]> = {
  broad: ['                  ', '        DD        ', '      DGLLD       ', '  DD DGLLLGD DD   ', ' DGLD GLLLLG DLGD ', ' DLLLGGLLHLLGGLLD ', ' DLLLLLLLLLLLLLLD ', '  DLLHLLLLLLHLLD  ', '  DDLLLLLLLLLLDD  ', '    DDGLLLLGDD    ', '       DGGD       ', '        SS        ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  cane:  ['                  ', '    D        D    ', '   DLD      DLD   ', '   DLLD    DLLD   ', '    DLLD  DLLD    ', '   D DLLDDLLD D   ', '  DLD DLLLLD DLD  ', '  DLLD DLLLD DLD  ', '   DLLD DLD DLD   ', '    DLLD S DLLD   ', '     DLD S DLD    ', '      D SS D      ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  trail: ['                  ', '       DGGD       ', '      DLHHLD      ', '  DGD DLLLD DGD   ', ' DLHLD DGGD DLHLD ', ' DLLLD  SS  DLLLD ', '  DGD   SS   DGD  ', ' DGD    SS    DGD ', 'DLHLD  rTTr  DLHLD', 'DLLLD  TTTT  DLLLD', ' DGD   TTTT   DGD ', '       tTTt       ', '  DGD  tttt  DGD  ', ' DLHLD      DLHLD ', ' DLLLD      DLLLD ', '  DGD        DGD  ', '                  ', '                  '],
  succ:  ['                  ', '   DGD      DGD   ', '  DLHGD    DGHLD  ', '  DLLGD    DGLLD  ', '   DGDD    DDGD   ', '    D  DGGD  D    ', '      DLHHLD      ', '      DLLLLD      ', '      DDGGDD      ', '        SS        ', '       DSSD       ', '        SS        ', '      rrTTrr      ', '      TTTTTT      ', '      TTTTTT      ', '      tTTTTt      ', '      ttTTtt      ', '       tooo       '],
  fan:   ['                  ', '  D    DD    D    ', '  LD  DLLD  DL    ', '  LLD DLLD DLL    ', '  LLLDDLLDDLLL    ', '  LLLLGLLGLLLL    ', '   LLLGLLGLLL     ', '    LLGLLGLL      ', '     LGLLGL       ', '      GLLG        ', '       SS         ', '       SS         ', '       SS         ', '     rrTTrr       ', '     TTTTTT       ', '     tTTTTt       ', '     ttTTtt       ', '      tooo        '],
}

const svgCache: Record<string, string> = {}
const iconCache: Record<string, string> = {}

function buildPalette(greens: GreensKey) {
  const g = greenSets[greens] ?? greenSets.forest
  return { D: g.D, G: g.G, L: g.L, H: g.H, S: '#7a5c3a', T: '#c8895b', t: '#ad6e44', r: '#dba87a', o: '#5b4636' } as Record<string, string>
}

/** CSS background-image url() for a sprite (SVG data URL). */
export function bg(arch: ArchKey, greens: GreensKey): string {
  const key = arch + '|' + greens
  if (svgCache[key]) return svgCache[key]
  const pal = buildPalette(greens)
  const map = sprites[arch] ?? sprites.broad
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
export function icon(arch: ArchKey, greens: GreensKey): string {
  const key = arch + '|' + greens
  if (iconCache[key]) return iconCache[key]
  const pal = buildPalette(greens)
  const map = sprites[arch] ?? sprites.broad
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
