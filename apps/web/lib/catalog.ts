/**
 * THE ONE LIST of tools — architecture.md §3.
 *
 * Every navigation surface reads from here: the home page, search, the syllabus
 * index, and the "related tools" rail. A tool that exists but is missing from
 * this list is unreachable; a tool listed but not built is a lie the README rule
 * (§2.7) forbids. Hence `status`, which is checked by a test rather than trusted.
 */

export type ToolStatus = 'live' | 'planned'

export interface Tool {
  id: string
  title: string
  /** One sentence, in the words a student would use. */
  summary: string
  href: string
  status: ToolStatus
  /** Which phase builds it, so "planned" is a date rather than a shrug. */
  phase: string
  /** The syllabus modules it serves. */
  modules: number[]
  verb: 'simulate' | 'convert' | 'decide' | 'prove' | 'learn'
}

export const CATALOG: Tool[] = [
  {
    id: 'simulate-fa',
    title: 'Simulate a finite automaton',
    summary: 'Run a DFA, NFA or ε-NFA on an input and watch every step, branch and ε-closure.',
    href: '/simulate',
    status: 'live',
    phase: 'P0.2',
    modules: [1],
    verb: 'simulate',
  },
  {
    id: 'strings-and-languages',
    title: 'Strings and languages',
    summary: 'Alphabets, powers, Σ*, length and concatenation, with every string of length ≤ k listed.',
    href: '/learn/strings',
    status: 'live',
    phase: 'P0.2',
    modules: [1],
    verb: 'learn',
  },
  {
    id: 'convert-nfa-to-dfa',
    title: 'NFA → DFA (subset construction)',
    summary: 'Watch the subset construction build each state, one reachable subset at a time.',
    href: '/convert/nfa-to-dfa',
    status: 'planned',
    phase: 'P0.3',
    modules: [1, 2],
    verb: 'convert',
  },
  {
    id: 'convert-minimize',
    title: 'Minimise a DFA',
    summary: 'Table filling and partition refinement, with the distinguishable pairs marked as they are found.',
    href: '/convert/minimize',
    status: 'planned',
    phase: 'P0.3',
    modules: [2],
    verb: 'convert',
  },
  {
    id: 'regex-playground',
    title: 'Regular expression playground',
    summary: 'Thompson construction from a regular expression, and state elimination back again.',
    href: '/convert/regex',
    status: 'planned',
    phase: 'P0.4',
    modules: [2],
    verb: 'convert',
  },
  {
    id: 'decide-equivalence',
    title: 'Are these two machines equivalent?',
    summary: 'A yes, or the shortest string the two disagree on.',
    href: '/decide/equivalence',
    status: 'planned',
    phase: 'P1.1',
    modules: [2],
    verb: 'decide',
  },
  {
    id: 'pumping-lemma',
    title: 'The pumping lemma game',
    summary: 'Play the adversary, or watch it play you, on a language that is not regular.',
    href: '/prove/pumping',
    status: 'planned',
    phase: 'P1.2',
    modules: [2],
    verb: 'prove',
  },
  {
    id: 'grammars',
    title: 'Grammars, derivations and parse trees',
    summary: 'Leftmost and rightmost derivations, parse trees, ambiguity, and the CNF pipeline.',
    href: '/grammar',
    status: 'planned',
    phase: 'P1.3',
    modules: [3, 4],
    verb: 'convert',
  },
  {
    id: 'pda',
    title: 'Pushdown automata',
    summary: 'Run a PDA and watch the stack move alongside the input.',
    href: '/simulate/pda',
    status: 'planned',
    phase: 'P1.4',
    modules: [3],
    verb: 'simulate',
  },
  {
    id: 'turing-machines',
    title: 'Turing machines',
    summary: 'A tape, a head, and every configuration in between.',
    href: '/simulate/tm',
    status: 'planned',
    phase: 'P1.6',
    modules: [5],
    verb: 'simulate',
  },
]

export function liveTools(): Tool[] {
  return CATALOG.filter((tool) => tool.status === 'live')
}

export function plannedTools(): Tool[] {
  return CATALOG.filter((tool) => tool.status === 'planned')
}

export function toolById(id: string): Tool | undefined {
  return CATALOG.find((tool) => tool.id === id)
}
