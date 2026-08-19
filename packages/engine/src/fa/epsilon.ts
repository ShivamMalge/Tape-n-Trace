/**
 * Removing ε-transitions — Hopcroft 2e §2.5.5.
 *
 * One step per state: its ε-closure computed with the search visible, then the
 * transitions that closure induces. The construction is
 *
 *     δ'(q, a) = ECLOSE( δ( ECLOSE(q), a ) )
 *     F'       = { q : ECLOSE(q) ∩ F ≠ ∅ }
 *
 * with the start state unchanged. Both closures matter and both are where marks
 * are lost: the one *before* reading (the machine may have already moved) and
 * the one *after* (it may move again before the next symbol).
 */

import { faTransitionId, sortStateIds } from '../ids.js'
import { ok, type Result } from '../result.js'
import { TraceBuilder } from '../trace.js'
import { validateFA } from '../validate.js'
import { epsilonClosure } from './simulate.js'
import type { FATransition, FiniteAutomaton, StateId, Step, Trace } from '../types.js'

export interface EpsilonSnapshot {
  source: FiniteAutomaton
  /** The ε-free NFA as far as it has been built. */
  target: FiniteAutomaton
  /** The closure of each state, once computed. */
  closures: Record<StateId, StateId[]>
  /** The state being processed this step. */
  current: StateId | null
  status: 'running' | 'done'
}

/**
 * Convert an ε-NFA to an equivalent NFA with no ε-transitions.
 *
 * A machine that already has none is returned unchanged apart from its `kind`,
 * with a trace saying so — silently doing nothing would leave the student
 * wondering whether the tool had worked.
 */
export function epsilonElim(enfa: FiniteAutomaton): Result<Trace<Step<EpsilonSnapshot>>> {
  const validated = validateFA(enfa)
  if (!validated.ok) return validated

  const source = enfa
  const accepting = new Set(source.accepting)
  const builder = new TraceBuilder<EpsilonSnapshot>('convert.enfa-to-nfa', source)

  const closures: Record<StateId, StateId[]> = {}
  let target: FiniteAutomaton = {
    kind: 'NFA',
    states: [...source.states],
    alphabet: [...source.alphabet],
    transitions: [],
    start: source.start,
    accepting: [],
    ...(source.layout === undefined ? {} : { layout: source.layout }),
  }

  const hasEpsilon = source.transitions.some((t) => t.read === null)

  builder.step({
    narration: hasEpsilon
      ? `The automaton has ${countEpsilon(source)} ε-transitions. Each state's ε-closure decides where it can be before reading anything, and that is what replaces them.`
      : `This automaton has no ε-transitions, so removing them changes nothing but its kind.`,
    citation: '2.5.5',
    highlight: source.transitions
      .filter((t) => t.read === null)
      .map((t) => ({ type: 'transition' as const, id: t.id, role: 'removed' as const })),
    snapshot: { source, target, closures: {}, current: null, status: 'running' },
  })

  for (const state of source.states) {
    const closure = epsilonClosure(source, [state])
    closures[state] = closure
    builder.bump('closuresTaken')

    // Read a symbol from anywhere in the closure, then close again.
    const added: FATransition[] = []
    for (const symbol of source.alphabet) {
      const reached = source.transitions
        .filter((t) => t.read === symbol && closure.includes(t.from))
        .map((t) => t.to)
      if (reached.length === 0) continue

      for (const to of epsilonClosure(source, sortStateIds([...new Set(reached)]))) {
        added.push({ id: faTransitionId(state, symbol, to), from: state, read: symbol, to })
      }
    }

    const nowAccepting = closure.some((id) => accepting.has(id))
    const known = new Set(target.transitions.map((t) => t.id))

    target = {
      ...target,
      transitions: [...target.transitions, ...added.filter((t) => !known.has(t.id))],
      accepting: nowAccepting
        ? // Kept in machine order so the result does not depend on iteration order.
          source.states.filter((s) => s === state || target.accepting.includes(s))
        : target.accepting,
    }

    builder.step({
      narration: describeState(state, closure, added.length, nowAccepting, accepting.has(state)),
      citation: '2.5.3',
      highlight: [
        { type: 'state', id: state, role: 'current' },
        { type: 'symbolSet', ids: closure, role: 'closure' },
        ...added.map((t) => ({ type: 'transition' as const, id: t.id, role: 'added' as const })),
        ...(nowAccepting ? [{ type: 'state' as const, id: state, role: 'accepting' as const }] : []),
      ],
      snapshot: { source, target, closures: { ...closures }, current: state, status: 'running' },
    })
  }

  const finalTarget = target
  builder.step({
    narration: `Every state has been given the moves its ε-closure allows, and the ε-transitions are gone. The NFA has ${finalTarget.transitions.length} transitions and accepts the same language.`,
    citation: '2.5.5, Thm 2.22',
    highlight: finalTarget.accepting.map((id) => ({
      type: 'state' as const,
      id,
      role: 'accepting' as const,
    })),
    snapshot: { source, target: finalTarget, closures, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: finalTarget }))
}

function countEpsilon(fa: FiniteAutomaton): number {
  return fa.transitions.filter((t) => t.read === null).length
}

function describeState(
  state: StateId,
  closure: readonly StateId[],
  added: number,
  nowAccepting: boolean,
  wasAccepting: boolean,
): string {
  const set = `{${closure.join(',')}}`
  const closurePart =
    closure.length === 1
      ? `${state} has no ε-moves out of it, so its ε-closure is just ${set}`
      : `The ε-closure of ${state} is ${set}`

  const movePart =
    added === 0
      ? 'no symbol leads anywhere from that set, so it gains no transitions'
      : `reading each symbol from that set and closing again gives ${added} ${added === 1 ? 'transition' : 'transitions'} out of ${state}`

  const acceptPart =
    nowAccepting && !wasAccepting
      ? `, and because the closure reaches an accepting state, ${state} becomes accepting`
      : ''

  return `${closurePart}, so ${movePart}${acceptPart}.`
}
