/**
 * THE ONE LIST of conversions — the `/convert` counterpart to `catalog.ts`.
 *
 * Each entry says what it takes in, what it runs, and how to read the result.
 * The stepper shell is generic over this list, so adding the CNF pipeline in
 * P1.3 is an entry here rather than a new page.
 *
 * `run` returns a `Result`, never throws, and never touches the DOM — it is a
 * straight call into the engine. The controller owns everything else.
 */

import {
  dfaToRegex,
  epsilonElim,
  grammarToNFA,
  minimize,
  nfaToDfa,
  parseRegex,
  regexToENFA,
  validationError,
} from '@tape-n-trace/engine'
import type { CFG, FiniteAutomaton, Result, Trace } from '@tape-n-trace/engine'

/** What a conversion needs before it can run. */
export type ConversionInput =
  | { kind: 'machine'; machine: FiniteAutomaton }
  | { kind: 'regex'; source: string }
  | { kind: 'grammar'; grammar: CFG }

export interface Conversion {
  id: string
  title: string
  /** One sentence: what goes in, what comes out. */
  summary: string
  citation: string
  /** Which source picker the page shows. */
  takes: 'machine' | 'regex' | 'grammar'
  /** For machine sources, the kinds this conversion accepts. */
  accepts?: FiniteAutomaton['kind'][]
  /** Beyond the prescribed scheme — ADR-003. Shown, but labelled. */
  enrichment?: boolean
  /** How to read what appears on screen, in the words a lecturer would use. */
  reading: string[]
  run: (input: ConversionInput) => Result<Trace>
}

/** Narrow an input, or explain why it is the wrong shape. */
function needsMachine(input: ConversionInput): FiniteAutomaton | null {
  return input.kind === 'machine' ? input.machine : null
}

function wrongInput(expected: string): Result<Trace> {
  return {
    ok: false,
    errors: [
      validationError('WRONG_INPUT_KIND', `This conversion needs ${expected}.`, { kind: 'machine' }),
    ],
  }
}

export const CONVERSIONS: Conversion[] = [
  {
    id: 'nfa-to-dfa',
    title: 'NFA → DFA',
    summary:
      'The subset construction: every set of NFA states the machine could be in becomes one DFA state.',
    citation: 'Hopcroft 2e, §2.3.5 (and §2.5.5 for an ε-NFA)',
    takes: 'machine',
    accepts: ['NFA', 'ENFA', 'DFA'],
    reading: [
      'The table underneath is the subset table, one row per DFA state.',
      'A row is expanded per step: where it goes on each symbol, and which of those subsets are new.',
      'The DFA on the right grows a state at a time — only subsets that are actually reachable are built.',
    ],
    run: (input) => {
      const machine = needsMachine(input)
      return machine === null ? wrongInput('an automaton') : (nfaToDfa(machine) as Result<Trace>)
    },
  },
  {
    id: 'enfa-to-nfa',
    title: 'ε-NFA → NFA',
    summary: 'Remove ε-transitions by giving every state the moves its ε-closure allows.',
    citation: 'Hopcroft 2e, §2.5.3',
    takes: 'machine',
    accepts: ['ENFA', 'NFA', 'DFA'],
    reading: [
      'One step per state: its ε-closure first, then the transitions that closure induces.',
      'A state becomes accepting when its closure can reach an accepting state — the step that catches most people out.',
      'Hopcroft goes straight from an ε-NFA to a DFA. This stops at an ε-free NFA so the two halves can be watched apart.',
    ],
    run: (input) => {
      const machine = needsMachine(input)
      return machine === null ? wrongInput('an automaton') : (epsilonElim(machine) as Result<Trace>)
    },
  },
  {
    id: 'minimize',
    title: 'Minimise a DFA',
    summary: 'Table filling: mark every distinguishable pair, then merge what is left.',
    citation: 'Hopcroft 2e, §4.4.1 and §4.4.3',
    takes: 'machine',
    accepts: ['DFA'],
    reading: [
      'Unreachable states go first — they are equivalent to nothing and would sit in the table forever.',
      'Round 0 marks every pair with one accepting state and one not. Later rounds mark a pair whose successors are already marked.',
      'The number in a cell is the round it was marked in, so the finished table is the proof, not just the answer.',
    ],
    run: (input) => {
      const machine = needsMachine(input)
      return machine === null ? wrongInput('a DFA') : (minimize(machine) as Result<Trace>)
    },
  },
  {
    id: 'dfa-to-re',
    title: 'DFA → regular expression',
    summary: 'State elimination: rip out one state at a time, relabelling the paths that went through it.',
    citation: 'Hopcroft 2e, §3.2.2',
    takes: 'machine',
    accepts: ['DFA', 'NFA', 'ENFA'],
    reading: [
      'A fresh start and a fresh accepting state come first, so there is one way in and one way out.',
      'Removing r turns every p → r → q into a single edge labelled R(p,q) + R(p,r) R(r,r)* R(r,q).',
      'When only the two new states remain, the label between them is the answer.',
    ],
    run: (input) => {
      const machine = needsMachine(input)
      return machine === null ? wrongInput('an automaton') : (dfaToRegex(machine) as Result<Trace>)
    },
  },
  {
    id: 're-to-enfa',
    title: 'Regular expression → ε-NFA',
    summary: "Thompson's construction, one parse-tree node at a time, bottom-up.",
    citation: 'Hopcroft 2e, §3.2.3',
    takes: 'regex',
    reading: [
      'The parse tree shows the reading: star binds tightest, then concatenation, then union.',
      'Each node builds a fragment with exactly one start and one accepting state, which is what makes the operators composable.',
      'The ε-transitions are the price of that composability. Removing them is a separate conversion.',
    ],
    run: (input) => {
      if (input.kind !== 'regex') return wrongInput('a regular expression')
      const parsed = parseRegex(input.source)
      if (!parsed.ok) return parsed
      return regexToENFA(parsed.value) as Result<Trace>
    },
  },
  {
    id: 'grammar-to-nfa',
    title: 'Regular grammar → NFA',
    summary: 'Each variable becomes a state and each production becomes a move.',
    citation: 'Beyond the prescribed text — see docs/citations.md',
    takes: 'grammar',
    enrichment: true,
    reading: [
      'A → aB reads a and moves to B. A → a reads a and finishes. A → ε makes A accepting.',
      'A right-linear grammar and an NFA are the same object written two ways.',
      'This topic is not in Hopcroft 2e and is not examined on this course — it is here as enrichment.',
    ],
    run: (input) =>
      input.kind === 'grammar'
        ? (grammarToNFA(input.grammar) as Result<Trace>)
        : wrongInput('a right-linear grammar'),
  },
]

export function conversionById(id: string): Conversion | undefined {
  return CONVERSIONS.find((c) => c.id === id)
}
