# Sill

Single-tenant plant tracker. Shows my plants, anyone who visits sees the same plants and can water / add / edit / delete them.

## Stack

- React + Vite + TypeScript
- React Router v6 (real routes per screen)
- Supabase (Postgres) for plant storage — no auth, single global table
- No framework, no UI library — inline styles + one CSS file

## Local development

```bash
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase dashboard
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run typecheck
```

## Supabase setup (one time)

In the Supabase dashboard, open the **SQL Editor** and run:

```sql
create table public.plants (
  id            text        primary key,
  name          text        not null,
  loc           text        not null,
  latin         text        not null,
  common        text        not null,
  light         text        not null,
  freq_days     integer     not null,
  arch          text        not null,
  greens        text        not null,
  fact          text        not null,
  last_watered  date        not null,
  history       jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.plants enable row level security;

-- Trust mode: anyone with the anon key can read + write.
create policy plants_read   on public.plants for select using (true);
create policy plants_insert on public.plants for insert with check (true);
create policy plants_update on public.plants for update using (true) with check (true);
create policy plants_delete on public.plants for delete using (true);
```

Then **Settings → API** → copy the URL and `anon` `public` key into `.env.local`.

That's it. No auth provider, no users, no email templates.

## Daily watering reminders (Phase 1a)

Sill sends a daily email digest of due plants via a Supabase Edge Function triggered by `pg_cron` at 14:00 UTC.

### One-time setup

**1. Resend account + domain verification.**
- Sign up at [resend.com](https://resend.com) (100 emails/day free).
- Add `pleasepleasepleasewater.me` (or your sender domain) and copy the DNS records into your registrar.
- Generate an API key.

**2. Set Supabase secrets** (the Edge Function reads these at runtime):

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set CRON_SHARED_SECRET=<the secret embedded in the cron schedule>
supabase secrets set REMINDER_SENDER='Sill <reminders@pleasepleasepleasewater.me>'
supabase secrets set APP_URL=https://pleasepleasepleasewater.me
```

The `CRON_SHARED_SECRET` must match the literal embedded inside the `cron.schedule` SQL — the function rejects calls without it. Rotate by re-running `cron.unschedule('send-watering-reminder')` + a fresh `cron.schedule(...)` with the new secret + `supabase secrets set CRON_SHARED_SECRET=...`.

**3. Enable reminders in the app.**
- Open `/settings` in Sill.
- Enter your email, toggle on, Save.

### Reliability guardrails

- The Edge Function ALWAYS writes one row to `reminder_runs`, with `sent: true|false` plus a `skip_reason` (`disabled` / `rate_limited` / `no_due` / `missing_resend_key`) or an `error`. The Dashboard's yellow heartbeat banner flips on when no row has landed in the last 30 hours — so if Supabase auto-pauses the free-tier project, you find out.
- A hard per-day send cap is enforced inside the function (one `sent=true` row per UTC day) so a misconfigured cron loop can't burn Resend's free quota silently.

## Backup / restore

Settings → Backup exports a JSON file of every plant + history (pure client-side download). Import accepts the same shape back — it validates server-side via the `import-backup` Edge Function before upserting, so a corrupt file can't wipe the live collection.

**One-time setup for Import:**

```bash
# Set on the Edge Function side
supabase secrets set IMPORT_SHARED_SECRET=<a long random hex string>
```

Then add the same value to `.env.local` so the frontend can call the function:

```
VITE_IMPORT_SECRET=<the same value>
```

(Export works without any setup — only Import requires the secret.)

## Project layout

```
src/
├── App.tsx                ─ <Header/> + <Outlet/>
├── main.tsx               ─ React root + RouterProvider + PlantsProvider
├── routes.tsx             ─ createBrowserRouter config
├── index.css              ─ keyframes, scrollbar, focus, mobile media query
├── lib/
│   ├── dates.ts           ─ TODAY const + parse/iso/addDays/diff/fmt
│   ├── sprites.ts         ─ pixel-art sprite generator (5 archetypes × 4 palettes)
│   ├── palette.ts         ─ green palettes + status colors
│   ├── species.ts         ─ SPECIES table
│   ├── derive.ts          ─ derive(plant) → status math
│   └── calendar.ts        ─ buildCalendar(plants, offset) → 35-cell month grid
├── data/
│   ├── types.ts           ─ Plant + Species types
│   ├── repo.ts            ─ PlantsRepo interface
│   ├── supabaseClient.ts  ─ createClient singleton
│   ├── supabasePlantsRepo.ts ─ PlantsRepo implementation
│   └── PlantsProvider.tsx ─ React context + usePlants hook
├── components/
│   ├── Header.tsx
│   ├── PlantSprite.tsx
│   ├── MeterBar.tsx
│   ├── StatusDot.tsx
│   └── NumberCountUp.tsx
└── screens/
    ├── Dashboard.tsx        ─ /
    ├── PlantDetail.tsx      ─ /plants/:id
    ├── PlantForm.tsx        ─ /plants/new and /plants/:id/edit
    └── Calendar.tsx         ─ /calendar
```

## Notes

- **`TODAY = '2026-06-19'`** in `src/lib/dates.ts` is hard-coded so demo dates render predictably. Change to `new Date()` in production once you've added real plants whose `lastWatered` reflects reality.
- **Trust mode**: the Supabase anon key is shipped to the browser. Anyone with the URL can mutate the data. Acceptable because this is your personal tracker and the audience is small. If a stranger ever vandalizes the list: lock writes via RLS + a magic-link login for you only, or rotate the anon key.
- **Single breakpoint mobile** at `@media (max-width: 720px)`. All responsive rules in `src/index.css`. Verified at 320 / 375 / 414 / 720 / 768 / 1060 viewports.
