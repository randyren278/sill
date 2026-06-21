import type { CSSProperties } from 'react'
import { bg, icon } from '../lib/sprites'
import type { ArchKey, GreensKey, SizeKey } from '../data/types'

type Props = {
  arch: ArchKey
  greens: GreensKey
  size: number
  /** Plant size variant for selecting the sprite map. Defaults to 'md'. */
  variant?: SizeKey
  /** Render as <img> with pixel-art smoothing instead of background-image div. */
  asImg?: boolean
  className?: string
  style?: CSSProperties
}

export function PlantSprite({ arch, greens, size, variant = 'md', asImg, className, style }: Props) {
  if (asImg) {
    return (
      <img
        src={icon(arch, greens, variant)}
        alt=""
        className={'pix' + (className ? ' ' + className : '')}
        style={{ width: size, height: size, ...style }}
      />
    )
  }
  return (
    <div
      className={className}
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
