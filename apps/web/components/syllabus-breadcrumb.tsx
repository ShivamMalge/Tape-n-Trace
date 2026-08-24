'use client'

/**
 * The syllabus breadcrumb — phases.md P1.7, "the derived breadcrumb on every
 * tool page".
 *
 * Derived is the operative word. It lives in the root layout and reads the
 * current path, so a tool gets its breadcrumb by existing in `topics.ts` and
 * nowhere else — there is no per-page prop to forget. A page the scheme does
 * not place renders nothing at all rather than an empty bar.
 */

import { usePathname } from 'next/navigation'
import { DEFAULT_SCHEME, moduleForTopic, topicsForHref } from '../lib/schemes'

export function SyllabusBreadcrumb(): React.JSX.Element | null {
  const pathname = usePathname()
  if (pathname === null) return null

  const topics = topicsForHref(pathname)
  if (topics.length === 0) return null

  const module = moduleForTopic(topics[0]?.id ?? '')
  if (module === undefined) return null

  const sections = [...new Set(topics.flatMap((topic) => topic.sections))]

  return (
    <nav aria-label="Syllabus" className="tnt-crumb">
      <a href="/syllabus">{DEFAULT_SCHEME.code}</a>
      <span aria-hidden>·</span>
      <a href="/syllabus">
        Module {module.number} — {module.title}
      </a>
      <span aria-hidden>·</span>
      <span>{topics.map((topic) => topic.title).join(' / ')}</span>
      {sections.length === 0 ? null : (
        <>
          <span aria-hidden>·</span>
          <span>Hopcroft 2e §{sections.join(', §')}</span>
        </>
      )}
      {module.co === '' ? null : (
        <>
          <span aria-hidden>·</span>
          <span>{module.co}</span>
        </>
      )}
    </nav>
  )
}
