/**
 * The mark — a fragment of tape, three cells with the one under the head lit,
 * and the trace the head leaves. The same geometry as `public/logo.svg` and the
 * favicon, inline so it takes the current theme: the ink is `currentColor`, the
 * lit cell the design system's `current` blue (`--tnt-current`), so it reads
 * right on paper, in the dark theme, and in chalk on the board.
 */

export function LogoMark({
  size = 22,
  className,
  title,
}: {
  /** Rendered height in px; the width follows the mark's 278 : 224 ratio. */
  size?: number
  className?: string
  /** Set for a standalone mark; omit when a wordmark beside it names the thing. */
  title?: string
}): React.JSX.Element {
  const width = Math.round((size * 278) / 224)
  return (
    <svg
      className={className === undefined ? 'tnt-logo' : `tnt-logo ${className}`}
      viewBox="0 0 278 224"
      width={width}
      height={size}
      role={title === undefined ? 'presentation' : 'img'}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="miter" strokeLinecap="butt">
        <rect x="7" y="7" width="264" height="136" />
        <line x1="95" y1="7" x2="95" y2="143" />
        <line x1="183" y1="7" x2="183" y2="143" />
        <polyline points="143,143 143,210 7,210" />
      </g>
      <rect className="tnt-logo-lit" x="102" y="14" width="74" height="122" fill="var(--tnt-current)" />
    </svg>
  )
}
