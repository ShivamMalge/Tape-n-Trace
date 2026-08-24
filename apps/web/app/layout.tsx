import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { NAV } from '../lib/catalog'
import { SyllabusBreadcrumb } from '../components/syllabus-breadcrumb'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Tape-n-Trace',
    template: '%s · Tape-n-Trace',
  },
  description:
    'An interactive Theory of Computation workbench. Draw a machine, run it, watch it move.',
}

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <a className="tnt-skip" href="#main">
          Skip to content
        </a>

        <header
          style={{
            borderBottom: '1px solid var(--tnt-border)',
            background: 'var(--tnt-surface)',
          }}
        >
          <nav
            aria-label="Primary"
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              padding: '12px 20px',
              display: 'flex',
              gap: 18,
              alignItems: 'baseline',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="/"
              style={{ fontWeight: 700, fontSize: 17, color: 'var(--tnt-text)', textDecoration: 'none' }}
            >
              Tape-n-Trace
            </a>
            {/* Read from lib/catalog.ts, so a new tool reaches the header by
                being added there rather than by editing this file. */}
            {NAV.map((link) => (
              <a key={link.href} href={link.href} style={{ fontSize: 14 }}>
                {link.label}
              </a>
            ))}
          </nav>

          <SyllabusBreadcrumb />
        </header>

        <main id="main">{children}</main>
      </body>
    </html>
  )
}
