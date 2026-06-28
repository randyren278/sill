import { Link } from 'react-router-dom'
import { colors, type } from '../lib/tokens'

/**
 * Page footer mounted in the App shell — credit line + a small `/owner`
 * entry point so unlocking the device doesn't require typing the URL.
 * Lives inside `.app-container`, so the standalone `/owner` and
 * `/unsubscribed` routes (outside App) don't render it.
 */
export function Footer() {
  return (
    <footer
      style={{
        marginTop: 48,
        paddingTop: 24,
        textAlign: 'center',
        fontFamily: type.meta.fontFamily,
        fontSize: type.meta.fontSize,
        color: colors.ink.faint,
        lineHeight: 1.6,
      }}
    >
      <div>Designed &amp; hosted by Randy</div>
      <Link
        to="/owner"
        style={{
          fontFamily: type.actionLabel.fontFamily,
          fontSize: 12,
          color: colors.ink.faint,
          textDecoration: 'none',
        }}
      >
        ‹owner›
      </Link>
    </footer>
  )
}
