/**
 * Terminology synonyms.
 *
 * The question papers write **DFSM** and **NDFSM** where Hopcroft writes DFA and
 * NFA. A student revising against a past paper searches for the words on the
 * paper, so both spellings resolve to the same thing and both are shown in the
 * docs. Getting this wrong makes the tool feel like it is about a different
 * subject than the exam.
 *
 * Canonical form follows the textbook (ADR-005); the alternatives are what the
 * papers, the lesson plan and JFLAP variously use.
 */

export interface Term {
  canonical: string
  /** Expanded name, as it would be written out in an answer. */
  expansion: string
  alternatives: string[]
}

export const TERMS: Term[] = [
  {
    canonical: 'DFA',
    expansion: 'deterministic finite automaton',
    alternatives: ['DFSM', 'deterministic finite state machine', 'deterministic finite acceptor', 'FSA'],
  },
  {
    canonical: 'NFA',
    expansion: 'nondeterministic finite automaton',
    alternatives: [
      'NDFSM',
      'NDFA',
      'nondeterministic finite state machine',
      'non-deterministic finite automaton',
    ],
  },
  {
    canonical: 'ε-NFA',
    expansion: 'nondeterministic finite automaton with ε-transitions',
    alternatives: ['epsilon-NFA', 'e-NFA', 'NFA with epsilon moves', 'ε-NDFSM'],
  },
  {
    canonical: 'PDA',
    expansion: 'pushdown automaton',
    alternatives: ['NPDA', 'nondeterministic pushdown automaton', 'push-down automaton'],
  },
  {
    canonical: 'TM',
    expansion: 'Turing machine',
    alternatives: ['Turing Machine', 'DTM', 'deterministic Turing machine'],
  },
  {
    canonical: 'CFG',
    expansion: 'context-free grammar',
    alternatives: ['context free grammar', 'CFL grammar'],
  },
  {
    canonical: 'CNF',
    expansion: 'Chomsky normal form',
    alternatives: ['Chomsky Normal Form', 'chomsky normal form'],
  },
  {
    canonical: 'GNF',
    expansion: 'Greibach normal form',
    alternatives: ['Greibach Normal Form'],
  },
  {
    canonical: 'regular expression',
    expansion: 'regular expression',
    alternatives: ['RE', 'regex', 'regexp'],
  },
]

/** Every spelling that resolves to a term, lowercased, for search. */
export function searchKeys(term: Term): string[] {
  return [term.canonical, term.expansion, ...term.alternatives].map((s) => s.toLowerCase())
}

/**
 * Resolve any spelling to its canonical term. Case- and hyphen-insensitive, so
 * "non deterministic finite automaton" and "NDFSM" both land on NFA.
 */
export function resolveTerm(query: string): Term | undefined {
  const needle = normalise(query)
  return TERMS.find((term) => searchKeys(term).some((key) => normalise(key) === needle))
}

/** How a term should be shown when the paper's spelling differs from the book's. */
export function alsoWrittenAs(canonical: string): string[] {
  return TERMS.find((t) => t.canonical === canonical)?.alternatives ?? []
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]/g, '')
}
