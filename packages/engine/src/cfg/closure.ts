/**
 * Closure properties of the CFLs — Hopcroft 2e §7.3.
 *
 * Grammar-level constructions for substitution (Thm 7.23) and the operations
 * it yields — union, concatenation, closure, homomorphism (Thm 7.24) — and
 * reversal (Thm 7.25); PDA-level constructions for intersection with a regular
 * language (Thm 7.27, the PDA×DFA product) and inverse homomorphism (Thm 7.30,
 * the buffer construction).
 *
 * What is *not* here is as important: the CFLs are not closed under
 * intersection or complement (Example 7.26, Thm 7.29). `CFL_INTERSECTION_DEMO`
 * carries the book's two grammars whose intersection is {aⁿbⁿcⁿ}, which the
 * CFL pumping game then proves is not context-free.
 */

import { TraceBuilder } from '../trace.js'
import { err, ok, unwrap, validationError, type Result, type ValidationError } from '../result.js'
import { pdaTransitionId, productStateName } from '../ids.js'
import { primedName } from './leftRecursion.js'
import { parseGrammar, productionToText } from './parse.js'
import type { Homomorphism } from '../fa/closure.js'
import type { CFG, FiniteAutomaton, PDA, PDATransition, Production, Step, Sym, Trace } from '../types.js'

export interface GrammarOpSnapshot {
  grammar: CFG
  status: 'running' | 'done'
  [key: string]: unknown
}

export type GrammarOpTrace = Trace<Step<GrammarOpSnapshot>>

export interface PdaOpSnapshot {
  source: PDA
  target: PDA
  status: 'running' | 'done'
  [key: string]: unknown
}

export type PdaOpTrace = Trace<Step<PdaOpSnapshot>>

/** s(a) for every terminal a, each a grammar. */
export type Substitution = Record<Sym, CFG>

// ---------------------------------------------------------------------------
// Renaming apart
// ---------------------------------------------------------------------------

/** Rename the grammar's variables so none collides with `taken`. Primes, as the book does. */
export function renameApart(grammar: CFG, taken: ReadonlySet<string>): { grammar: CFG; renamed: [string, string][] } {
  const mapping = new Map<string, string>()
  const used = new Set(taken)
  for (const v of grammar.variables) {
    const name = used.has(v) ? primedName(v, used) : v
    mapping.set(v, name)
    used.add(name)
  }
  const rename = (s: string): string => mapping.get(s) ?? s
  return {
    grammar: {
      variables: grammar.variables.map(rename),
      terminals: [...grammar.terminals],
      productions: grammar.productions.map((p) => ({ head: rename(p.head), body: p.body.map(rename) })),
      start: rename(grammar.start),
    },
    renamed: [...mapping].filter(([from, to]) => from !== to),
  }
}

function freshStart(taken: ReadonlySet<string>): string {
  return taken.has('S') ? primedName('S', taken) : 'S'
}

const unionOf = (...lists: readonly (readonly string[])[]): string[] => [...new Set(lists.flat())]

// ---------------------------------------------------------------------------
// Substitution — Thm 7.23 — and what it yields
// ---------------------------------------------------------------------------

export function cflSubstitution(grammar: CFG, substitution: Substitution): Result<GrammarOpTrace> {
  const missing = grammar.terminals.filter((a) => substitution[a] === undefined)
  if (missing.length > 0) {
    return err(
      missing.map((a) =>
        validationError('SUBSTITUTION_UNDEFINED', `No language is given for the terminal ${a}; a substitution must define s(a) for every terminal.`, {
          kind: 'production',
        }),
      ),
    )
  }

  const builder = new TraceBuilder<GrammarOpSnapshot>('closure.cfl.substitution', { grammar, substitution })
  const taken = new Set<string>([...grammar.variables, ...grammar.terminals])
  const starts = new Map<string, string>()
  const pooled: Production[] = []
  const variables: string[] = [...grammar.variables]
  let terminals: string[] = []

  for (const a of grammar.terminals) {
    const source = substitution[a] as CFG
    for (const t of source.terminals) taken.add(t)
    const { grammar: apart, renamed } = renameApart(source, taken)
    for (const v of apart.variables) taken.add(v)
    starts.set(a, apart.start)
    variables.push(...apart.variables)
    terminals = unionOf(terminals, apart.terminals)
    pooled.push(...apart.productions)
    builder.step({
      narration: `The grammar for s(${a}) joins with start symbol ${apart.start}${
        renamed.length > 0 ? `, its variables renamed (${renamed.map(([f, t]) => `${f} → ${t}`).join(', ')}) so that no variable belongs to two grammars` : ''
      }.`,
      citation: '7.3.1, Thm 7.23',
      highlight: [],
      snapshot: { grammar: { variables: [...variables], terminals, productions: [...pooled], start: grammar.start }, status: 'running' },
    })
  }

  const rewritten: Production[] = grammar.productions.map((p) => ({
    head: p.head,
    body: p.body.map((s) => starts.get(s) ?? s),
  }))
  const result: CFG = { variables, terminals, productions: [...rewritten, ...pooled], start: grammar.start }
  builder.step({
    narration: `In the original productions every terminal a is replaced by the start symbol of the grammar for s(a): ${rewritten.map((p) => productionToText(p)).join('; ')}. A parse tree now starts like one of the original grammar and finishes with a tree of each substituted grammar, so the result generates s(L).`,
    citation: '7.3.1, Thm 7.23',
    highlight: rewritten.map((_, index) => ({ type: 'production' as const, index, role: 'added' as const })),
    snapshot: { grammar: result, status: 'done' },
  })
  return ok(builder.build({ type: 'grammar', grammar: result }))
}

export function cflUnion(left: CFG, right: CFG): Result<GrammarOpTrace> {
  const builder = new TraceBuilder<GrammarOpSnapshot>('closure.cfl.union', { left, right })
  const taken = new Set<string>([...left.variables, ...left.terminals, ...right.terminals])
  const { grammar: apart, renamed } = renameApart(right, taken)
  for (const v of apart.variables) taken.add(v)
  const start = freshStart(taken)

  const combined: CFG = {
    variables: [start, ...left.variables, ...apart.variables],
    terminals: unionOf(left.terminals, right.terminals),
    productions: [
      { head: start, body: [left.start] },
      { head: start, body: [apart.start] },
      ...left.productions,
      ...apart.productions,
    ],
    start,
  }

  builder.step({
    narration:
      renamed.length > 0
        ? `The two grammars must share no variable, so in the second ${renamed.map(([f, t]) => `${f} becomes ${t}`).join(', ')}.`
        : `The two grammars already share no variable, so both are kept as they are.`,
    citation: '7.3.2, Thm 7.24',
    highlight: [],
    snapshot: { grammar: { ...combined, variables: combined.variables.slice(1), productions: combined.productions.slice(2) }, status: 'running' },
  })
  builder.step({
    narration: `A new start symbol ${start} chooses a side: ${start} → ${left.start} | ${apart.start}. This is Theorem 7.23's substitution of L₁ and L₂ into the two-string language {1, 2}, written out.`,
    citation: '7.3.2, Thm 7.24',
    highlight: [
      { type: 'production', index: 0, role: 'added' },
      { type: 'production', index: 1, role: 'added' },
    ],
    snapshot: { grammar: combined, status: 'done' },
  })
  return ok(builder.build({ type: 'grammar', grammar: combined }))
}

export function cflConcat(left: CFG, right: CFG): Result<GrammarOpTrace> {
  const builder = new TraceBuilder<GrammarOpSnapshot>('closure.cfl.concat', { left, right })
  const taken = new Set<string>([...left.variables, ...left.terminals, ...right.terminals])
  const { grammar: apart, renamed } = renameApart(right, taken)
  for (const v of apart.variables) taken.add(v)
  const start = freshStart(taken)

  const combined: CFG = {
    variables: [start, ...left.variables, ...apart.variables],
    terminals: unionOf(left.terminals, right.terminals),
    productions: [{ head: start, body: [left.start, apart.start] }, ...left.productions, ...apart.productions],
    start,
  }

  builder.step({
    narration:
      renamed.length > 0
        ? `The two grammars must share no variable, so in the second ${renamed.map(([f, t]) => `${f} becomes ${t}`).join(', ')}.`
        : `The two grammars already share no variable, so both are kept as they are.`,
    citation: '7.3.2, Thm 7.24',
    highlight: [],
    snapshot: { grammar: { ...combined, variables: combined.variables.slice(1), productions: combined.productions.slice(1) }, status: 'running' },
  })
  builder.step({
    narration: `A new start symbol ${start} derives one string of each, in order: ${start} → ${left.start} ${apart.start}. This is the substitution into the one-string language {12}.`,
    citation: '7.3.2, Thm 7.24',
    highlight: [{ type: 'production', index: 0, role: 'added' }],
    snapshot: { grammar: combined, status: 'done' },
  })
  return ok(builder.build({ type: 'grammar', grammar: combined }))
}

export function cflStar(grammar: CFG): Result<GrammarOpTrace> {
  const builder = new TraceBuilder<GrammarOpSnapshot>('closure.cfl.star', { grammar })
  const taken = new Set<string>([...grammar.variables, ...grammar.terminals])
  const start = freshStart(taken)
  const combined: CFG = {
    variables: [start, ...grammar.variables],
    terminals: [...grammar.terminals],
    productions: [{ head: start, body: [grammar.start, start] }, { head: start, body: [] }, ...grammar.productions],
    start,
  }
  builder.step({
    narration: `A new start symbol ${start} derives any number of strings of L, including none: ${start} → ${grammar.start} ${start} | ε. The ε-production is what puts ε into L*; the simplification pipeline would remove it again, at the cost of ε.`,
    citation: '7.3.2, Thm 7.24',
    highlight: [
      { type: 'production', index: 0, role: 'added' },
      { type: 'production', index: 1, role: 'added' },
    ],
    snapshot: { grammar: combined, status: 'done' },
  })
  return ok(builder.build({ type: 'grammar', grammar: combined }))
}

export function cflReversal(grammar: CFG): Result<GrammarOpTrace> {
  const builder = new TraceBuilder<GrammarOpSnapshot>('closure.cfl.reverse', { grammar })
  const reversed: CFG = {
    ...grammar,
    productions: grammar.productions.map((p) => ({ head: p.head, body: [...p.body].reverse() })),
  }
  const changed = grammar.productions
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.body.join(' ') !== [...p.body].reverse().join(' '))
  builder.step({
    narration: `Every body is reversed: ${changed.length === 0 ? 'each body reads the same backwards, so nothing changes' : changed.map(({ p }) => `${productionToText(p)} becomes ${productionToText({ head: p.head, body: [...p.body].reverse() })}`).join('; ')}. Every sentential form of the new grammar is the reverse of one of the old, so it generates Lᴿ.`,
    citation: '7.3.3, Thm 7.25',
    highlight: changed.map(({ index }) => ({ type: 'production' as const, index, role: 'applied' as const })),
    snapshot: { grammar: reversed, status: 'done' },
  })
  return ok(builder.build({ type: 'grammar', grammar: reversed }))
}

export function cflHomomorphism(grammar: CFG, h: Homomorphism): Result<GrammarOpTrace> {
  const missing = grammar.terminals.filter((a) => h[a] === undefined)
  if (missing.length > 0) {
    return err(
      missing.map((a) =>
        validationError('HOMOMORPHISM_UNDEFINED', `h(${a}) is not given; a homomorphism must map every terminal.`, { kind: 'production' }),
      ),
    )
  }
  const builder = new TraceBuilder<GrammarOpSnapshot>('closure.cfl.homomorphism', { grammar, h })
  const image = (s: string): string[] => (grammar.terminals.includes(s) ? [...(h[s] as Sym[])] : [s])
  const result: CFG = {
    variables: [...grammar.variables],
    terminals: unionOf(...grammar.terminals.map((a) => h[a] as Sym[])),
    productions: grammar.productions.map((p) => ({ head: p.head, body: p.body.flatMap(image) })),
    start: grammar.start,
  }
  const introducedEpsilon = result.productions.some((p, i) => p.body.length === 0 && (grammar.productions[i] as Production).body.length > 0)
  builder.step({
    narration: `Every terminal a in every body is replaced by h(a): ${grammar.terminals.map((a) => `${a} ↦ ${(h[a] as Sym[]).length === 0 ? 'ε' : (h[a] as Sym[]).join('')}`).join(', ')}. That is the substitution s(a) = {h(a)}, each language a single string, so the result generates h(L).${
      introducedEpsilon ? ' Some bodies became ε: a terminal mapped to ε took a whole body with it.' : ''
    }`,
    citation: '7.3.2, Thm 7.24',
    highlight: result.productions.map((_, index) => ({ type: 'production' as const, index, role: 'applied' as const })),
    snapshot: { grammar: result, status: 'done' },
  })
  return ok(builder.build({ type: 'grammar', grammar: result }))
}

// ---------------------------------------------------------------------------
// Intersection with a regular language — Thm 7.27
// ---------------------------------------------------------------------------

function arc(from: string, read: Sym | null, pop: Sym | null, push: Sym[], to: string): PDATransition {
  return { id: pdaTransitionId(from, read, pop, push, to), from, read, pop, to, push }
}

/** The PDA × FA product: the PDA runs the stack, the FA rides along on the input symbols. */
export function cflIntersectRegular(pda: PDA, fa: FiniteAutomaton): Result<PdaOpTrace> {
  const problems: ValidationError[] = []
  if (pda.acceptBy !== 'finalState') {
    problems.push(
      validationError('INTERSECT_NEEDS_FINAL_STATE', 'The product construction needs a PDA that accepts by final state; convert it on the acceptance page first.', {
        kind: 'machine',
      }),
    )
  }
  if (fa.kind === 'ENFA') {
    problems.push(validationError('INTERSECT_NEEDS_FA', 'The product needs a DFA or NFA without ε-moves; eliminate the ε-transitions first.', { kind: 'machine' }))
  }
  if (problems.length > 0) return err(problems)

  const builder = new TraceBuilder<PdaOpSnapshot>('closure.cfl.intersection', { pda, fa })
  const start = productStateName(pda.start, fa.start)
  let target: PDA = {
    states: [start],
    inputAlphabet: [...pda.inputAlphabet],
    stackAlphabet: [...pda.stackAlphabet],
    transitions: [],
    start,
    startStack: pda.startStack,
    accepting: pda.accepting.includes(pda.start) && fa.accepting.includes(fa.start) ? [start] : [],
    acceptBy: 'finalState',
  }
  const source = pda

  builder.step({
    narration: `The product starts in the pair ${start}: the PDA's start state and the automaton's, with the stack as the PDA left it. A pair accepts when both halves accept.`,
    citation: '7.3.4, Thm 7.27',
    highlight: [{ type: 'state', id: start, role: 'new' }],
    snapshot: { source, fa, target, status: 'running' },
  })

  const queue: [string, string][] = [[pda.start, fa.start]]
  const seen = new Set<string>([start])
  while (queue.length > 0) {
    const [q, p] = queue.shift() as [string, string]
    const from = productStateName(q, p)
    const added: PDATransition[] = []
    const discovered: string[] = []
    for (const t of pda.transitions) {
      if (t.from !== q) continue
      const faTargets = t.read === null ? [p] : fa.transitions.filter((f) => f.from === p && f.read === t.read).map((f) => f.to)
      for (const p2 of faTargets) {
        const to = productStateName(t.to, p2)
        if (!seen.has(to)) {
          seen.add(to)
          queue.push([t.to, p2])
          discovered.push(to)
        }
        added.push(arc(from, t.read, t.pop, [...t.push], to))
      }
    }
    const newAccepting = discovered.filter((name) => {
      const pair = queue.find(([a, b]) => productStateName(a, b) === name) as [string, string]
      return pda.accepting.includes(pair[0]) && fa.accepting.includes(pair[1])
    })
    target = {
      ...target,
      states: [...target.states, ...discovered],
      transitions: [...target.transitions, ...added],
      accepting: [...target.accepting, ...newAccepting],
    }
    builder.step({
      narration:
        added.length === 0
          ? `${from} has no move: every PDA move out of ${q} reads a symbol the automaton cannot take from ${p}, so this pair is a dead end.`
          : `From ${from}, each PDA move out of ${q} is copied with the automaton advanced on the symbol read — ε-moves leave it in ${p}. ${added.length} move${added.length === 1 ? '' : 's'}${
              discovered.length > 0 ? `, reaching ${discovered.join(', ')}` : ''
            }.${newAccepting.length > 0 ? ` ${newAccepting.join(', ')} accept${newAccepting.length === 1 ? 's' : ''}: both halves are accepting there.` : ''}`,
      citation: '7.3.4, Thm 7.27',
      highlight: [
        { type: 'state', id: from, role: 'current' },
        ...discovered.map((id) => ({ type: 'state' as const, id, role: 'new' as const })),
        ...added.map((t) => ({ type: 'transition' as const, id: t.id, role: 'added' as const })),
      ],
      snapshot: { source, fa, target, status: 'running' },
    })
  }

  builder.step({
    narration: `Every reachable pair has been expanded. The product accepts a string exactly when the PDA and the automaton both do: L ∩ R.`,
    citation: '7.3.4, Thm 7.27',
    highlight: target.accepting.map((id) => ({ type: 'state' as const, id, role: 'accepting' as const })),
    snapshot: { source, fa, target, status: 'done' },
  })
  builder.bump('statesCreated', target.states.length)
  return ok(builder.build({ type: 'machine', machine: target }))
}

// ---------------------------------------------------------------------------
// Inverse homomorphism — Thm 7.30
// ---------------------------------------------------------------------------

/** The buffer construction: states (q, x) with x the unread tail of some h(a). */
export function cflInverseHomomorphism(pda: PDA, h: Homomorphism): Result<PdaOpTrace> {
  const problems: ValidationError[] = []
  if (pda.acceptBy !== 'finalState') {
    problems.push(
      validationError('INVHOM_NEEDS_FINAL_STATE', 'The buffer construction needs a PDA that accepts by final state; convert it on the acceptance page first.', {
        kind: 'machine',
      }),
    )
  }
  const sigma = Object.keys(h)
  if (sigma.length === 0) {
    problems.push(validationError('INVHOM_EMPTY', 'The homomorphism maps no symbol at all.', { kind: 'machine' }))
  }
  for (const a of sigma) {
    for (const s of h[a] as Sym[]) {
      if (!pda.inputAlphabet.includes(s)) {
        problems.push(validationError('INVHOM_IMAGE_UNKNOWN', `h(${a}) uses "${s}", which the PDA cannot read.`, { kind: 'machine' }))
      }
    }
  }
  if (problems.length > 0) return err(problems)

  const builder = new TraceBuilder<PdaOpSnapshot>('closure.cfl.inverse-homomorphism', { pda, h })

  const suffixes: string[][] = [[]]
  const seenSuffix = new Set<string>([''])
  for (const a of sigma) {
    const image = h[a] as Sym[]
    for (let i = 0; i < image.length; i++) {
      const tail = image.slice(i)
      const key = tail.join('')
      if (!seenSuffix.has(key)) {
        seenSuffix.add(key)
        suffixes.push(tail)
      }
    }
  }

  const name = (q: string, x: readonly Sym[]): string => productStateName(q, x.join(''))
  const states = pda.states.flatMap((q) => suffixes.map((x) => name(q, x)))
  const loads: PDATransition[] = pda.states.flatMap((q) =>
    sigma.map((a) => arc(name(q, []), a, null, [], name(q, h[a] as Sym[]))),
  )
  const simulations: PDATransition[] = pda.transitions.flatMap((t) =>
    suffixes.flatMap((x) => {
      if (t.read === null) return [arc(name(t.from, x), null, t.pop, [...t.push], name(t.to, x))]
      if (x[0] === t.read) return [arc(name(t.from, x), null, t.pop, [...t.push], name(t.to, x.slice(1)))]
      return []
    }),
  )

  const full: PDA = {
    states,
    inputAlphabet: [...sigma],
    stackAlphabet: [...pda.stackAlphabet],
    transitions: [...loads, ...simulations],
    start: name(pda.start, []),
    startStack: pda.startStack,
    accepting: pda.accepting.map((q) => name(q, [])),
    acceptBy: 'finalState',
  }

  // Keep only what the graph can reach from the start — the rest would be drawn for nothing.
  const reachable = new Set<string>([full.start])
  const queue = [full.start]
  while (queue.length > 0) {
    const s = queue.shift() as string
    for (const t of full.transitions) {
      if (t.from === s && !reachable.has(t.to)) {
        reachable.add(t.to)
        queue.push(t.to)
      }
    }
  }
  const target: PDA = {
    ...full,
    states: full.states.filter((s) => reachable.has(s)),
    transitions: full.transitions.filter((t) => reachable.has(t.from) && reachable.has(t.to)),
    accepting: full.accepting.filter((s) => reachable.has(s)),
  }
  const loadIds = new Set(loads.map((t) => t.id))

  builder.step({
    narration: `A state of the new machine is a pair (q, x): the PDA's state q and a buffer x holding the unread tail of some h(a). The buffers are ${suffixes.map((x) => (x.length === 0 ? 'ε' : x.join(''))).join(', ')}. It starts in ${target.start} with an empty buffer.`,
    citation: '7.3.5, Thm 7.30',
    highlight: [{ type: 'state', id: target.start, role: 'start' }],
    snapshot: { source: pda, target: { ...target, transitions: [] }, status: 'running' },
  })
  builder.step({
    narration: `Loading moves: only with an empty buffer may the machine read its next input symbol a, and then it puts h(a) into the buffer without touching the stack — ${sigma.map((a) => `${a} loads ${(h[a] as Sym[]).length === 0 ? 'ε' : (h[a] as Sym[]).join('')}`).join(', ')}.`,
    citation: '7.3.5, Thm 7.30',
    highlight: target.transitions.filter((t) => loadIds.has(t.id)).map((t) => ({ type: 'transition' as const, id: t.id, role: 'added' as const })),
    snapshot: { source: pda, target: { ...target, transitions: target.transitions.filter((t) => loadIds.has(t.id)) }, status: 'running' },
  })
  builder.step({
    narration: `Simulation moves: every move of the original PDA is copied as an ε-move of the new one, reading from the front of the buffer instead of the input — a move that read b needs the buffer to start with b, an ε-move of the PDA runs with any buffer. Accepting states are the pairs (q, ε) with q accepting: the PDA accepted h(w) and nothing is left unread.`,
    citation: '7.3.5, Thm 7.30',
    highlight: target.transitions.filter((t) => !loadIds.has(t.id)).map((t) => ({ type: 'transition' as const, id: t.id, role: 'added' as const })),
    snapshot: { source: pda, target, status: 'done' },
  })
  builder.bump('statesCreated', target.states.length)
  return ok(builder.build({ type: 'machine', machine: target }))
}

// ---------------------------------------------------------------------------
// The non-closure — Example 7.26
// ---------------------------------------------------------------------------

/**
 * Two CFLs whose intersection is {aⁿbⁿcⁿ}, the book's Example 7.26 with its
 * 0, 1, 2 renamed a, b, c to match the pumping game's preset. Both grammars
 * are context-free on sight; the intersection is not, and the CFL pumping
 * lemma (the `abc-equal` game) proves it.
 */
export const CFL_INTERSECTION_DEMO = {
  l1: {
    title: 'L₁ = {aⁿbⁿcⁱ | n ≥ 1, i ≥ 1}',
    grammar: unwrap(parseGrammar('S -> A B\nA -> a A b | a b\nB -> c B | c')),
  },
  l2: {
    title: 'L₂ = {aⁱbⁿcⁿ | n ≥ 1, i ≥ 1}',
    grammar: unwrap(parseGrammar('S -> A B\nA -> a A | a\nB -> b B c | b c')),
  },
  intersection: 'L₁ ∩ L₂ = {aⁿbⁿcⁿ | n ≥ 1}',
  pumpingGameId: 'abc-equal',
  citation: '7.3.4, Example 7.26',
} as const
