import { useEffect, useState } from 'react'

type Props = {
  /** Width as a percent (0..118). Mounts at 0 and animates to this value. */
  percent: number
  color: string
  height?: number
}

export function MeterBar({ percent, color, height = 9 }: Props) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setRevealed(true))
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [])
  return (
    <div style={{ height, borderRadius: 999, background: '#e9e6d9', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          borderRadius: 999,
          width: (revealed ? Math.min(percent, 100) : 0) + '%',
          background: color,
          transition: 'width 0.9s cubic-bezier(.2,.8,.2,1)',
        }}
      />
    </div>
  )
}
