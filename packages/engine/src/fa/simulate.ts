/**
 * Finite-automaton simulation — Hopcroft 2e §2.2, §2.3, §2.5.
 *
 * Three simulators, three renderings, because the three machines are taught
 * three different ways:
 *
 * - **DFA** — one state, one path. §2.2.4, the extended transition function.
 * - **NFA** — a *branch tree*, not a path. Every live branch at once, and a
 *   branch that dies stays in the tree flagged with the step it died at, which
 *   is the thing a blackboard cannot show. §2.3.3.
 * - **ε-NFA** — a set of states, with ε-closure as its own visible step, since
 *   the closure is what students actually get wrong. §2.5.3.
 *
 * All three agree on membership; `test/helpers/oracle.ts` holds an independent
 * implementation that the property tests check them against.
 */

import { sortStateIds } from '../ids.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { LIMITS, TraceBuilder } from '../trace.js'
import { validateFA } from '../validate.js'
import type { FiniteAutomaton, Highlight, StateId, Step, Sym, Trace, TransitionId } from '../types.js'

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

/**
 * `stopped` means a §9 guard fired before the run reached a verdict — not that
 * the string was rejected. See the `incomplete` trace result.
 */
export type RunStatus = 'running' | 'accepted' | 'rejected' | 'stopped'

export interface DFASnapshot {
  machine: FiniteAutomaton
  input: Sym[]
  /** How many symbols have been consumed. */
  position: number
  /** `null` once the run has died with no move available. */
  state: StateId | null
  status: RunStatus
}

/** One node of the nondeterministic branch tree. */
export interface BranchNode {
  id: string
  state: StateId
  /** Symbols consumed on the path from the root to this node. */
  position: number
  parent: string | null
  /** The transition that produced this node, for edge highlighting. */
  via: TransitionId | null
  status: 'live' | 'dead' | 'accepting'
  /** The step at which this branch died, so the UI greys it exactly then. */
  diedAtStep?: number
}

export interface NFASnapshot {
  machine: FiniteAutomaton
  input: Sym[]
  position: number
  /** Every node ever created, live and dead. Dead branches are never removed. */
  nodes: BranchNode[]
  /** Ids of the nodes still live at the current position. */
  frontier: string[]
  status: RunStatus
}

export interface ENFASnapshot {
  machine: FiniteAutomaton
  input: Sym[]
  position: number
  /** The set of states the automaton is currently in, canonically sorted. */
  current: StateId[]
  /** Which half of δ̂ this step just did. */
  phase: 'start' | 'closure' | 'read' | 'final'
  status: RunStatus
}

export type SimulationTrace =
  | Trace<Step<DFASnapshot>>
  | Trace<Step<NFASnapshot>>
  | Trace<Step<ENFASnapshot>>

// ---------------------------------------------------------------------------
// ε-closure — Hopcroft 2.5.3
// ---------------------------------------------------------------------------

/**
 * The set of states reachable from `states` on ε-transitions alone, including
 * the states themselves. Canonically sorted, so the result is byte-identical
 * across runs (§2.5).
 *
 * A primitive rather than a user-facing algorithm: it emits no trace of its own,
 * and `simulateENFA` narrates each closure it takes.
 */
export function epsilonClosure(fa: FiniteAutomaton, states: readonly StateId[]): StateId[] {
  const reached = new Set<StateId>(states)
  const pending = [...states]

  while (pending.length > 0) {
    const from = pending.pop() as StateId
    for (const t of fa.transitions) {
      if (t.read === null && t.from === from && !reached.has(t.to)) {
        reached.add(t.to)
        pending.push(t.to)
      }
    }
  }

  return sortStateIds([...reached])
}

// ---------------------------------------------------------------------------
// Simulators
// ---------------------------------------------------------------------------

/** Run a machine on an input, picking the simulator its `kind` calls for. */
export function simulate(
  fa: FiniteAutomaton,
  input: string | readonly Sym[],
): Result<SimulationTrace> {
  switch (fa.kind) {
    case 'DFA':
      return simulateDFA(fa, input)
    case 'NFA':
      return simulateNFA(fa, input)
    case 'ENFA':
      return simulateENFA(fa, input)
  }
}

/**
 * Simulate a DFA. One state at a time; a missing move is not an error but a
 * rejection, since a partial diagram means an implicit dead state (see
 * `validateFA` on why incompleteness is not a validation failure).
 */
export function simulateDFA(
  fa: FiniteAutomaton,
  input: string | readonly Sym[],
): Result<Trace<Step<DFASnapshot>>> {
  const prepared = prepare(fa, input)
  if (!prepared.ok) return prepared
  const { machine, symbols } = prepared.value

  const builder = new TraceBuilder<DFASnapshot>('simulate.dfa', { machine, input: symbols })
  const accepting = new Set(machine.accepting)
  let state: StateId = machine.start

  builder.step({
    narration: `Start in state ${machine.start} with ${describeInput(symbols)} still to read.`,
    citation: '2.2.4',
    highlight: [
      { type: 'state', id: machine.start, role: 'start' },
      { type: 'state', id: machine.start, role: 'current' },
      ...lookahead(symbols),
    ],
    snapshot: { machine, input: symbols, position: 0, state, status: 'running' },
  })

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i] as Sym
    const move = machine.transitions.find((t) => t.from === state && t.read === sym)

    if (move === undefined) {
      builder.step({
        narration: `State ${state} has no transition on "${sym}", so the automaton cannot move and the string is rejected.`,
        citation: '2.2.4',
        highlight: [
          { type: 'state', id: state, role: 'dead' },
          { type: 'input', position: i, role: 'read' },
        ],
        snapshot: { machine, input: symbols, position: i, state: null, status: 'rejected' },
      })
      return ok(builder.build({ type: 'acceptance', accepted: false, note: `No move from ${state} on "${sym}".` }))
    }

    state = move.to
    builder.bump('transitionsTaken')
    builder.step({
      narration: `Read "${sym}" in state ${move.from} and follow the transition to ${move.to}.`,
      citation: '2.2.4',
      highlight: [
        { type: 'transition', id: move.id, role: 'taken' },
        { type: 'state', id: move.to, role: 'current' },
        { type: 'input', position: i, role: 'consumed' },
      ],
      snapshot: { machine, input: symbols, position: i + 1, state, status: 'running' },
    })
  }

  const accepted = accepting.has(state)
  builder.step({
    narration: accepted
      ? `The input is exhausted in state ${state}, which is an accepting state, so ${describeInput(symbols)} is accepted.`
      : `The input is exhausted in state ${state}, which is not an accepting state, so ${describeInput(symbols)} is rejected.`,
    citation: '2.2.5',
    highlight: [{ type: 'state', id: state, role: accepted ? 'accepting' : 'dead' }],
    snapshot: {
      machine,
      input: symbols,
      position: symbols.length,
      state,
      status: accepted ? 'accepted' : 'rejected',
    },
  })

  return ok(builder.build({ type: 'acceptance', accepted }))
}

/**
 * Simulate an NFA as a branch tree.
 *
 * Every branch that ever existed stays in `nodes`. A branch with no move on the
 * next symbol is marked `dead` and stamped with the step it died at, rather than
 * being dropped — the tree is the explanation, and a tree that quietly loses its
 * failures explains nothing.
 */
export function simulateNFA(
  fa: FiniteAutomaton,
  input: string | readonly Sym[],
): Result<Trace<Step<NFASnapshot>>> {
  const prepared = prepare(fa, input)
  if (!prepared.ok) return prepared
  const { machine, symbols } = prepared.value

  const builder = new TraceBuilder<NFASnapshot>('simulate.nfa', { machine, input: symbols })
  const accepting = new Set(machine.accepting)

  let counter = 0
  const nextId = (): string => `n${counter++}`

  const root: BranchNode = {
    id: nextId(),
    state: machine.start,
    position: 0,
    parent: null,
    via: null,
    status: 'live',
  }
  let nodes: BranchNode[] = [root]
  let frontier: string[] = [root.id]

  builder.step({
    narration: `Start in state ${machine.start} with ${describeInput(symbols)} still to read.`,
    citation: '2.3.3',
    highlight: [
      { type: 'state', id: machine.start, role: 'start' },
      { type: 'treeNode', id: root.id, role: 'matched' },
      ...lookahead(symbols),
    ],
    snapshot: { machine, input: symbols, position: 0, nodes, frontier, status: 'running' },
  })

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i] as Sym
    const stepIndex = builder.length
    const byId = new Map(nodes.map((n) => [n.id, n]))

    const children: BranchNode[] = []
    const died: string[] = []
    const taken: TransitionId[] = []

    for (const id of frontier) {
      const node = byId.get(id) as BranchNode
      const moves = machine.transitions
        .filter((t) => t.from === node.state && t.read === sym)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

      if (moves.length === 0) {
        died.push(id)
        continue
      }

      for (const move of moves) {
        children.push({
          id: nextId(),
          state: move.to,
          position: i + 1,
          parent: id,
          via: move.id,
          status: 'live',
        })
        taken.push(move.id)
        builder.bump('transitionsTaken')
      }
    }

    // Rebuild the node list by structural extension: unchanged nodes keep their
    // identity, so consecutive snapshots share almost everything (ADR-001).
    const deadSet = new Set(died)
    nodes = [
      ...nodes.map((n) =>
        deadSet.has(n.id) ? { ...n, status: 'dead' as const, diedAtStep: stepIndex } : n,
      ),
      ...children,
    ]
    frontier = children.map((n) => n.id)

    if (nodes.length > LIMITS.SIMULATION_STEPS) {
      builder.truncate(
        `The branch tree passed ${LIMITS.SIMULATION_STEPS} nodes, so the run was stopped early.`,
        LIMITS.SIMULATION_STEPS,
      )
    }

    const stopped = builder.truncated
    const narration = stopped
      ? `Read "${sym}"; the branch tree passed ${LIMITS.SIMULATION_STEPS} nodes, so the run stops here without a verdict.`
      : describeBranchStep(sym, children.length, died.length)

    builder.step({
      narration,
      citation: '2.3.3',
      highlight: [
        { type: 'input', position: i, role: 'consumed' },
        ...taken.map((id) => ({ type: 'transition' as const, id, role: 'taken' as const })),
        ...children.map((n) => ({ type: 'treeNode' as const, id: n.id, role: 'matched' as const })),
        ...children.map((n) => ({ type: 'state' as const, id: n.state, role: 'current' as const })),
        ...died.map((id) => ({ type: 'treeNode' as const, id, role: 'dead' as const })),
      ],
      snapshot: {
        machine,
        input: symbols,
        position: i + 1,
        nodes,
        frontier,
        status: stopped ? 'stopped' : children.length === 0 ? 'rejected' : 'running',
      },
    })

    if (stopped) {
      return ok(
        builder.build({
          type: 'incomplete',
          reason: `The branch tree passed ${LIMITS.SIMULATION_STEPS} nodes after ${i + 1} of ${symbols.length} symbols.`,
          bounded: { searchedUpTo: i + 1, unit: 'inputLength' },
        }),
      )
    }

    if (children.length === 0) {
      return ok(
        builder.build({
          type: 'acceptance',
          accepted: false,
          note: 'Every branch died before the input was consumed.',
        }),
      )
    }
  }

  // The input is consumed. Live branches resting on an accepting state accept;
  // the rest die here, at this step.
  const stepIndex = builder.length
  const frontierSet = new Set(frontier)
  const accepted = nodes.some((n) => frontierSet.has(n.id) && accepting.has(n.state))

  nodes = nodes.map((n) => {
    if (!frontierSet.has(n.id)) return n
    return accepting.has(n.state)
      ? { ...n, status: 'accepting' as const }
      : { ...n, status: 'dead' as const, diedAtStep: stepIndex }
  })

  const survivors = nodes.filter((n) => frontierSet.has(n.id) && n.status === 'accepting')
  builder.step({
    narration: accepted
      ? `The input is exhausted and ${survivors.length === 1 ? 'one branch rests' : `${survivors.length} branches rest`} on an accepting state, so ${describeInput(symbols)} is accepted.`
      : `The input is exhausted but no branch rests on an accepting state, so ${describeInput(symbols)} is rejected.`,
    citation: '2.3.4',
    highlight: nodes
      .filter((n) => frontierSet.has(n.id))
      .flatMap((n): Highlight[] =>
        n.status === 'accepting'
          ? [
              { type: 'treeNode' as const, id: n.id, role: 'accepting' as const },
              { type: 'state' as const, id: n.state, role: 'accepting' as const },
            ]
          : [{ type: 'treeNode' as const, id: n.id, role: 'dead' as const }],
      ),
    snapshot: {
      machine,
      input: symbols,
      position: symbols.length,
      nodes,
      frontier,
      status: accepted ? 'accepted' : 'rejected',
    },
  })

  return ok(builder.build({ type: 'acceptance', accepted }))
}

function describeBranchStep(sym: Sym, born: number, died: number): string {
  if (born === 0) {
    return `No branch has a transition on "${sym}", so every remaining branch dies and the string is rejected.`
  }
  const alive = born === 1 ? '1 branch continues' : `${born} branches continue`
  if (died === 0) return `Read "${sym}"; ${alive}.`
  const lost = died === 1 ? '1 branch dies here' : `${died} branches die here`
  return `Read "${sym}"; ${alive} and ${lost}.`
}

/**
 * Simulate an ε-NFA as a set of states, taking the ε-closure as a step of its
 * own. δ̂(q, xa) = ε-closure(δ(δ̂(q, x), a)) — the closure is the half students
 * forget, so it gets its own narration and its own snapshot.
 */
export function simulateENFA(
  fa: FiniteAutomaton,
  input: string | readonly Sym[],
): Result<Trace<Step<ENFASnapshot>>> {
  const prepared = prepare(fa, input)
  if (!prepared.ok) return prepared
  const { machine, symbols } = prepared.value

  const builder = new TraceBuilder<ENFASnapshot>('simulate.enfa', { machine, input: symbols })
  const accepting = new Set(machine.accepting)

  let current: StateId[] = [machine.start]
  builder.step({
    narration: `Start in state ${machine.start} with ${describeInput(symbols)} still to read.`,
    citation: '2.5.4',
    highlight: [
      { type: 'state', id: machine.start, role: 'start' },
      ...lookahead(symbols),
    ],
    snapshot: { machine, input: symbols, position: 0, current, phase: 'start', status: 'running' },
  })

  current = epsilonClosure(machine, current)
  builder.bump('closuresTaken')
  builder.step({
    narration: `Take the ε-closure of ${asSet([machine.start])}: before reading anything the automaton may already be in any of ${asSet(current)}.`,
    citation: '2.5.3',
    highlight: [
      { type: 'symbolSet', ids: current, role: 'closure' },
      ...current.map((id) => ({ type: 'state' as const, id, role: 'current' as const })),
    ],
    snapshot: { machine, input: symbols, position: 0, current, phase: 'closure', status: 'running' },
  })

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i] as Sym
    const before = current

    const moves = machine.transitions.filter((t) => t.read === sym && before.includes(t.from))
    const moved = sortStateIds([...new Set(moves.map((t) => t.to))])
    builder.bump('transitionsTaken', moves.length)

    if (moved.length === 0) {
      builder.step({
        narration: `No state in ${asSet(before)} has a transition on "${sym}", so the automaton cannot move and the string is rejected.`,
        citation: '2.5.4',
        highlight: [
          { type: 'input', position: i, role: 'read' },
          ...before.map((id) => ({ type: 'state' as const, id, role: 'dead' as const })),
        ],
        snapshot: { machine, input: symbols, position: i, current: moved, phase: 'read', status: 'rejected' },
      })
      return ok(
        builder.build({
          type: 'acceptance',
          accepted: false,
          note: `No move on "${sym}" from ${asSet(before)}.`,
        }),
      )
    }

    builder.step({
      narration: `Read "${sym}" from ${asSet(before)}, which leads to ${asSet(moved)}.`,
      citation: '2.5.4',
      highlight: [
        { type: 'input', position: i, role: 'consumed' },
        ...moves.map((t) => ({ type: 'transition' as const, id: t.id, role: 'taken' as const })),
        ...moved.map((id) => ({ type: 'state' as const, id, role: 'current' as const })),
      ],
      snapshot: { machine, input: symbols, position: i + 1, current: moved, phase: 'read', status: 'running' },
    })

    const closed = epsilonClosure(machine, moved)
    builder.bump('closuresTaken')
    current = closed
    builder.step({
      narration: sameSet(moved, closed)
        ? `The ε-closure of ${asSet(moved)} adds nothing, so the automaton stays in ${asSet(closed)}.`
        : `Take the ε-closure of ${asSet(moved)}, which widens the set to ${asSet(closed)}.`,
      citation: '2.5.3',
      highlight: [
        { type: 'symbolSet', ids: closed, role: 'closure' },
        ...closed.map((id) => ({ type: 'state' as const, id, role: 'current' as const })),
      ],
      snapshot: {
        machine,
        input: symbols,
        position: i + 1,
        current: closed,
        phase: 'closure',
        status: 'running',
      },
    })
  }

  const hits = current.filter((id) => accepting.has(id))
  const accepted = hits.length > 0
  builder.step({
    narration: accepted
      ? `The input is exhausted and ${asSet(current)} contains the accepting state${hits.length === 1 ? '' : 's'} ${asSet(hits)}, so ${describeInput(symbols)} is accepted.`
      : `The input is exhausted and ${asSet(current)} contains no accepting state, so ${describeInput(symbols)} is rejected.`,
    citation: '2.5.4',
    highlight: accepted
      ? hits.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const }))
      : current.map((id) => ({ type: 'state' as const, id, role: 'dead' as const })),
    snapshot: {
      machine,
      input: symbols,
      position: symbols.length,
      current,
      phase: 'final',
      status: accepted ? 'accepted' : 'rejected',
    },
  })

  return ok(builder.build({ type: 'acceptance', accepted }))
}

// ---------------------------------------------------------------------------
// Shared preparation
// ---------------------------------------------------------------------------

interface Prepared {
  /** A frozen defensive copy — the caller's machine is never frozen out from
   *  under them, and every step shares this one object (ADR-001). */
  machine: FiniteAutomaton
  symbols: Sym[]
}

function prepare(fa: FiniteAutomaton, input: string | readonly Sym[]): Result<Prepared> {
  const validated = validateFA(fa)
  if (!validated.ok) return validated

  const symbols = typeof input === 'string' ? [...input] : [...input]
  const inputErrors = checkInputSymbols(fa, symbols)
  if (inputErrors.length > 0) return err(inputErrors)

  return ok({ machine: frozenCopy(fa), symbols })
}

function checkInputSymbols(fa: FiniteAutomaton, symbols: readonly Sym[]): ValidationError[] {
  const alphabet = new Set(fa.alphabet)
  const offenders = [...new Set(symbols.filter((s) => !alphabet.has(s)))]

  return offenders.map((sym) =>
    validationError(
      'INPUT_SYMBOL_NOT_IN_ALPHABET',
      `The input contains "${sym}", which is not in the automaton's alphabet.`,
      { kind: 'machine' },
    ),
  )
}

/**
 * Copy a machine deeply enough that freezing it cannot reach the caller's
 * objects. Done once per simulation, not once per step.
 */
function frozenCopy(fa: FiniteAutomaton): FiniteAutomaton {
  return {
    kind: fa.kind,
    states: [...fa.states],
    alphabet: [...fa.alphabet],
    transitions: fa.transitions.map((t) => ({ ...t })),
    start: fa.start,
    accepting: [...fa.accepting],
    ...(fa.layout === undefined ? {} : { layout: structuredCloneLayout(fa.layout) }),
  }
}

function structuredCloneLayout(
  layout: NonNullable<FiniteAutomaton['layout']>,
): NonNullable<FiniteAutomaton['layout']> {
  return Object.fromEntries(Object.entries(layout).map(([k, v]) => [k, { ...v }]))
}

// ---------------------------------------------------------------------------
// Narration helpers
// ---------------------------------------------------------------------------

/**
 * The lookahead highlight for the opening step. Omitted on the empty string:
 * there is no input position 0 to point at, and a highlight naming a position
 * that does not exist violates the §5 invariant.
 */
function lookahead(symbols: readonly Sym[]): Highlight[] {
  return symbols.length === 0 ? [] : [{ type: 'input', position: 0, role: 'lookahead' }]
}

/** `{q0,q1}` in prose. Matches the canonical subset name a student will see. */
function asSet(ids: readonly StateId[]): string {
  return `{${ids.join(',')}}`
}

function describeInput(symbols: readonly Sym[]): string {
  return symbols.length === 0 ? 'the empty string' : `"${symbols.join('')}"`
}

function sameSet(a: readonly StateId[], b: readonly StateId[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i])
}
