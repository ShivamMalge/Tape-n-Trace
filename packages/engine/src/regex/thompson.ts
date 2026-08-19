/**
 * Thompson's construction — Hopcroft 2e §3.2.3.
 *
 * One step per node of the parse tree, bottom-up, so the ε-NFA is assembled the
 * way the expression is read: symbols first, then the operators that join them.
 * Each step names the fragment it just built and the piece of the expression it
 * came from.
 *
 * Every fragment has exactly one start and one accepting state and no edges back
 * into its start — the invariant that makes the operators composable, and the
 * reason the construction produces so many ε-transitions. Removing them is
 * §2.5.5's job, not this one's.
 */

import { faTransitionId } from '../ids.js'
import { ok, type Result } from '../result.js'
import { TraceBuilder } from '../trace.js'
import { regexToString } from './parse.js'
import type { FATransition, FiniteAutomaton, RegexNode, StateId, Step, Sym, Trace } from '../types.js'

/** One node of the parse tree, flattened so a trace can point at it. */
export interface RegexTreeNode {
  id: string
  op: RegexNode['op']
  /** The sub-expression this node stands for, as text. */
  label: string
  children: string[]
  parent: string | null
}

export interface ThompsonSnapshot {
  regex: RegexNode
  /** The parse tree, flattened. `id` is the node's path from the root. */
  nodes: RegexTreeNode[]
  /** The ε-NFA as far as it has been assembled. */
  target: FiniteAutomaton
  /** The tree node built this step. */
  current: string | null
  /** The fragment that node produced. */
  fragment: { start: StateId; accept: StateId } | null
  status: 'running' | 'done'
}

interface Fragment {
  start: StateId
  accept: StateId
}

/** Convert a regular expression into an ε-NFA accepting the same language. */
export function regexToENFA(
  regex: RegexNode,
  alphabet?: readonly Sym[],
): Result<Trace<Step<ThompsonSnapshot>>> {
  const nodes = flatten(regex)
  const builder = new TraceBuilder<ThompsonSnapshot>('convert.re-to-enfa', regex)

  let counter = 0
  const fresh = (): StateId => `q${counter++}`

  const states: StateId[] = []
  const transitions: FATransition[] = []
  const symbols = new Set<Sym>(alphabet ?? [])

  const connect = (from: StateId, read: Sym | null, to: StateId): void => {
    transitions.push({ id: faTransitionId(from, read, to), from, read, to })
  }
  const addState = (): StateId => {
    const id = fresh()
    states.push(id)
    return id
  }

  builder.step({
    narration: `Build an ε-NFA for ${regexToString(regex)} by working up the parse tree, one operator at a time.`,
    citation: '3.2.3',
    highlight: nodes.length === 0 ? [] : [{ type: 'treeNode', id: 'r', role: 'expanding' }],
    snapshot: {
      regex,
      nodes,
      target: machineOf(states, symbols, transitions, null),
      current: null,
      fragment: null,
      status: 'running',
    },
  })

  /** Post-order: a node is built only once both its children exist. */
  const build = (node: RegexNode, path: string): Fragment => {
    let fragment: Fragment

    switch (node.op) {
      case 'empty': {
        // Two states and nothing joining them: no string reaches the accept.
        const start = addState()
        const accept = addState()
        fragment = { start, accept }
        break
      }
      case 'epsilon': {
        const start = addState()
        const accept = addState()
        connect(start, null, accept)
        fragment = { start, accept }
        break
      }
      case 'symbol': {
        const start = addState()
        const accept = addState()
        symbols.add(node.sym)
        connect(start, node.sym, accept)
        fragment = { start, accept }
        break
      }
      case 'union': {
        const left = build(node.left, `${path}0`)
        const right = build(node.right, `${path}1`)
        const start = addState()
        const accept = addState()
        connect(start, null, left.start)
        connect(start, null, right.start)
        connect(left.accept, null, accept)
        connect(right.accept, null, accept)
        fragment = { start, accept }
        break
      }
      case 'concat': {
        const left = build(node.left, `${path}0`)
        const right = build(node.right, `${path}1`)
        connect(left.accept, null, right.start)
        fragment = { start: left.start, accept: right.accept }
        break
      }
      case 'star': {
        const inner = build(node.inner, `${path}0`)
        const start = addState()
        const accept = addState()
        connect(start, null, inner.start)
        connect(inner.accept, null, accept)
        // Skip the body entirely, or go round it again.
        connect(start, null, accept)
        connect(inner.accept, null, inner.start)
        fragment = { start, accept }
        break
      }
    }

    builder.bump('statesCreated', 2)
    builder.step({
      narration: describe(node, fragment),
      citation: '3.2.3',
      highlight: [
        { type: 'treeNode', id: path, role: 'matched' },
        { type: 'state', id: fragment.start, role: 'new' },
        { type: 'state', id: fragment.accept, role: 'new' },
      ],
      snapshot: {
        regex,
        nodes,
        target: machineOf(states, symbols, transitions, fragment),
        current: path,
        fragment,
        status: 'running',
      },
    })

    return fragment
  }

  const whole = build(regex, 'r')
  const target = machineOf(states, symbols, transitions, whole)

  builder.step({
    narration: `The whole expression is built: ${target.states.length} states, ${target.transitions.length} transitions, starting at ${whole.start} and accepting at ${whole.accept}.`,
    citation: '3.2.3, Thm 3.7',
    highlight: [{ type: 'state', id: whole.accept, role: 'accepting' }],
    snapshot: { regex, nodes, target, current: 'r', fragment: whole, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

function machineOf(
  states: readonly StateId[],
  symbols: ReadonlySet<Sym>,
  transitions: readonly FATransition[],
  fragment: Fragment | null,
): FiniteAutomaton {
  return {
    kind: 'ENFA',
    states: [...states],
    alphabet: [...symbols].sort(),
    transitions: [...transitions],
    start: fragment?.start ?? (states[0] ?? 'q0'),
    accepting: fragment === null ? [] : [fragment.accept],
  }
}

/** Flatten the parse tree, giving each node its path as an id. */
function flatten(regex: RegexNode): RegexTreeNode[] {
  const nodes: RegexTreeNode[] = []

  const walk = (node: RegexNode, path: string, parent: string | null): void => {
    const children =
      node.op === 'union' || node.op === 'concat'
        ? [`${path}0`, `${path}1`]
        : node.op === 'star'
          ? [`${path}0`]
          : []

    nodes.push({ id: path, op: node.op, label: regexToString(node), children, parent })

    if (node.op === 'union' || node.op === 'concat') {
      walk(node.left, `${path}0`, path)
      walk(node.right, `${path}1`, path)
    } else if (node.op === 'star') {
      walk(node.inner, `${path}0`, path)
    }
  }

  walk(regex, 'r', null)
  return nodes
}

function describe(node: RegexNode, fragment: Fragment): string {
  const range = `${fragment.start} to ${fragment.accept}`

  switch (node.op) {
    case 'empty':
      return `∅ is two states with nothing between them: ${range}, and no string can cross.`
    case 'epsilon':
      return `ε is a single ε-transition from ${fragment.start} to ${fragment.accept}.`
    case 'symbol':
      return `The symbol "${node.sym}" is one transition, ${range}.`
    case 'union':
      return `Union: a new start branches by ε into both fragments, and both ends rejoin at a new accepting state, giving ${range}.`
    case 'concat':
      return `Concatenation: an ε-transition joins the end of the first fragment to the start of the second, giving ${range}.`
    case 'star':
      return `Star: a new start can skip the fragment entirely or enter it, and its end can loop back, giving ${range}.`
  }
}
