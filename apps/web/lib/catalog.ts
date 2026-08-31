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
    id: 'board',
    title: 'Classroom board',
    summary:
      'Draw states and arcs freehand on a dark board; each stroke is recognised and redrawn, and the machine it makes runs from the same screen.',
    href: '/board',
    status: 'live',
    phase: 'U4',
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
    status: 'live',
    phase: 'P0.3',
    modules: [1, 2],
    verb: 'convert',
  },
  {
    id: 'convert-minimize',
    title: 'Minimise a DFA',
    summary: 'Table filling and partition refinement, with the distinguishable pairs marked as they are found.',
    href: '/convert/minimize',
    status: 'live',
    phase: 'P0.3',
    modules: [2],
    verb: 'convert',
  },
  {
    id: 'regex-playground',
    title: 'Regular expression playground',
    summary: 'Thompson construction from a regular expression, and state elimination back again.',
    href: '/regex',
    status: 'live',
    phase: 'P0.4',
    modules: [2],
    verb: 'convert',
  },
  {
    id: 'closure-lab',
    title: 'Closure lab',
    summary:
      'Union, intersection, complement, difference, reversal and homomorphisms — each built step by step.',
    href: '/closure',
    status: 'live',
    phase: 'P0.4',
    modules: [2],
    verb: 'convert',
  },
  {
    id: 'text-search',
    title: 'Text and keyword search',
    summary:
      'Keywords to a guessing NFA to a recognising DFA, scanning real text with overlapping matches.',
    href: '/search',
    status: 'live',
    phase: 'P0.4',
    modules: [1],
    verb: 'simulate',
  },
  {
    id: 'applied-cases',
    title: 'Applied case studies',
    summary:
      "The department's own Module 1 and 2 case studies, as machines you can run.",
    href: '/applied',
    status: 'live',
    phase: 'P0.4',
    modules: [1, 2],
    verb: 'learn',
  },
  {
    id: 'unix-regex',
    title: 'UNIX regular expressions',
    summary:
      'Which extended operators are shorthand and which are not, plus a longest-match lexer.',
    href: '/learn/unix-regex',
    status: 'live',
    phase: 'P0.4',
    modules: [2],
    verb: 'learn',
  },
  {
    id: 'decide-equivalence',
    title: 'Practice — the question bank',
    summary: 'Construction exercises graded exactly, with the shortest disagreeing string as feedback.',
    href: '/practice',
    status: 'live',
    phase: 'P1.1',
    modules: [2],
    verb: 'decide',
  },
  {
    id: 'pumping-lemma',
    title: 'The pumping lemma game',
    summary: 'Play the adversary, or watch it play you, on a language that is not regular.',
    href: '/prove/pumping',
    status: 'live',
    phase: 'P1.2',
    modules: [2],
    verb: 'prove',
  },
  {
    id: 'grammars',
    title: 'Grammars, derivations and parse trees',
    summary: 'Derivations with growing parse trees, the ambiguity detector, and left recursion elimination.',
    href: '/grammar',
    status: 'live',
    phase: 'P1.3',
    modules: [3, 4],
    verb: 'convert',
  },
  {
    id: 'pda',
    title: 'Pushdown automata',
    summary:
      'Run a PDA with state, input and stack in sync, the branch tree for every guess, and the ID sequence written out.',
    href: '/simulate/pda',
    status: 'live',
    phase: 'P1.4',
    modules: [3],
    verb: 'simulate',
  },
  {
    id: 'edit-pda',
    title: 'Build a PDA',
    summary:
      'Type δ line by line, see the machine drawn with a, X/YX labels, and check whether it is deterministic — pair by overlapping pair.',
    href: '/edit/pda',
    status: 'live',
    phase: 'P1.4',
    modules: [3],
    verb: 'simulate',
  },
  {
    id: 'convert-pda-acceptance',
    title: 'PDA acceptance modes',
    summary: 'Final state to empty stack and back, with the bottom marker doing the work.',
    href: '/convert/pda-acceptance',
    status: 'live',
    phase: 'P1.4',
    modules: [3],
    verb: 'convert',
  },
  {
    id: 'convert-cfg-to-pda',
    title: 'Grammar → PDA',
    summary: 'The one-state construction of Theorem 6.13, then the built machine run on real inputs.',
    href: '/convert/cfg-to-pda',
    status: 'live',
    phase: 'P1.4',
    modules: [3],
    verb: 'convert',
  },
  {
    id: 'grammar-simplify',
    title: 'Simplification and CNF',
    summary:
      'ε-productions, unit productions, useless symbols and Chomsky Normal Form as one pipeline in the safe order, the grammar diffed at each stage.',
    href: '/grammar/simplify',
    status: 'live',
    phase: 'P1.5',
    modules: [4],
    verb: 'convert',
  },
  {
    id: 'cfl-closure',
    title: 'CFL closure lab',
    summary:
      'Union, concatenation, closure, reversal, substitution, intersection with a regular language, inverse homomorphism — and the intersection that fails.',
    href: '/closure/cfl',
    status: 'live',
    phase: 'P1.5',
    modules: [4],
    verb: 'prove',
  },
  {
    id: 'turing-machines',
    title: 'Turing machines',
    summary:
      'The chapter 8 machines run on a scrolling tape, the ID sequence written out, and a non-halting run stopped honestly.',
    href: '/simulate/tm',
    status: 'live',
    phase: 'P1.6',
    modules: [5],
    verb: 'simulate',
  },
  {
    id: 'edit-tm',
    title: 'Build a Turing machine',
    summary: 'Type δ one move per line, see the diagram with X/Y → labels, and run it — one tape or several.',
    href: '/edit/tm',
    status: 'live',
    phase: 'P1.6',
    modules: [5],
    verb: 'simulate',
  },
  {
    id: 'convert-tm-multitape',
    title: 'Many tapes to one',
    summary: 'Theorem 8.9 animated, with the 4n + 2k cost of Theorem 8.10 counted live.',
    href: '/convert/tm-multitape',
    status: 'live',
    phase: 'P1.6',
    modules: [5],
    verb: 'convert',
  },
  {
    id: 'undecidability',
    title: 'Undecidability',
    summary:
      'Recursive inside RE inside everything, the four places a language and its complement can sit, and what the two classes are closed under.',
    href: '/undecidable',
    status: 'live',
    phase: 'P1.7',
    modules: [5],
    verb: 'prove',
  },
  {
    id: 'diagonalization',
    title: 'The diagonalization table',
    summary:
      'Fig. 9.1 with every cell computed: machines decoded from binary strings, run under a step budget, and a diagonal you can complement.',
    href: '/undecidable/diagonalization',
    status: 'live',
    phase: 'P1.7',
    modules: [5],
    verb: 'prove',
  },
  {
    id: 'reduction-builder',
    title: 'The reduction builder',
    summary: 'Drop one problem onto another to build A ≤ B, with the construction and the contradiction drawn — and the wrong direction refused.',
    href: '/undecidable/reduction',
    status: 'live',
    phase: 'P1.7',
    modules: [5],
    verb: 'prove',
  },
  {
    id: 'hierarchy',
    title: 'The hierarchy of language classes',
    summary: 'Nested rings from regular out to every language, each with its machine, its closure and its pumping lemma, and the languages that separate them.',
    href: '/hierarchy',
    status: 'live',
    phase: 'P1.7',
    modules: [1, 2, 3, 4, 5],
    verb: 'learn',
  },
]

export interface NavLink {
  href: string
  label: string
}

export interface NavGroup {
  id: string
  /** The module number as the bar shows it. */
  n: number
  /** The short name on the bar button. */
  label: string
  /** The full name the panel strip opens with. */
  title: string
  /** One sentence under the title, in the panel strip. */
  blurb: string
  links: NavLink[]
}

/**
 * The top bar's modules — design artboard 01, "the 13-link nav folded into five
 * modules".
 *
 * Here rather than in the layout so that adding a tool is a change to this file
 * and `topics.ts`, and to nothing else — `test/syllabus.test.tsx` reads
 * `app/layout.tsx` and fails if a link is hard-coded back into it.
 *
 * **Grouped by module, because the course is.** The five buttons are the five
 * modules of BTOCH503; the verb a tool belongs to (simulate, convert, decide,
 * prove, learn) is the tag on its catalog card, one per tool, never two. Not
 * every live tool is here — the panel is for the ones a student reaches for;
 * the home page renders `CATALOG` in full, and a test asserts every live tool
 * is reachable from one or the other.
 */
export const NAV: NavGroup[] = [
  {
    id: 'm1',
    n: 1,
    label: 'Automata',
    title: 'Finite automata',
    blurb: 'Build a machine and watch it read.',
    links: [
      { href: '/simulate', label: 'Simulate' },
      { href: '/board', label: 'Classroom board' },
      { href: '/search', label: 'Text search' },
      { href: '/learn/strings', label: 'Strings & languages' },
    ],
  },
  {
    id: 'm2',
    n: 2,
    label: 'Equivalence',
    title: 'Equivalence & conversion',
    blurb: 'Move between the four representations of a regular language.',
    links: [
      { href: '/convert', label: 'Convert' },
      { href: '/convert/nfa-to-dfa', label: 'NFA → DFA' },
      { href: '/convert/minimize', label: 'Minimise' },
      { href: '/regex', label: 'Regex' },
      { href: '/learn/unix-regex', label: 'UNIX regexes' },
    ],
  },
  {
    id: 'm3',
    n: 3,
    label: 'Properties',
    title: 'Properties & proofs',
    blurb: 'Decide what a language is, and write down why.',
    links: [
      { href: '/closure', label: 'Closure' },
      { href: '/prove/pumping', label: 'Pumping' },
      { href: '/practice', label: 'Question bank' },
      { href: '/hierarchy', label: 'The hierarchy' },
    ],
  },
  {
    id: 'm4',
    n: 4,
    label: 'Grammars',
    title: 'Grammars & pushdown automata',
    blurb: 'Context-free languages, their grammars and their machines.',
    links: [
      { href: '/grammar', label: 'Grammars' },
      { href: '/simulate/pda', label: 'PDA' },
      { href: '/edit/pda', label: 'Build a PDA' },
      { href: '/grammar/simplify', label: 'CNF' },
      { href: '/closure/cfl', label: 'CFL closure' },
    ],
  },
  {
    id: 'm5',
    n: 5,
    label: 'Machines',
    title: 'Turing machines',
    blurb: 'The full model, worked examples and graded practice.',
    links: [
      { href: '/simulate/tm', label: 'TM' },
      { href: '/edit/tm', label: 'Build a TM' },
      { href: '/undecidable', label: 'Undecidability' },
      { href: '/applied', label: 'Case studies' },
      { href: '/syllabus', label: 'Syllabus' },
    ],
  },
]

/** The bar's standalone links, to the right of the modules. */
export const NAV_EXTRAS: NavLink[] = [{ href: '/practice', label: 'Practice' }]

/** Every rail link, flattened. */
export function navLinks(): NavLink[] {
  return NAV.flatMap((group) => group.links)
}

export function liveTools(): Tool[] {
  return CATALOG.filter((tool) => tool.status === 'live')
}

export function plannedTools(): Tool[] {
  return CATALOG.filter((tool) => tool.status === 'planned')
}

export function toolById(id: string): Tool | undefined {
  return CATALOG.find((tool) => tool.id === id)
}
