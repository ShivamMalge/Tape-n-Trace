/**
 * The subset construction — Hopcroft 2e §2.3.5, and §2.5.5 for ε-NFAs.
 *
 * One step per row of the subset table: the subset being processed, where it
 * goes on each symbol, and which of those targets are new. The growing DFA is in
 * every snapshot, so the renderer can show it appearing state by state — which
 * is the part a textbook prints only as a finished table.
 *
 * Only *reachable* subsets are built. Constructing all 2^n and then pruning is
 * how the construction is defined but not how anyone performs it, and the
 * difference is the whole reason the exponential blow-up is usually theoretical.
 */

import { faTransitionId, sortStateIds, subsetStateName } from '../ids.js'
import { ok, type Result } from '../result.js'
import { LIMITS, TraceBuilder } from '../trace.js'
import { validateFA } from '../validate.js'
import { epsilonClosure } from './simulate.js'
import type { FATransition, FiniteAutomaton, StateId, Step, Sym, Trace } from '../types.js'

/** One row of the subset table, as a student would write it. */
export interface SubsetRow {
  /** The canonical name of the subset, e.g. `{q0,q1}`. */
  name: StateId
  members: StateId[]
  /** Where this subset goes on each symbol, by symbol. */
  moves: Record<Sym, StateId>
  /** Whether the row has been expanded yet. */
  processed: boolean
}

export interface SubsetSnapshot {
  source: FiniteAutomaton
  /** The DFA as far as it has been built. */
  target: FiniteAutomaton
  table: SubsetRow[]
  /** The subset being expanded this step. */
  current: StateId | null
  /** Subsets discovered this step and not seen before. */
  discovered: StateId[]
  status: 'running' | 'done' | 'stopped'
}

/**
 * Convert an NFA (or ε-NFA) to an equivalent DFA.
 *
 * For an ε-NFA the start subset is the ε-closure of the start state and every
 * move is closed afterwards, which is §2.5.5 — the two constructions are the
 * same procedure with closure threaded through it.
 */
export function nfaToDfa(nfa: FiniteAutomaton): Result<Trace<Step<SubsetSnapshot>>> {
  const validated = validateFA(nfa)
  if (!validated.ok) return validated

  const source = nfa
  const usesClosure = source.kind === 'ENFA'
  const alphabet = source.alphabet
  const accepting = new Set(source.accepting)

  const close = (states: readonly StateId[]): StateId[] =>
    usesClosure ? epsilonClosure(source, states) : sortStateIds([...new Set(states)])

  const startMembers = close([source.start])
  const startName = subsetStateName(startMembers)

  const rows = new Map<StateId, SubsetRow>()
  const members = new Map<StateId, StateId[]>([[startName, startMembers]])
  const queue: StateId[] = [startName]
  rows.set(startName, { name: startName, members: startMembers, moves: {}, processed: false })

  const builder = new TraceBuilder<SubsetSnapshot>('convert.nfa-to-dfa', source)

  /**
   * The construction accumulates into mutable local state and materialises an
   * immutable machine only when a step is actually emitted.
   *
   * Rebuilding the partial DFA on every row instead would cost O(rows × states)
   * — at the 2^12 cap, sixteen million array entries for snapshots nobody will
   * ever look at. This keeps the silent phase linear.
   */
  const transitions: FATransition[] = []
  const known = new Set<string>()
  const materialise = (): FiniteAutomaton => {
    const names = [...rows.keys()]
    return {
      kind: 'DFA',
      states: names,
      alphabet: [...source.alphabet],
      transitions: [...transitions],
      start: startName,
      // A subset is accepting exactly when it contains an accepting state of the
      // NFA — including `{}`, which never does, so the dead subset falls out free.
      accepting: names.filter((name) => (members.get(name) ?? []).some((m) => accepting.has(m))),
    }
  }

  let target = emptyTarget(source, startName)
  builder.bump('statesCreated')

  builder.step({
    narration: usesClosure
      ? `Start from the ε-closure of ${source.start}, which is ${startName}. That subset is the start state of the DFA.`
      : `Start from the subset containing just the start state: ${startName}. That subset is the start state of the DFA.`,
    citation: usesClosure ? '2.5.5' : '2.3.5',
    highlight: [
      ...startMembers.map((id) => ({ type: 'state' as const, id, role: 'marked' as const })),
      { type: 'state', id: startName, role: 'new' },
    ],
    snapshot: {
      source,
      target,
      table: tableOf(rows),
      current: null,
      discovered: [startName],
      status: 'running',
    },
  })

  while (queue.length > 0) {
    const name = queue.shift() as StateId
    const row = rows.get(name) as SubsetRow
    const currentMembers = members.get(name) as StateId[]

    const moves: Record<Sym, StateId> = {}
    const discovered: StateId[] = []
    const added: FATransition[] = []

    for (const symbol of alphabet) {
      const reached = source.transitions
        .filter((t) => t.read === symbol && currentMembers.includes(t.from))
        .map((t) => t.to)
      const targetMembers = close(reached)
      const targetName = subsetStateName(targetMembers)

      moves[symbol] = targetName

      if (!rows.has(targetName)) {
        rows.set(targetName, { name: targetName, members: targetMembers, moves: {}, processed: false })
        members.set(targetName, targetMembers)
        queue.push(targetName)
        discovered.push(targetName)
        builder.bump('statesCreated')
      }

      added.push({ id: faTransitionId(name, symbol, targetName), from: name, read: symbol, to: targetName })
    }

    rows.set(name, { ...row, moves, processed: true })
    for (const t of added) {
      if (known.has(t.id)) continue
      known.add(t.id)
      transitions.push(t)
    }

    // The hard stop is the pedagogical point of §2.3.6: the construction is
    // exponential, and the tool has to *show* that rather than hang.
    if (rows.size > LIMITS.SUBSET_STATES) {
      target = materialise()
      builder.truncate(
        `The subset construction passed ${LIMITS.SUBSET_STATES} states. That is the exponential blow-up of §2.3.6 in practice: an n-state NFA can need 2^n DFA states, and this NFA is one that does.`,
        LIMITS.SUBSET_STATES,
        // Outranks the narration cap: this one changed the answer.
        { replace: true },
      )
      builder.step({
        narration: `The construction has produced more than ${LIMITS.SUBSET_STATES} subsets and is stopped here. This automaton is a case where the subset construction really is exponential.`,
        citation: '2.3.6',
        highlight: [],
        snapshot: {
          source,
          target,
          table: tableOf(rows),
          current: name,
          discovered,
          status: 'stopped',
        },
      })
      return ok(
        builder.build({
          type: 'incomplete',
          reason: `The subset construction reached the ${LIMITS.SUBSET_STATES}-state cap, which is the exponential case of §2.3.6.`,
          bounded: { searchedUpTo: rows.size, unit: 'steps' },
        }),
      )
    }

    // Past the narration cap the construction carries on silently: the answer
    // stays honest, only the commentary stops. See LIMITS.TRACE_STEPS.
    if (builder.length >= LIMITS.TRACE_STEPS) {
      builder.truncate(
        `The construction runs to more than ${LIMITS.TRACE_STEPS} subsets, so it is narrated up to that point and then completed without commentary.`,
        LIMITS.TRACE_STEPS,
      )
      continue
    }

    target = materialise()
    builder.step({
      narration: describeRow(name, currentMembers, moves, discovered, alphabet),
      citation: usesClosure ? '2.5.5' : '2.3.5',
      highlight: [
        { type: 'state', id: name, role: 'current' },
        ...currentMembers.map((id) => ({ type: 'state' as const, id, role: 'marked' as const })),
        ...discovered.map((id) => ({ type: 'state' as const, id, role: 'new' as const })),
        ...added.map((t) => ({ type: 'transition' as const, id: t.id, role: 'added' as const })),
        ...alphabet.map((symbol) => ({
          type: 'tableCell' as const,
          row: name,
          col: symbol,
          role: 'filled' as const,
        })),
      ],
      snapshot: { source, target, table: tableOf(rows), current: name, discovered, status: 'running' },
    })
  }

  const finalTarget = materialise()
  builder.step({
    narration: `Every subset has been expanded. The DFA has ${finalTarget.states.length} ${finalTarget.states.length === 1 ? 'state' : 'states'}, and accepts exactly the language the NFA does.`,
    citation: '2.3.5, Thm 2.11',
    highlight: finalTarget.accepting.map((id) => ({
      type: 'state' as const,
      id,
      role: 'accepting' as const,
    })),
    snapshot: {
      source,
      target: finalTarget,
      table: tableOf(rows),
      current: null,
      discovered: [],
      status: 'done',
    },
  })

  return ok(builder.build({ type: 'machine', machine: finalTarget }))
}

function emptyTarget(source: FiniteAutomaton, startName: StateId): FiniteAutomaton {
  return {
    kind: 'DFA',
    states: [startName],
    alphabet: [...source.alphabet],
    transitions: [],
    start: startName,
    accepting: [],
  }
}

function tableOf(rows: Map<StateId, SubsetRow>): SubsetRow[] {
  return [...rows.values()]
}

function describeRow(
  name: StateId,
  currentMembers: readonly StateId[],
  moves: Record<Sym, StateId>,
  discovered: readonly StateId[],
  alphabet: readonly Sym[],
): string {
  const source = currentMembers.length === 0 ? 'the empty subset' : name
  const legs = alphabet.map((symbol) => `on "${symbol}" it goes to ${moves[symbol] ?? '{}'}`).join(', and ')

  if (discovered.length === 0) {
    return `Expand ${source}: ${legs}. Every one of those subsets is already in the table.`
  }
  const fresh = discovered.join(', ')
  const plural = discovered.length === 1 ? 'is a new DFA state' : 'are new DFA states'
  return `Expand ${source}: ${legs}. ${fresh} ${plural}, so they join the table.`
}
