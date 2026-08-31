import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Spectral } from 'next/font/google'
import type { ReactNode } from 'react'
import { SiteNav } from '../components/site-nav'
import { SyllabusBreadcrumb } from '../components/syllabus-breadcrumb'
import './globals.css'

/*
 * The three faces of the design system (artboard 00), self-hosted by
 * `next/font` and published as CSS variables. `tokens.css` names them through
 * `var(--font-*, …)` fallbacks, so the notebook widget — which never loads this
 * layout — degrades to the host's serif, sans and mono without a broken stack.
 */
const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-spectral',
  display: 'swap',
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

const THEME_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){localStorage.setItem('tnt-theme',q)}else if(q==='system'){localStorage.removeItem('tnt-theme')}var t=localStorage.getItem('tnt-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.tntTheme=t}}catch(e){}})()`

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
    <html
      lang="en"
      className={`${spectral.variable} ${plexSans.variable} ${plexMono.variable}`}
      // The theme script above sets data-tnt-theme before React hydrates; that
      // difference is intended, not a bug to report.
      suppressHydrationWarning
    >
      <head>
        {/* Apply the stored (or ?theme=) choice before first paint — see theme-toggle.tsx. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="tnt-skip" href="#main">
          Skip to content
        </a>

        <SiteNav />

        <div className="tnt-shell">
          <main id="main">
            <SyllabusBreadcrumb />
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
