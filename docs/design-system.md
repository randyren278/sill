# Sill — design system reference

Single source of truth for the visual language of [Sill](https://pleasepleasepleasewater.me) — a single-tenant plant-care web app. Every value here mirrors a token in [`src/lib/tokens.ts`](../src/lib/tokens.ts) or [`src/lib/palette.ts`](../src/lib/palette.ts). Paste sections into design tools (Claude Design, Figma AI, v0) to seed brand-consistent output.

---

## 1. Identity

Sill is a warm, observational, pixel-art plant-tracker. Cream paper backgrounds, dark forest-green hero accents, soft rust + gold + green status hues, hand-set pixel-art mascots. Three families: **Newsreader** (serif, titles + numerals), **Hanken Grotesk** (sans, body + buttons), **monospaced** (eyebrow labels + inline metadata). Rounded everywhere — pills for controls, 18–26 px corners for cards.

Voice: calm and matter-of-fact. "Looking healthy", "Water today", "1 plant due soon" — never "🚨 WATER NOW!". Plants are pets, not crops.

---

## 2. Color tokens

### Neutrals

| Role | Hex | Use |
|---|---|---|
| `canvas` | `#f3f1e9` | Page background; also the alpha-0 stop in the header gradient |
| `surface.DEFAULT` | `#fbfaf5` | Standard card / tile / input field (≈12 sites) |
| `surface.muted` | `#f1efe5` | Select hover row, dotted calendar cell |
| `surface.lo` | `#eef0e4` | Low-emphasis green-tinted card (sprite wells, "Did you know?") |
| `ink.primary` | `#1b211c` | Body text |
| `ink.muted` | `#6b736a` | Body-secondary, back buttons, inactive tabs |
| `ink.faint` | `#9aa093` | Eyebrow + meta caption |
| `border.DEFAULT` | `#e6e3d7` | Card / tile / input border |
| `border.onSurfaceLo` | `#e0e4d2` | Border paired with `surface.lo` tiles |
| `border.strong` | `#d8d3c2` | Scrollbar thumb, row-hover border |

### Brand (dark green)

| Role | Hex | Use |
|---|---|---|
| `brand.DEFAULT` | `#1e3d2f` | Hero, primary CTAs, active nav tab, active filter chip |
| `brand.raised` | `#274a39` | Hero sprite wall |
| `brand.raisedHi` | `#2f5743` | Hero sprite circle |
| `onBrand.fg` | `#eef0e4` | Text/icon on brand |
| `onBrand.mute` | `#9bb98a` | Secondary text on brand |
| `onBrand.eyebrow` | `#b6cf90` | Eyebrow on brand |
| `onBrand.border` | `rgba(238,240,228,.35)` | Border on brand |
| `onBrand.hoverBg` | `rgba(238,240,228,.1)` | Hover bg on brand |

### Status (used in `derive.ts`, calendar legend, plant rows, email digest)

| Role | Hex | Hue | Meaning |
|---|---|---|---|
| `status.overdue` | `#b5613a` | Rust | `nextIn < 0` or `nextIn === 0` |
| `status.overdueDot` | `#d98a5b` | Light rust | Calendar dot, email row dot |
| `status.dueSoon` | `#b8862f` | Gold | `1 ≤ nextIn ≤ 2` |
| `status.dueSoonDot` | `#d8ab4a` | Light gold | Calendar dot, email row dot |
| `status.happy` | `#3f6b4a` | Forest green | `nextIn ≥ 3` |
| `status.happyDot` | `#7fae6a` | Light green | Calendar dot, email row dot |
| `wateredDot` | `#9bb98a` | Pale green | History dot |

### Sprite green palettes (per-plant, one of 4)

| Palette | Darkest (D) | Mid (G) | Light (L) | Highlight (H) |
|---|---|---|---|---|
| `forest` | `#1c3a2c` | `#3f6b4a` | `#76995f` | `#b6cf90` |
| `deep`   | `#173024` | `#345a3f` | `#5f8a53` | `#9cc080` |
| `bright` | `#26452f` | `#4a7a4f` | `#86a85f` | `#c3d893` |
| `jade`   | `#2a4636` | `#4c7158` | `#83a06f` | `#bcd29a` |

### Focus

Solid `#3f6b4a` border + `0 0 0 3px rgba(63,107,74,.14)` ring on any `:focus-visible` control.

---

## 3. Type scale

Three families:

- **serif** — `'Newsreader', serif` — titles, numerals, fact prose
- **sans**  — `'Hanken Grotesk', sans-serif` — body, buttons, captions
- **mono**  — `ui-monospace, 'SF Mono', Menlo, monospace` — eyebrows + inline metadata

| Role | Family | Size (desktop / mobile) | Line height | Letter-spacing | Use |
|---|---|---|---|---|---|
| `heroNumeral` | serif | 74 / 56 | 0.8 | — | PlantDetail hero countdown |
| `screenTitle` | serif | 48 / 36 | 1 | -0.02em | Page H1 |
| `statDisplay` | serif | 46 / 36 | 0.85 | — | Plant-row big numeral, dashboard thirsty count |
| `sectionTitle` | serif | 23 / 19 | 1.02 | — | Plant-row name, "Sill" wordmark |
| `prose` | serif | 19 | 1.42 | — | "Did you know?" fact card |
| `scientific` | serif italic | 16 | 1.2 | — | Latin species name |
| `body` | sans | 15 | 1.4 | — | Inputs, history row |
| `meta` | sans | 12 | 1.35 | — | Last-watered helper, calendar day numeral |
| `captionNumeral` | sans | 12 | 1.2 | — | Caption next to a big numeral |
| `eyebrow` | mono | 10 | 1.2 | 0.14em uppercase | Section labels |
| `monoMeta` | mono | 11 | 1.2 | 0.02em | Plant-row location, history timestamp |
| `actionLabel` | sans 600 | 14 | 1 | — | Pill button label |
| `iconGlyph` | sans | 16 | 1 | — | `＋` / chevrons inside buttons |

Weights used: 400 (regular) and 600 (semibold). Nothing heavier.

---

## 4. Spacing + radius

### Spacing scale

`hairline 2`, `xs 4`, `tight 6`, `sm 8`, `md 12`, `lg 16`, `xl 22`, `2xl 28`, `3xl 40`.

Named vertical rhythms:
- `kickerToTitle` 10 · `labelToControl` 8 · `cardHeaderToBody` 10 · `sectionHeaderToBody` 22 · `pageMargin` 28.

Named horizontal rhythms:
- `iconToLabel` 8 · `fieldPair` 14 · `tileGrid` 12 · `listRow` 22 · `actionsRow` 10.

Page inset:
- Desktop: 28 px horizontal, 80 px bottom · Mobile: 16 px horizontal, 64 px bottom.

### Radius ramp

| Role | Px | Use |
|---|---|---|
| `scrollbar` | 6 | Scrollbar thumb |
| `popoverRow` | 9 | DatePicker / Select listbox rows |
| `well` | 12 | Sprite wells, calendar cells |
| `input` | 13 | Inputs, DatePicker trigger, Select trigger |
| `cardSm` | 16 | Row sprite well frame, DatePicker popover, **email header icon tile** |
| `card` | 18 | Standard card, plant row, meter card, **email body card** |
| `cardLg` | 22 | PlantForm sprite preview, calendar wrapper |
| `hero` | 26 | PlantDetail hero |
| `pill` | 999 | Every button, MeterBar track |
| `circle` | 50% | History dots, hero sprite frame |

---

## 5. Sprite system

Pixel art is generated at runtime by [`src/lib/sprites.ts`](../src/lib/sprites.ts) as inline SVG data URLs. Three axes:

- **arch** (archetype) — `broad | cane | trail | succ | fan` (5 silhouettes)
- **greens** (palette) — `forest | deep | bright | jade` (4 palettes, see §2)
- **size** — `xs | sm | md | lg | xl` (5 sizes; md is default)

That's 100 possible combinations. Each archetype is an 18×18 grid (md) of color codes; characters map to palette keys (`D` darkest → `H` highlight, plus `S` stem, `T`/`r` pot, `o` rim, `M` moss pole, `W` water, `R` root). Larger sizes use hand-tuned bigger grids; smaller sizes have variants.

The brand icon (favicon, OG image, email header) is **arch=broad, greens=forest, size=md** — pixel-art forest plant in a clay pot. The single canonical 180×180 transparent-background export lives at [`public/favicon-180.png`](../public/favicon-180.png) and is used everywhere; every site frames it in markup with a cream `#fbfaf5` tile + 1px `#1e3d2f` border (do **not** bake a background into the PNG, and do **not** regenerate with smoothing — use nearest-neighbor / `image-rendering: pixelated` to preserve crispness).

---

## 6. Component patterns

### 6.1 Hero card

Dark-green panel. The only place `radius.hero (26)` is used.

```
background: #1e3d2f      // brand.DEFAULT
borderRadius: 26          // radius.hero
color: #eef0e4            // onBrand.fg
padding: 38 40            // top/bottom 38, left/right 40
min-height: 262

> eyebrow: mono 11 / .16em / uppercase / color #b6cf90
> title: Newsreader serif 44 / line-height 1 / letter-spacing -.01em
> sprite well: 300px right column, bg #274a39, with a 188×188 circle of #2f5743
```

### 6.2 Surface card

The universal card.

```
background: #fbfaf5      // surface.DEFAULT
border: 1px solid #e6e3d7
border-radius: 18         // radius.card
padding: 24 to 28
```

Used by: Settings sections, NotesCard, history list, the daily reminder email body.

### 6.3 Eyebrow label

```
font: ui-monospace 10–11 / uppercase / letter-spacing .14em–.22em
color: #6b736a (on surface)
color: #b6cf90 (on brand)
margin-bottom: 8 to 10 (kickerToTitle / labelToControl)
```

### 6.4 Pill button (primary)

The most common control.

```
background: #1e3d2f       // brand.DEFAULT
color: #eef0e4            // onBrand.fg
border-radius: 999        // radius.pill
font: Hanken Grotesk 14 / weight 600 / line-height 1
padding: 12 22
height: 44
```

Ghost variant: transparent bg, `border: 1px solid #e6e3d7`, color `#6b736a`. Inverse variants swap colors for placement on a dark hero.

### 6.5 Status dots + rows

Each plant in the dashboard / email digest carries a colored dot:

```
width / height: 8 to 11
border-radius: 50%
background: status.<state>Dot
```

Paired with a name in `sectionTitle` (23) or `body` (15), plus a meta line in `monoMeta` (11) or `meta` (12) underneath.

---

## 7. Screen inventory

| Route | File | Purpose |
|---|---|---|
| `/` | `src/screens/Dashboard.tsx` | Roster of all plants with watering status; "Needs water" filter chip; big thirsty count; sticky "Water N due plants" bulk button |
| `/calendar` | `src/screens/Calendar.tsx` | Month grid of due dates with prev/next pager; sidebar lists upcoming plants grouped by relative date |
| `/plants/:id` | `src/screens/PlantDetail.tsx` | Hero card (sprite + status countdown), stat tiles (light + freq), meter bar, fun-fact card, watering history, notes |
| `/plants/new` and `/plants/:id/edit` | `src/screens/PlantForm.tsx` | Add/edit form: nickname, location, species picker (drives sprite arch/greens/size + default freq), light, size, water-every slider, last-watered date, notes |
| `/settings` | `src/screens/Settings.tsx` | Daily reminders (email + toggle + heartbeat status) + Backup (Export JSON / Import JSON) |

---

## 8. Voice + tone

- Warm, observational, never alarmist.
- Use lowercase "plants" / "needs water" in body copy; capitalize only proper labels and section eyebrows (which are uppercase anyway).
- Numerals get their own visual weight — show "3" big and "days to water" small underneath; don't bury the count in a sentence.
- Plant names are short and personal: "Bedroom Monstera", "Big Bird", "Mossy Monstera" — first-name energy.
- Never use emoji except 🌿 in the all-happy email subject. The sprites are the visual personality; emoji feel like a downgrade.
- Calls to action: "Water now", "Open Sill", "Add a plant" — verb + noun, no marketing-speak.
