import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../data/supabaseClient'
import { colors } from '../lib/tokens'

const STALE_HOURS = 30
const DISMISS_KEY = 'sill.reminderBannerDismissed'

/**
 * Heartbeat banner — yellow strip above the header when reminders are enabled
 * but no reminder_runs row has landed in the last 30h. Catches the silent
 * failure mode the senate raised (free-tier project pause, cron misconfig).
 */
export function ReminderHealthBanner() {
  const [stale, setStale] = useState(false)
  const [lastRanAt, setLastRanAt] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: s } = await supabase
        .from('reminder_settings')
        .select('enabled')
        .eq('id', 1)
        .single()
      if (cancelled || !s?.enabled) return
      const { data: r } = await supabase
        .from('reminder_runs')
        .select('ran_at')
        .order('ran_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      const latest = r?.[0]?.ran_at as string | undefined
      if (!latest) {
        setStale(true)
        return
      }
      const hours = (Date.now() - new Date(latest).getTime()) / 3_600_000
      if (hours > STALE_HOURS) {
        setStale(true)
        setLastRanAt(latest)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!stale || dismissed) return null

  const onDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      role="status"
      style={{
        background: '#fbe9b8',
        borderBottom: '1px solid #e6cd86',
        color: '#5d4318',
        fontSize: 13,
        lineHeight: 1.4,
        padding: '10px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <span>
        Reminders {lastRanAt ? 'haven’t run since ' + new Date(lastRanAt).toLocaleString() : 'haven’t run yet'} —{' '}
        <Link to="/settings" style={{ color: colors.brand.DEFAULT, fontWeight: 600 }}>check Settings</Link>.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          border: 'none',
          background: 'transparent',
          color: '#5d4318',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  )
}
