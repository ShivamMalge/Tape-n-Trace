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

/**
 * Every selector in a stylesheet, brace-aware rather than line-based: a rule
 * may sit on one line and a selector list may span several.
 */
function selectorsOf(css: string): string[] {
  const selectors: string[] = []
  const stack: ('rules' | 'body')[] = []
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of source.matchAll(/([^{};]*)([{};])/g)) {
    const [, prelude = '', token] = match
    const inRules = stack.length === 0 || stack[stack.length - 1] === 'rules'
    if (token === '{') {
      const head = prelude.trim()
      if (!inRules) stack.push('body')
      else if (head.startsWith('@')) stack.push(/^@(media|supports|container|layer)\b/.test(head) ? 'rules' : 'body')
      else {
        selectors.push(...head.split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, ' ')))
        stack.push('body')
      }
    } else if (token === '}') stack.pop()
  }
  return selectors
}

describe('the scoped stylesheet', () => {
  const base = readFileSync(path.join(repo, 'bridge', 'src', 'styles.css'), 'utf8')
  const tokens = readFileSync(path.join(repo, 'packages', 'ui', 'src', 'tokens.css'), 'utf8')
  const primitives = readFileSync(path.join(repo, 'packages', 'ui', 'src', 'primitives.css'), 'utf8')
  const scoped = scopeCss(`${base}\n\n${tokens}\n\n${primitives}`)

  it('leaves no selector that can reach outside the container', () => {
    const selectors = selectorsOf(scoped)
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) {
      // Ancestor-attribute forms put the scope right after the attribute; everything else starts with it.
      expect(
        selector.startsWith(SCOPE) || /^\[[^\]]*\] /.test(selector) && selector.replace(/^\[[^\]]*\] /, '').startsWith(SCOPE),
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

  it('scopes one-line rules, multi-line selector lists and rules inside @media', () => {
    const css = [
      '.a { color: red; }',
      '.b > *,',
      '.c:hover {',
      '  font-family: x,',
      '    y;',
      '}',
      '@media (max-width: 600px) {',
      '  .d { gap: 0; }',
      '}',
      '@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }',
      '.e:is(.f, .g) {}',
    ].join('\n')
    expect(selectorsOf(scopeCss(css))).toEqual([
      `${SCOPE} .a`,
      `${SCOPE} .b > *`,
      `${SCOPE} .c:hover`,
      `${SCOPE} .d`,
      `${SCOPE} .e:is(.f, .g)`,
    ])
    expect(scopeCss(css)).toContain('font-family: x,\n    y;')
    expect(scopeCss(css)).toContain('@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }')
  })

  it('keeps a compound :root on the container and theme hooks on either side of it', () => {
    const selectors = selectorsOf(scopeCss(":root:not([data-t='light']) { --x: 1; }\n[data-t='dark'] .a { --x: 2; }"))
    expect(selectors).toEqual([
      `${SCOPE}:not([data-t='light'])`,
      `${SCOPE}[data-t='dark'] .a`,
      `[data-t='dark'] ${SCOPE} .a`,
    ])
  })
})
