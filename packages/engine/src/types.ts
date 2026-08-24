/**
 * Core types — architecture.md §5 and §6.
 *
 * These match the textbook tuples deliberately: a student should be able to read
 * `FiniteAutomaton` and see Hopcroft's 5-tuple (Q, Σ, δ, q0, F). Citations
 * throughout the engine are to Hopcroft, Motwani & Ullman, *Introduction to
 * Automata Theory, Languages, and Computation*, **2nd edition** (ADR-005).
 */

export type StateId = string
export type TransitionId = string

/** Exactly one symbol of an alphabet. The empty string is not a symbol. */
export type Sym = string

/**
 * A transition label. Epsilon is `null`, never the string "ε" — see ADR-002.
 * Renderers map `null` to the glyph; the glyph itself lives in packages/ui.
 */
export type Read = Sym | null

/** Readability helper for the `null`-means-epsilon convention (ADR-002). */
export function isEpsilon(r: Read): r is null {
  return r === null
}

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------

export interface Point {
  x: number
  y: number
}

/**
 * DFA, NFA and ε-NFA in one type with a discriminant. A DFA *is* an NFA with a
 * determinism invariant; `validateFA` checks the invariant and the editor shows
 * the violation. Three separate types would triple every conversion signature.
 */
export interface FiniteAutomaton {
  kind: 'DFA' | 'NFA' | 'ENFA'
  /** Q */
  states: StateId[]
  /** Σ */
  alphabet: Sym[]
  /**
   * δ, held flat. A nested map cannot represent an NFA's multiple targets
   * cleanly, cannot render as edges without inversion, and makes the partial
   * and invalid machines the editor must hold unrepresentable.
   */
  transitions: FATransition[]
  /** q0 */
  start: StateId
  /** F */
  accepting: StateId[]
  /**
   * Editor-only. Every engine function ignores it; coordinates never influence
   * semantics. Auto-layout is a UI concern.
   */
  layout?: Record<StateId, Point>
}

export interface FATransition {
  /**
   * Stable across relabelling, so trace highlights survive it. Highlighting by
   * (from, symbol, to) is ambiguous for an NFA with parallel edges.
   */
  id: TransitionId
  from: StateId
  read: Read
  to: StateId
}

export interface PDA {
  states: StateId[]
  inputAlphabet: Sym[]
  stackAlphabet: Sym[]
  transitions: PDATransition[]
  start: StateId
  startStack: Sym
  accepting: StateId[]
  acceptBy: 'finalState' | 'emptyStack'
  layout?: Record<StateId, Point>
}

export interface PDATransition {
  id: TransitionId
  from: StateId
  read: Read
  /** `null` = no pop. Hopcroft always pops; this is for JFLAP compatibility. */
  pop: Read
  to: StateId
  /** Leftmost element becomes the new top. `[]` = pop only. */
  push: Sym[]
}

export interface TuringMachine {
  states: StateId[]
  inputAlphabet: Sym[]
  tapeAlphabet: Sym[]
  blank: Sym
  transitions: TMTransition[]
  start: StateId
  accepting: StateId[]
  rejecting?: StateId[]
  /** 1 = single-tape; greater than 1 activates the multitape renderer. */
  tapes: number
  layout?: Record<StateId, Point>
}

export interface TMTransition {
  id: TransitionId
  from: StateId
  /** One per tape. */
  read: Sym[]
  to: StateId
  write: Sym[]
  move: ('L' | 'R' | 'S')[]
}

export interface CFG {
  /** V */
  variables: string[]
  /** T */
  terminals: Sym[]
  /** P */
  productions: Production[]
  /** S */
  start: string
}

/** An empty `body` is an ε-production. */
export interface Production {
  head: string
  body: (string | Sym)[]
}

// ---------------------------------------------------------------------------
// Regular expressions
// ---------------------------------------------------------------------------

/**
 * The RE abstract syntax tree. Built by `regex/parse.ts` in P0.4; the type lives
 * here because traces and results reference it.
 */
export type RegexNode =
  | { op: 'empty' }
  | { op: 'epsilon' }
  | { op: 'symbol'; sym: Sym }
  | { op: 'union'; left: RegexNode; right: RegexNode }
  | { op: 'concat'; left: RegexNode; right: RegexNode }
  | { op: 'star'; inner: RegexNode }

// ---------------------------------------------------------------------------
// The trace protocol — architecture.md §5
// ---------------------------------------------------------------------------

/**
 * Trace kinds. Fixed strings; the discriminants everything switches on.
 * The kinds architecture.md marks `[E]` are enrichment, scheduled after v1.0
 * (ADR-003). They are listed so the union needs no widening when they land.
 */
export type TraceKind =
  | 'simulate.dfa'
  | 'simulate.nfa'
  | 'simulate.enfa'
  | 'simulate.pda'
  | 'simulate.tm'
  | 'simulate.tm.multitape'
  | 'convert.nfa-to-dfa'
  | 'convert.enfa-to-nfa'
  | 'convert.re-to-enfa'
  | 'convert.dfa-to-re.elim'
  | 'convert.minimize'
  | 'convert.grammar-to-nfa'
  | 'convert.pda-acceptance'
  | 'convert.cfg-to-pda'
  | 'convert.tm-multitape-to-single'
  | 'grammar.derive'
  | 'grammar.parse-tree'
  | 'grammar.ambiguity'
  | 'grammar.useless'
  | 'grammar.epsilon-prod'
  | 'grammar.unit-prod'
  | 'grammar.cnf'
  | 'grammar.left-recursion'
  | 'decide.membership'
  | 'decide.equivalence'
  | 'decide.state-equivalence'
  /** Theorem 9.2, walked over a computed corner of Fig. 9.1. */
  | 'decide.diagonalization'
  /** A ≤ B, as Fig. 8.7 draws it. */
  | 'prove.reduction'
  | ClosureTraceKind
  | 'game.pumping.regular'
  | 'game.pumping.cfl'
  | 'grade.language'
  | 'grade.trace-match'
  | 'grade.sample'
  // Enrichment (ADR-003).
  | 'convert.dfa-to-re.rij'
  | 'convert.pda-to-cfg'
  | 'grammar.cyk'
  | 'decide.emptiness'
  | 'decide.finiteness'

/** The closure operations, as trace kinds. architecture.md writes these `closure.regular.*`. */
export type ClosureOp =
  | 'union'
  | 'intersection'
  | 'complement'
  | 'difference'
  | 'concat'
  | 'star'
  | 'reverse'
  | 'homomorphism'
  | 'inverse-homomorphism'
  /** Hopcroft §7.3.1 — the machinery the other CFL closures are proved with. */
  | 'substitution'

export type ClosureTraceKind = `closure.regular.${ClosureOp}` | `closure.cfl.${ClosureOp}`

/**
 * What the renderer highlights this step. Renderer-agnostic and semantic — a
 * highlight names *what* matters, never a colour or a coordinate.
 */
export type Highlight =
  | {
      type: 'state'
      id: StateId
      role: 'current' | 'new' | 'dead' | 'accepting' | 'start' | 'marked'
    }
  | { type: 'transition'; id: TransitionId; role: 'taken' | 'candidate' | 'added' | 'removed' }
  | { type: 'input'; position: number; role?: 'read' | 'consumed' | 'lookahead' }
  | { type: 'stackCell'; depth: number; role: 'top' | 'pushed' | 'popped' }
  | { type: 'tapeCell'; tape: number; index: number; role: 'head' | 'written' | 'read' }
  | { type: 'tableCell'; row: string; col: string; role: 'filling' | 'filled' | 'marked' | 'witness' }
  | {
      type: 'production'
      index: number
      role: 'applied' | 'added' | 'removed' | 'nullable' | 'unit'
    }
  | { type: 'treeNode'; id: string; role: 'expanding' | 'matched' | 'dead' | 'accepting' }
  | { type: 'symbolSet'; ids: string[]; role: 'generating' | 'reachable' | 'nullable' | 'closure' }

export interface Step<TSnapshot = unknown> {
  index: number
  /**
   * One sentence of prose, exam-language. Rendered verbatim in the explanation
   * panel, so it ends in a period and never contains placeholder text.
   */
  narration: string
  highlight: Highlight[]
  /**
   * The full logical artifact state *after* this step. Logically complete,
   * physically shared with the previous step, and frozen — see ADR-001.
   */
  snapshot: TSnapshot
  /** Hopcroft 2e, e.g. "2.3.5, Thm 2.11". */
  citation?: string
}

/**
 * A claim produced by a finite search. Principle §2.6: the UI never says a
 * language "is regular" on the strength of a bounded search — it says
 * "no counterexample up to length 12", and this is how it knows to.
 */
export interface BoundedClaim {
  searchedUpTo: number
  unit: 'inputLength' | 'derivationDepth' | 'steps'
}

/**
 * The verdict a trace reached. New variants are added as phases land; these are
 * the ones P0.1 can produce plus the shapes the P0.3 conversions will need.
 */
export type TraceResult =
  | { type: 'acceptance'; accepted: boolean; note?: string }
  /**
   * The run was stopped by a §9 guard before it reached a verdict. Distinct from
   * `acceptance` with `accepted: false` on purpose: "we did not find acceptance
   * within the cap" is not "this string is rejected", and §2.6 forbids
   * presenting the first as the second. Also what a PDA or TM that does not halt
   * within its step cap returns.
   */
  | { type: 'incomplete'; reason: string; bounded: BoundedClaim }
  | { type: 'machine'; machine: FiniteAutomaton | PDA | TuringMachine }
  | { type: 'grammar'; grammar: CFG }
  | { type: 'regex'; regex: RegexNode }
  | { type: 'verdict'; holds: boolean; bounded?: BoundedClaim; witness?: unknown }
  | { type: 'value'; value: unknown }

export interface TraceMeta {
  stepCount: number
  /** transitionsTaken, statesCreated, tapeMoves, ... */
  counters: Record<string, number>
  /** Set whenever a §9 size guard fired. A silent cap is a defect. */
  truncated?: { reason: string; cap: number }
}

export interface Trace<TStep extends Step = Step> {
  kind: TraceKind
  engineVersion: string
  /** The machine / grammar / string this trace came from. */
  input: unknown
  steps: TStep[]
  result: TraceResult
  meta: TraceMeta
}
