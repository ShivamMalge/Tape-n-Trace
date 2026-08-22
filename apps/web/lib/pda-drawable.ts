/**
 * A PDA drawn with the finite-automaton renderer.
 *
 * The renderer is a pure function of a machine shape — states, transitions
 * with a label, a start, accepting rings. A PDA fits that shape once each
 * transition's three-part action is folded into the label the textbook writes
 * on the arc: `a, X/YX`. The drawable keeps the *engine's* transition ids, so
 * a trace highlight lights exactly the arc that fired.
 *
 * ε appears here and nowhere deeper: the engine's `null` becomes a glyph at
 * the last moment, per ADR-002.
 */

import type { FiniteAutomaton, PDA, PDATransition } from '@tape-n-trace/engine'

/** The textbook arc label: read, pop/push, ε for each empty part. */
export function pdaEdgeLabel(t: PDATransition): string {
  const push = t.push.length === 0 ? 'ε' : t.push.join('')
  return `${t.read ?? 'ε'}, ${t.pop ?? 'ε'}/${push}`
}

export function pdaToDrawable(pda: PDA): FiniteAutomaton {
  return {
    kind: 'NFA',
    states: [...pda.states],
    alphabet: [...pda.inputAlphabet],
    transitions: pda.transitions.map((t) => ({
      id: t.id,
      from: t.from,
      read: pdaEdgeLabel(t),
      to: t.to,
    })),
    start: pda.start,
    accepting: [...pda.accepting],
    ...(pda.layout === undefined ? {} : { layout: pda.layout }),
  }
}
