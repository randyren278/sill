import { useEffect, useState } from 'react'

type Props = {
  target: number
  duration?: number
}

/**
 * Animates 0 → target over `duration` ms, ease-out cubic. Restarts when target changes.
 * Mirrors the artifact's data-count animation.
 */
export function NumberCountUp({ target, duration = 650 }: Props) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    setValue(0)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return <>{value}</>
}
