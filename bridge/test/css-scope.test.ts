/**
 * V1's CSS-isolation criterion, asserted rather than eyeballed: every rule the
 * widget ships is scoped under .vyakarana-container, so the host notebook's
 * own document cannot be restyled. Checked against the real inputs — the
 * bridge base styles and the shared tokens — through the same transform the
 * build uses.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCOPE, scopeCss } from '../scope-css.mjs'

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
const repo = path.resolve(here, '..', '..')

function selectorsOf(css: string): string[] {
  const selectors: string[] = []
  let keyframes = false
  let depth = 0
  for (const line of css.split('\n')) {
    const trimmed = line.trim()
    const opens = (line.match(/\{/g) ?? []).length
    const closes = (line.match(/\}/g) ?? []).length
    if (trimmed.endsWith('{') && !keyframes) {
      const selector = trimmed.slice(0, -1).trim()
      if (selector.startsWith('@keyframes')) keyframes = true
      else if (!selector.startsWith('@')) selectors.push(...selector.split(',').map((s) => s.trim()))
    }
    depth += opens - closes
    if (keyframes && depth === 0) keyframes = false
  }
  return selectors
}

describe('the scoped stylesheet', () => {
  const base = readFileSync(path.join(repo, 'bridge', 'src', 'styles.css'), 'utf8')
  const tokens = readFileSync(path.join(repo, 'packages', 'ui', 'src', 'tokens.css'), 'utf8')
  const scoped = scopeCss(`${base}\n\n${tokens}`)

  it('leaves no selector that can reach outside the container', () => {
    const selectors = selectorsOf(scoped)
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) {
      // Ancestor-attribute forms end in the scope; everything else starts with it.
      expect(
        selector.startsWith(SCOPE) || selector.endsWith(SCOPE),
        `unscoped selector escapes the widget: "${selector}"`,
      ).toBe(true)
    }
  })

  it('turns :root into the container itself, keeping the tokens', () => {
    // Comments may mention :root; no *selector* may be it.
    expect(selectorsOf(scoped)).not.toContain(':root')
    expect(scoped).toContain(`${SCOPE} {`)
    expect(scoped).toContain('--tnt-current:')
  })
})
