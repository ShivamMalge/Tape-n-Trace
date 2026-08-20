/**
 * DFA minimisation by table filling — Hopcroft 2e §4.4.
 *
 * One step per marking round, so the triangular table fills in the way it does
 * on a blackboard: round 0 marks every pair where exactly one state is
 * accepting, and each later round marks a pair whose successors on some symbol
 * are already marked. The round number stays in the cell, which is what turns
 * the table from an answer into an argument.
 *
 * Two things happen before the table. Unreachable states are removed (§4.4.3) —
 * they are trivially equivalent to nothing and would sit in the table forever.
 * And the DFA is completed, because δ must be total for "where do these two go
 * on a?" to have an answer; the trap state that appears is the implicit dead
 * state a textbook diagram leaves off, and it is a genuine state of the minimal
 * machine.
 */

import { faTransitionId, subsetStateName } from '../ids.js'
import { ok, type Result } from '../result.js'
import { TraceBuilder } from '../trace.js'
import { completeDFA, validateFA } from '../validate.js'
import { err, validationError } from '../result.js'
import type { FiniteAutomaton, StateId, Step, Sym, Trace } from '../types.js'

export interface MinimizeSnapshot {
  /** The DFA the table is built over: reachable states only, and completed. */
  source: FiniteAutomaton
  /** The merged machine, once the table is finished. */
  target: FiniteAutomaton | null
  /** The states forming the table's rows and columns, in order. */
  states: StateId[]
  /** Pair key to the round it was marked in. Unmarked pairs are absent. */
  marks: Record<string, number>
  round: number
  /** The equivalence classes, once the table has settled. */
  blocks: StateId[][] | null
  status: 'running' | 'done'
}

/** `p|q`, with the two states in table order so a pair has exactly one key. */
export function pairKey(order: readonly StateId[], p: StateId, q: StateId): string {
  return order.indexOf(p) < order.indexOf(q) ? `${p}|${q}` : `${q}|${p}`
}

export function minimize(dfa: FiniteAutomaton): Result<Trace<Step<MinimizeSnapshot>>> {
  const validated = validateFA(dfa)
  if (!validated.ok) return validated

  if (dfa.kind !== 'DFA') {
    return err([
      validationError(
        'MINIMIZE_NEEDS_DFA',
        `Table filling is defined for a DFA, and this is an ${dfa.kind}. Run the subset construction first.`,
        { kind: 'machine' },
      ),
    ])
  }

  const builder = new TraceBuilder<MinimizeSnapshot>('convert.minimize', dfa)

  const reachable = reachableFrom(dfa)
  const dropped = dfa.states.filter((s) => !reachable.has(s))
  const pruned = dropped.length === 0 ? dfa : restrictTo(dfa, reachable)
  const source = completeDFA(pruned)
  const states = source.states
  const accepting = new Set(source.accepting)

  builder.step({
    narration:
      dropped.length === 0
        ? `Every state is reachable from ${source.start}, so the table is built over all ${states.length} of them.`
        : `${dropped.join(', ')} cannot be reached from ${source.start}, so ${dropped.length === 1 ? 'it is' : 'they are'} removed before the table is built.`,
    citation: '4.4.3',
    highlight: dropped.map((id) => ({ type: 'state' as const, id, role: 'dead' as const })),
    snapshot: { source, target: null, states, marks: {}, round: 0, blocks: null, status: 'running' },
  })

  const move = (from: StateId, symbol: Sym): StateId => {
    const t = source.transitions.find((x) => x.from === from && x.read === symbol)
    return t === undefined ? from : t.to
  }

  // Round 0: a pair with one accepting state and one not is distinguishable by
  // the empty string, which is where every other mark ultimately comes from.
  let marks: Record<string, number> = {}
  const basis: [StateId, StateId][] = []

  for (const [p, q] of allPairs(states)) {
    if (accepting.has(p) !== accepting.has(q)) {
      marks[pairKey(states, p, q)] = 0
      basis.push([p, q])
    }
  }

  builder.bump('pairsMarked', basis.length)
  builder.step({
    narration:
      basis.length === 0
        ? `No pair has one accepting state and one non-accepting state, so round 0 marks nothing.`
        : `Round 0: mark every pair with one accepting state and one not. ${basis.length} ${basis.length === 1 ? 'pair is' : 'pairs are'} distinguished by the empty string alone.`,
    citation: '4.4.1',
    highlight: basis.map(([p, q]) => ({
      type: 'tableCell' as const,
      row: p,
      col: q,
      role: 'marked' as const,
    })),
    snapshot: { source, target: null, states, marks, round: 0, blocks: null, status: 'running' },
  })

  // Later rounds: propagate marks backwards through δ until nothing changes.
  let round = 0
  for (;;) {
    round += 1
    const newlyMarked: { p: StateId; q: StateId; symbol: Sym }[] = []

    for (const [p, q] of allPairs(states)) {
      if (marks[pairKey(states, p, q)] !== undefined) continue

      for (const symbol of source.alphabet) {
        const to = pairKey(states, move(p, symbol), move(q, symbol))
        if (move(p, symbol) === move(q, symbol)) continue
        if (marks[to] === undefined) continue
        newlyMarked.push({ p, q, symbol })
        break
      }
    }

    if (newlyMarked.length === 0) {
      builder.step({
        narration: `Round ${round} marks nothing new, so the table has settled. Every unmarked pair is a pair of equivalent states.`,
        citation: '4.4.1',
        highlight: [],
        snapshot: { source, target: null, states, marks, round, blocks: null, status: 'running' },
      })
      break
    }

    marks = { ...marks }
    for (const { p, q } of newlyMarked) marks[pairKey(states, p, q)] = round
    builder.bump('pairsMarked', newlyMarked.length)

    builder.step({
      narration: describeRound(round, newlyMarked),
      citation: '4.4.1',
      highlight: newlyMarked.map(({ p, q }) => ({
        type: 'tableCell' as const,
        row: p,
        col: q,
        role: 'marked' as const,
      })),
      snapshot: { source, target: null, states, marks, round, blocks: null, status: 'running' },
    })
  }

  const blocks = blocksFrom(states, marks)
  const target = merge(source, blocks)

  builder.step({
    narration: describeMerge(states.length, blocks),
    citation: '4.4.3, Thm 4.24',
    highlight: target.states.map((id) => ({ type: 'state' as const, id, role: 'new' as const })),
    snapshot: { source, target, states, marks, round, blocks, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

/** Every unordered pair of distinct states, in table order. */
function* allPairs(states: readonly StateId[]): Generator<[StateId, StateId], void, undefined> {
  for (let i = 0; i < states.length; i++) {
    for (let j = i + 1; j < states.length; j++) {
      yield [states[i] as StateId, states[j] as StateId]
    }
  }
}

function reachableFrom(dfa: FiniteAutomaton): Set<StateId> {
  const seen = new Set<StateId>([dfa.start])
  const queue = [dfa.start]

  while (queue.length > 0) {
    const from = queue.shift() as StateId
    for (const t of dfa.transitions) {
      if (t.from !== from || seen.has(t.to)) continue
      seen.add(t.to)
      queue.push(t.to)
    }
  }

  return seen
}

function restrictTo(dfa: FiniteAutomaton, keep: Set<StateId>): FiniteAutomaton {
  return {
    ...dfa,
    states: dfa.states.filter((s) => keep.has(s)),
    transitions: dfa.transitions.filter((t) => keep.has(t.from) && keep.has(t.to)),
    accepting: dfa.accepting.filter((s) => keep.has(s)),
  }
}

/**
 * Group states into equivalence classes: two states share a block when their
 * pair was never marked. Blocks come out in table order, and so do their
 * members, which is what makes the generated names deterministic.
 */
function blocksFrom(states: readonly StateId[], marks: Record<string, number>): StateId[][] {
  const blockOf = new Map<StateId, StateId[]>()
  const blocks: StateId[][] = []

  for (const state of states) {
    if (blockOf.has(state)) continue
    const block = [state]
    for (const other of states) {
      if (other === state || blockOf.has(other)) continue
      if (marks[pairKey(states, state, other)] === undefined) block.push(other)
    }
    for (const member of block) blockOf.set(member, block)
    blocks.push(block)
  }

  return blocks
}

function merge(source: FiniteAutomaton, blocks: StateId[][]): FiniteAutomaton {
  const nameOf = new Map<StateId, StateId>()
  for (const block of blocks) {
    const name = subsetStateName(block)
    for (const member of block) nameOf.set(member, name)
  }

  const names = blocks.map((block) => subsetStateName(block))
  const accepting = new Set(source.accepting)
  const seen = new Set<string>()
  const transitions = []

  for (const block of blocks) {
    const representative = block[0] as StateId
    for (const symbol of source.alphabet) {
      const t = source.transitions.find((x) => x.from === representative && x.read === symbol)
      if (t === undefined) continue
      const from = nameOf.get(representative) as StateId
      const to = nameOf.get(t.to) as StateId
      const id = faTransitionId(from, symbol, to)
      if (seen.has(id)) continue
      seen.add(id)
      transitions.push({ id, from, read: symbol, to })
    }
  }

  return {
    kind: 'DFA',
    states: names,
    alphabet: [...source.alphabet],
    transitions,
    start: nameOf.get(source.start) as StateId,
    // A block is accepting when its states are — and they either all are or all
    // are not, since round 0 separated them otherwise.
    accepting: names.filter((name, i) => (blocks[i] as StateId[]).some((m) => accepting.has(m))),
  }
}

function describeRound(round: number, marked: { p: StateId; q: StateId; symbol: Sym }[]): string {
  const first = marked[0] as { p: StateId; q: StateId; symbol: Sym }
  const example = `${first.p} and ${first.q} differ because reading "${first.symbol}" takes them to a pair already marked`

  return marked.length === 1
    ? `Round ${round}: ${example}.`
    : `Round ${round}: ${marked.length} more pairs are marked. For instance ${example}.`
}

function describeMerge(before: number, blocks: StateId[][]): string {
  const merged = blocks.filter((b) => b.length > 1)
  if (merged.length === 0) {
    return `No pair survived unmarked, so no two states are equivalent and the DFA was already minimal at ${before} states.`
  }
  const groups = merged.map((b) => `{${b.join(',')}}`).join(' and ')
  return `The unmarked pairs merge into ${groups}, taking the DFA from ${before} states to ${blocks.length}. No smaller DFA accepts this language.`
}
