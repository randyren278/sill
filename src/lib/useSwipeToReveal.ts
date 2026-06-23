import { useCallback, useEffect, useRef, useState } from 'react'

type Options = {
  /** Width of the action button revealed when swiped open. */
  actionWidth?: number
  /** Drag threshold in px before we snap open on release. */
  threshold?: number
}

export type SwipeBinding = {
  /** Apply to the swipe-able content element. */
  ref: React.RefObject<HTMLDivElement>
  /** Current X translation in px (always ≤ 0 when revealed). */
  translateX: number
  /** True when the row is past the threshold and "open." */
  open: boolean
  /** Programmatically close the row (e.g. after the action fires). */
  close: () => void
}

/**
 * Touch-only swipe-to-reveal. Left-swipe drags the row left to expose an
 * action sitting to its right. Pointer events are filtered to coarse pointers
 * via the call-site CSS / media query — the hook itself just listens for
 * touch.
 *
 * Tap-anywhere-else closes any open row through a document-level pointerdown
 * listener that the call site can subscribe to via the returned `close`.
 */
export function useSwipeToReveal({ actionWidth = 92, threshold = 60 }: Options = {}): SwipeBinding {
  const ref = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)
  const [open, setOpen] = useState(false)
  const startX = useRef<number | null>(null)
  const startTranslate = useRef(0)
  const isDragging = useRef(false)

  const close = useCallback(() => {
    setTranslateX(0)
    setOpen(false)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      startX.current = e.touches[0].clientX
      startTranslate.current = translateX
      isDragging.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startX.current === null) return
      const dx = e.touches[0].clientX - startX.current
      // Ignore tiny jitters until the user clearly started a horizontal drag.
      if (!isDragging.current) {
        if (Math.abs(dx) < 8) return
        isDragging.current = true
      }
      // Clamp: only allow leftward drag, capped at the action width.
      const next = Math.max(-actionWidth, Math.min(0, startTranslate.current + dx))
      setTranslateX(next)
    }

    const onTouchEnd = () => {
      if (startX.current === null) return
      startX.current = null
      if (!isDragging.current) return
      isDragging.current = false
      // Snap open if the drag crossed the threshold; otherwise close.
      if (translateX <= -threshold) {
        setTranslateX(-actionWidth)
        setOpen(true)
      } else {
        close()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [actionWidth, threshold, translateX, close])

  return { ref, translateX, open, close }
}
