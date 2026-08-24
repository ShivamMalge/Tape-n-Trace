import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteNav } from '../components/site-nav'
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

        <div className="tnt-shell">
          <SiteNav />

          <main id="main">
            <SyllabusBreadcrumb />
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
