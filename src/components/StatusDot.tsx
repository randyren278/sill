import type { CSSProperties } from 'react'

type Props = {
  color: string
  size?: number
  style?: CSSProperties
}

export function StatusDot({ color, size = 8, style }: Props) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        animation: 'pulse 1.9s infinite',
        ...style,
      }}
    />
  )
}
