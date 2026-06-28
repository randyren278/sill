import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { colors, radius, type } from '../lib/tokens'

type State = 'loading' | 'ok' | 'already' | 'error'

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

/**
 * Unsubscribed landing — replaces the Edge Function HTML page.
 *
 * The Supabase gateway forces `content-type: text/plain` on edge-function
 * responses (browsers show raw HTML), so the visible unsubscribe landing
 * lives here as a real React route served with the SPA's `text/html`.
 *
 * URL: /unsubscribed?token=<subscriberId>.<base64url(hmac)>
 *
 * On mount we POST { token } to the unsubscribe Edge Function (which is now
 * a JSON-only API) and render one of three states based on its response.
 */
export function Unsubscribed() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    if (!token || !ENV_SUPABASE_URL) {
      setState('error')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(ENV_SUPABASE_URL + '/functions/v1/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = (await resp.json().catch(() => ({}))) as { status?: State }
        if (cancelled) return
        if (body.status === 'ok' || body.status === 'already' || body.status === 'error') {
          setState(body.status)
        } else {
          setState('error')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const variant = state === 'loading' ? null : variantFor(state)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.canvas,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: colors.surface.DEFAULT,
          border: `1px solid ${colors.border.DEFAULT}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '36px 32px 28px',
            borderBottom: `1px solid ${colors.border.DEFAULT}`,
            textAlign: 'center',
          }}
        >
          <img
            src="/favicon-180.png"
            width={64}
            height={64}
            alt="Sill"
            style={{ display: 'block', margin: '0 auto 18px', borderRadius: 14, imageRendering: 'pixelated', backgroundColor: '#fbfaf5', border: '1px solid #1e3d2f' }}
          />
          <div
            style={{
              fontFamily: type.screenTitle.fontFamily,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1,
              color: colors.ink.primary,
              marginBottom: 10,
            }}
          >
            Sill
          </div>
          <div
            style={{
              fontFamily: type.eyebrow.fontFamily,
              fontSize: type.eyebrow.fontSize,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: variant ? variant.color : colors.ink.faint,
              marginBottom: 6,
            }}
          >
            {variant ? variant.eyebrow : 'Working…'}
          </div>
          <div
            style={{
              fontFamily: type.eyebrow.fontFamily,
              fontSize: type.eyebrow.fontSize,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: colors.ink.faint,
            }}
          >
            {fmtFullDate(new Date())}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '28px 32px 8px' }}>
          {variant ? (
            <>
              <p
                style={{
                  fontFamily: type.prose.fontFamily,
                  fontSize: 20,
                  lineHeight: 1.45,
                  color: colors.ink.primary,
                  margin: '0 0 14px',
                }}
              >
                {variant.headline}
              </p>
              <p
                style={{
                  fontFamily: type.body.fontFamily,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: colors.ink.muted,
                  margin: '0 0 22px',
                }}
              >
                {variant.subtext}
              </p>
            </>
          ) : (
            <p
              style={{
                fontFamily: type.prose.fontFamily,
                fontSize: 20,
                lineHeight: 1.45,
                color: colors.ink.muted,
                margin: '0 0 22px',
              }}
            >
              Updating your subscription…
            </p>
          )}
        </div>

        {/* FOOTER (CTA) */}
        <div
          style={{
            padding: '22px 32px 32px',
            borderTop: `1px solid ${colors.border.DEFAULT}`,
            textAlign: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '11px 22px',
              borderRadius: radius.pill,
              background: colors.brand.DEFAULT,
              color: colors.onBrand.fg,
              fontFamily: type.actionLabel.fontFamily,
              fontSize: type.actionLabel.fontSize,
              fontWeight: type.weight.semibold,
              textDecoration: 'none',
            }}
          >
            Open Sill
          </Link>
        </div>
      </div>
    </div>
  )
}

function variantFor(
  state: Exclude<State, 'loading'>,
): { eyebrow: string; color: string; headline: string; subtext: string } {
  if (state === 'ok') {
    return {
      eyebrow: 'Reminders off',
      color: colors.brand.DEFAULT,
      headline: 'You’ve unsubscribed from daily reminders.',
      subtext: 'Subscribe again any time from the home page.',
    }
  }
  if (state === 'already') {
    return {
      eyebrow: 'Already off',
      color: colors.ink.faint,
      headline: 'Reminders are already off.',
      subtext: 'You must’ve unsubscribed previously. Subscribe again any time from the home page.',
    }
  }
  return {
    eyebrow: 'Unsubscribe failed',
    color: colors.status.overdue,
    headline: 'We couldn’t process that unsubscribe link.',
    subtext: 'The link may have expired or been tampered with. Try subscribing again from the home page.',
  }
}

function fmtFullDate(d: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate()
}
