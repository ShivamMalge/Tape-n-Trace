'use client'

/**
 * The navigation rail.
 *
 * Reads `NAV` from `lib/catalog.ts` and nothing else, so adding a tool never
 * touches this file. The current page is marked with `aria-current="page"`,
 * which is both the accessible answer and — via `primitives.css` — what draws
 * the highlight; there is no second "active" class that could disagree with it.
 */

import { usePathname } from 'next/navigation'
import { NAV } from '../lib/catalog'

export function SiteNav(): React.JSX.Element {
  const pathname = usePathname()

  return (
    <div className="tnt-rail">
      <a href="/" className="tnt-brand">
        Tape&rsquo;n&rsquo;Trace
      </a>
      <span className="tnt-brand-sub">Theory of Computation</span>

      <nav aria-label="Primary" className="tnt-rail-nav">
        {NAV.map((group) => (
          <div key={group.id} className="tnt-rail-group">
            <span className="tnt-label">{group.label}</span>
            {group.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="tnt-rail-link"
                {...(pathname === link.href ? { 'aria-current': 'page' as const } : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}
