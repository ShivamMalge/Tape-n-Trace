/**
 * Regular grammars and finite automata.
 *
 * A right-linear grammar and an NFA are the same object written two ways. Every
 * production has one of four shapes, and each is a transition:
 *
 *     A → aB     read a, move from A to B
 *     A → a      read a, and finish
 *     A → ε      A is an accepting state
 *     A → B      move from A to B without reading (an ε-transition)
 *
 * One step per production or transition mapped, so the correspondence is watched
 * rather than asserted.
 *
 * **Citations are absent here on purpose.** Every other module cites its Hopcroft
 * 2e section; regular grammars are not covered at any of the sections the
 * syllabus prescribes, and this file will not invent a reference to a page that
 * may not say what it claims. Add one once the printed edition has been checked.
 */

import { faTransitionId, freshStateId } from '../ids.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { TraceBuilder } from '../trace.js'
import { validateFA } from '../validate.js'
import type { CFG, FATransition, FiniteAutomaton, Production, StateId, Step, Sym, Trace } from '../types.js'

export interface GrammarSnapshot {
  grammar: CFG
  /** The automaton as far as it has been built, or the source it came from. */
  machine: FiniteAutomaton
  /** The production index or transition id handled this step. */
  current: number | null
  status: 'running' | 'done'
}

/** The four shapes a right-linear production may take. */
type Shape =
  | { form: 'epsilon' }
  | { form: 'terminal'; sym: Sym }
  | { form: 'terminal-variable'; sym: Sym; next: string }
  | { form: 'variable'; next: string }

function shapeOf(production: Production, grammar: CFG): Shape | null {
  const variables = new Set(grammar.variables)
  const terminals = new Set(grammar.terminals)
  const [first, second, ...rest] = production.body

  if (production.body.length === 0) return { form: 'epsilon' }
  if (rest.length > 0) return null

  if (second === undefined) {
    if (first !== undefined && terminals.has(first)) return { form: 'terminal', sym: first }
    if (first !== undefined && variables.has(first)) return { form: 'variable', next: first }
    return null
  }

  if (first !== undefined && terminals.has(first) && variables.has(second)) {
    return { form: 'terminal-variable', sym: first, next: second }
  }
  return null
}

/**
 * Convert a right-linear grammar into an equivalent automaton.
 *
 * A single extra state absorbs every `A → a` production — the string ends there,
 * so it is the one accepting state those productions need. It is only added if
 * something actually uses it.
 */
export function grammarToNFA(grammar: CFG): Result<Trace<Step<GrammarSnapshot>>> {
  const problems = checkRightLinear(grammar)
  if (problems.length > 0) return err(problems)

  const finishName = freshStateId('F', grammar.variables)
  const transitions: FATransition[] = []
  const accepting = new Set<StateId>()
  let usesFinish = false
  let usesEpsilon = false

  const builder = new TraceBuilder<GrammarSnapshot>('convert.grammar-to-nfa', grammar)

  const machineNow = (): FiniteAutomaton => ({
    kind: usesEpsilon ? 'ENFA' : 'NFA',
    states: usesFinish ? [...grammar.variables, finishName] : [...grammar.variables],
    alphabet: [...grammar.terminals],
    transitions: [...transitions],
    start: grammar.start,
    accepting: (usesFinish ? [...grammar.variables, finishName] : [...grammar.variables]).filter((s) =>
      accepting.has(s),
    ),
  })

  builder.step({
    narration: `Each variable becomes a state, starting at ${grammar.start}. Each production becomes a move.`,
    highlight: [],
    snapshot: { grammar, machine: machineNow(), current: null, status: 'running' },
  })

  grammar.productions.forEach((production, index) => {
    const shape = shapeOf(production, grammar) as Shape
    let narration: string

    switch (shape.form) {
      case 'epsilon':
        accepting.add(production.head)
        narration = `${production.head} → ε means a string can end here, so ${production.head} becomes an accepting state.`
        break
      case 'terminal': {
        usesFinish = true
        accepting.add(finishName)
        transitions.push(edge(production.head, shape.sym, finishName))
        narration = `${production.head} → ${shape.sym} reads "${shape.sym}" and finishes, so it becomes a move from ${production.head} to the accepting state ${finishName}.`
        break
      }
      case 'terminal-variable':
        transitions.push(edge(production.head, shape.sym, shape.next))
        narration = `${production.head} → ${shape.sym}${shape.next} reads "${shape.sym}" and continues as ${shape.next}, so it becomes a move from ${production.head} to ${shape.next}.`
        break
      case 'variable':
        usesEpsilon = true
        transitions.push(edge(production.head, null, shape.next))
        narration = `${production.head} → ${shape.next} reads nothing at all, so it becomes an ε-transition from ${production.head} to ${shape.next}.`
        break
    }

    builder.bump('productionsMapped')
    builder.step({
      narration,
      highlight: [
        { type: 'production', index, role: 'applied' },
        { type: 'state', id: production.head, role: 'current' },
      ],
      snapshot: { grammar, machine: machineNow(), current: index, status: 'running' },
    })
  })

  const machine = machineNow()
  builder.step({
    narration: `Every production is mapped. The result is an ${machine.kind === 'ENFA' ? 'ε-NFA' : 'NFA'} with ${machine.states.length} states accepting exactly the language the grammar generates.`,
    highlight: machine.accepting.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const })),
    snapshot: { grammar, machine, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine }))
}

/** Convert an automaton into an equivalent right-linear grammar. */
export function nfaToGrammar(nfa: FiniteAutomaton): Result<Trace<Step<GrammarSnapshot>>> {
  const validated = validateFA(nfa)
  if (!validated.ok) return validated

  const productions: Production[] = []
  const builder = new TraceBuilder<GrammarSnapshot>('convert.grammar-to-nfa', nfa)

  const grammarNow = (): CFG => ({
    variables: [...nfa.states],
    terminals: [...nfa.alphabet],
    productions: [...productions],
    start: nfa.start,
  })

  builder.step({
    narration: `Each state becomes a variable, with ${nfa.start} as the start symbol. Each move becomes a production.`,
    highlight: [],
    snapshot: { grammar: grammarNow(), machine: nfa, current: null, status: 'running' },
  })

  for (const t of nfa.transitions) {
    productions.push({ head: t.from, body: t.read === null ? [t.to] : [t.read, t.to] })
    builder.bump('transitionsMapped')
    builder.step({
      narration:
        t.read === null
          ? `The ε-transition from ${t.from} to ${t.to} reads nothing, so it becomes ${t.from} → ${t.to}.`
          : `The move from ${t.from} to ${t.to} on "${t.read}" becomes ${t.from} → ${t.read}${t.to}.`,
      highlight: [
        { type: 'transition', id: t.id, role: 'taken' },
        { type: 'production', index: productions.length - 1, role: 'added' },
      ],
      snapshot: { grammar: grammarNow(), machine: nfa, current: productions.length - 1, status: 'running' },
    })
  }

  for (const state of nfa.accepting) {
    productions.push({ head: state, body: [] })
    builder.step({
      narration: `${state} is accepting, so a string may end there: ${state} → ε.`,
      highlight: [
        { type: 'state', id: state, role: 'accepting' },
        { type: 'production', index: productions.length - 1, role: 'added' },
      ],
      snapshot: { grammar: grammarNow(), machine: nfa, current: productions.length - 1, status: 'running' },
    })
  }

  const grammar = grammarNow()
  builder.step({
    narration: `Every move and every accepting state is mapped. The grammar has ${grammar.productions.length} productions and generates exactly the language the automaton accepts.`,
    highlight: [],
    snapshot: { grammar, machine: nfa, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'grammar', grammar }))
}

function edge(from: StateId, read: Sym | null, to: StateId): FATransition {
  return { id: faTransitionId(from, read, to), from, read, to }
}

/** Every production must be right-linear, and every violation is reported. */
export function checkRightLinear(grammar: CFG): ValidationError[] {
  const problems: ValidationError[] = []

  if (!grammar.variables.includes(grammar.start)) {
    problems.push(
      validationError(
        'START_NOT_A_VARIABLE',
        `The start symbol ${grammar.start} is not one of the grammar's variables.`,
        { kind: 'machine' },
      ),
    )
  }

  grammar.productions.forEach((production, index) => {
    if (!grammar.variables.includes(production.head)) {
      problems.push(
        validationError(
          'PRODUCTION_HEAD_NOT_A_VARIABLE',
          `Production ${index + 1} has head ${production.head}, which is not a variable.`,
          { kind: 'production', id: String(index) },
        ),
      )
      return
    }

    if (shapeOf(production, grammar) === null) {
      problems.push(
        validationError(
          'NOT_RIGHT_LINEAR',
          `Production ${index + 1}, ${production.head} → ${production.body.join('') || 'ε'}, is not right-linear. A right-linear production is a terminal, a terminal then a variable, a single variable, or ε.`,
          { kind: 'production', id: String(index) },
        ),
      )
    }
  })

  return problems
}
