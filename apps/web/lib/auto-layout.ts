'use client'

/**
 * Layered auto-layout via elkjs — architecture.md §7.
 *
 * §7 fixes the strategy: a generated machine is laid out **layered, ranked by
 * BFS distance from the start state**, because a subset-construction DFA ranked
 * by distance reads far better than a force blob.
 *
 * The renderer already does a synchronous version of that (`layeredLayout`),
 * which is what keeps rendering pure. This is the deliberate, user-invoked
 * version: elk routes around nodes and separates edges properly, and it is async,
 * so it belongs in a controller action rather than in a render.
 *
 * Loaded on demand — elk is a large bundle and no page should pay for it until
 * someone presses "Tidy up".
 */

import { NODE_RADIUS } from '@tape-n-trace/ui'
import type { FiniteAutomaton, Point, StateId } from '@tape-n-trace/engine'

const DIAMETER = NODE_RADIUS * 2

/**
 * Compute positions for every state. Returns `null` if elk fails to load or to
 * lay out — a tidy-up that cannot run should leave the diagram alone, not crash
 * the editor with a machine the user has been drawing for ten minutes.
 */
export async function autoLayout(machine: FiniteAutomaton): Promise<Record<StateId, Point> | null> {
  try {
    const { default: ELK } = await import('elkjs/lib/elk.bundled.js')
    const elk = new ELK()

    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.layered.spacing.nodeNodeBetweenLayers': String(DIAMETER * 1.6),
        'elk.spacing.nodeNode': String(DIAMETER * 0.9),
        'elk.spacing.edgeNode': String(DIAMETER * 0.5),
        // Rank by distance from the start state, per §7.
        'elk.layered.layering.strategy': 'LONGEST_PATH_SOURCE',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      },
      children: machine.states.map((id) => ({ id, width: DIAMETER, height: DIAMETER })),
      // Self-loops confuse layered ranking and carry no ranking information
      // anyway — a state is not further from the start for looping on itself.
      edges: machine.transitions
        .filter((t) => t.from !== t.to)
        .map((t) => ({ id: t.id, sources: [t.from], targets: [t.to] })),
    }

    const result = await elk.layout(graph)
    const layout: Record<StateId, Point> = {}

    for (const child of result.children ?? []) {
      if (child.x === undefined || child.y === undefined) continue
      // elk reports the top-left corner; the renderer positions by centre.
      layout[child.id] = {
        x: Math.round(child.x + DIAMETER / 2),
        y: Math.round(child.y + DIAMETER / 2),
      }
    }

    return Object.keys(layout).length === machine.states.length ? layout : null
  } catch {
    return null
  }
}
