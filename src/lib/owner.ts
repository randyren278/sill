// Owner-key store. Sill has no auth — instead, the owner pastes a shared
// secret at /owner once per device. The key lives in localStorage and rides
// along on every plant write to the SECURITY DEFINER RPCs in Postgres, which
// is where the real check happens. The key is NEVER inlined into the JS
// bundle — frontend code only reads it from localStorage.
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sill.owner'
// Same-tab updates: localStorage's `storage` event only fires for *other*
// tabs. We dispatch a synthetic event on set/clear so React subscribers in
// the same tab refresh too.
const CHANGE_EVENT = 'sill:owner-change'

export class OwnerKeyMissingError extends Error {
  constructor() {
    super("This device isn't unlocked. Open /owner to paste the password.")
    this.name = 'OwnerKeyMissingError'
  }
}

export function getOwnerKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setOwnerKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // localStorage unavailable (private mode on some browsers) — silently
    // no-op; the UI will keep showing "Locked" and the user can retry.
  }
}

export function clearOwnerKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // ditto
  }
}

/**
 * Returns true iff this device has stored a non-empty owner key. Subscribes
 * to both cross-tab (`storage`) and same-tab (`sill:owner-change`) updates so
 * the UI gates flip immediately when the user saves/clears the key.
 */
export function useIsOwner(): boolean {
  const [isOwner, setIsOwner] = useState<boolean>(() => getOwnerKey() !== '')
  useEffect(() => {
    const update = () => setIsOwner(getOwnerKey() !== '')
    window.addEventListener('storage', update)
    window.addEventListener(CHANGE_EVENT, update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener(CHANGE_EVENT, update)
    }
  }, [])
  return isOwner
}
