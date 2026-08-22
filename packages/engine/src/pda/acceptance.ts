/**
 * Acceptance-mode conversions — Hopcroft 2e §6.2.3 (empty stack → final state,
 * Thm 6.9) and §6.2.4 (final state → empty stack, Thm 6.11).
 *
 * Both constructions hinge on the same trick: a **new bottom marker** X0 pushed
 * *under* the original start symbol. It is not decoration. Going one way it is
 * the tripwire — the original machine's stack has emptied exactly when X0
 * surfaces; going the other it is the safety net — the simulated machine must
 * not accidentally accept by running its own stack dry before the drain state
 * has been entered deliberately.
 */

import { TraceBuilder } from '../trace.js'
import { freshStateId, pdaTransitionId } from '../ids.js'
import { ok, type Result } from '../result.js'
import { validatePDA } from './simulate.js'
import { err } from '../result.js'
import type { PDA, PDATransition, Read, Step, StateId, Sym, Trace } from '../types.js'

export interface PdaAcceptanceSnapshot {
  source: PDA
  target: PDA
  status: 'running' | 'done'
  [key: string]: unknown
}

export type PdaAcceptanceTrace = Trace<Step<PdaAcceptanceSnapshot>>

function arc(from: StateId, read: Read, pop: Read, push: Sym[], to: StateId): PDATransition {
  return { id: pdaTransitionId(from, read, pop, push, to), from, read, pop, to, push }
}

/**
 * L(P) → N(P): a PDA accepting by final state becomes one accepting by empty
 * stack — Thm 6.11. From every accepting state an ε-move enters the drain
 * state, which pops whatever remains.
 */
export function finalStateToEmptyStack(source: PDA): Result<PdaAcceptanceTrace> {
  const problems = validatePDA(source)
  if (problems.length > 0) return err(problems)

  const p0 = freshStateId('p0', source.states)
  const drain = freshStateId('pe', [...source.states, p0])
  const bottom = freshStateId('X0', source.stackAlphabet)
  const builder = new TraceBuilder<PdaAcceptanceSnapshot>('convert.pda-acceptance', {
    source,
    direction: 'final-to-empty',
  })

  let target: PDA = {
    states: [p0, ...source.states, drain],
    inputAlphabet: [...source.inputAlphabet],
    stackAlphabet: [bottom, ...source.stackAlphabet],
    transitions: [arc(p0, null, bottom, [source.startStack, bottom], source.start)],
    start: p0,
    startStack: bottom,
    accepting: [],
    acceptBy: 'emptyStack',
  }

  builder.step({
    narration: `A new start state ${p0} pushes ${source.startStack} above a new bottom marker ${bottom} and hands control to ${source.start}. ${bottom} is the safety net: if the original machine drains its own stack without having accepted, ${bottom} is still there and the new machine does not accept by accident.`,
    citation: '6.2.4, Thm 6.11',
    highlight: [
      { type: 'state', id: p0, role: 'new' },
      { type: 'transition', id: target.transitions[0]?.id ?? '', role: 'added' },
    ],
    snapshot: { source, target, status: 'running' },
  })

  target = { ...target, transitions: [...target.transitions, ...source.transitions] }
  builder.step({
    narration: `Every original transition is kept unchanged: the new machine simulates the original move for move.`,
    citation: '6.2.4',
    highlight: [],
    snapshot: { source, target, status: 'running' },
  })

  const stackSymbols = [bottom, ...source.stackAlphabet]
  const drainArcs: PDATransition[] = [
    ...source.accepting.flatMap((q) => stackSymbols.map((y) => arc(q, null, y, [], drain))),
    ...stackSymbols.map((y) => arc(drain, null, y, [], drain)),
  ]
  target = { ...target, transitions: [...target.transitions, ...drainArcs] }
  builder.bump('transitionsAdded', drainArcs.length + 1)

  builder.step({
    narration:
      source.accepting.length === 0
        ? `The original machine has no accepting state, so no drain transitions are needed: the new machine's stack never empties and it accepts nothing, which is exactly L(P) = ∅.`
        : `From ${source.accepting.length === 1 ? 'the accepting state' : 'each accepting state'} ${source.accepting.join(', ')}, an ε-move on every stack symbol enters the drain state ${drain}, which pops symbol after symbol — including ${bottom} — until the stack is empty. Acceptance by final state has become acceptance by empty stack.`,
    citation: '6.2.4, Thm 6.11',
    highlight: [
      { type: 'state', id: drain, role: 'new' },
      ...source.accepting.map((q) => ({ type: 'state' as const, id: q, role: 'marked' as const })),
    ],
    snapshot: { source, target, status: 'running' },
  })

  builder.step({
    narration: `The construction is complete: the new machine accepts by empty stack exactly the strings the original accepted by final state, N(P′) = L(P).`,
    citation: '6.2.4, Thm 6.11',
    highlight: [],
    snapshot: { source, target, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

/**
 * N(P) → L(P): a PDA accepting by empty stack becomes one accepting by final
 * state — Thm 6.9. The bottom marker surfacing is the proof the original
 * stack just emptied, and it triggers the move into the one accepting state.
 */
export function emptyStackToFinalState(source: PDA): Result<PdaAcceptanceTrace> {
  const problems = validatePDA(source)
  if (problems.length > 0) return err(problems)

  const p0 = freshStateId('p0', source.states)
  const accept = freshStateId('pf', [...source.states, p0])
  const bottom = freshStateId('X0', source.stackAlphabet)
  const builder = new TraceBuilder<PdaAcceptanceSnapshot>('convert.pda-acceptance', {
    source,
    direction: 'empty-to-final',
  })

  let target: PDA = {
    states: [p0, ...source.states, accept],
    inputAlphabet: [...source.inputAlphabet],
    stackAlphabet: [bottom, ...source.stackAlphabet],
    transitions: [arc(p0, null, bottom, [source.startStack, bottom], source.start)],
    start: p0,
    startStack: bottom,
    accepting: [accept],
    acceptBy: 'finalState',
  }

  builder.step({
    narration: `A new start state ${p0} pushes ${source.startStack} above a new bottom marker ${bottom} and hands control to ${source.start}. ${bottom} is the tripwire: the original machine can never see it, so the moment ${bottom} is on top, the original stack has just emptied.`,
    citation: '6.2.3, Thm 6.9',
    highlight: [
      { type: 'state', id: p0, role: 'new' },
      { type: 'transition', id: target.transitions[0]?.id ?? '', role: 'added' },
    ],
    snapshot: { source, target, status: 'running' },
  })

  target = { ...target, transitions: [...target.transitions, ...source.transitions] }
  builder.step({
    narration: `Every original transition is kept unchanged, so the new machine reaches exactly the IDs the original could — with ${bottom} sitting untouched underneath.`,
    citation: '6.2.3',
    highlight: [],
    snapshot: { source, target, status: 'running' },
  })

  const detectArcs = source.states.map((q) => arc(q, null, bottom, [], accept))
  target = { ...target, transitions: [...target.transitions, ...detectArcs] }
  builder.bump('transitionsAdded', detectArcs.length + 1)

  builder.step({
    narration: `From every original state, an ε-move that sees ${bottom} on top enters the new accepting state ${accept}: emptying the old stack is now observable, and it is rewarded with acceptance by final state.`,
    citation: '6.2.3, Thm 6.9',
    highlight: [
      { type: 'state', id: accept, role: 'new' },
      ...detectArcs.map((a) => ({ type: 'transition' as const, id: a.id, role: 'added' as const })),
    ],
    snapshot: { source, target, status: 'running' },
  })

  builder.step({
    narration: `The construction is complete: the new machine accepts by final state exactly the strings the original accepted by empty stack, L(P′) = N(P).`,
    citation: '6.2.3, Thm 6.9',
    highlight: [],
    snapshot: { source, target, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}
