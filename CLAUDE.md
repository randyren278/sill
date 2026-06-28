# CLAUDE.md

Context for future Claude sessions working on Sill. Read this first.

## What Sill is

A plant-watering tracker that lives at https://pleasepleasepleasewater.me. The owner (Randy) curates the plant collection; anyone can visit and subscribe to a daily email digest about those plants. Single-tenant on the data side (one collection of plants), multi-subscriber on the email side (any visitor's email can be added).

**Trust model is wide open by design** — anyone can add / edit / delete / export plants. The only thing locked down is the subscribers list (emails are private; see Privacy below).

## Stack

- React 18 + Vite 5 + TypeScript SPA, deployed on Vercel.
- Inline-style JSX. No CSS framework, no UI library. One stylesheet at `src/index.css` for keyframes, scrollbar, focus rings, and the single `@media (max-width: 720px)` mobile breakpoint.
- React Router v6 (`src/routes.tsx`).
- Supabase Postgres + Edge Functions + `pg_cron` + `pg_net`.
- Resend for transactional email (100/day free tier).
- Playwright for e2e tests (`npm run test:e2e`).

## Codebase tour

```
src/
├── App.tsx                ─ <Header/>, <ReminderHealthBanner/>, <Outlet/>
├── main.tsx               ─ React root + RouterProvider + PlantsProvider
├── routes.tsx             ─ createBrowserRouter; /unsubscribed lives OUTSIDE the App shell
├── index.css              ─ keyframes, scrollbar, focus, single mobile media query
├── lib/
│   ├── dates.ts           ─ TODAY const + parse/iso/addDays/diff/fmt (NOTE: TODAY is hardcoded)
│   ├── sprites.ts         ─ pixel-art sprite generator (5 archetypes × 4 palettes)
│   ├── palette.ts         ─ green palettes + status colors for sprites
│   ├── species.ts         ─ SPECIES table
│   ├── derive.ts          ─ derive(plant) → status math
│   ├── calendar.ts        ─ buildCalendar(plants, offset) → 35-cell month grid
│   └── tokens.ts          ─ colors / type / radius / button — design system source of truth
├── data/
│   ├── types.ts           ─ Plant + Species types
│   ├── repo.ts            ─ PlantsRepo interface
│   ├── supabaseClient.ts  ─ createClient singleton (uses VITE_SUPABASE_* env)
│   ├── supabasePlantsRepo.ts ─ PlantsRepo implementation
│   └── PlantsProvider.tsx ─ React context + usePlants hook
├── components/
│   ├── Header.tsx, PlantSprite.tsx, MeterBar.tsx, StatusDot.tsx,
│   ├── NumberCountUp.tsx, ConfirmDialog.tsx, DatePicker.tsx,
│   ├── NotesCard.tsx, Select.tsx, Toast.tsx
│   └── ReminderHealthBanner.tsx ─ yellow banner when reminder_runs goes >30h stale
└── screens/
    ├── Dashboard.tsx        ─ /
    ├── PlantDetail.tsx      ─ /plants/:id
    ├── PlantForm.tsx        ─ /plants/new and /plants/:id/edit
    ├── Calendar.tsx         ─ /calendar
    ├── Subscribe.tsx        ─ /settings (path kept for backwards compat; UI is "Subscribe")
    └── Unsubscribed.tsx     ─ /unsubscribed — standalone landing (no App shell, no Header)

supabase/functions/
├── send-watering-reminder/ ─ daily cron (16:00 UTC). Fans out one email per enabled subscriber
├── send-welcome/           ─ one-time welcome. Fired from the subscribe() RPC via pg_net
└── unsubscribe/            ─ JSON API. Returns { status: 'ok' | 'already' | 'error' }

tests/e2e/
├── subscribe.spec.ts, unsubscribe.spec.ts, privacy.spec.ts,
├── digest.spec.ts, plants-public.spec.ts
└── helpers/{supabase,resend}.ts
```

## Data model (Supabase / Postgres)

Three tables in `public`:

- **`plants`** — open trust mode. RLS `using (true)` on all CRUD. Anyone can read/write/delete/export.
- **`subscribers`** — locked down. RLS denies anon SELECT/UPDATE/DELETE entirely. Only path in is `subscribe(p_email)` RPC; only paths out are `subscriber_count()` (aggregate only) and edge functions running with service role.
  - Columns: `id uuid`, `email text`, `email_lower text generated`, `enabled bool`, `welcomed_at`, `unsubscribed_at`, `last_sent_date date`, `last_resend_id text`, `created_at`.
  - Unique index on `email_lower`.
- **`reminder_runs`** — audit log, anon-readable for the heartbeat banner. `subscriber_id` FK + `sent` / `skip_reason` / `resend_id` / `error`.

Private schema:

- **`private.app_secrets`** — single row holding `unsubscribe_secret` + `welcome_shared_secret`. RLS has no policies, so only service-role can read. Used by the `subscribe()` RPC (server-side welcome fire) and the `test_unsubscribe_token()` helper.

Security-definer RPCs in `public`:

- **`subscribe(p_email)`** → `{ status, id? }`. Idempotent. On `subscribed`/`resubscribed`, calls `net.http_post` to `send-welcome`. Validates email shape, but doesn't reveal existing emails — the response is just `subscribed` / `resubscribed` / `already_subscribed` / `invalid_email`.
- **`subscriber_count()`** → integer. Public count of enabled subscribers.
- **`recent_reminder_runs(p_hours)`** → integer. Used by the heartbeat banner.
- **`test_unsubscribe_token(subscriber_id uuid)`** → text. Service-role only. Returns the canonical HMAC token for tests.

## Email architecture

Three Edge Functions. All run as `verify_jwt: false` because each has its own auth (cron secret / welcome secret / HMAC token).

### `send-watering-reminder` (digest)

Triggered by `pg_cron` daily at **16:00 UTC** (9am PDT in summer, 8am PST in winter — cron doesn't honor DST). Reads `private.app_secrets` is NOT used here; uses Edge Function env var `CRON_SHARED_SECRET` instead.

Flow:
1. Auth-gate on `x-cron-secret` header.
2. Fetch all `enabled=true` subscribers.
3. Fetch plants once (shared across fan-out).
4. For each subscriber:
   - Skip if `last_sent_date = today_utc` (per-row rate cap).
   - Build digest HTML, including a unique HMAC-signed unsubscribe link.
   - POST to Resend.
   - On success: stamp `last_sent_date` + `last_resend_id`.
   - Always: insert `reminder_runs` row.

Returns aggregate counts. Never errors fatally — failures land in `reminder_runs` with `skip_reason`/`error`.

### `send-welcome`

Public POST endpoint gated by `x-welcome-secret` header. Body: `{ email }`. Looks up subscriber by `email_lower`, sends welcome if `welcomed_at IS NULL` and `enabled = true`, then stamps `welcomed_at`. Idempotent.

**Fired from Postgres**, not the frontend — the `subscribe()` RPC calls `net.http_post` to this function with the secret read from `private.app_secrets`. The browser never sees the welcome secret. Anything in `VITE_WELCOME_SECRET` is dead code; do not re-add a frontend trigger.

### `unsubscribe`

**JSON-only API.** Returns `{ status: 'ok' | 'already' | 'error' }`. Two surfaces:

- `POST /functions/v1/unsubscribe?token=...` — RFC 8058 one-click (Gmail, Apple Mail). Returns empty 200 on `ok` per the spec.
- `POST /functions/v1/unsubscribe` with `{ token }` JSON body — what the React `/unsubscribed` page calls.

**Why JSON, not HTML**: Supabase's Edge Function gateway forces `content-type: text/plain` on unauthenticated functions. Browsers refuse to render the response as HTML, so the visible unsubscribe landing lives at `/unsubscribed` in the SPA instead. Don't try to render HTML from this function again — it will show as raw source in the browser.

### Token construction (shared by all three functions)

```
payload = `${subscriberId}:${lower(email)}`
sig     = base64url(hmac_sha256(UNSUBSCRIBE_SECRET, payload))
token   = `${subscriberId}.${sig}`
```

Same construction lives in `supabase/functions/{send-watering-reminder,send-welcome,unsubscribe}/index.ts` and (in SQL form) in `public.test_unsubscribe_token`. Rotating `UNSUBSCRIBE_SECRET` requires updating BOTH:

1. The Edge Function secret (`supabase secrets set UNSUBSCRIBE_SECRET=...`)
2. The DB mirror (`update private.app_secrets set unsubscribe_secret = '...'`)

Otherwise email links from before the rotation stop verifying.

### Email links

Every email's footer carries TWO URLs:

- **Human visible**: `https://pleasepleasepleasewater.me/unsubscribed?token=...` — points at the SPA route. Real HTML rendering.
- **`List-Unsubscribe` header**: `https://pleasepleasepleasewater.me/api/unsubscribe?token=...` — proxied via `vercel.json` rewrite to the JSON API. Mail clients use this for the native "Unsubscribe" link.

## Privacy — the one thing that matters

The owner's email (and any subscriber's email) MUST NOT appear anywhere a stranger can see:

1. **DB layer**: `subscribers` has no anon SELECT/UPDATE/DELETE policy. Even with the anon key, `GET /rest/v1/subscribers` returns `[]`.
2. **Frontend layer**: the Subscribe page email input is ALWAYS empty for fresh visitors. No `useEffect` reads from `subscribers`. The `subscriber_count` RPC returns an integer, never email content.
3. **Bundle layer**: the production JS bundle is grep'd for emails in the privacy spec. Re-run `npm run test:e2e -- privacy.spec.ts` whenever changing Subscribe.tsx.

Regression test if you forget this: `curl -s https://pleasepleasepleasewater.me/assets/index-*.js | grep -E "[a-z]+@[a-z]+\.[a-z]+"` should return nothing.

## Environment variables

### `.env.local` (frontend)
- `VITE_SUPABASE_URL=https://dftjobtwildtdfpnqqyu.supabase.co`
- `VITE_SUPABASE_ANON_KEY=sb_publishable_...` (publishable key, safe to ship)
- `VITE_IMPORT_SECRET` — for the import-backup function (server-side gated)

Do NOT add `VITE_WELCOME_SECRET` here. The welcome secret is server-side only.

### Supabase Edge Function secrets
- `RESEND_API_KEY`
- `CRON_SHARED_SECRET` — embedded in the `cron.schedule` SQL inside the Supabase project
- `UNSUBSCRIBE_SECRET` — also mirrored into `private.app_secrets.unsubscribe_secret`
- `WELCOME_SHARED_SECRET` — also mirrored into `private.app_secrets.welcome_shared_secret`
- `IMPORT_SHARED_SECRET`
- `REMINDER_SENDER` — e.g. `Sill <reminders@pleasepleasepleasewater.me>`
- `APP_URL` — `https://pleasepleasepleasewater.me`

### `.env.test.local` (Playwright; never committed)
See `.env.test.local.example`. Needs `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SHARED_SECRET` for the digest + unsubscribe specs to run live.

## Routing notes

- `/` — Dashboard
- `/plants/:id`, `/plants/new`, `/plants/:id/edit`, `/calendar` — standard
- `/settings` — Subscribe page (path kept for backwards compat with any email links pre-rename)
- `/unsubscribed` — Standalone unsubscribe landing. Lives OUTSIDE the App shell so it doesn't render the Header/banner. If you add it back inside App, it'll feel like a regular app page, which is wrong.
- `vercel.json` has TWO rewrites:
  - `/api/unsubscribe` → Supabase unsubscribe function (POST one-click)
  - Catch-all to `index.html` for the SPA

## Design tokens

`src/lib/tokens.ts` is the source of truth for colors / type / spacing. Use `type.<role>.fontFamily`, never hard-code `'Newsreader'` or `'Hanken Grotesk'`. Common gotchas:

- `colors.status.ok` (not `.happy`), `colors.status.overdue`, `colors.status.dueSoon`
- `colors.surface.DEFAULT` for cards, `colors.canvas` for page background
- `colors.onBrand.fg` for text on dark-green CTAs

The email templates use a parallel palette that's locked separately (audit-passed). Don't try to share tokens between email HTML and the React app — emails ship inline-style strings with hex values, the app uses tokens. They drift independently for good reasons (email-client compat).

## Email design palette (locked, audit-passed)

Light: page `#f1eee2`, card `#fbfaf5`, border `#e6e3d7`, ink primary `#1b211c`, ink muted `#6b736a`, ink faint `#858b80`.
Dark: page `#10180f`, card `#1f2d26`, border `#264536`, ink primary `#eef0e4`, ink muted `#b6cf90`, ink faint `#8aa589`.

Status colors in email: overdue `#b5613a` / soon `#b8862f` / happy `#3f6b4a` (light); `#e09a6b` / `#e6bd60` / `#9bc586` (dark).

CTA pill stays `#1e3d2f` background + `#eef0e4` text in BOTH modes (brand identity, audit decision).

## Sender icon

`public/icon-email.png` is rendered from `public/favicon.svg` at **288×288 (16× integer scale from 18-unit SVG)** with `+antialias off` and no alpha:

```bash
cp public/favicon.svg /tmp/favicon-sized.svg
sed -i '' 's|<svg xmlns="http://www.w3.org/2000/svg"|<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288"|' /tmp/favicon-sized.svg
magick +antialias -background "#1e3d2f" /tmp/favicon-sized.svg -flatten -strip -define png:color-type=2 public/icon-email.png
```

Do NOT use 256×256 — that's 14.22× (non-integer) and produces dithering speckles in the dark-green tile. The SVG must have explicit `width`/`height` attrs or ImageMagick ignores `shape-rendering="crispEdges"`. Background must be baked in (no alpha) because Outlook/Gmail Android strip `style="background"` on `<img>`.

## Heartbeat

Free-tier Supabase pauses inactive projects. The `ReminderHealthBanner` component renders a yellow strip when:
1. `subscriber_count() > 0`
2. AND the latest `reminder_runs.ran_at` is more than 30 hours old.

This is the visible signal that something silently broke. Don't suppress it; if it appears, check `select * from reminder_runs order by ran_at desc limit 5` and `select * from cron.job_run_details order by start_time desc limit 5`.

## Things that have bitten us before

1. **Supabase forces `content-type: text/plain`** on unauthenticated edge function responses. Don't try to render HTML from `unsubscribe/index.ts` — use the SPA route.
2. **Vercel rewrites don't forward 3xx redirects.** Don't try to 302 from an edge function through `/api/*` to an SPA route.
3. **`VITE_` env vars ship to the client.** Don't put server-side secrets behind a `VITE_` prefix even with a guard — they're discoverable in the JS bundle.
4. **Non-integer SVG-to-PNG scaling causes dithering.** Only use integer scale factors (18 × N) for the icon.
5. **`pg_cron` runs in UTC and doesn't honor DST.** The 9am Pacific send time drifts to 8am in winter; accepted tradeoff.
6. **Resend rejects `@example.com` recipients silently.** Use real (or `+test` aliased) emails for Resend smoke tests, or expect "bounced" rows in the dashboard.
7. **`reminder_settings` is gone** — replaced by `subscribers` in commit `0bdbe79`. If you see code referencing it, that's stale; the migration dropped the table.

## Workflow rules I've learned the hard way

- Don't ship without `npm run typecheck && npm run build` clean.
- Don't commit `tsconfig.app.tsbuildinfo` — git-restore it before staging.
- Don't `git add .` — review every file. There's an existing `.env.local.example` typo (`WLsCo` instead of `WLsC`) that keeps trying to sneak into commits.
- Don't paste secrets into git history. Mirror them into `private.app_secrets` instead.
- When a Playwright spec fails on the deployed site, check the asset hash before debugging — Vercel deploy might be lagging.

## Cron schedule

`cron.schedule('send-watering-reminder', '0 16 * * *', ...)` — daily at 16:00 UTC. The literal cron `command` field includes the cron secret inline; rotating that secret requires re-`schedule`ing.

## Test cleanup

Test specs subscribe `sill-test-*@example.com` rows; `cleanupTestSubscribers()` in `tests/e2e/helpers/supabase.ts` drops them between runs. Don't delete real subscribers when cleaning up — filter on `email_lower like 'sill-test-%@example.com'`.

## What this app is NOT

- It's not multi-tenant (one plant collection, shared by all visitors).
- It doesn't have auth (anyone can edit plants — that's intentional).
- It doesn't have a manage-my-subscription page (subscribe + unsubscribe are the entire surface).
- It doesn't do double-opt-in (single-opt-in is fine for the trust model).
- It doesn't run on GitHub Actions (Playwright is local-only for now).

If a feature request seems to require any of the above, raise it before implementing — the answer might be "we don't do that here."
