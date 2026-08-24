/**
 * The tape renderer, rendered to static markup like the other renderers —
 * it has no state, so the markup is the whole output.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TapeStrip } from '../src/index.js'

const positionsIn = (markup: string): string[] => [...markup.matchAll(/data-position="(-?\d+)"/g)].map((m) => m[1] as string)
const headIn = (markup: string): string | undefined => /data-position="(-?\d+)" data-head="true"/.exec(markup)?.[1]

describe('TapeStrip', () => {
  const tape = { cells: ['X', '0', 'Y', '1'], offset: 0, head: 2 }

  it('draws the head cell, the state under it, and blanks beyond the window', () => {
    const markup = renderToStaticMarkup(<TapeStrip tape={tape} blank="B" radius={3} state="q₁" />)
    expect(markup).toContain('aria-label="Tape: head on cell 2 reading Y, in state q₁"')
    expect(headIn(markup)).toBe('2')
    expect(positionsIn(markup)).toHaveLength(7)
    expect(markup).toContain('q₁')
  })

  it('keeps the head centred when head-fixed, and pages when tape-fixed', () => {
    const far = { cells: ['0'], offset: 0, head: 20 }
    const headFixed = renderToStaticMarkup(<TapeStrip tape={far} blank="B" radius={3} mode="head-fixed" />)
    expect(positionsIn(headFixed)[0]).toBe('17')
    expect(positionsIn(headFixed).at(-1)).toBe('23')

    const tapeFixed = renderToStaticMarkup(<TapeStrip tape={far} blank="B" radius={3} mode="tape-fixed" />)
    // Page width is 7; the head at 20 lies on page 3, which starts at 18.
    expect(positionsIn(tapeFixed)[0]).toBe('18')
    expect(headIn(tapeFixed)).toBe('20')
  })

  it('stacks tracks when a separator is given', () => {
    const markup = renderToStaticMarkup(
      <TapeStrip tape={{ cells: ['^0|_B'], offset: 0, head: 0 }} blank="_B|_B" radius={1} trackSeparator="|" formatRow={(r) => r.slice(1)} />,
    )
    const headCell = /data-head="true"[\s\S]*?<\/div>/.exec(markup)?.[0] ?? ''
    expect(headCell).toContain('>0<')
    expect(headCell).toContain('>B<')
  })
})
