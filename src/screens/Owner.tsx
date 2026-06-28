import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../data/supabaseClient'
import { clearOwnerKey, getOwnerKey, setOwnerKey, useIsOwner } from '../lib/owner'
import { button, colors, radius, type } from '../lib/tokens'

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
  const navigate = useNavigate()
  const [draft, setDraft] = useState<string>('')
  const [state, setState] = useState<SaveState>('idle')
  const [reveal, setReveal] = useState<boolean>(false)

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
        className="owner-card"
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
          className="owner-card-header"
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
        <div className="owner-card-body" style={{ padding: '28px 32px 18px' }}>
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
              ? "Lock when you're handing the device to someone else."
              : "Only this device unlocks — the password isn't shared between browsers."}
          </p>

          {!isOwner && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type={reveal ? 'text' : 'password'}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  if (state !== 'idle') setState('idle')
                }}
                onKeyDown={onKeyDown}
                placeholder="Owner password"
                aria-label="Owner password"
                name="owner-password"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="text"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: type.body.fontSize,
                  padding: '13px 48px 13px 15px',
                  borderRadius: radius.input,
                  border: `1px solid ${colors.border.DEFAULT}`,
                  background: colors.surface.DEFAULT,
                  color: colors.ink.primary,
                }}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                aria-pressed={reveal}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 6,
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: colors.ink.muted,
                  cursor: 'pointer',
                  borderRadius: radius.circle,
                }}
              >
                <EyeIcon revealed={reveal} />
              </button>
            </div>
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

          <div className="owner-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  border: button.primary.border,
                  cursor: 'pointer',
                  background: button.primary.background,
                  color: button.primary.color,
                  fontWeight: type.weight.semibold,
                  fontSize: button.primary.fontSize,
                  padding: button.primary.padding,
                  borderRadius: radius.pill,
                }}
              >
                Open my plants
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate('/plants/new')}
                style={{
                  border: button.ghostOutline.border,
                  cursor: 'pointer',
                  background: button.ghostOutline.background,
                  color: button.ghostOutline.color,
                  fontWeight: type.weight.semibold,
                  fontSize: button.ghostOutline.fontSize,
                  padding: button.ghostOutline.padding,
                  borderRadius: radius.pill,
                }}
              >
                Add a plant
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
          className="owner-card-footer"
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

function EyeIcon({ revealed }: { revealed: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {revealed ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A10.4 10.4 0 0112 6c5 0 9.3 3.4 11 6a13 13 0 01-3.4 4.1" />
          <path d="M6.6 6.6A13 13 0 001 12c1.7 2.6 6 6 11 6a10.4 10.4 0 005.4-1.4" />
          <path d="M9.9 9.9a3 3 0 004.2 4.2" />
        </>
      ) : (
        <>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  )
}
