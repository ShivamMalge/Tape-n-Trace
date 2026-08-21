/**
 * Everything the RE playground shows, derived from the expression in one pass.
 *
 * **One function, one input, all four panels.** That is not tidiness — it is how
 * the panels are kept in sync. If the parse tree came from one `useMemo` and the
 * DFA from another, a render could pair the tree for `01*` with the machine for
 * `01`, and the student would be looking at two different expressions without
 * being told. Deriving everything from one string in one call makes that
 * unrepresentable rather than merely unlikely.
 */

import {
  displayWord,
  enumerateUpTo,
  epsilonElim,
  isOk,
  minimize,
  nfaToDfa,
  parseRegex,
  regexToENFA,
  simulateDFA,
} from '@tape-n-trace/engine'
import type {
  FiniteAutomaton,
  RegexNode,
  RegexTreeNode,
  Sym,
  ThompsonSnapshot,
  Trace,
  ValidationError,
} from '@tape-n-trace/engine'

export interface MembershipRow {
  word: string
  accepted: boolean
}

export interface Playground {
  /** The expression these panels were built from. */
  source: string
  /** Present when the expression parsed. */
  regex: RegexNode | null
  tree: RegexTreeNode[]
  /** Thompson's ε-NFA, and the trace that built it. */
  enfa: FiniteAutomaton | null
  thompson: Trace | null
  /** The minimal DFA for the same language. */
  dfa: FiniteAutomaton | null
  alphabet: Sym[]
  /** Every string up to `MEMBERSHIP_LENGTH`, marked accepted or not. */
  membership: MembershipRow[]
  /** Parse errors, positioned. Empty when the expression is good. */
  errors: ValidationError[]
}

/** Short enough to read at a glance, long enough to be convincing. */
export const MEMBERSHIP_LENGTH = 4

const EMPTY: Omit<Playground, 'source' | 'errors'> = {
  regex: null,
  tree: [],
  enfa: null,
  thompson: null,
  dfa: null,
  alphabet: [],
  membership: [],
}

function machineOf(trace: Trace): FiniteAutomaton | null {
  return trace.result.type === 'machine' ? (trace.result.machine as FiniteAutomaton) : null
}

/**
 * Build every panel from one expression.
 *
 * `alphabet` is the symbols the expression mentions, widened by `extra` so a
 * playground over {0,1} still shows both columns for an expression that only
 * uses one of them. An expression mentioning nothing at all — `ε` or `∅` — would
 * otherwise have no strings to test against.
 */
export function buildPlayground(source: string, extra: readonly Sym[] = []): Playground {
  const parsed = parseRegex(source)
  if (!isOk(parsed)) return { source, ...EMPTY, errors: parsed.errors }

  const regex = parsed.value
  const alphabet = [...new Set([...symbolsOf(regex), ...extra])].sort()

  const thompson = regexToENFA(regex, alphabet)
  if (!isOk(thompson)) return { source, ...EMPTY, errors: thompson.errors }

  const enfa = machineOf(thompson.value as Trace)
  if (enfa === null) return { source, ...EMPTY, errors: [] }

  const tree = (thompson.value.steps[0]?.snapshot as ThompsonSnapshot | undefined)?.nodes ?? []

  // ε-NFA → NFA → DFA → minimal DFA. Each is a conversion a student can also
  // watch on its own page; here they run to completion because the playground is
  // about the expression, not the constructions.
  const dfa = toMinimalDFA(enfa)

  return {
    source,
    regex,
    tree,
    enfa,
    thompson: thompson.value as Trace,
    dfa,
    alphabet,
    membership: dfa === null ? [] : membershipTable(dfa, alphabet),
    errors: [],
  }
}

function toMinimalDFA(enfa: FiniteAutomaton): FiniteAutomaton | null {
  const free = epsilonElim(enfa)
  if (!isOk(free)) return null
  const nfa = machineOf(free.value as Trace)
  if (nfa === null) return null

  const determined = nfaToDfa(nfa)
  if (!isOk(determined)) return null
  const dfa = machineOf(determined.value as Trace)
  if (dfa === null) return null

  const minimal = minimize(dfa)
  return isOk(minimal) ? machineOf(minimal.value as Trace) : dfa
}

/** Every string up to the bound, with the machine's verdict on each. */
function membershipTable(dfa: FiniteAutomaton, alphabet: readonly Sym[]): MembershipRow[] {
  if (alphabet.length === 0) return []

  const { words } = enumerateUpTo(alphabet, MEMBERSHIP_LENGTH, { limit: 400 })
  return words.map((word) => {
    const run = simulateDFA(dfa, word)
    const accepted = isOk(run) && run.value.result.type === 'acceptance' && run.value.result.accepted
    return { word: displayWord(word), accepted }
  })
}

/** The symbols an expression actually mentions. */
export function symbolsOf(node: RegexNode): Sym[] {
  switch (node.op) {
    case 'symbol':
      return [node.sym]
    case 'star':
      return symbolsOf(node.inner)
    case 'union':
    case 'concat':
      return [...symbolsOf(node.left), ...symbolsOf(node.right)]
    default:
      return []
  }
}
