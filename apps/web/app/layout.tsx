import type { Metadata } from 'next'
import type { ReactNode } from 'react'
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
            <a href="/simulate" style={{ fontSize: 14 }}>
              Simulate
            </a>
            <a href="/edit" style={{ fontSize: 14 }}>
              Draw
            </a>
            <a href="/convert" style={{ fontSize: 14 }}>
              Convert
            </a>
            <a href="/regex" style={{ fontSize: 14 }}>
              Regex
            </a>
            <a href="/closure" style={{ fontSize: 14 }}>
              Closure
            </a>
            <a href="/search" style={{ fontSize: 14 }}>
              Search
            </a>
            <a href="/applied" style={{ fontSize: 14 }}>
              Case studies
            </a>
            <a href="/practice" style={{ fontSize: 14 }}>
              Practice
            </a>
            <a href="/learn/strings" style={{ fontSize: 14 }}>
              Strings &amp; languages
            </a>
          </nav>
        </header>

        <main id="main">{children}</main>
      </body>
    </html>
  )
}
