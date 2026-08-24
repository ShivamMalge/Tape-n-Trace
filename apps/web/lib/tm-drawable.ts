/**
 * A Turing machine drawn with the finite-automaton renderer.
 *
 * Arcs carry the label the book draws (§8.2.4): `X/Y →` for δ(q, X) = (p, Y, R)
 * and `X/Y ←` for a left move. A multitape move lists one such part per tape,
 * separated by semicolons. Transition ids are the engine's, so highlights
 * light the arc that fired.
 */

import type { FiniteAutomaton, TMTransition, TuringMachine } from '@tape-n-trace/engine'

const ARROW: Record<string, string> = { L: '←', R: '→', S: '·' }

export function tmEdgeLabel(t: TMTransition): string {
  return t.read.map((r, i) => `${r}/${t.write[i]} ${ARROW[t.move[i] as string] ?? t.move[i]}`).join('; ')
}

export function tmToDrawable(machine: TuringMachine): FiniteAutomaton {
  return {
    kind: 'DFA',
    states: [...machine.states],
    alphabet: [...machine.tapeAlphabet],
    transitions: machine.transitions.map((t) => ({ id: t.id, from: t.from, read: tmEdgeLabel(t), to: t.to })),
    start: machine.start,
    accepting: [...machine.accepting],
    ...(machine.layout === undefined ? {} : { layout: machine.layout }),
  }
}
