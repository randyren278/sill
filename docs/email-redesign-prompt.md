# Prompt — Redesign the Sill daily reminder email

Paste this entire file into Claude Design, Figma AI, v0, or any HTML-capable design tool. It is self-contained — the tool does not need any other Sill files to produce a working template.

---

## Goal

Design a daily watering reminder email for **Sill**, a single-tenant plant-care web app. The email is sent once per day at 9 am Eastern via Resend, from `Sill <reminders@pleasepleasepleasewater.me>`. It lists every plant the user owns, grouped by status — so even on days where nothing needs water, the user gets a calm full-roster digest confirming reminders are alive.

**Output:** a single HTML file (one `<html>…</html>` block) with **inline styles only** and `<table role="presentation">`-based layout. No `<style>` blocks, no external CSS, no JavaScript, no web fonts loaded via `<link>`. The HTML will be slotted directly into a Deno `renderHtml(classified, counts)` function — leave `{{handlebars}}` placeholders for every dynamic value (see §6 below).

The current email already works ([see the live function](../supabase/functions/send-watering-reminder/index.ts)) — your job is to make it **more beautiful, more on-brand, and easier to scan**, while keeping the same structure and constraints.

---

## Brand summary

Sill is a warm, observational, pixel-art plant-tracker. Cream paper backgrounds, dark forest-green hero accents, soft rust + gold + green status hues. Three font families: **Newsreader** (serif, titles), **Hanken Grotesk** (sans, body + buttons), **monospaced** (eyebrow labels). Rounded everywhere — pills for controls, 18 px corners for cards, 26 px for hero panels. Voice: matter-of-fact and warm. Plants are pets, not crops.

---

## Visual constraints (must use these exact values)

### Colors

| Role | Hex |
|---|---|
| Page background | `#f3f1e9` |
| Card surface | `#fbfaf5` |
| Card border | `#e6e3d7` |
| Body text | `#1b211c` |
| Secondary text | `#6b736a` |
| Faint text | `#9aa093` |
| Brand dark green | `#1e3d2f` |
| Brand foreground (text on brand) | `#eef0e4` |
| **Status — Needs water** (overdue + due today) — section color | `#b5613a` |
| **Status — Needs water** — row dot | `#d98a5b` |
| **Status — Due soon** (1–2 days out) — section color | `#b8862f` |
| **Status — Due soon** — row dot | `#d8ab4a` |
| **Status — Happy** (3+ days out) — section color | `#3f6b4a` |
| **Status — Happy** — row dot | `#7fae6a` |

### Typography (with email-safe fallbacks)

- **Serif** for titles: `'Newsreader', Georgia, serif`
- **Sans** for body/buttons: `-apple-system, 'Hanken Grotesk', BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Mono** for eyebrows: `ui-monospace, 'SF Mono', Menlo, monospace`

Type sizes to use:
- "Sill" wordmark: serif 30, letter-spacing `-0.01em`, line-height 1
- Section eyebrow: mono 10, uppercase, letter-spacing `0.18em`, colored to the section's status color
- Plant name: sans 15, weight 600
- Plant meta (location, due date): sans 12, color `#6b736a`
- Footer micro-text: sans 11, color `#9aa093`
- Button label: sans 14, weight 600

### Radius + spacing

- Card body: 18 px corners, 32 px padding
- Pill button: 999 px corners, 11 × 22 px padding
- Brand icon tile: 14 px corners
- Row gap (between plants): 12 px vertical padding, 1 px bottom border `#e6e3d7`
- Section gap (between status groups): 18 px above the eyebrow

### Image

Exactly **one** hosted image is allowed:

```html
<img src="https://pleasepleasepleasewater.me/favicon-180.png"
     width="64" height="64" alt="Sill"
     style="display:block;border-radius:14px;background:#fbfaf5;border:1px solid #1e3d2f;image-rendering:pixelated;">
```

It's a 256 × 256 pixel-art plant (broad-leaf, forest palette) served from the live site. **Do not** use other images, do not use SVG, do not use `background-image` on `<div>` — Gmail strips it.

---

## Email-specific constraints

- **Max width 560 px**, centered. Mobile-readable down to ~320 px (your `<table>` will collapse fine; do not use media queries).
- **Inline styles only.** Gmail strips `<style>` blocks.
- **Tables for layout** (`<table role="presentation">`), not flexbox. Outlook hates flex.
- **Dark-mode aware.** Apple Mail flips backgrounds in dark mode automatically; do not rely on pure white. The cream `#fbfaf5` on a `#f3f1e9` page already reads fine in both modes.
- **No web fonts via `<link>`.** Newsreader is requested in `font-family` and will fall back to Georgia on receivers that don't have it (acceptable — Georgia is similar enough).
- **Buttons must be `<a>` tags styled as buttons**, not `<button>`. Outlook ignores `<button>` styling.
- **Don't include preview text** as a `<style>` hack — let the first body line ("3 need water · 1 due soon · 5 happy") serve as the preview.

---

## Content slots (every email contains these)

### Header

1. The 64 × 64 brand icon (above), centered or top-aligned.
2. "Sill" wordmark in Newsreader 30.
3. Summary line in sans 13, `#6b736a`: e.g. `{{summary}}` → `"3 need water · 1 due soon · 5 happy"` — built from the three counts, joining only non-zero parts with ` · `.

### Status groups (any of the three, each shown only if its count > 0)

Each group has:
- An eyebrow label in mono 10, uppercase, `0.18em` letter-spacing, in the section's status color: `{{group.label}} · {{group.count}}` → e.g. `NEEDS WATER · 3`
- A list of rows. Each row has:
  - An 8 × 8 colored dot (`{{group.dot}}` color, `border-radius:50%`)
  - The plant name as a link to `https://pleasepleasepleasewater.me/plants/{{plant.id}}` — sans 15 / weight 600 / color `#1b211c`, no underline
  - One line of meta below it in sans 12 / `#6b736a`:
    - Overdue: `{{plant.loc}} · 4d overdue (due Jun 21)`
    - Due today: `{{plant.loc}} · due today`
    - Due soon: `{{plant.loc}} · in 2d (Jun 25)`
    - Happy: `{{plant.loc}} · next Jun 30`

### Footer

1. A pill button "Open Sill" linking to `https://pleasepleasepleasewater.me`, on brand-green background (`#1e3d2f` / `#eef0e4`).
2. Tiny line below: `Manage reminders → https://pleasepleasepleasewater.me/settings` in sans 11 / `#9aa093`.

---

## Template placeholders

Use exactly these placeholders so the Deno renderer can string-replace:

- `{{summary}}` — preformatted "3 need water · 1 due soon · 5 happy" string
- `{{#groups}}…{{/groups}}` — loop over groups, each carrying `label`, `count`, `color`, `dot`, and `plants`
- `{{#plants}}…{{/plants}}` — loop within a group; each plant has `id`, `name`, `loc`, `meta` (the pre-built meta line shown above), `link`
- `{{appUrl}}` — `https://pleasepleasepleasewater.me`

If your tool can't emit handlebars, use `__SUMMARY__`, `__GROUP_LABEL__`, etc. — anything I can find-and-replace.

---

## Example payload the rendered HTML should accept

```json
{
  "summary": "3 need water · 1 due soon · 5 happy",
  "appUrl": "https://pleasepleasepleasewater.me",
  "groups": [
    {
      "label": "Needs water",
      "count": 3,
      "color": "#b5613a",
      "dot": "#d98a5b",
      "plants": [
        { "id": "p1", "name": "Bedroom Monstera", "loc": "bedroom", "meta": "bedroom · 4d overdue (due Jun 19)", "link": "https://pleasepleasepleasewater.me/plants/p1" },
        { "id": "p2", "name": "Mossy Monstera", "loc": "bedroom", "meta": "bedroom · 1d overdue (due Jun 22)", "link": "https://pleasepleasepleasewater.me/plants/p2" },
        { "id": "p3", "name": "Pothos", "loc": "living room", "meta": "living room · due today", "link": "https://pleasepleasepleasewater.me/plants/p3" }
      ]
    },
    {
      "label": "Due soon",
      "count": 1,
      "color": "#b8862f",
      "dot": "#d8ab4a",
      "plants": [
        { "id": "p4", "name": "Big Bird", "loc": "front door", "meta": "front door · in 2d (Jun 25)", "link": "https://pleasepleasepleasewater.me/plants/p4" }
      ]
    },
    {
      "label": "Happy",
      "count": 5,
      "color": "#3f6b4a",
      "dot": "#7fae6a",
      "plants": [
        { "id": "p5", "name": "Jade Plant", "loc": "front door", "meta": "front door · next Jul 8", "link": "https://pleasepleasepleasewater.me/plants/p5" }
      ]
    }
  ]
}
```

---

## What "better than the current version" looks like

The current email (single inline-style table, dot + name + meta per row, three sections, brand icon at top) already works — improvements should focus on:

1. **Hierarchy.** Make the most-actionable group (`Needs water`) visually heavier than `Happy` — e.g. a left-edge accent stripe in the section color, or a subtle tinted-background card for that group only.
2. **Scannability at a glance.** A user opening this on a phone should see "3 need water" within the first viewport without scrolling.
3. **Polished spacing.** The current version uses generic 12 px row padding; consider a 14 px / 4 px split that gives the colored dot more breathing room.
4. **Optional date stamp.** A tasteful "Tuesday, June 23" line under the summary, in mono 10 uppercase `#9aa093`, would situate the digest in time.
5. **Optional subtle illustration.** A single decorative element (e.g. a thin horizontal pixel-art accent line, made from inline SVG kept under 1 KB and embedded via `data:image/svg+xml;base64,...` only if needed) — but keep total email weight under 60 KB.

What **not** to change:
- The hosted image URL (`/favicon-180.png`, framed in markup with a cream tile + 1px `#1e3d2f` outline, not baked).
- The brand color hexes — no introducing new tones.
- The three status thresholds and their labels (`Needs water`, `Due soon`, `Happy`).
- The placeholder names.

---

## Deliverable

Return a single HTML document. Show it inline in your response (no zip files). I will paste it into `renderHtml()` in `supabase/functions/send-watering-reminder/index.ts`, replacing the current `return (…)` string concatenation. Validate that it renders correctly in Gmail web, Apple Mail iOS, and Outlook web (the three I care about).
