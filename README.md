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
