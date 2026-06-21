import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigError =
  !url || !anonKey
    ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local. After editing .env.local you must restart `npm run dev`.'
    : null

// Use empty strings as a placeholder when misconfigured — the Provider catches the failure
// and renders a visible error, instead of the whole app crashing on module load.
export const supabase = createClient(url ?? '', anonKey ?? '')
