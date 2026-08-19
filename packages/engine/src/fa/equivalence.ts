/**
 * Are two automata equivalent, and if not, what is the shortest string that
 * separates them? — Hopcroft 2e §4.1.
 *
 * The product construction, explored breadth-first. Two DFAs are equivalent iff
 * no reachable pair of states is *distinguishing* — one accepting, one not. BFS
 * order is what makes the counterexample the **shortest** one, and that is the
 * whole point: telling a student "your DFA is wrong" is a grade, but telling
 * them "it disagrees with the answer on 0110" is teaching.
 */

import { productStateName } from '../ids.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { LIMITS, TraceBuilder } from '../trace.js'
import { completeDFA, validateFA } from '../validate.js'
import type { FiniteAutomaton, StateId, Step, Sym, Trace } from '../types.js'

/** One node of the product exploration. */
export interface PairNode {
  /** `(p,q)` — canonical, in argument order. */
  id: string
  a: StateId
  b: StateId
  /** The pair this one was reached from, and the symbol that got here. */
  parent: string | null
  via: Sym | null
  /** Exactly one of the two states is accepting: the machines disagree here. */
  distinguishing: boolean
}

export interface EquivalenceSnapshot {
  machineA: FiniteAutomaton
  machineB: FiniteAutomaton
  pairs: PairNode[]
  /** The pair being examined this step. */
  current: string | null
  /** The shortest separating string, once one is found. */
  witness: string | null
  status: 'running' | 'equivalent' | 'different'
}

/**
 * Decide whether two DFAs accept the same language.
 *
 * Both machines are completed first — a missing move means the implicit dead
 * state, and comparing a partial machine against a complete one without saying
 * so would report a difference that is only in the drawing.
 *
 * NFAs are rejected rather than silently determinised: the subset construction
 * is a step a student should watch, not something that happens behind a verdict.
 */
export function equivalence(
  a: FiniteAutomaton,
  b: FiniteAutomaton,
): Result<Trace<Step<EquivalenceSnapshot>>> {
  const problems = [...check(a, 'first'), ...check(b, 'second'), ...sameAlphabet(a, b)]
  if (problems.length > 0) return err(problems)

  const machineA = completeDFA(a, 'deadA')
  const machineB = completeDFA(b, 'deadB')
  const alphabet = machineA.alphabet

  const builder = new TraceBuilder<EquivalenceSnapshot>('decide.equivalence', { a, b })
  const acceptingA = new Set(machineA.accepting)
  const acceptingB = new Set(machineB.accepting)

  const move = (machine: FiniteAutomaton, from: StateId, symbol: Sym): StateId => {
    const t = machine.transitions.find((x) => x.from === from && x.read === symbol)
    // The machines were completed above, so this is a broken invariant, not user error.
    return t === undefined ? from : t.to
  }

  const root: PairNode = {
    id: productStateName(machineA.start, machineB.start),
    a: machineA.start,
    b: machineB.start,
    parent: null,
    via: null,
    distinguishing: acceptingA.has(machineA.start) !== acceptingB.has(machineB.start),
  }

  let pairs: PairNode[] = [root]
  const seen = new Map<string, PairNode>([[root.id, root]])
  const queue: PairNode[] = [root]

  builder.step({
    narration: `Start the product construction at the pair ${root.id}: the start state of each machine.`,
    citation: '4.1.1',
    highlight: [
      { type: 'state', id: machineA.start, role: 'start' },
      { type: 'state', id: machineB.start, role: 'start' },
      { type: 'tableCell', row: root.a, col: root.b, role: 'filling' },
    ],
    snapshot: { machineA, machineB, pairs, current: root.id, witness: null, status: 'running' },
  })

  if (root.distinguishing) {
    return ok(finish(builder, machineA, machineB, pairs, root, '', acceptingA))
  }

  while (queue.length > 0) {
    const pair = queue.shift() as PairNode
    const discovered: PairNode[] = []
    let separator: PairNode | null = null

    for (const symbol of alphabet) {
      const nextA = move(machineA, pair.a, symbol)
      const nextB = move(machineB, pair.b, symbol)
      const id = productStateName(nextA, nextB)
      if (seen.has(id)) continue

      const node: PairNode = {
        id,
        a: nextA,
        b: nextB,
        parent: pair.id,
        via: symbol,
        distinguishing: acceptingA.has(nextA) !== acceptingB.has(nextB),
      }
      seen.set(id, node)
      discovered.push(node)
      if (node.distinguishing && separator === null) separator = node
      else queue.push(node)
    }

    pairs = [...pairs, ...discovered]

    if (seen.size > LIMITS.SUBSET_STATES) {
      builder.truncate(
        `The product passed ${LIMITS.SUBSET_STATES} pairs, so the comparison was stopped.`,
        LIMITS.SUBSET_STATES,
      )
    }

    builder.bump('pairsExplored')
    builder.step({
      narration: describePair(pair, discovered, separator),
      citation: '4.1.1',
      highlight: [
        { type: 'state', id: pair.a, role: 'current' },
        { type: 'state', id: pair.b, role: 'current' },
        { type: 'tableCell', row: pair.a, col: pair.b, role: 'filled' },
        ...discovered.map((n) => ({
          type: 'tableCell' as const,
          row: n.a,
          col: n.b,
          role: n.distinguishing ? ('witness' as const) : ('filling' as const),
        })),
      ],
      snapshot: {
        machineA,
        machineB,
        pairs,
        current: pair.id,
        witness: null,
        status: 'running',
      },
    })

    if (separator !== null) {
      return ok(
        finish(builder, machineA, machineB, pairs, separator, wordTo(separator, seen), acceptingA),
      )
    }

    if (builder.truncated) {
      return ok(
        builder.build({
          type: 'incomplete',
          reason: `The product construction passed ${LIMITS.SUBSET_STATES} pairs before finishing.`,
          bounded: { searchedUpTo: seen.size, unit: 'steps' },
        }),
      )
    }
  }

  builder.step({
    narration: `Every reachable pair agrees on acceptance, so the two automata accept exactly the same language.`,
    citation: '4.1.2',
    highlight: [],
    snapshot: { machineA, machineB, pairs, current: null, witness: null, status: 'equivalent' },
  })

  return ok(builder.build({ type: 'verdict', holds: true }))
}

function finish(
  builder: TraceBuilder<EquivalenceSnapshot>,
  machineA: FiniteAutomaton,
  machineB: FiniteAutomaton,
  pairs: PairNode[],
  separator: PairNode,
  witness: string,
  acceptingA: Set<StateId>,
): Trace<Step<EquivalenceSnapshot>> {
  const acceptedBy = acceptingA.has(separator.a) ? 'the first' : 'the second'
  const rejectedBy = acceptingA.has(separator.a) ? 'the second' : 'the first'
  const shown = witness === '' ? 'the empty string' : `"${witness}"`

  builder.step({
    narration: `The pair ${separator.id} separates them: ${acceptedBy} machine accepts ${shown} and ${rejectedBy} rejects it, so the two are not equivalent.`,
    citation: '4.1.2',
    highlight: [
      { type: 'state', id: separator.a, role: 'marked' },
      { type: 'state', id: separator.b, role: 'marked' },
      { type: 'tableCell', row: separator.a, col: separator.b, role: 'witness' },
    ],
    snapshot: { machineA, machineB, pairs, current: separator.id, witness, status: 'different' },
  })

  return builder.build({ type: 'verdict', holds: false, witness })
}

/** Walk parent links back to the root, spelling out the string that got here. */
function wordTo(node: PairNode, seen: Map<string, PairNode>): string {
  const symbols: Sym[] = []
  let current: PairNode | undefined = node

  while (current !== undefined && current.parent !== null) {
    if (current.via !== null) symbols.unshift(current.via)
    current = seen.get(current.parent)
  }

  return symbols.join('')
}

function describePair(pair: PairNode, discovered: PairNode[], separator: PairNode | null): string {
  if (separator !== null) {
    return `From ${pair.id}, reading "${separator.via ?? ''}" reaches ${separator.id}, where exactly one of the two states is accepting.`
  }
  if (discovered.length === 0) {
    return `The pair ${pair.id} leads only to pairs already seen, so it adds nothing new.`
  }
  const names = discovered.map((n) => n.id).join(', ')
  return `From ${pair.id}, reading each symbol reaches ${names}. Both states agree on acceptance in every one, so the search continues.`
}

function check(fa: FiniteAutomaton, which: string): ValidationError[] {
  const validated = validateFA(fa)
  if (!validated.ok) return validated.errors

  if (fa.kind !== 'DFA') {
    return [
      validationError(
        'EQUIVALENCE_NEEDS_DFA',
        `The ${which} automaton is an ${fa.kind}. Convert it to a DFA first — the subset construction is a step worth watching, not one to hide behind a verdict.`,
        { kind: 'machine' },
      ),
    ]
  }

  return []
}

function sameAlphabet(a: FiniteAutomaton, b: FiniteAutomaton): ValidationError[] {
  const left = [...new Set(a.alphabet)].sort()
  const right = [...new Set(b.alphabet)].sort()
  if (left.length === right.length && left.every((s, i) => s === right[i])) return []

  return [
    validationError(
      'ALPHABET_MISMATCH',
      `The two automata are over different alphabets — {${left.join(', ')}} and {${right.join(', ')}}. Equivalence is only meaningful over one alphabet.`,
      { kind: 'machine' },
    ),
  ]
}

/**
 * Whether two DFAs accept the same language, without the trace. For engine
 * internals and tests; the UI always wants the trace, because the point is the
 * witness rather than the boolean.
 */
export function areEquivalent(a: FiniteAutomaton, b: FiniteAutomaton): boolean {
  const result = equivalence(a, b)
  return result.ok && result.value.result.type === 'verdict' && result.value.result.holds
}

/** The shortest string the two disagree on, or `null` if they agree. */
export function separatingWord(a: FiniteAutomaton, b: FiniteAutomaton): string | null {
  const result = equivalence(a, b)
  if (!result.ok || result.value.result.type !== 'verdict') return null
  const { holds, witness } = result.value.result
  return holds ? null : ((witness as string | undefined) ?? '')
}
