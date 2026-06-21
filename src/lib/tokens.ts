/**
 * Design tokens for Sill.
 *
 * Synthesized from five lens audits (typography, buttons, form controls,
 * colors, spacing & radius). Every value here traces to an existing value in
 * the source — no invented numbers, no speculative roles. Role names are
 * semantic (purpose) rather than visual (hue / pixel value) so consumers can
 * be repointed without renaming.
 *
 * Exported groups:
 *   colors  — palette + semantic aliases (canvas / surface / ink / border /
 *             brand / onBrand / focus / status / headline / accent / elevation)
 *   type    — typography recipes by role; family is an implementation detail
 *   button  — button recipes by role (pill family + textLink + pager)
 *   radius  — corner-radius ramp
 *   space   — spacing scale + named layout stacks
 *   focus   — shared focus-ring values used by inputs and buttons
 */

/* ────────────────────────────────────────────────────────────────────────── */
/* Font families                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Vendor font stacks. Every typography recipe below references one of these
 * by key (`'serif' | 'sans' | 'mono'`) — never by hard-coded family string —
 * so swapping Newsreader/Hanken does not touch any call site.
 */
const families = {
  serif: "'Newsreader', serif",
  sans: "'Hanken Grotesk', sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/* Colors                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Color palette. Hex literals live only here; every other module references
 * these by name. Roles are named by contrast / purpose, not by hue — e.g.
 * `brand` (not `forest`), `border.strong` (not `border.hover`), `canvas`
 * (not `page.bg`). Same hex serving two roles is aliased twice on purpose
 * (e.g. `surface.lo` and `onBrand.fg` share `#eef0e4`) so the two can
 * decouple later without a rename.
 */
export const colors = {
  /** Page background; also the alpha-0 stop in the header gradient and the
   *  2px ring around the scrollbar thumb. From `index.css:6`. */
  canvas: '#f3f1e9',

  /** Raised neutrals. `DEFAULT` is the standard card/tile/input field
   *  (`#fbfaf5`, ~12 sites). `muted` is a slightly warmer step used for the
   *  Select hover row + dotted calendar cell. `lo` is the low-emphasis green-
   *  tinted card surface (sprite wells, "Did you know?" tile). */
  surface: {
    DEFAULT: '#fbfaf5',
    muted: '#f1efe5',
    lo: '#eef0e4',
  },

  /** Ink ramp by contrast. `primary` is body text. `muted` is body-secondary
   *  (back buttons, inactive tabs, captions adjacent to body). `faint` is
   *  the eyebrow / meta caption color; the slightly darker `#8a907f` used in
   *  3 Dashboard captions folds into `faint`. */
  ink: {
    primary: '#1b211c',
    muted: '#6b736a',
    faint: '#9aa093',
  },

  /** Warm neutral borders. `DEFAULT` covers 10+ card/tile/input sites; the
   *  near-duplicate `#e0ddce` (PlantForm input + Cancel) and `#ece9dd`
   *  (Calendar legend top border) fold into it. `onSurfaceLo` is the border
   *  paired with `surface.lo` tiles. `strong` is a higher-contrast neutral
   *  shared by the scrollbar thumb and the row-hover border. */
  border: {
    DEFAULT: '#e6e3d7',
    onSurfaceLo: '#e0e4d2',
    strong: '#d8d3c2',
  },

  /** Brand dark-green ramp used on the PlantDetail hero. `DEFAULT` is also
   *  the inverted-surface for every primary CTA (Save, Add plant, header
   *  active tabs, active filter chip). */
  brand: {
    DEFAULT: '#1e3d2f',
    raised: '#274a39',
    raisedHi: '#2f5743',
  },

  /** Foreground / accent values used when laying type or borders on `brand`.
   *  `fg` shares a hex with `surface.lo` but is a separate role. `mute`
   *  shares a hex with `status.ok` — the alias is intentional. `border` /
   *  `hoverBg` are alpha derivatives of `fg`. */
  onBrand: {
    fg: '#eef0e4',
    mute: '#9bb98a',
    eyebrow: '#b6cf90',
    border: 'rgba(238,240,228,.35)',
    hoverBg: 'rgba(238,240,228,.1)',
  },

  /** Status colors (Calendar legend + derive.ts statusColor). */
  status: {
    ok: '#9bb98a',
    dueSoon: '#b8862f',
    overdue: '#b5613a',
  },

  /** Decoupled alias for the Dashboard thirsty-count headline — same hex as
   *  `status.overdue` today but a separate semantic role. */
  headline: {
    alert: '#b5613a',
  },

  /** Green-tinted faint used as an eyebrow on `surface.lo` ("Did you know?").
   *  Distinct from `ink.faint` because the hue family differs. */
  accent: {
    eyebrowOnSurfaceLo: '#7c9b6b',
  },

  /** Brand-tinted shadow steps. `1` is the smaller roster-hover shadow,
   *  `2` is the larger plant-row hover shadow. */
  elevation: {
    1: 'rgba(30,61,47,.09)',
    2: 'rgba(30,61,47,.11)',
  },
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/* Typography                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Typography recipes by semantic role. The vendor face is an implementation
 * detail under `families`; consumers reference `type.<role>.fontFamily` and
 * never hard-code "Newsreader" / "Hanken Grotesk".
 *
 * Role inventory (with the single existing source value each one preserves):
 *   heroNumeral      74 / 56  PlantDetail hero countdown
 *   screenTitle      48 / 36  H1 — dashboard, calendar month, hero name, form title
 *   statDisplay      46 / 36  Plant-row big numeral + dashboard thirsty count
 *   sectionTitle     23 / 19  Plant-row name + Sill wordmark
 *   prose            19        "Did you know?" fact body (only serif body text)
 *   scientific       16        italic latin / species name
 *   body             15        inputs, history row date
 *   meta             12        secondary sans metadata
 *   captionNumeral   12        sans caption sitting next to a big numeral
 *   eyebrow          10        uppercase mono section labels (12+ sites collapse here)
 *   monoMeta         11        lowercase mono inline metadata (NOT an eyebrow)
 *   actionLabel      14 / 600  pill button label
 *   iconGlyph        16        single-character glyph inside a pill button
 */
export const type = {
  /** Biggest stat in the app — PlantDetail hero countdown. Identity moment. */
  heroNumeral: {
    fontFamily: families.serif,
    fontSize: 74,
    lineHeight: 0.8,
    /** Mobile override (`<=720px`). Existing value at `index.css:205`. */
    mobileFontSize: 56,
  },

  /** Page-level H1. 48 is dominant (dashboard hero + calendar month). Casualty
   *  notes: PlantDetail hero name was 44 (+9%), PlantForm title was 40 (+20%). */
  screenTitle: {
    fontFamily: families.serif,
    fontSize: 48,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    mobileFontSize: 36,
  },

  /** Displayed numerals subordinate to `heroNumeral`. Plant-row big-num is
   *  the dominant size; the dashboard thirsty-count (34) folds into 46. */
  statDisplay: {
    fontFamily: families.serif,
    fontSize: 46,
    lineHeight: 0.85,
    mobileFontSize: 36,
  },

  /** Section / row titles — plant-row name, Sill wordmark. StatTile value
   *  (21) and roster name (17) grow up to 23. */
  sectionTitle: {
    fontFamily: families.serif,
    fontSize: 23,
    lineHeight: 1.02,
    mobileFontSize: 19,
  },

  /** Long-form serif reading. Only the "Did you know?" fact card uses it. */
  prose: {
    fontFamily: families.serif,
    fontSize: 19,
    lineHeight: 1.42,
  },

  /** Italic Latin species / binomial name. Picks 16 (PlantDetail hero) — the
   *  larger of the two existing sizes. */
  scientific: {
    fontFamily: families.serif,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 1.2,
  },

  /** Default sans reading text — input values, history row date. Matches the
   *  existing `inputStyle` 15. */
  body: {
    fontFamily: families.sans,
    fontSize: 15,
    lineHeight: 1.4,
  },

  /** Secondary metadata in sans — last-watered helper, freq label, status
   *  pill text, legend, roster date, calendar day numeral (documented
   *  cross-family exception: day grid wants uniform-width sans glyphs). */
  meta: {
    fontFamily: families.sans,
    fontSize: 12,
    lineHeight: 1.35,
  },

  /** Caption sitting next to a big numeral. Today the slot ships two recipes
   *  (mono uppercase on dashboard, sans plain on PlantDetail) — this
   *  unifies on sans 12 to match the `maxWidth:96` wrap box on PlantDetail. */
  captionNumeral: {
    fontFamily: families.sans,
    fontSize: 12,
    lineHeight: 1.2,
  },

  /** Uppercase monospace caption — the single shared recipe collapsing
   *  ~12 inline eyebrow declarations across the app. */
  eyebrow: {
    fontFamily: families.mono,
    fontSize: 10,
    lineHeight: 1.2,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },

  /** Lowercase mono inline metadata — distinct role from `eyebrow` because
   *  these strings are not uppercased. Dashboard plant-row location +
   *  PlantDetail history "ago" timestamp. */
  monoMeta: {
    fontFamily: families.mono,
    fontSize: 11,
    lineHeight: 1.2,
    letterSpacing: '0.02em',
  },

  /** Clickable control labels — pill buttons, header nav, filter chip,
   *  back-link, calendar roster relative-time. The 12.5 / 13 / 13.5 / 14 /
   *  14.5 drift collapses here. The only 700 in the app (roster `rel`)
   *  folds into 600. */
  actionLabel: {
    fontFamily: families.sans,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1,
  },

  /** Single-character glyph inside a pill / icon button — `＋` in Add plant,
   *  chevrons in NavButton. The `marginTop: -1` optical-centering hint at
   *  Header.tsx:103 is part of this recipe; apply it per-instance when the
   *  glyph's intrinsic bearing offsets the pill center. */
  iconGlyph: {
    fontFamily: families.sans,
    fontSize: 16,
    lineHeight: 1,
    opticalAdjustTop: -1,
  },

  /** Weights actually used in the app. 700 is dropped (roster rel folds
   *  into `actionLabel` 600). 400 is the implicit Hanken body default. */
  weight: {
    regular: 400,
    semibold: 600,
  },
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/* Radius                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Corner-radius ramp. Every named role traces to a single existing source
 * value. `pill` (999) is reserved for control geometry — non-button surfaces
 * (the MeterBar track) reference `pill` explicitly as a documented reuse.
 * `circle` ('50%') stays for round dots / round avatars.
 */
export const radius = {
  /** Scrollbar thumb only (`index.css:97`). */
  scrollbar: 6,
  /** Popover row hover surface (DatePicker / Select listbox items). */
  popoverRow: 9,
  /** Inner wells — sprite well in roster, calendar cell, calendar grid
   *  sprite well. */
  well: 12,
  /** Input fields — PlantForm `inputStyle`, DatePicker trigger, Select
   *  trigger (4 sites). */
  input: 13,
  /** Smaller card — row sprite well outer frame, roster card, DatePicker
   *  popover. */
  cardSm: 16,
  /** Default card — meter card, "Did you know?" card, history card,
   *  StatTile. Also PlantRow (was 20, collapses to 18 — 2px shrink). */
  card: 18,
  /** Larger card — PlantForm sprite preview tile, calendar wrapper. */
  cardLg: 22,
  /** PlantDetail hero only. */
  hero: 26,
  /** Pill — every button, plus the MeterBar track (reused as a track role). */
  pill: 999,
  /** Round dots (calendar day dots, history row dot, hero sprite frame) and
   *  the legacy round NavButton (kept as documented circle exception). */
  circle: '50%',
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/* Space                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Spacing primitives + named layout stacks. The primitives are a 9-step ramp
 * derived from the most-used gap / margin / padding values; the layout
 * stacks codify recurring rhythms by role (kicker→title, label→control,
 * card-header→body, section-header→body, page margin, row gap, action row).
 *
 * Page inset / sticky-header values come straight from `App.tsx:7` and
 * `Header.tsx:22` and are kept as their own object because they pair
 * desktop / mobile values that should always travel together.
 */
export const space = {
  /** 9-step scale. */
  hairline: 2,
  xs: 4,
  tight: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 28,
  '3xl': 40,

  /** Vertical rhythm by role. */
  stack: {
    kickerToTitle: 10,
    labelToControl: 8,
    cardHeaderToBody: 10,
    sectionHeaderToBody: 22,
    pageMargin: 28,
  },

  /** Horizontal rhythm by role. */
  inline: {
    iconToLabel: 8,
    fieldPair: 14,
    tileGrid: 12,
    listRow: 22,
    actionsRow: 10,
    /** Calendar day-grid gaps — explicit desktop/mobile pair because the
     *  grid wants tighter spacing than the rest of the app. */
    calendarGridDesktop: 6,
    calendarGridMobile: 4,
  },

  /** Page inset (App container + sticky header). Matches `App.tsx:7` /
   *  `index.css:172` / `Header.tsx:22` verbatim. */
  screenInset: {
    desktop: { x: 28, bottom: 80 },
    mobile: { x: 16, bottom: 64 },
    stickyHeader: { top: 22, bottom: 18 },
  },

  /** Dot ramp — single circular-marker role used at three sizes in source. */
  dot: {
    sm: 7,
    md: 9,
    lg: 11,
    /** `boxShadow` ring around the history dot. */
    ring: 4,
  },
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/* Buttons                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Button recipes by semantic role. Every role is pill-shaped
 * (`borderRadius: radius.pill`) except `textLink` (no radius) and `pager`
 * (also pill — the legacy Calendar NavButton circle is reshaped to a pill
 * to match the family; the circle aesthetic is intentionally retired).
 *
 * Every button consumes:
 *   - `button.shared.fontFamily / fontWeight / cursor / transition`
 *   - `focus.ring` via a `:focus-visible` rule
 *   - `htmlType: 'button'` to avoid the implicit `type="submit"` default
 */
export const button = {
  /** Shared defaults applied to every role. */
  shared: {
    fontFamily: families.sans,
    fontWeight: type.weight.semibold,
    borderRadius: radius.pill,
    /** Single transition covering every animated property — replaces the
     *  five drifted declarations (`gap .25s`, `transform .25s`, `all .25s`,
     *  `background .25s`, none). `all` is avoided so layout properties
     *  don't accidentally animate. */
    transition:
      'transform .2s ease, background .2s ease, color .2s ease, border-color .2s ease',
    cursor: 'pointer',
    /** Default `<button type="…">` value. Submit buttons must opt in. */
    htmlType: 'button',
  },

  /** Main CTA on light surfaces — PlantForm Save / Add to my plants. */
  primary: {
    background: colors.brand.DEFAULT,
    color: colors.onBrand.fg,
    border: 'none',
    fontSize: 14,
    padding: '12px 22px',
    height: 44,
  },

  /** Primary action on dark hero — PlantDetail "Water now". */
  primaryInverse: {
    background: colors.onBrand.fg,
    color: colors.brand.DEFAULT,
    border: 'none',
    fontSize: 14,
    padding: '12px 22px',
    height: 44,
  },

  /** Secondary cancel / edit on light surfaces — PlantForm Cancel. */
  ghostOutline: {
    background: 'transparent',
    color: colors.ink.muted,
    border: `1px solid ${colors.border.DEFAULT}`,
    fontSize: 14,
    padding: '12px 22px',
    height: 44,
  },

  /** Secondary action on dark hero — PlantDetail Edit. */
  ghostOutlineInverse: {
    background: 'transparent',
    color: colors.onBrand.fg,
    border: `1px solid ${colors.onBrand.border}`,
    fontSize: 14,
    padding: '12px 22px',
    height: 44,
  },

  /** Header nav pills (Plants / Calendar) — active state swaps to brand fill. */
  navTab: {
    backgroundActive: colors.brand.DEFAULT,
    colorActive: colors.onBrand.fg,
    backgroundInactive: 'transparent',
    colorInactive: colors.ink.muted,
    border: 'none',
    fontSize: 13.5,
    padding: '9px 18px',
    height: 36,
    /** Existing `.hdr-btn` mobile shrink — kept as a documented exception. */
    mobile: { fontSize: 12, padding: '8px 11px' },
  },

  /** Header Add-plant — brand-colored, sized to sit in the nav row. */
  navCta: {
    background: colors.brand.DEFAULT,
    color: colors.onBrand.fg,
    border: 'none',
    fontSize: 13.5,
    padding: '9px 18px',
    /** Asymmetric left pad when a leading glyph is rendered. */
    paddingWithLeadingIcon: '9px 18px 9px 15px',
    iconGlyphSize: type.iconGlyph.fontSize,
    height: 36,
    mobile: { fontSize: 12, padding: '8px 11px' },
  },

  /** Filter chip — Dashboard "All plants" / "Needs water". */
  chip: {
    backgroundActive: colors.brand.DEFAULT,
    colorActive: colors.onBrand.fg,
    backgroundInactive: colors.surface.DEFAULT,
    colorInactive: colors.ink.muted,
    borderActive: `1px solid ${colors.brand.DEFAULT}`,
    borderInactive: `1px solid ${colors.border.DEFAULT}`,
    fontSize: 12.5,
    padding: '7px 16px',
    height: 30,
  },

  /** Calendar prev / next month pager. The legacy 44×44 circle (`NavButton`)
   *  is reshaped to a pill to match the rest of the family — the only
   *  circular button in the app is retired. */
  pager: {
    background: colors.surface.DEFAULT,
    color: colors.ink.primary,
    border: `1px solid ${colors.border.DEFAULT}`,
    fontSize: 14,
    iconGlyphSize: type.iconGlyph.fontSize,
    padding: '8px 16px',
    height: 36,
    minWidth: 44,
  },

  /** Inline back-link — PlantForm "‹ Cancel", PlantDetail "‹ All plants".
   *  Identical 12-line inline-style block is duplicated at both call sites;
   *  this role replaces it. */
  textLink: {
    background: 'none',
    color: colors.ink.muted,
    border: 'none',
    fontSize: 13,
    padding: '6px 0',
    iconGlyphSize: 13,
  },
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/* Focus                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Focus-ring values. Applied through a single `:focus-visible` selector on
 * inputs, selects, textareas, buttons, `[role=button]`, and links. The
 * existing `index.css:80` `border-color: ... !important` is dropped here so
 * focus and other border states (invalid, error) can compose. Mouse clicks
 * stop painting the ring because `:focus-visible` replaces `:focus`.
 */
export const focus = {
  /** Solid border / outline color used for the focus state. */
  borderColor: '#3f6b4a',
  /** Same hue used by the native `accent-color` on `<input type="range">`. */
  accent: '#3f6b4a',
  /** Soft glow shadow paired with the border. Matches the value already
   *  shipped at `index.css:82`. */
  ring: '0 0 0 3px rgba(63,107,74,.14)',
} as const
