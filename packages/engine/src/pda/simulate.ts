/**
 * PDA simulation — Hopcroft 2e §6.1.4 (IDs) and §6.2 (acceptance).
 *
 * A configuration is the instantaneous description (q, w, γ): state, remaining
 * input, stack. The trace carries two renderings of the same run:
 *
 * - the **branch tree**, as NFA runs have — a PDA is nondeterministic, and a
 *   guess that dies stays on screen at the step it died;
 * - the **ID sequence** in textbook notation, (q₀, aabb, Z₀) ⊢ (q₁, abb, XZ₀)
 *   ⊢ …, because that is the artefact the exam marks and the log must be
 *   copy-pasteable character for character.
 *
 * A repeated configuration is marked dead rather than re-explored: reaching
 * (q, w, γ) a second way cannot lead anywhere the first way could not, and
 * ε-loops would otherwise run forever. Unbounded stack growth is caught by the
 * node cap instead, and reported as stopped — never as rejection (§2.6).
 */

import { LIMITS, TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import type { Highlight, PDA, PDATransition, Step, Sym, Trace } from '../types.js'

export interface PdaBranchNode {
  id: string
  state: string
  /** Input symbols consumed on the path to this node. */
  position: number
  /** The stack, top first. */
  stack: Sym[]
  parent: string | null
  via: string | null
  status: 'live' | 'dead' | 'accepting'
  diedAtStep?: number
  /** Why a dead branch died — shown beside the greyed node. */
  note?: string
}

export interface PdaSnapshot {
  machine: PDA
  input: Sym[]
  nodes: PdaBranchNode[]
  status: 'running' | 'accepted' | 'rejected' | 'stopped'
  [key: string]: unknown
}

/** The stack written the way the book writes γ: top first, ε when empty. */
export function stackToText(stack: readonly Sym[]): string {
  return stack.length === 0 ? 'ε' : stack.join('')
}

/** One ID in textbook notation. */
export function idToText(state: string, remaining: readonly Sym[], stack: readonly Sym[]): string {
  return `(${state}, ${remaining.length === 0 ? 'ε' : remaining.join('')}, ${stackToText(stack)})`
}

/** Whether a transition applies to a configuration. */
function applies(t: PDATransition, state: string, next: Sym | undefined, top: Sym | undefined): boolean {
  if (t.from !== state) return false
  if (t.read !== null && t.read !== next) return false
  if (t.pop !== null && t.pop !== top) return false
  return true
}

/** The configuration a transition produces. */
function moveOf(t: PDATransition, position: number, stack: readonly Sym[]): { position: number; stack: Sym[] } {
  const afterPop = t.pop === null ? [...stack] : stack.slice(1)
  return { position: position + (t.read === null ? 0 : 1), stack: [...t.push, ...afterPop] }
}

function accepted(machine: PDA, node: { state: string; position: number; stack: readonly Sym[] }, inputLength: number): boolean {
  if (node.position !== inputLength) return false
  return machine.acceptBy === 'finalState'
    ? machine.accepting.includes(node.state)
    : node.stack.length === 0
}

export function validatePDA(machine: PDA): ValidationError[] {
  const problems: ValidationError[] = []
  const states = new Set(machine.states)

  if (!states.has(machine.start)) {
    problems.push(validationError('PDA_START_UNKNOWN', `The start state "${machine.start}" is not a state.`, { kind: 'machine' }))
  }
  if (!machine.stackAlphabet.includes(machine.startStack)) {
    problems.push(
      validationError('PDA_START_STACK_UNKNOWN', `The start stack symbol "${machine.startStack}" is not in the stack alphabet.`, { kind: 'machine' }),
    )
  }
  for (const state of machine.accepting) {
    if (!states.has(state)) {
      problems.push(validationError('PDA_ACCEPTING_UNKNOWN', `"${state}" is marked accepting but is not a state.`, { kind: 'state', id: state }))
    }
  }
  machine.transitions.forEach((t) => {
    if (!states.has(t.from)) {
      problems.push(validationError('PDA_FROM_UNKNOWN', `A transition leaves "${t.from}", which is not a state.`, { kind: 'transition', id: t.id }))
    }
    if (!states.has(t.to)) {
      problems.push(validationError('PDA_TO_UNKNOWN', `A transition enters "${t.to}", which is not a state.`, { kind: 'transition', id: t.id }))
    }
    if (t.read !== null && !machine.inputAlphabet.includes(t.read)) {
      problems.push(validationError('PDA_READ_UNKNOWN', `A transition reads "${t.read}", which is not in the input alphabet.`, { kind: 'transition', id: t.id }))
    }
    if (t.pop !== null && !machine.stackAlphabet.includes(t.pop)) {
      problems.push(validationError('PDA_POP_UNKNOWN', `A transition pops "${t.pop}", which is not in the stack alphabet.`, { kind: 'transition', id: t.id }))
    }
    for (const sym of t.push) {
      if (!machine.stackAlphabet.includes(sym)) {
        problems.push(validationError('PDA_PUSH_UNKNOWN', `A transition pushes "${sym}", which is not in the stack alphabet.`, { kind: 'transition', id: t.id }))
      }
    }
  })

  return problems
}

/**
 * Membership without a trace — the fast path the conversion tests sweep with.
 * Same search, same caps, no snapshots. Returns null when the cap fired before
 * an answer was reached, so a bounded non-answer can never masquerade as "no".
 */
export function acceptsPDA(machine: PDA, input: string | readonly Sym[], maxNodes = 6_000): boolean | null {
  const symbols = typeof input === 'string' ? [...input] : [...input]
  const seen = new Set<string>()
  const queue: { state: string; position: number; stack: Sym[] }[] = [
    { state: machine.start, position: 0, stack: [machine.startStack] },
  ]
  let explored = 0

  while (queue.length > 0) {
    const config = queue.shift() as { state: string; position: number; stack: Sym[] }
    const key = `${config.state}|${config.position}|${config.stack.join('')}`
    if (seen.has(key)) continue
    seen.add(key)

    if (accepted(machine, config, symbols.length)) return true
    if (++explored > maxNodes) return null

    const next = symbols[config.position]
    const top = config.stack[0]
    for (const t of machine.transitions) {
      if (!applies(t, config.state, next, top)) continue
      const moved = moveOf(t, config.position, config.stack)
      queue.push({ state: t.to, position: moved.position, stack: moved.stack })
    }
  }

  return false
}

export interface SimulatePdaOptions {
  /**
   * Configuration cap — defaults to LIMITS.SIMULATION_STEPS. A pathological
   * machine's tree costs O(cap²) to snapshot (every node carries its stack), so
   * callers that only need to *demonstrate* the guard pass something small.
   */
  maxNodes?: number
}

/** Run a PDA on an input, producing the branch tree and the ID log. */
export function simulatePDA(
  machine: PDA,
  input: string | readonly Sym[],
  options: SimulatePdaOptions = {},
): Result<Trace<Step<PdaSnapshot>>> {
  const maxNodes = options.maxNodes ?? LIMITS.SIMULATION_STEPS
  const problems = validatePDA(machine)
  if (problems.length > 0) return err(problems)

  const symbols = (typeof input === 'string' ? [...input] : [...input]) as Sym[]
  const offAlphabet = [...new Set(symbols.filter((s) => !machine.inputAlphabet.includes(s)))]
  if (offAlphabet.length > 0) {
    return err(
      offAlphabet.map((s) =>
        validationError('PDA_INPUT_UNKNOWN', `The input contains "${s}", which is not in the input alphabet.`, { kind: 'machine' }),
      ),
    )
  }

  const builder = new TraceBuilder<PdaSnapshot>('simulate.pda', { machine, input: symbols })
  let counter = 0
  const fresh = (): string => `n${counter++}`

  const root: PdaBranchNode = {
    id: fresh(),
    state: machine.start,
    position: 0,
    stack: [machine.startStack],
    parent: null,
    via: null,
    status: 'live',
  }
  let nodes: PdaBranchNode[] = [root]
  const seen = new Set<string>([`${root.state}|0|${machine.startStack}`])
  const queue: string[] = [root.id]

  // Past the narration cap the search carries on silently — but a verdict step
  // is always emitted, so the final snapshot agrees with the result (§5).
  const emit = (narration: string, highlight: Highlight[], status: PdaSnapshot['status']): void => {
    if (status === 'running' && builder.length >= LIMITS.TRACE_STEPS) {
      builder.truncate(
        `The run passed ${LIMITS.TRACE_STEPS} narrated steps and continues without commentary.`,
        LIMITS.TRACE_STEPS,
      )
      return
    }
    builder.step({ narration, highlight, citation: '6.1.4', snapshot: { machine, input: symbols, nodes, status } })
  }

  emit(
    `Start in the ID ${idToText(root.state, symbols, root.stack)}: state ${root.state}, the whole input unread, and ${machine.startStack} alone on the stack.`,
    [{ type: 'state', id: root.state, role: 'start' }],
    'running',
  )

  if (accepted(machine, root, symbols.length)) {
    // Only reachable by final state: the start stack is never empty.
    nodes = nodes.map((n) => (n.id === root.id ? { ...n, status: 'accepting' as const } : n))
    emit(
      `The input is empty and ${machine.start} is already accepting: the start ID accepts with no move made.`,
      [{ type: 'state', id: machine.start, role: 'accepting' }],
      'accepted',
    )
    return ok(builder.build({ type: 'acceptance', accepted: true }))
  }

  let acceptingNode: string | null = null

  while (queue.length > 0 && acceptingNode === null) {
    if (nodes.length > maxNodes) {
      // The live branches are left live: they did not die, the search stopped.
      builder.truncate(
        `The configuration tree passed ${maxNodes} nodes — the stack may be growing without bound — so the run was stopped.`,
        maxNodes,
        { replace: true },
      )
      emit(`The search was stopped at ${maxNodes} configurations without exhausting the tree, so no verdict is reported.`, [], 'stopped')
      return ok(
        builder.build({
          type: 'incomplete',
          reason: `The run passed ${maxNodes} configurations before reaching a verdict.`,
          bounded: { searchedUpTo: nodes.length, unit: 'steps' },
        }),
      )
    }

    const nodeId = queue.shift() as string
    const node = nodes.find((n) => n.id === nodeId) as PdaBranchNode
    if (node.status !== 'live') continue

    const next = symbols[node.position]
    const top = node.stack[0]
    const moves = machine.transitions.filter((t) => applies(t, node.state, next, top))
    const stepIndex = builder.length

    if (moves.length === 0) {
      nodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, status: 'dead' as const, diedAtStep: stepIndex, note: 'no move' } : n,
      )
      emit(
        `${idToText(node.state, symbols.slice(node.position), node.stack)} has no applicable move — this branch dies.`,
        [{ type: 'treeNode', id: nodeId, role: 'dead' }],
        'running',
      )
      continue
    }

    const children: PdaBranchNode[] = []
    const skippedAsSeen: string[] = []
    for (const t of moves) {
      const moved = moveOf(t, node.position, node.stack)
      const key = `${t.to}|${moved.position}|${moved.stack.join('')}`
      if (seen.has(key)) {
        skippedAsSeen.push(t.id)
        continue
      }
      seen.add(key)
      const child: PdaBranchNode = {
        id: fresh(),
        state: t.to,
        position: moved.position,
        stack: moved.stack,
        parent: nodeId,
        via: t.id,
        status: 'live',
      }
      children.push(child)
    }

    nodes = [...nodes, ...children]
    if (children.length === 0) {
      // Every move repeats an ID already explored — this branch is finished.
      nodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, status: 'dead' as const, diedAtStep: stepIndex, note: 'repeats an explored ID' } : n,
      )
    }
    builder.bump('transitionsTaken', moves.length)

    const winner = children.find((c) => accepted(machine, c, symbols.length))
    if (winner !== undefined) {
      acceptingNode = winner.id
      nodes = nodes.map((n) => (n.id === winner.id ? { ...n, status: 'accepting' as const } : n))
    }

    emit(
      describeExpansion(machine, node, symbols, children, skippedAsSeen.length, winner !== undefined),
      [
        { type: 'treeNode', id: nodeId, role: 'expanding' },
        ...children.map((c) => ({ type: 'treeNode' as const, id: c.id, role: winner?.id === c.id ? ('accepting' as const) : ('matched' as const) })),
        ...moves.map((t) => ({ type: 'transition' as const, id: t.id, role: 'taken' as const })),
      ],
      winner !== undefined ? 'accepted' : 'running',
    )

    for (const child of children) {
      if (child.id !== acceptingNode) queue.push(child.id)
    }
  }

  if (acceptingNode !== null) {
    return ok(builder.build({ type: 'acceptance', accepted: true }))
  }

  const finalStep = builder.length
  nodes = nodes.map((n) => (n.status === 'live' ? { ...n, status: 'dead' as const, diedAtStep: finalStep, note: 'exhausted' } : n))
  emit(
    `Every branch has died: no sequence of moves ${machine.acceptBy === 'finalState' ? 'consumes the input in an accepting state' : 'consumes the input with an empty stack'}. The string is rejected.`,
    [],
    'rejected',
  )
  return ok(builder.build({ type: 'acceptance', accepted: false }))
}

function describeExpansion(
  machine: PDA,
  node: PdaBranchNode,
  symbols: readonly Sym[],
  children: readonly PdaBranchNode[],
  skipped: number,
  won: boolean,
): string {
  const from = idToText(node.state, symbols.slice(node.position), node.stack)
  const parts = children.map((c) => idToText(c.state, symbols.slice(c.position), c.stack))
  const skipNote = skipped > 0 ? ` ${skipped} move${skipped === 1 ? 's' : ''} led to configurations already explored and ${skipped === 1 ? 'is' : 'are'} not repeated.` : ''

  if (won) {
    return `${from} ⊢ ${parts.join(' | ')} — and ${machine.acceptBy === 'finalState' ? 'an accepting state is reached with the input consumed' : 'the stack empties with the input consumed'}: the string is accepted.${skipNote}`
  }
  if (parts.length === 0) {
    return `${from} has moves, but every one reaches a configuration already explored — this branch adds nothing new.`
  }
  return `${from} ⊢ ${parts.join(' | ')}.${skipNote}`
}

/**
 * The ID sequence of the accepting path, in the notation the exam wants —
 * or of the longest surviving path when the string was rejected, since that is
 * the trace a student would write before discovering the rejection.
 */
export function idLog(trace: Trace<Step<PdaSnapshot>>): string {
  const final = trace.steps.at(-1)?.snapshot
  if (final === undefined) return ''
  const { nodes, input } = final

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const target =
    nodes.find((n) => n.status === 'accepting') ??
    [...nodes].sort((a, b) => b.position - a.position || b.id.localeCompare(a.id))[0]
  if (target === undefined) return ''

  const path: PdaBranchNode[] = []
  for (let node: PdaBranchNode | undefined = target; node !== undefined; node = node.parent === null ? undefined : byId.get(node.parent)) {
    path.unshift(node)
  }

  return path.map((n) => idToText(n.state, input.slice(n.position), n.stack)).join(' ⊢ ')
}
