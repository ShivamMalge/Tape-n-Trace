/**
 * Closure properties of the regular languages — Hopcroft 2e §4.2.
 *
 * Each operation is a *construction*, not a fact to memorise, and each one is
 * traced so the construction is what a student sees. The Boolean operations
 * (§4.2.1) share one product walk and differ only in which pairs they accept —
 * which is the point, and is hard to see when they are taught as three separate
 * theorems.
 *
 *   union         accept when either side accepts
 *   intersection  accept when both do
 *   difference    accept when the left does and the right does not
 *
 * Reversal (§4.2.2), homomorphism (§4.2.3) and inverse homomorphism (§4.2.4)
 * each have their own shape and their own section.
 */

import { faTransitionId, freshStateId, productStateName } from '../ids.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { LIMITS, TraceBuilder } from '../trace.js'
import { completeDFA, validateFA } from '../validate.js'
import type {
  ClosureOp,
  FATransition,
  FiniteAutomaton,
  StateId,
  Step,
  Sym,
  Trace,
} from '../types.js'

/** h : Σ → Δ*. A symbol may map to the empty string. */
export type Homomorphism = Record<Sym, Sym[]>

export interface ClosureSnapshot {
  /** The operand(s), left and (for a binary operation) right. */
  left: FiniteAutomaton
  right: FiniteAutomaton | null
  /** The machine as far as it has been built. */
  target: FiniteAutomaton
  /** What the step is working on — a product pair, a state, a transition. */
  current: string | null
  status: 'running' | 'done'
}

type ClosureTrace = Trace<Step<ClosureSnapshot>>

const BOOLEAN_CITATION = '4.2.1'

// ---------------------------------------------------------------------------
// Boolean operations — one product walk, three accepting conditions
// ---------------------------------------------------------------------------

/** Which pairs of the product are accepting. */
const ACCEPTS: Record<'union' | 'intersection' | 'difference', (a: boolean, b: boolean) => boolean> = {
  union: (a, b) => a || b,
  intersection: (a, b) => a && b,
  difference: (a, b) => a && !b,
}

const BOOLEAN_PROSE: Record<'union' | 'intersection' | 'difference', string> = {
  union: 'either machine accepts',
  intersection: 'both machines accept',
  difference: 'the first accepts and the second does not',
}

/**
 * The product construction, shared by union, intersection and difference.
 *
 * Only reachable pairs are built, for the same reason the subset construction
 * only builds reachable subsets: the full product is |A| × |B| states and almost
 * none of them are usually reachable.
 */
function product(
  op: 'union' | 'intersection' | 'difference',
  a: FiniteAutomaton,
  b: FiniteAutomaton,
): Result<ClosureTrace> {
  const problems = [...requireDFA(a, 'first'), ...requireDFA(b, 'second'), ...sameAlphabet(a, b)]
  if (problems.length > 0) return err(problems)

  const left = completeDFA(a, 'deadA')
  const right = completeDFA(b, 'deadB')
  const alphabet = left.alphabet
  const acceptingLeft = new Set(left.accepting)
  const acceptingRight = new Set(right.accepting)
  const accepts = ACCEPTS[op]

  const move = (machine: FiniteAutomaton, from: StateId, symbol: Sym): StateId =>
    machine.transitions.find((t) => t.from === from && t.read === symbol)?.to ?? from

  const builder = new TraceBuilder<ClosureSnapshot>(`closure.regular.${op}`, { a, b })

  const startName = productStateName(left.start, right.start)
  const members = new Map<StateId, [StateId, StateId]>([[startName, [left.start, right.start]]])
  const order: StateId[] = [startName]
  const queue: StateId[] = [startName]
  const transitions: FATransition[] = []

  const materialise = (): FiniteAutomaton => ({
    kind: 'DFA',
    states: [...order],
    alphabet: [...alphabet],
    transitions: [...transitions],
    start: startName,
    accepting: order.filter((name) => {
      const pair = members.get(name)
      return pair !== undefined && accepts(acceptingLeft.has(pair[0]), acceptingRight.has(pair[1]))
    }),
  })

  builder.step({
    narration: `Build the product of the two machines, starting at ${startName}. A pair accepts when ${BOOLEAN_PROSE[op]}.`,
    citation: BOOLEAN_CITATION,
    highlight: [
      { type: 'state', id: left.start, role: 'start' },
      { type: 'state', id: right.start, role: 'start' },
    ],
    snapshot: { left, right, target: materialise(), current: startName, status: 'running' },
  })

  while (queue.length > 0) {
    const name = queue.shift() as StateId
    const [p, q] = members.get(name) as [StateId, StateId]
    const discovered: StateId[] = []

    for (const symbol of alphabet) {
      const nextP = move(left, p, symbol)
      const nextQ = move(right, q, symbol)
      const targetName = productStateName(nextP, nextQ)

      if (!members.has(targetName)) {
        members.set(targetName, [nextP, nextQ])
        order.push(targetName)
        queue.push(targetName)
        discovered.push(targetName)
        builder.bump('statesCreated')
      }
      transitions.push({
        id: faTransitionId(name, symbol, targetName),
        from: name,
        read: symbol,
        to: targetName,
      })
    }

    if (order.length > LIMITS.SUBSET_STATES) {
      builder.truncate(
        `The product passed ${LIMITS.SUBSET_STATES} states and was stopped.`,
        LIMITS.SUBSET_STATES,
        { replace: true },
      )
      return ok(
        builder.build({
          type: 'incomplete',
          reason: `The product construction reached the ${LIMITS.SUBSET_STATES}-state cap.`,
          bounded: { searchedUpTo: order.length, unit: 'steps' },
        }),
      )
    }

    if (builder.length < LIMITS.TRACE_STEPS) {
      const verdict = accepts(acceptingLeft.has(p), acceptingRight.has(q))
      builder.step({
        narration: `In ${name} the first machine is in ${p} and the second in ${q}, so the pair is ${verdict ? 'accepting' : 'not accepting'}.${discovered.length === 0 ? ' Every pair it reaches is already known.' : ` It reaches ${discovered.join(', ')}.`}`,
        citation: BOOLEAN_CITATION,
        highlight: [
          { type: 'state', id: p, role: 'current' },
          { type: 'state', id: q, role: 'current' },
          ...discovered.map((id) => ({ type: 'state' as const, id, role: 'new' as const })),
        ],
        snapshot: { left, right, target: materialise(), current: name, status: 'running' },
      })
    } else {
      builder.truncate(
        `The product runs past ${LIMITS.TRACE_STEPS} pairs, so it is narrated to that point and then finished quietly.`,
        LIMITS.TRACE_STEPS,
      )
    }
  }

  const target = materialise()
  builder.step({
    narration: `The product is complete: ${target.states.length} reachable pairs, of which ${target.accepting.length} accept.`,
    citation: BOOLEAN_CITATION,
    highlight: target.accepting.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const })),
    snapshot: { left, right, target, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

export function union(a: FiniteAutomaton, b: FiniteAutomaton): Result<ClosureTrace> {
  return product('union', a, b)
}

export function intersection(a: FiniteAutomaton, b: FiniteAutomaton): Result<ClosureTrace> {
  return product('intersection', a, b)
}

export function difference(a: FiniteAutomaton, b: FiniteAutomaton): Result<ClosureTrace> {
  return product('difference', a, b)
}

/**
 * Swap accepting and non-accepting — but only on a **complete** DFA.
 *
 * On an NFA this is simply wrong: a string can have both an accepting and a
 * rejecting run, so flipping the accepting set does not complement the language.
 * The error says so and names the fix rather than silently determinising, since
 * the subset construction is a step worth watching.
 */
export function complement(fa: FiniteAutomaton): Result<ClosureTrace> {
  const problems = requireDFA(fa, 'input')
  if (problems.length > 0) return err(problems)

  const left = completeDFA(fa)
  const wasIncomplete = left.states.length !== fa.states.length
  const accepting = new Set(left.accepting)
  const flipped = left.states.filter((s) => !accepting.has(s))

  const builder = new TraceBuilder<ClosureSnapshot>('closure.regular.complement', fa)

  builder.step({
    narration: wasIncomplete
      ? `Complete the DFA first: a missing move must lead somewhere, and after complementing that somewhere becomes accepting.`
      : `The DFA is already complete, so every string ends in exactly one state and the complement is a matter of swapping which states accept.`,
    citation: BOOLEAN_CITATION,
    highlight: left.states
      .filter((s) => !fa.states.includes(s))
      .map((id) => ({ type: 'state' as const, id, role: 'new' as const })),
    snapshot: { left, right: null, target: left, current: null, status: 'running' },
  })

  const target: FiniteAutomaton = { ...left, accepting: flipped }
  builder.step({
    narration: `Swap the accepting states: ${describeSet(left.accepting)} stop accepting and ${describeSet(flipped)} start. The machine now accepts exactly the strings it used to reject.`,
    citation: BOOLEAN_CITATION,
    highlight: [
      ...left.accepting.map((id) => ({ type: 'state' as const, id, role: 'dead' as const })),
      ...flipped.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const })),
    ],
    snapshot: { left, right: null, target, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

/**
 * Reverse every transition — Hopcroft §4.2.2.
 *
 * A new start state reaches every old accepting state by ε, and the old start
 * becomes the only accepting state. The result is an ε-NFA even when the input
 * was a DFA, because reversing a deterministic machine rarely leaves one.
 */
export function reverse(fa: FiniteAutomaton): Result<ClosureTrace> {
  const validated = validateFA(fa)
  if (!validated.ok) return validated

  const builder = new TraceBuilder<ClosureSnapshot>('closure.regular.reverse', fa)
  const start = freshStateId('rStart', fa.states)

  const reversed: FATransition[] = fa.transitions.map((t) => ({
    id: faTransitionId(t.to, t.read, t.from),
    from: t.to,
    read: t.read,
    to: t.from,
  }))
  const entries: FATransition[] = fa.accepting.map((a) => ({
    id: faTransitionId(start, null, a),
    from: start,
    read: null,
    to: a,
  }))

  const target: FiniteAutomaton = {
    kind: 'ENFA',
    states: [start, ...fa.states],
    alphabet: [...fa.alphabet],
    transitions: [...entries, ...reversed],
    start,
    accepting: [fa.start],
  }

  builder.step({
    narration: `Turn every transition around: a path that spelled w from ${fa.start} now spells w backwards towards it.`,
    citation: '4.2.2',
    highlight: fa.transitions.map((t) => ({ type: 'transition' as const, id: t.id, role: 'removed' as const })),
    snapshot: { left: fa, right: null, target: { ...target, transitions: reversed }, current: null, status: 'running' },
  })

  builder.step({
    narration: `Add a new start state ${start} with ε-transitions to ${describeSet(fa.accepting)}, and make ${fa.start} the only accepting state. The machine now accepts exactly the reversals of what it accepted before.`,
    citation: '4.2.2, Thm 4.11',
    highlight: [
      { type: 'state', id: start, role: 'start' },
      { type: 'state', id: fa.start, role: 'accepting' },
      ...entries.map((t) => ({ type: 'transition' as const, id: t.id, role: 'added' as const })),
    ],
    snapshot: { left: fa, right: null, target, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

/**
 * Apply a homomorphism — Hopcroft §4.2.3.
 *
 * Every transition on `a` becomes a path spelling `h(a)`, with fresh states in
 * between. `h(a) = ε` collapses the transition to an ε-transition, which is why
 * the result is an ε-NFA.
 */
export function homomorphism(fa: FiniteAutomaton, h: Homomorphism): Result<ClosureTrace> {
  const problems = [...validateFAErrors(fa), ...checkHomomorphism(fa, h)]
  if (problems.length > 0) return err(problems)

  const builder = new TraceBuilder<ClosureSnapshot>('closure.regular.homomorphism', { fa, h })
  const states = [...fa.states]
  const transitions: FATransition[] = []
  let bridges = 0

  for (const t of fa.transitions) {
    const image = t.read === null ? [] : (h[t.read] ?? [])

    if (image.length === 0) {
      transitions.push({ id: faTransitionId(t.from, null, t.to), from: t.from, read: null, to: t.to })
      continue
    }

    // A path of |h(a)| transitions, with |h(a)| - 1 fresh states in between.
    let from = t.from
    image.forEach((symbol, i) => {
      const last = i === image.length - 1
      const to = last ? t.to : `${t.from}~${t.to}~${i}`
      if (!last) {
        states.push(to)
        bridges += 1
      }
      transitions.push({ id: faTransitionId(from, symbol, to), from, read: symbol, to })
      from = to
    })
  }

  const delta = [...new Set(Object.values(h).flat())].sort()
  const target: FiniteAutomaton = {
    kind: 'ENFA',
    states,
    alphabet: delta,
    transitions,
    start: fa.start,
    accepting: [...fa.accepting],
  }

  builder.step({
    narration: `Replace each transition by the string the homomorphism sends its symbol to: ${describeHomomorphism(fa.alphabet, h)}.`,
    citation: '4.2.3',
    highlight: fa.transitions.map((t) => ({ type: 'transition' as const, id: t.id, role: 'removed' as const })),
    snapshot: { left: fa, right: null, target, current: null, status: 'running' },
  })

  builder.step({
    narration: `The result reads over {${delta.join(', ')}} and needed ${bridges} extra ${bridges === 1 ? 'state' : 'states'} to spell the longer images out.`,
    citation: '4.2.3, Thm 4.14',
    highlight: target.accepting.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const })),
    snapshot: { left: fa, right: null, target, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

/**
 * Apply an inverse homomorphism — Hopcroft §4.2.4.
 *
 * The states do not change at all. Only the transition function does:
 * δ'(q, a) = δ̂(q, h(a)) — read the *image* of `a` in the old machine and see
 * where it lands. That is why this one needs a DFA: δ̂ must be a function.
 */
export function inverseHomomorphism(fa: FiniteAutomaton, h: Homomorphism): Result<ClosureTrace> {
  const problems = [...requireDFA(fa, 'input'), ...checkImagesInAlphabet(fa, h)]
  if (problems.length > 0) return err(problems)

  const left = completeDFA(fa)
  const builder = new TraceBuilder<ClosureSnapshot>('closure.regular.inverse-homomorphism', { fa, h })
  const sigma = Object.keys(h).sort()

  const walk = (from: StateId, word: readonly Sym[]): StateId =>
    word.reduce(
      (at, symbol) => left.transitions.find((t) => t.from === at && t.read === symbol)?.to ?? at,
      from,
    )

  const transitions: FATransition[] = []
  for (const state of left.states) {
    for (const symbol of sigma) {
      const to = walk(state, h[symbol] ?? [])
      transitions.push({ id: faTransitionId(state, symbol, to), from: state, read: symbol, to })
    }
  }

  const target: FiniteAutomaton = {
    kind: 'DFA',
    states: [...left.states],
    alphabet: sigma,
    transitions,
    start: left.start,
    accepting: [...left.accepting],
  }

  builder.step({
    narration: `Keep every state exactly as it is. Only the moves change: reading "a" in the new machine means running ${describeHomomorphism(sigma, h)} through the old one.`,
    citation: '4.2.4',
    highlight: left.states.map((id) => ({ type: 'state' as const, id, role: 'marked' as const })),
    snapshot: { left, right: null, target, current: null, status: 'running' },
  })

  builder.step({
    narration: `The result reads over {${sigma.join(', ')}} with the same ${target.states.length} states, and accepts exactly the strings whose image the original accepted.`,
    citation: '4.2.4, Thm 4.16',
    highlight: target.accepting.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const })),
    snapshot: { left, right: null, target, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'machine', machine: target }))
}

/** Run any closure operation by name. Binary ops need `b`; unary ones ignore it. */
export function applyClosure(
  op: ClosureOp,
  a: FiniteAutomaton,
  b: FiniteAutomaton | null,
  h: Homomorphism | null,
): Result<ClosureTrace> {
  switch (op) {
    case 'union':
    case 'intersection':
    case 'difference':
      return b === null ? err([needs('a second automaton')]) : product(op, a, b)
    case 'complement':
      return complement(a)
    case 'reverse':
      return reverse(a)
    case 'homomorphism':
      return h === null ? err([needs('a homomorphism')]) : homomorphism(a, h)
    case 'inverse-homomorphism':
      return h === null ? err([needs('a homomorphism')]) : inverseHomomorphism(a, h)
    default:
      return err([
        validationError('CLOSURE_NOT_IMPLEMENTED', `"${op}" is not one of the regular closure operations built here.`, {
          kind: 'machine',
        }),
      ])
  }
}

// ---------------------------------------------------------------------------

function needs(what: string): ValidationError {
  return validationError('CLOSURE_MISSING_OPERAND', `This operation needs ${what}.`, { kind: 'machine' })
}

function validateFAErrors(fa: FiniteAutomaton): ValidationError[] {
  const result = validateFA(fa)
  return result.ok ? [] : result.errors
}

function requireDFA(fa: FiniteAutomaton, which: string): ValidationError[] {
  const problems = validateFAErrors(fa)
  if (problems.length > 0) return problems

  if (fa.kind !== 'DFA') {
    return [
      validationError(
        'CLOSURE_NEEDS_DFA',
        `The ${which} automaton is an ${fa.kind}. This construction needs a complete DFA: on a nondeterministic machine a string can have both an accepting and a rejecting run, so the result would not be the language you asked for. Convert it with the subset construction first.`,
        { kind: 'machine' },
      ),
    ]
  }
  return []
}

function sameAlphabet(a: FiniteAutomaton, b: FiniteAutomaton): ValidationError[] {
  const left = [...new Set(a.alphabet)].sort()
  const right = [...new Set(b.alphabet)].sort()
  if (left.length === right.length && left.every((s, i) => s === right[i])) return []

  return [
    validationError(
      'ALPHABET_MISMATCH',
      `The two automata read different alphabets — {${left.join(', ')}} and {${right.join(', ')}}. A Boolean operation is only defined over one alphabet.`,
      { kind: 'machine' },
    ),
  ]
}

function checkHomomorphism(fa: FiniteAutomaton, h: Homomorphism): ValidationError[] {
  return fa.alphabet
    .filter((symbol) => h[symbol] === undefined)
    .map((symbol) =>
      validationError(
        'HOMOMORPHISM_INCOMPLETE',
        `The homomorphism says nothing about "${symbol}". It must give an image for every symbol of the alphabet, even if that image is ε.`,
        { kind: 'machine' },
      ),
    )
}

/** For h⁻¹, the *images* must be readable by the machine. */
function checkImagesInAlphabet(fa: FiniteAutomaton, h: Homomorphism): ValidationError[] {
  const readable = new Set(fa.alphabet)
  const offenders = [...new Set(Object.values(h).flat())].filter((s) => !readable.has(s))

  return offenders.map((symbol) =>
    validationError(
      'HOMOMORPHISM_IMAGE_UNREADABLE',
      `The homomorphism maps something to "${symbol}", which the automaton cannot read. For h⁻¹ the images must be strings over the machine's own alphabet.`,
      { kind: 'machine' },
    ),
  )
}

function describeSet(ids: readonly StateId[]): string {
  return ids.length === 0 ? 'nothing' : `{${ids.join(',')}}`
}

function describeHomomorphism(symbols: readonly Sym[], h: Homomorphism): string {
  return symbols
    .map((symbol) => {
      const image = h[symbol] ?? []
      return `h(${symbol}) = ${image.length === 0 ? 'ε' : image.join('')}`
    })
    .join(', ')
}
