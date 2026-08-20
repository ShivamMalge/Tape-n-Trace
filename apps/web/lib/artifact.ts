/**
 * What goes underneath the two machines, for each conversion.
 *
 * §5 makes snapshots `unknown` on purpose: a subset table and a triangular
 * distinguishability table have nothing in common. Narrowing them is the
 * controller's job, so it happens here — one pure function from a step to a
 * description of what to draw, and the panel component just draws it.
 */

import { EPSILON_GLYPH } from '@tape-n-trace/ui'
import type { ParseTreeNode, TableColumn, TableRow } from '@tape-n-trace/ui'
import type { FiniteAutomaton, Step, Trace } from '@tape-n-trace/engine'

export type Artifact =
  | { kind: 'table'; columns: TableColumn[]; rows: TableRow[]; caption: string }
  | { kind: 'triangle'; states: string[]; marks: Record<string, number> }
  | { kind: 'parseTree'; nodes: ParseTreeNode[] }
  | { kind: 'none' }

/** The two machines the shell shows, left and right. */
export interface Panes {
  source: FiniteAutomaton | null
  target: FiniteAutomaton | null
}

interface AnySnapshot {
  source?: FiniteAutomaton
  target?: FiniteAutomaton | null
  machine?: FiniteAutomaton
  current?: unknown
  table?: { name: string; members: string[]; moves: Record<string, string>; processed: boolean }[]
  closures?: Record<string, string[]>
  states?: string[]
  marks?: Record<string, number>
  edges?: { from: string; to: string; label: string }[]
  nodes?: ParseTreeNode[]
  grammar?: { productions: { head: string; body: string[] }[] }
}

function snapshotOf(step: Step | null | undefined): AnySnapshot | null {
  if (step === null || step === undefined) return null
  const snapshot = step.snapshot
  return snapshot !== null && typeof snapshot === 'object' ? (snapshot as AnySnapshot) : null
}

/**
 * Source on the left, growing target on the right.
 *
 * A grammar conversion has only one automaton, and it is the thing being built,
 * so it goes on the right with nothing opposite it.
 */
export function panesOf(trace: Trace, step: Step | null): Panes {
  const s = snapshotOf(step)
  if (s === null) return { source: null, target: null }

  if (trace.kind === 'convert.grammar-to-nfa') {
    return { source: null, target: s.machine ?? null }
  }

  return { source: s.source ?? s.machine ?? null, target: s.target ?? null }
}

export function artifactOf(trace: Trace, step: Step | null): Artifact {
  const s = snapshotOf(step)
  if (s === null) return { kind: 'none' }

  switch (trace.kind) {
    case 'convert.nfa-to-dfa':
      return subsetTable(s)
    case 'convert.enfa-to-nfa':
      return closureTable(s)
    case 'convert.minimize':
      return { kind: 'triangle', states: s.states ?? [], marks: s.marks ?? {} }
    case 'convert.dfa-to-re.elim':
      return edgeTable(s)
    case 'convert.re-to-enfa':
      return { kind: 'parseTree', nodes: s.nodes ?? [] }
    case 'convert.grammar-to-nfa':
      return productionTable(s)
    default:
      return { kind: 'none' }
  }
}

/** The subset table: one row per DFA state, one column per input symbol. */
function subsetTable(s: AnySnapshot): Artifact {
  const alphabet = s.source?.alphabet ?? []
  const current = typeof s.current === 'string' ? s.current : null

  return {
    kind: 'table',
    caption: 'The subset table. Each row is a DFA state; each cell is where it goes on that symbol.',
    columns: [
      { key: 'state', label: 'DFA state' },
      ...alphabet.map((symbol) => ({ key: symbol, label: symbol })),
    ],
    rows: (s.table ?? []).map((row) => ({
      key: row.name,
      role: row.name === current ? ('current' as const) : !row.processed ? ('new' as const) : undefined,
      cells: {
        state: row.name === '{}' ? '{} (dead)' : row.name,
        ...Object.fromEntries(alphabet.map((symbol) => [symbol, row.moves[symbol] ?? '—'])),
      },
    })),
  }
}

/** One row per state: its ε-closure, and whether the closure makes it accepting. */
function closureTable(s: AnySnapshot): Artifact {
  const closures = s.closures ?? {}
  const current = typeof s.current === 'string' ? s.current : null
  const accepting = new Set(s.target?.accepting ?? [])

  return {
    kind: 'table',
    caption: `ε-closures. A state becomes accepting when its closure reaches one.`,
    columns: [
      { key: 'state', label: 'State' },
      { key: 'closure', label: `ECLOSE` },
      { key: 'accepting', label: 'Accepting now?' },
    ],
    rows: Object.entries(closures).map(([state, closure]) => ({
      key: state,
      role: state === current ? ('current' as const) : undefined,
      cells: {
        state,
        closure: `{${closure.join(',')}}`,
        accepting: accepting.has(state) ? 'yes' : 'no',
      },
    })),
  }
}

/** The labelled edges of the generalised automaton, as state elimination rewrites them. */
function edgeTable(s: AnySnapshot): Artifact {
  const remaining = new Set(s.states ?? [])

  return {
    kind: 'table',
    caption: 'Edges of the generalised automaton. Labels are regular expressions, not symbols.',
    columns: [
      { key: 'from', label: 'From' },
      { key: 'to', label: 'To' },
      { key: 'label', label: 'Reads' },
    ],
    rows: (s.edges ?? []).map((edge) => ({
      key: `${edge.from} ${edge.to}`,
      // An edge whose endpoints have both survived is part of the answer forming.
      role: remaining.has(edge.from) && remaining.has(edge.to) ? undefined : ('dead' as const),
      cells: { from: edge.from, to: edge.to, label: edge.label },
    })),
  }
}

function productionTable(s: AnySnapshot): Artifact {
  const productions = s.grammar?.productions ?? []
  const current = typeof s.current === 'number' ? s.current : null

  return {
    kind: 'table',
    caption: 'The grammar. Each production is one move of the automaton.',
    columns: [
      { key: 'index', label: '#' },
      { key: 'head', label: 'Head' },
      { key: 'body', label: 'Body' },
    ],
    rows: productions.map((production, index) => ({
      key: String(index),
      role: index === current ? ('current' as const) : undefined,
      cells: {
        index: String(index + 1),
        head: production.head,
        body: production.body.length === 0 ? EPSILON_GLYPH : production.body.join(''),
      },
    })),
  }
}
