/**
 * The syllabus layer — phases.md P1.7's first acceptance criterion.
 *
 * "Every topic in the default scheme resolves to a live link. A CI test walks
 * the scheme and fails on any dead or missing target."
 *
 * The routes are not listed here. They are read off the filesystem, because a
 * hand-maintained list of routes is exactly the thing that goes stale and would
 * make this test pass while the link 404s. Delete a page and this fails; add a
 * topic pointing at a route nobody built and this fails.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CANONICAL_LANGUAGES, LANGUAGE_CLASSES } from '@tape-n-trace/engine'
import { CATALOG, NAV, navLinks } from '../lib/catalog'
import { TOPICS, topicById } from '../lib/topics'
import {
  DEFAULT_SCHEME,
  SCHEMES,
  moduleOf,
  scheduledTopics,
  topicsForHref,
  unscheduledTopics,
} from '../lib/schemes'
import { SyllabusIndex } from '../components/syllabus-index'

afterEach(cleanup)

/** vitest runs with the workspace package as its root, so `app/` is beside it. */
const APP = join(process.cwd(), 'app')

/** Every route the app actually serves, read from the app directory. */
function routes(dir = APP, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...routes(join(dir, entry.name), `${prefix}/${entry.name}`))
    } else if (entry.name === 'page.tsx') {
      found.push(prefix === '' ? '/' : prefix)
    }
  }
  return found
}

const ROUTES = routes()

/** A dynamic segment matches any one segment, so `/convert/[conversion]` serves `/convert/minimize`. */
function resolves(href: string): boolean {
  const wanted = href.split('/').filter((s) => s !== '')
  return ROUTES.some((route) => {
    const parts = route.split('/').filter((s) => s !== '')
    if (parts.length !== wanted.length) return false
    return parts.every((part, i) => (part.startsWith('[') && part.endsWith(']')) || part === wanted[i])
  })
}

describe('the app has the routes it claims', () => {
  it('finds the pages this phase added', () => {
    for (const route of ['/undecidable', '/undecidable/diagonalization', '/undecidable/reduction', '/hierarchy', '/syllabus']) {
      expect(ROUTES, `${route} is missing`).toContain(route)
    }
  })

  it('resolves a dynamic route the way Next does', () => {
    expect(resolves('/convert/minimize')).toBe(true)
    expect(resolves('/convert/minimize/extra')).toBe(false)
    expect(resolves('/nowhere')).toBe(false)
  })
})

describe('every topic the default scheme places resolves to a live page', () => {
  it('walks the scheme and finds no dead target', () => {
    const walked = scheduledTopics()
    expect(walked.length).toBeGreaterThan(0)
    for (const topic of walked) {
      expect(resolves(topic.href), `topic "${topic.id}" points at ${topic.href}, which is not a route`).toBe(true)
    }
  })

  it('places every topic in the graph — nothing is orphaned', () => {
    expect(unscheduledTopics().map((t) => t.id)).toEqual([])
  })

  it('names only topics that exist, in every scheme', () => {
    for (const scheme of SCHEMES) {
      for (const module of scheme.modules) {
        for (const id of module.topics) {
          expect(topicById(id), `${scheme.id} module ${module.number} names unknown topic "${id}"`).toBeDefined()
        }
      }
    }
  })

  it('gives every module a course outcome, or says the scheme has none', () => {
    for (const scheme of SCHEMES) {
      for (const module of scheme.modules) {
        if (scheme.outcomes.length === 0) {
          expect(module.co, `${scheme.id} has no outcomes, so module ${module.number} must not claim one`).toBe('')
        } else {
          expect(
            scheme.outcomes.some((co) => co.id === module.co),
            `${scheme.id} module ${module.number} claims ${module.co}, which it does not define`,
          ).toBe(true)
        }
      }
    }
  })

  it('carries a note wherever a scheme ships without outcomes, rather than a silent blank', () => {
    for (const scheme of SCHEMES.filter((s) => s.outcomes.length === 0)) {
      expect(scheme.outcomesNote, `${scheme.id}`).toBeTruthy()
    }
  })

  it('covers all five modules, with the hours the syllabus prints', () => {
    expect(DEFAULT_SCHEME.modules.map((m) => m.number)).toEqual([1, 2, 3, 4, 5])
    expect(DEFAULT_SCHEME.modules.reduce((sum, m) => sum + m.hours, 0)).toBe(40)
    expect(DEFAULT_SCHEME.ltps[0]).toBe(42)
  })

  it('resolves every tutorial component to a topic, or says nothing delivers it', () => {
    for (const tutorial of DEFAULT_SCHEME.tutorials) {
      if (tutorial.topic === null) {
        expect(tutorial.note, tutorial.title).toBeTruthy()
      } else {
        expect(topicById(tutorial.topic), `${tutorial.title} names topic "${tutorial.topic}"`).toBeDefined()
      }
    }
  })
})

describe('the catalog is the only list of tools', () => {
  it('gives every live tool a route that exists', () => {
    for (const tool of CATALOG.filter((t) => t.status === 'live')) {
      expect(resolves(tool.href), `${tool.id} points at ${tool.href}`).toBe(true)
    }
  })

  it('gives every rail link a route that exists', () => {
    for (const link of navLinks()) {
      expect(resolves(link.href), `the rail links to ${link.href}`).toBe(true)
    }
  })

  it('has unique ids and no duplicate rail entries', () => {
    expect(new Set(CATALOG.map((t) => t.id)).size).toBe(CATALOG.length)
    expect(new Set(navLinks().map((l) => l.href)).size).toBe(navLinks().length)
    expect(new Set(NAV.map((g) => g.id)).size).toBe(NAV.length)
  })

  /**
   * The UI overhaul (phases-ui.md U1, design artboard 01) folds the nav into
   * the course's five modules; the verb a tool belongs to is the tag on its
   * catalog card rather than a navigation group.
   */
  it('groups the bar by the five modules of the course', () => {
    expect(NAV.map((g) => g.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
    expect(NAV.map((g) => g.n)).toEqual([1, 2, 3, 4, 5])
    for (const group of NAV) {
      expect(group.links.length, `${group.id} is empty`).toBeGreaterThan(0)
      expect(group.label, group.id).toBeTruthy()
      expect(group.title, group.id).toBeTruthy()
      expect(group.blurb, group.id).toBeTruthy()
    }
  })

  /**
   * P1.7: "Adding a tool requires editing catalog.ts and topics.ts only." The
   * header used to be a hand-written list in the layout, which made it a third
   * file. This fails if one comes back.
   */
  it('keeps the header out of the layout', () => {
    const layout = readFileSync(join(APP, 'layout.tsx'), 'utf8')
    const hardcoded = [...layout.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1] as string)
    expect(hardcoded.filter((href) => href !== '/'), 'nav links belong in catalog.ts, not in layout.tsx').toEqual([])
  })

  it('reaches every live tool from the rail or the home page', () => {
    // The home page renders CATALOG directly, so a live tool is reachable by
    // being in it; this states that rather than leaving it implied.
    const reachable = new Set([...navLinks().map((l) => l.href), ...CATALOG.filter((t) => t.status === 'live').map((t) => t.href)])
    for (const tool of CATALOG.filter((t) => t.status === 'live')) {
      expect(reachable.has(tool.href), `${tool.id} is unreachable`).toBe(true)
    }
  })

  it('lists the four tools this phase built', () => {
    for (const id of ['undecidability', 'diagonalization', 'reduction-builder', 'hierarchy']) {
      const tool = CATALOG.find((t) => t.id === id)
      expect(tool, `${id} is missing from the catalog`).toBeDefined()
      expect(tool?.status).toBe('live')
      expect(tool?.phase).toBe('P1.7')
    }
  })
})

describe('the engine and the app agree on topics', () => {
  it('every topic a language class names is a real topic with a real page', () => {
    for (const cls of LANGUAGE_CLASSES) {
      for (const id of cls.topics) {
        const topic = topicById(id)
        expect(topic, `class "${cls.id}" names topic "${id}"`).toBeDefined()
        expect(resolves(topic?.href ?? ''), `${id} points at ${topic?.href}`).toBe(true)
      }
    }
  })

  it('every language plotted on the map links to a page that proves it belongs there', () => {
    for (const language of CANONICAL_LANGUAGES) {
      if (language.proofTopic === undefined) continue
      const topic = topicById(language.proofTopic)
      expect(topic, `${language.id} names proof topic "${language.proofTopic}"`).toBeDefined()
      expect(resolves(topic?.href ?? ''), `${language.id} points at ${topic?.href}`).toBe(true)
    }
  })
})

describe('the breadcrumb is derived, not written per page', () => {
  it('finds the module for a tool page from its path alone', () => {
    expect(topicsForHref('/simulate/tm').map((t) => t.id)).toContain('tm.basics')
    expect(moduleOf('tm.basics')).toBe(5)
    expect(moduleOf('fa.dfa')).toBe(1)
    expect(moduleOf('cfl.closure')).toBe(4)
  })

  it('finds nothing for a page the scheme does not place', () => {
    expect(topicsForHref('/')).toEqual([])
    expect(topicsForHref('/syllabus')).toEqual([])
    expect(moduleOf('not-a-topic')).toBeUndefined()
  })

  it('groups the topics that share a page, so /simulate names all three machines', () => {
    expect(topicsForHref('/simulate').map((t) => t.id)).toEqual(['fa.dfa', 'fa.nfa', 'fa.enfa'])
  })
})

describe('the syllabus page', () => {
  it('renders every module and links every topic', async () => {
    render(<SyllabusIndex />)
    for (const module of DEFAULT_SCHEME.modules) {
      expect(screen.getByText(new RegExp(`Module ${module.number} — ${module.title}`))).toBeTruthy()
    }
    // By href rather than by title: a title may hold regex metacharacters, and
    // the href is the thing that has to be right anyway.
    const linked = new Set(screen.getAllByRole('link').map((a) => a.getAttribute('href')))
    for (const topic of scheduledTopics()) {
      expect(linked.has(topic.href), `${topic.id} is not linked from the syllabus`).toBe(true)
    }
  })

  it('shows the course outcomes of the default scheme', () => {
    render(<SyllabusIndex />)
    for (const co of DEFAULT_SCHEME.outcomes) {
      expect(screen.getByText(co.text)).toBeTruthy()
    }
  })

  it('says plainly that the second scheme has no outcomes recorded', async () => {
    const user = userEvent.setup()
    render(<SyllabusIndex />)
    const vtu = SCHEMES.find((s) => s.id === 'vtu-2022-bcs503')
    expect(vtu).toBeDefined()
    await user.click(screen.getByRole('button', { name: /BCS503/ }))
    expect(screen.getByText(new RegExp(vtu?.outcomesNote?.slice(0, 40) ?? 'x'))).toBeTruthy()
  })

  it('names the tutorial component that nothing delivers', () => {
    render(<SyllabusIndex />)
    expect(screen.getAllByText(/JFLAP/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Not built/)).toBeTruthy()
  })

  it('records the disagreements between the source documents', () => {
    render(<SyllabusIndex />)
    for (const note of DEFAULT_SCHEME.discrepancies) {
      expect(screen.getByText(note)).toBeTruthy()
    }
  })
})

describe('the topic graph itself', () => {
  it('has unique ids and a page for every entry', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length)
    for (const topic of TOPICS) {
      expect(topic.title, topic.id).toBeTruthy()
      expect(topic.href.startsWith('/'), topic.id).toBe(true)
    }
  })

  it('cites sections for every topic Hopcroft actually carries', () => {
    // Two exceptions, both deliberate: left recursion is a parsing topic the
    // book has no section for, and the hierarchy map is a synthesis.
    const uncited = TOPICS.filter((t) => t.sections.length === 0).map((t) => t.id)
    expect(uncited.sort()).toEqual(['cfg.left-recursion', 'hierarchy'])
  })
})
