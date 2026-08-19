/**
 * Automaton layout — architecture.md §7.
 *
 * The strategy table in §7 gives three cases. This module covers the second and
 * third: a machine that arrives with a hand-authored or user-drawn `layout` is
 * drawn exactly where it says, and a machine that arrives without one is laid
 * out **layered, ranked by BFS distance from the start state** — because a
 * subset-construction DFA ranked by distance reads far better than a force blob.
 *
 * Deliberately synchronous and dependency-free. §7 names `elkjs`, which is
 * async and therefore has to run in a controller effect rather than during
 * render; this covers the common case in the render path, and elkjs remains the
 * upgrade when generated machines get dense enough to need real edge routing.
 * Positions are a pure function of the machine, so the same machine always draws
 * identically.
 */

import type { FiniteAutomaton, Point, StateId } from '@tape-n-trace/engine'
import { NODE_RADIUS } from './geometry.js'

export interface LayoutOptions {
  /** Horizontal gap between ranks. */
  columnGap?: number
  /** Vertical gap between states sharing a rank. */
  rowGap?: number
  radius?: number
}

export type Layout = Record<StateId, Point>

/**
 * The layout to draw with: the machine's own if it has one for every state,
 * otherwise a computed layered one. A partial layout is treated as absent
 * rather than merged, so a half-positioned machine cannot render as a pile in
 * the top-left corner.
 */
export function resolveLayout(machine: FiniteAutomaton, options: LayoutOptions = {}): Layout {
  const given = machine.layout
  if (given !== undefined && machine.states.every((s) => given[s] !== undefined)) return given

  // Cached by machine identity and radius, for the same reason `groupTransitions`
  // is: stable object identity across the renders of a scrub, so `React.memo`
  // can see that a node's position did not change.
  const radius = options.radius ?? NODE_RADIUS
  const byRadius = layoutCache.get(machine) ?? new Map<number, Layout>()
  const cached = byRadius.get(radius)
  if (cached !== undefined) return cached

  const computed = layeredLayout(machine, options)
  byRadius.set(radius, computed)
  layoutCache.set(machine, byRadius)
  return computed
}

const layoutCache = new WeakMap<FiniteAutomaton, Map<number, Layout>>()

/**
 * Rank every state by its BFS distance from the start state, then place ranks
 * left to right. States no path reaches sit in a final rank of their own — they
 * are usually the point of the exercise (unreachable states are what
 * minimisation removes), so they must be visible rather than stacked at the origin.
 */
export function layeredLayout(machine: FiniteAutomaton, options: LayoutOptions = {}): Layout {
  const radius = options.radius ?? NODE_RADIUS
  const columnGap = options.columnGap ?? radius * 5
  const rowGap = options.rowGap ?? radius * 3.4

  const ranks = rankByDistance(machine)
  const maxRank = Math.max(0, ...Object.values(ranks))

  // Group by rank, keeping machine order within a rank so layout is deterministic.
  const columns: StateId[][] = Array.from({ length: maxRank + 1 }, () => [])
  for (const state of machine.states) {
    const rank = ranks[state] ?? maxRank
    ;(columns[rank] as StateId[]).push(state)
  }

  const tallest = Math.max(1, ...columns.map((c) => c.length))
  const layout: Layout = {}
  const marginX = radius * 2.6
  const marginY = radius * 2.2

  columns.forEach((states, rank) => {
    // Centre each column against the tallest, so the graph reads as a band
    // rather than a staircase.
    const offset = ((tallest - states.length) * rowGap) / 2
    states.forEach((state, row) => {
      layout[state] = {
        x: marginX + rank * columnGap,
        y: marginY + offset + row * rowGap,
      }
    })
  })

  return layout
}

/** BFS distance from the start state. States with no path in are omitted. */
function rankByDistance(machine: FiniteAutomaton): Record<StateId, number> {
  const known = new Set(machine.states)
  const ranks: Record<StateId, number> = {}
  if (!known.has(machine.start)) return ranks

  const outgoing = new Map<StateId, StateId[]>()
  for (const t of machine.transitions) {
    if (!known.has(t.from) || !known.has(t.to)) continue
    const list = outgoing.get(t.from)
    if (list === undefined) outgoing.set(t.from, [t.to])
    else list.push(t.to)
  }

  ranks[machine.start] = 0
  let frontier: StateId[] = [machine.start]
  let distance = 0

  while (frontier.length > 0) {
    distance += 1
    const next: StateId[] = []
    for (const state of frontier) {
      for (const to of outgoing.get(state) ?? []) {
        if (ranks[to] !== undefined) continue
        ranks[to] = distance
        next.push(to)
      }
    }
    frontier = next
  }

  return ranks
}

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A viewBox with room for everything that renders outside a node's circle: the
 * start arrow to the left, self-loops above, and edge labels all round.
 */
export function boundsOf(layout: Layout, radius: number): ViewBox {
  const points = Object.values(layout)
  if (points.length === 0) return { x: 0, y: 0, width: radius * 4, height: radius * 4 }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)

  // Left: the start-state stub. Top: self-loops rise about 3r above centre.
  const padLeft = radius * 2.6
  const padTop = radius * 3.6
  const padRight = radius * 2.2
  const padBottom = radius * 2.2

  const minX = Math.min(...xs) - padLeft
  const minY = Math.min(...ys) - padTop

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) + padRight - minX,
    height: Math.max(...ys) + padBottom - minY,
  }
}
