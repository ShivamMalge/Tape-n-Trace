/**
 * CFG → PDA — Hopcroft 2e §6.3.1, Thm 6.13.
 *
 * One state. The stack *is* the sentential form: what remains of a leftmost
 * derivation that has not yet been matched against the input. A variable on
 * top is expanded by guessing a production; a terminal on top must match the
 * next input symbol and both are consumed. The machine accepts by empty stack,
 * because an empty stack means the whole guessed derivation was matched.
 */

import { TraceBuilder } from '../trace.js'
import { pdaTransitionId } from '../ids.js'
import { err, ok, validationError, type Result } from '../result.js'
import type { CFG, PDA, PDATransition, Step, Sym, Trace } from '../types.js'

export interface CfgToPdaSnapshot {
  grammar: CFG
  target: PDA
  status: 'running' | 'done'
  [key: string]: unknown
}

export type CfgToPdaTrace = Trace<Step<CfgToPdaSnapshot>>

const STATE = 'q'

export function cfgToPDA(grammar: CFG): Result<CfgToPdaTrace> {
  const overlap = grammar.variables.filter((v) => grammar.terminals.includes(v))
  if (overlap.length > 0) {
    return err(
      overlap.map((v) =>
        validationError('CFG_SYMBOL_OVERLAP', `"${v}" is both a variable and a terminal; the stack could not tell them apart.`, {
          kind: 'production',
        }),
      ),
    )
  }

  const builder = new TraceBuilder<CfgToPdaSnapshot>('convert.cfg-to-pda', { grammar })

  let target: PDA = {
    states: [STATE],
    inputAlphabet: [...grammar.terminals],
    stackAlphabet: [...grammar.variables, ...grammar.terminals],
    transitions: [],
    start: STATE,
    startStack: grammar.start,
    accepting: [],
    acceptBy: 'emptyStack',
  }

  builder.step({
    narration: `The PDA has a single state ${STATE}. Its stack alphabet is every grammar symbol — the ${grammar.variables.length} variable${grammar.variables.length === 1 ? '' : 's'} and the ${grammar.terminals.length} terminal${grammar.terminals.length === 1 ? '' : 's'} — and the start symbol ${grammar.start} begins alone on the stack. The stack will hold the unmatched tail of a leftmost derivation.`,
    citation: '6.3.1, Thm 6.13',
    highlight: [{ type: 'state', id: STATE, role: 'new' }],
    snapshot: { grammar, target, status: 'running' },
  })

  grammar.productions.forEach((production, index) => {
    const added: PDATransition = {
      id: pdaTransitionId(STATE, null, production.head, production.body, STATE),
      from: STATE,
      read: null,
      pop: production.head,
      to: STATE,
      push: [...production.body] as Sym[],
    }
    target = { ...target, transitions: [...target.transitions, added] }
    builder.bump('transitionsAdded')
    builder.step({
      narration:
        production.body.length === 0
          ? `The ε-production ${production.head} → ε becomes an ε-move that pops ${production.head} and pushes nothing: the variable simply vanishes, as it does in the derivation.`
          : `The production ${production.head} → ${production.body.join(' ')} becomes an ε-move: pop ${production.head}, push ${production.body.join(' ')} with its first symbol on top. Expanding the stack this way is exactly applying the production to the leftmost variable.`,
      citation: '6.3.1',
      highlight: [
        { type: 'production', index, role: 'applied' },
        { type: 'transition', id: added.id, role: 'added' },
      ],
      snapshot: { grammar, target, status: 'running' },
    })
  })

  const matchArcs: PDATransition[] = grammar.terminals.map((a) => ({
    id: pdaTransitionId(STATE, a, a, [], STATE),
    from: STATE,
    read: a,
    pop: a,
    to: STATE,
    push: [],
  }))
  target = { ...target, transitions: [...target.transitions, ...matchArcs] }
  builder.bump('transitionsAdded', matchArcs.length)

  builder.step({
    narration: `For every terminal, a matching move: read it from the input and pop it from the stack in the same step. A terminal on top of the stack is a commitment the guessed derivation has made, and the input must honour it.`,
    citation: '6.3.1',
    highlight: matchArcs.map((a) => ({ type: 'transition' as const, id: a.id, role: 'added' as const })),
    snapshot: { grammar, target, status: 'running' },
  })

  builder.step({
    narration: `The construction is complete: the PDA accepts by empty stack exactly the strings the grammar derives, N(P) = L(G). Every accepting run is a leftmost derivation read off the stack.`,
    citation: '6.3.1, Thm 6.13',
    highlight: [],
    snapshot: { grammar, target, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}
