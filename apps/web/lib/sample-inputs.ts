/**
 * Starting points for the conversions whose input is typed rather than drawn.
 *
 * A conversion page that opens on an empty box asks the student to invent an
 * example before they have seen what the tool does. These are chosen so the
 * first thing on screen is worth watching: each one exercises the part of the
 * construction that is actually interesting.
 */

import type { CFG } from '@tape-n-trace/engine'

export interface SampleRegex {
  id: string
  source: string
  /** Why this one is worth running. */
  note: string
}

export const SAMPLE_REGEXES: SampleRegex[] = [
  { id: 'ends-01', source: '(0+1)*01', note: 'Strings ending in 01 — the union and star nest.' },
  { id: 'zeros-ones', source: '0*1*', note: 'Two stars in sequence; ε is accepted.' },
  { id: 'contains-01', source: '(0+1)*01(0+1)*', note: 'Contains 01 — the largest of these trees.' },
  { id: 'alt', source: '(01+10)*', note: 'A star over a union of two-symbol strings.' },
  { id: 'single', source: '0', note: 'The smallest interesting case: one symbol, two states.' },
]

export interface SampleGrammar {
  id: string
  title: string
  grammar: CFG
}

export const SAMPLE_GRAMMARS: SampleGrammar[] = [
  {
    id: 'ends-in-01',
    title: 'Strings ending in 01',
    grammar: {
      variables: ['S', 'A', 'B'],
      terminals: ['0', '1'],
      productions: [
        { head: 'S', body: ['0', 'S'] },
        { head: 'S', body: ['1', 'S'] },
        { head: 'S', body: ['0', 'A'] },
        { head: 'A', body: ['1', 'B'] },
        { head: 'B', body: [] },
      ],
      start: 'S',
    },
  },
  {
    id: 'even-zeros',
    title: 'An even number of 0s',
    grammar: {
      variables: ['E', 'O'],
      terminals: ['0', '1'],
      productions: [
        { head: 'E', body: ['1', 'E'] },
        { head: 'E', body: ['0', 'O'] },
        { head: 'E', body: [] },
        { head: 'O', body: ['1', 'O'] },
        { head: 'O', body: ['0', 'E'] },
      ],
      start: 'E',
    },
  },
  {
    id: 'unit-production',
    title: 'With a unit production (becomes an ε-transition)',
    grammar: {
      variables: ['S', 'T'],
      terminals: ['0', '1'],
      productions: [
        { head: 'S', body: ['0', 'S'] },
        { head: 'S', body: ['T'] },
        { head: 'T', body: ['1', 'T'] },
        { head: 'T', body: [] },
      ],
      start: 'S',
    },
  },
]

/** A grammar written out the way it would appear on paper. */
export function grammarToText(grammar: CFG): string {
  return grammar.variables
    .map((variable) => {
      const bodies = grammar.productions
        .filter((p) => p.head === variable)
        .map((p) => (p.body.length === 0 ? 'ε' : p.body.join('')))
      return bodies.length === 0 ? null : `${variable} → ${bodies.join(' | ')}`
    })
    .filter((line) => line !== null)
    .join('\n')
}
