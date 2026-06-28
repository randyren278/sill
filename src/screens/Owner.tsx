import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../data/supabaseClient'
import { clearOwnerKey, getOwnerKey, setOwnerKey, useIsOwner } from '../lib/owner'
import { colors, radius, type } from '../lib/tokens'

type SaveState = 'idle' | 'checking' | 'wrong' | 'error'

/**
 * /owner — standalone landing (no App shell, no Header) for the owner to
 * unlock this device. Paste the password, click Save: the page calls
 * verify_owner_key on Supabase, and only on `true` does it stash the key in
 * localStorage. Mirrors the layout of /unsubscribed.
 *
 * No nav link points here — accessed by typing the URL.
 */
export function Owner() {
  const isOwner = useIsOwner()
  const [draft, setDraft] = useState<string>('')
  const [state, setState] = useState<SaveState>('idle')

  // Don't prefill from localStorage. The whole point is to keep the key
  // out of every input value/DOM dump; show a blank field instead.
  useEffect(() => {
    setDraft('')
  }, [isOwner])

  const onSave = async () => {
    const key = draft.trim()
    if (!key) return
    setState('checking')
    try {
      const { data, error } = await supabase.rpc('verify_owner_key', { p_key: key })
      if (error) {
        setState('error')
        return
      }
      if (data === true) {
        setOwnerKey(key)
        setDraft('')
        setState('idle')
      } else {
        setState('wrong')
      }
    } catch {
      setState('error')
    }
  }

  const onClear = () => {
    clearOwnerKey()
    setDraft('')
    setState('idle')
  }

  // Allow Enter-to-save while the input has focus.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void onSave()
    }
  }

  const stored = getOwnerKey()
  const statusLabel = isOwner ? 'Unlocked on this device' : 'Locked'
  const statusColor = isOwner ? colors.brand.DEFAULT : colors.ink.faint

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
            src="/icon-email.png"
            width={64}
            height={64}
            alt="Sill"
            style={{ display: 'block', margin: '0 auto 18px', borderRadius: 14, imageRendering: 'pixelated' }}
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
              color: statusColor,
            }}
          >
            {statusLabel}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '28px 32px 18px' }}>
          <p
            style={{
              fontFamily: type.prose.fontFamily,
              fontSize: 20,
              lineHeight: 1.45,
              color: colors.ink.primary,
              margin: '0 0 10px',
            }}
          >
            {isOwner ? 'This device can edit plants.' : 'Paste the owner password.'}
          </p>
          <p
            style={{
              fontFamily: type.body.fontFamily,
              fontSize: 14,
              lineHeight: 1.55,
              color: colors.ink.muted,
              margin: '0 0 18px',
            }}
          >
            {isOwner
              ? "Click below to remove this device's access. To rotate the password itself, update private.app_secrets.owner_key in Supabase."
              : "Visitors don't see write buttons. Pasting the password here unlocks them on this device."}
          </p>

          {!isOwner && (
            <input
              type="password"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (state !== 'idle') setState('idle')
              }}
              onKeyDown={onKeyDown}
              placeholder="Owner password"
              aria-label="Owner password"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: type.body.fontSize,
                padding: '13px 15px',
                borderRadius: radius.input,
                border: `1px solid ${colors.border.DEFAULT}`,
                background: colors.surface.DEFAULT,
                color: colors.ink.primary,
                marginBottom: 12,
              }}
            />
          )}

          {!isOwner && state === 'wrong' && (
            <div
              role="alert"
              style={{
                fontSize: 13,
                color: colors.status.overdue,
                marginBottom: 12,
                fontFamily: type.body.fontFamily,
              }}
            >
              Wrong password — nothing saved.
            </div>
          )}
          {!isOwner && state === 'error' && (
            <div
              role="alert"
              style={{
                fontSize: 13,
                color: colors.status.overdue,
                marginBottom: 12,
                fontFamily: type.body.fontFamily,
              }}
            >
              Couldn't reach the server. Try again in a moment.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!isOwner && (
              <button
                type="button"
                onClick={onSave}
                disabled={state === 'checking' || !draft.trim()}
                style={{
                  border: 'none',
                  cursor: state === 'checking' || !draft.trim() ? 'not-allowed' : 'pointer',
                  background: colors.brand.DEFAULT,
                  color: colors.onBrand.fg,
                  fontWeight: type.weight.semibold,
                  fontSize: 14,
                  padding: '11px 22px',
                  borderRadius: radius.pill,
                  opacity: state === 'checking' || !draft.trim() ? 0.6 : 1,
                }}
              >
                {state === 'checking' ? 'Checking…' : 'Unlock this device'}
              </button>
            )}
            {stored && (
              <button
                type="button"
                onClick={onClear}
                style={{
                  border: `1px solid ${colors.border.DEFAULT}`,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: colors.ink.muted,
                  fontWeight: type.weight.semibold,
                  fontSize: 14,
                  padding: '11px 22px',
                  borderRadius: radius.pill,
                }}
              >
                Lock this device
              </button>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '18px 32px 28px',
            borderTop: `1px solid ${colors.border.DEFAULT}`,
            textAlign: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              fontFamily: type.actionLabel.fontFamily,
              fontSize: type.actionLabel.fontSize,
              fontWeight: type.weight.semibold,
              color: colors.ink.muted,
              textDecoration: 'none',
            }}
          >
            ‹ Back to Sill
          </Link>
        </div>
      </div>
    </div>
  )
}
