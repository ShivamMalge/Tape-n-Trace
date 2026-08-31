/**
 * PDAs and Turing machines drawn with the finite-automaton renderer.
 *
 * The renderer is a pure function of a machine shape — states, transitions
 * with a label, a start, accepting rings. A PDA fits that shape once each
 * transition's three-part action is folded into the label the textbook writes
 * on the arc (`a, X/YX`); a TM once each move becomes `X/Y →` (§8.2.4), one
 * part per tape. Both keep the *engine's* transition ids, so a trace highlight
 * lights exactly the arc that fired.
 *
 * Here in `packages/ui` rather than the web app because the notebook widget
 * needs the same conversion: a snapshot's machine may be any of the three
 * kinds, and handing a TM's array-valued `read` to the renderer is a crash.
 *
 * ε appears here and nowhere deeper: the engine's `null` becomes a glyph at
 * the last moment, per ADR-002.
 */

import type { FiniteAutomaton, PDA, PDATransition, TMTransition, TuringMachine } from '@tape-n-trace/engine'

const ARROW: Record<string, string> = { L: '←', R: '→', S: '·' }

/** The textbook arc label for one TM move: `X/Y →`, one part per tape. */
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

/**
 * Whatever machine a snapshot carries, as something the renderer can draw —
 * or null when it is not a machine at all.
 */
export function drawableOf(value: unknown): FiniteAutomaton | null {
  if (typeof value !== 'object' || value === null) return null
  const m = value as { kind?: unknown; states?: unknown; transitions?: unknown; tapeAlphabet?: unknown; stackAlphabet?: unknown }
  if (!Array.isArray(m.states) || !Array.isArray(m.transitions)) return null
  // The engine's PDA and TuringMachine carry no `kind`; their shape says what they are.
  if (Array.isArray(m.tapeAlphabet)) return tmToDrawable(value as TuringMachine)
  if (Array.isArray(m.stackAlphabet)) return pdaToDrawable(value as PDA)
  if (m.kind === 'DFA' || m.kind === 'NFA' || m.kind === 'ENFA') return value as FiniteAutomaton
  return null
}
