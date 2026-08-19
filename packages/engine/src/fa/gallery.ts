/**
 * Canonical machines — the presets the app ships and the tests measure against.
 *
 * Citations are to *sections* of Hopcroft 2e (ADR-005), not figure numbers:
 * the section list is fixed by the syllabus and corroborated by the module-wise
 * textbook extracts, whereas figure numbers have not been checked against the
 * printed edition. A coarse citation is honest; a wrong one shown to a student
 * is not.
 *
 * Layouts are hand-authored here, per §7 — a preset should look composed rather
 * than auto-arranged.
 */

import { faTransitionId } from '../ids.js'
import type { FATransition, FiniteAutomaton, Read, StateId, Sym } from '../types.js'

/** A transition carrying its canonical id, so a preset cannot drift from `ids.ts`. */
function t(from: StateId, read: Read, to: StateId): FATransition {
  return { id: faTransitionId(from, read, to), from, read, to }
}

const binary: Sym[] = ['0', '1']

export interface GalleryEntry {
  id: string
  title: string
  /** The language, in the words a question paper would use. */
  language: string
  citation: string
  machine: FiniteAutomaton
  /** Strings worth trying first — chosen to show the interesting behaviour. */
  suggested: string[]
}

/** Hopcroft §2.2 — strings over {0,1} containing 01 as a substring. */
export const dfaContains01: FiniteAutomaton = {
  kind: 'DFA',
  states: ['q0', 'q1', 'q2'],
  alphabet: binary,
  transitions: [
    t('q0', '0', 'q1'),
    t('q0', '1', 'q0'),
    t('q1', '0', 'q1'),
    t('q1', '1', 'q2'),
    t('q2', '0', 'q2'),
    t('q2', '1', 'q2'),
  ],
  start: 'q0',
  accepting: ['q2'],
  layout: { q0: { x: 70, y: 90 }, q1: { x: 200, y: 90 }, q2: { x: 330, y: 90 } },
}

/** Hopcroft §2.3 — strings over {0,1} ending in 01. The classic NFA guess. */
export const nfaEndsIn01: FiniteAutomaton = {
  kind: 'NFA',
  states: ['q0', 'q1', 'q2'],
  alphabet: binary,
  transitions: [t('q0', '0', 'q0'), t('q0', '1', 'q0'), t('q0', '0', 'q1'), t('q1', '1', 'q2')],
  start: 'q0',
  accepting: ['q2'],
  layout: { q0: { x: 70, y: 90 }, q1: { x: 200, y: 90 }, q2: { x: 330, y: 90 } },
}

/** Hopcroft §2.5 — 0*1*, where the ε-transition is what accepts the empty string. */
export const enfaZerosThenOnes: FiniteAutomaton = {
  kind: 'ENFA',
  states: ['A', 'B'],
  alphabet: binary,
  transitions: [t('A', '0', 'A'), t('A', null, 'B'), t('B', '1', 'B')],
  start: 'A',
  accepting: ['B'],
  layout: { A: { x: 80, y: 90 }, B: { x: 240, y: 90 } },
}

/**
 * An NFA with two independent ways to accept, so the branch tree carries more
 * than one live path and some branches die before the input runs out.
 *
 * `e0`/`e1` count zeros mod 2; on a 1 the machine may also *guess* that this 1
 * is the last symbol and jump to `f`. `f` has no moves at all, so a wrong guess
 * dies exactly where it was made — which is the behaviour the tree exists to
 * show. Kept ε-free deliberately: an ε-transition would make it an ε-NFA, and
 * ε-NFAs are simulated as a state set rather than as a tree.
 */
export const nfaEvenZerosOrEndsIn1: FiniteAutomaton = {
  kind: 'NFA',
  states: ['e0', 'e1', 'f'],
  alphabet: binary,
  transitions: [
    t('e0', '0', 'e1'),
    t('e0', '1', 'e0'),
    t('e0', '1', 'f'),
    t('e1', '0', 'e0'),
    t('e1', '1', 'e1'),
    t('e1', '1', 'f'),
  ],
  start: 'e0',
  accepting: ['e0', 'f'],
  layout: { e0: { x: 90, y: 70 }, e1: { x: 260, y: 70 }, f: { x: 175, y: 190 } },
}

/**
 * The residue-class construction: a DFA accepting base-`base` numerals divisible
 * by `divisor`.
 *
 * "Construct a DFA accepting decimal strings divisible by 3" and its variants
 * recur across the model papers and the question bank, so it ships as one
 * parameterised construction rather than six unrelated hand-drawn answers.
 *
 * Each state is a residue: reading digit `d` in state `r` moves to
 * `(r * base + d) mod divisor`, because appending a digit multiplies the value
 * by the base and adds the digit. The start state is residue 0, which also makes
 * it accepting — so the empty string is in the language, as the standard
 * construction intends.
 *
 * States are laid out on a ring, which is what the transition structure is.
 */
export function divisibleBy(divisor: number, base = 10): FiniteAutomaton {
  if (!Number.isInteger(divisor) || divisor < 1) {
    throw new RangeError(`divisibleBy needs a positive whole divisor, received ${divisor}`)
  }
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new RangeError(`divisibleBy needs a base between 2 and 36, received ${base}`)
  }

  const digits = Array.from({ length: base }, (_, d) => d.toString(36))
  const states = Array.from({ length: divisor }, (_, r) => `r${r}`)

  const transitions = states.flatMap((from, r) =>
    digits.map((digit, d) => {
      const to = states[(r * base + d) % divisor] as StateId
      return t(from, digit, to)
    }),
  )

  const radius = 40 + divisor * 16
  const layout: Record<StateId, { x: number; y: number }> = {}
  states.forEach((state, i) => {
    // Start at the top and go clockwise, so r0 sits where a reader looks first.
    const angle = (i / divisor) * Math.PI * 2 - Math.PI / 2
    layout[state] = {
      x: Math.round((radius + Math.cos(angle) * radius) * 100) / 100,
      y: Math.round((radius + Math.sin(angle) * radius) * 100) / 100,
    }
  })

  return {
    kind: 'DFA',
    states,
    alphabet: digits,
    transitions,
    start: 'r0',
    accepting: ['r0'],
    layout,
  }
}

/** The presets the catalogue offers, in the order they should be shown. */
export const GALLERY: GalleryEntry[] = [
  {
    id: 'dfa-contains-01',
    title: 'DFA — contains 01',
    language: 'Strings over {0, 1} that contain 01 as a substring.',
    citation: 'Hopcroft 2e, §2.2',
    machine: dfaContains01,
    suggested: ['0110', '1000', '11', '01'],
  },
  {
    id: 'nfa-ends-in-01',
    title: 'NFA — ends in 01',
    language: 'Strings over {0, 1} that end in 01.',
    citation: 'Hopcroft 2e, §2.3',
    machine: nfaEndsIn01,
    suggested: ['0101', '0100', '01', '1'],
  },
  {
    id: 'enfa-zeros-then-ones',
    title: 'ε-NFA — 0*1*',
    language: 'Any run of 0s followed by any run of 1s, the empty string included.',
    citation: 'Hopcroft 2e, §2.5',
    machine: enfaZerosThenOnes,
    suggested: ['', '0011', '10', '000'],
  },
  {
    id: 'nfa-even-zeros-or-ends-in-1',
    title: 'NFA — even 0s, or ending in 1',
    language: 'Strings with an even number of 0s, or strings ending in 1.',
    citation: 'Hopcroft 2e, §2.3',
    machine: nfaEvenZerosOrEndsIn1,
    suggested: ['0011', '101', '000', '1'],
  },
  {
    id: 'divisible-by-3',
    title: 'DFA — decimal, divisible by 3',
    language: 'Decimal numerals whose value is divisible by 3.',
    citation: 'Residue-class construction',
    machine: divisibleBy(3),
    suggested: ['12', '123', '7', '90'],
  },
  {
    id: 'divisible-by-5',
    title: 'DFA — decimal, divisible by 5',
    language: 'Decimal numerals whose value is divisible by 5.',
    citation: 'Residue-class construction',
    machine: divisibleBy(5),
    suggested: ['25', '31', '100', '5'],
  },
  {
    id: 'divisible-by-3-binary',
    title: 'DFA — binary, divisible by 3',
    language: 'Binary numerals whose value is divisible by 3.',
    citation: 'Residue-class construction',
    machine: divisibleBy(3, 2),
    suggested: ['110', '1001', '101', '0'],
  },
]

export function galleryEntry(id: string): GalleryEntry | undefined {
  return GALLERY.find((entry) => entry.id === id)
}
