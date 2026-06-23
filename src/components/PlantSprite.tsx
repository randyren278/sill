import type { CSSProperties } from 'react'
import { bg, icon } from '../lib/sprites'
import type { ArchKey, GreensKey, SizeKey } from '../data/types'
import type { PlantHealth } from '../lib/derive'

type Props = {
  arch: ArchKey
  greens: GreensKey
  size: number
  /** Plant size variant for selecting the sprite map. Defaults to 'md'. */
  variant?: SizeKey
  /** Render as <img> with pixel-art smoothing instead of background-image div. */
  asImg?: boolean
  /** Visual state — leans wilted when overdue, perks up after watering. */
  health?: PlantHealth
  className?: string
  style?: CSSProperties
}

function composeClass(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function PlantSprite({ arch, greens, size, variant = 'md', asImg, health, className, style }: Props) {
  const healthClass = health && health !== 'neutral' ? 'sprite-' + health : undefined
  if (asImg) {
    return (
      <img
        src={icon(arch, greens, variant)}
        alt=""
        className={composeClass('pix', healthClass, className)}
        style={{ width: size, height: size, ...style }}
      />
    )
  }
  return (
    <div
      className={composeClass(healthClass, className)}
      style={{
        width: size,
        height: size,
        backgroundImage: bg(arch, greens, variant),
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        ...style,
      }}
    />
  )
}
