'use client'

/**
 * The top bar — design artboard 01.
 *
 * Reads `NAV` from `lib/catalog.ts` and nothing else, so adding a tool never
 * touches this file. The five buttons are the course's modules; pressing one
 * opens the panel strip beneath the bar with that module's title, blurb and
 * links (the design's "13-link nav folded into five modules"). The verb a tool
 * belongs to is no longer a navigation group — it is the tag on the tool's
 * card, where the design puts it.
 *
 * The open module is `aria-expanded` on its button and the current page is
 * `aria-current` on its link — the accessible attributes are also what the
 * stylesheet paints, so the two cannot disagree.
 */

import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { NAV, NAV_EXTRAS, liveTools } from '../lib/catalog'
import { ThemeToggle } from './theme-toggle'

export function SiteNav(): React.JSX.Element {
  const pathname = usePathname()
  const panelId = useId()
  // Home opens with Module 1's panel, as the design's catalog does; elsewhere
  // the panel is closed until a module is pressed.
  const [open, setOpen] = useState<string | null>(pathname === '/' ? 'm1' : null)

  // Navigating closes the panel; the page itself is now the answer.
  useEffect(() => {
    setOpen(pathname === '/' ? 'm1' : null)
  }, [pathname])

  const group = NAV.find((g) => g.id === open) ?? null
  const toolCount = liveTools().length

  return (
    <header className="tnt-topbar">
      <div className="tnt-topbar-row">
        <a href="/" className="tnt-brand">
          <span className="tnt-brand-glyph" aria-hidden="true">
            <span />
            <span data-lit="true" />
            <span />
          </span>
          Tape&#8209;n&#8209;Trace
        </a>

        <nav aria-label="Modules" className="tnt-modnav">
          {NAV.map((g) => {
            const here = g.links.some((l) => l.href === pathname)
            return (
              <button
                key={g.id}
                type="button"
                className="tnt-modnav-btn"
                aria-expanded={open === g.id}
                aria-controls={panelId}
                {...(here ? { 'aria-current': 'true' as const } : {})}
                onClick={() => setOpen(open === g.id ? null : g.id)}
              >
                <span className="tnt-modnav-n">{g.n}</span>
                <span>{g.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {NAV_EXTRAS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="tnt-topbar-link"
            {...(pathname === link.href ? { 'aria-current': 'page' as const } : {})}
          >
            {link.label}
          </a>
        ))}

        <a href="/#catalog" className="tnt-search-pill" aria-label={`Search ${toolCount} tools`}>
          <kbd aria-hidden="true">⌘K</kbd>
          <span>Search {toolCount} tools</span>
        </a>

        <ThemeToggle />
      </div>

      <div id={panelId} className="tnt-modpanel" hidden={group === null}>
        {group === null ? null : (
          <div className="tnt-modpanel-row">
            <div style={{ maxWidth: 330, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="tnt-modpanel-title">
                Module {group.n} · {group.title}
              </span>
              <span className="tnt-modpanel-blurb">{group.blurb}</span>
            </div>
            <nav aria-label={`Module ${group.n} tools`} className="tnt-modpanel-links">
              {group.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  {...(pathname === link.href ? { 'aria-current': 'page' as const } : {})}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
