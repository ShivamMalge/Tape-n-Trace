/**
 * The docs card — design artboard 00: a `<details>` whose summary carries the
 * title in Plex Sans and the citation set right in mono, with the explanation
 * in Spectral beneath. Every "why this works" note in the product is one of
 * these, so they all read the same.
 */

import type { ReactNode } from 'react'

export function DocsCard({
  title,
  cite,
  open = false,
  children,
  className,
}: {
  title: ReactNode
  /** "Hopcroft 2e §8.2.3" — set right of the title. */
  cite?: string | undefined
  open?: boolean
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <details className={className === undefined ? 'tnt-docs' : `tnt-docs ${className}`} open={open}>
      <summary>
        <span>{title}</span>
        {cite === undefined ? null : <span className="tnt-docs-cite">{cite}</span>}
      </summary>
      {typeof children === 'string' ? <p>{children}</p> : children}
    </details>
  )
}
