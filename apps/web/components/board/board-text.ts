/**
 * The board's words and paths — pure helpers shared by the controller, the
 * canvas and the panel.
 */

import type { FiniteAutomaton, Point, StateId } from '@tape-n-trace/engine'

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉'

/** q3 → q₃, the way the board letters it. */
export function pretty(id: StateId): string {
  return id.replace(/^q(\d+)$/, (_, n: string) => `q${[...n].map((d) => SUBSCRIPT[Number(d)]).join('')}`)
}

/** An SVG path through the points of a stroke. */
export function pathOf(points: readonly Point[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points as [Point, ...Point[]]
  return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}` + rest.map((p) => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

function count(n: number): string {
  return `${WORDS[n] ?? String(n)} state${n === 1 ? '' : 's'}`
}

/** The panel's one-sentence prompt for what to do next (design artboard 07). */
export function hintFor(machine: FiniteAutomaton, arcs: number, problems: string[], hasRun: boolean): string {
  const n = machine.states.length
  if (n === 0) return 'Draw a loop to make a state. The first one is the start state.'
  const names = machine.states.map(pretty)
  if (n === 1 && arcs === 0) return `One state so far. Draw an arc from ${names[0]} back to itself, or a second loop for a new state.`
  if (machine.accepting.length === 0) {
    return `${count(n)} so far. Draw an arc back to ${names[0]} or mark ${names[n - 1]} accepting to run a string.`
  }
  if (problems.length > 0) return problems[0] as string
  if (hasRun) return 'Scrub the steps or press Play; the current states light on the board.'
  return 'Type a string and press Play; the machine runs it in every branch at once.'
}
