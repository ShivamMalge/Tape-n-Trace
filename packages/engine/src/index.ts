/**
 * `@tape-n-trace/engine` — the public surface.
 *
 * Pure TypeScript: no React, no Next, no DOM, no timers, no clock, no RNG.
 * Every algorithm returns a trace, not just an answer (architecture.md §2).
 */

export type {
  BoundedClaim,
  CFG,
  ClosureOp,
  ClosureTraceKind,
  FATransition,
  FiniteAutomaton,
  Highlight,
  PDA,
  PDATransition,
  Point,
  Production,
  Read,
  RegexNode,
  StateId,
  Step,
  Sym,
  Trace,
  TraceKind,
  TraceMeta,
  TraceResult,
  TransitionId,
  TMTransition,
  TuringMachine,
} from './types.js'
export { isEpsilon } from './types.js'

export type { Result, ValidationError } from './result.js'
export { allOf, EngineInvariantError, err, isErr, isOk, mapResult, ok, unwrap, validationError } from './result.js'

export {
  canonicalRenaming,
  compareStateIds,
  faTransitionId,
  freshStateId,
  parseSubsetStateName,
  productStateName,
  sortStateIds,
  subsetStateName,
} from './ids.js'

export { completeDFA, isComplete, validateFA } from './validate.js'

export type { SerialiseOptions, StepInput } from './trace.js'
export { deepFreeze, deserialise, ENGINE_VERSION, LIMITS, serialise, TraceBuilder } from './trace.js'

export type {
  BranchNode,
  DFASnapshot,
  ENFASnapshot,
  NFASnapshot,
  RunStatus,
  SimulationTrace,
} from './fa/simulate.js'
export { epsilonClosure, simulate, simulateDFA, simulateENFA, simulateNFA } from './fa/simulate.js'

export type { GalleryEntry } from './fa/gallery.js'
export {
  GALLERY,
  dfaContains01,
  divisibleBy,
  enfaZerosThenOnes,
  galleryEntry,
  nfaEndsIn01,
  nfaEvenZerosOrEndsIn1,
} from './fa/gallery.js'

export type { Enumeration, EnumerationOptions } from './strings.js'
export {
  allStringsUpTo,
  alphabetPower,
  concat,
  countUpTo,
  displayWord,
  enumerateUpTo,
  reverse,
} from './strings.js'

export type { AddStateOptions } from './fa/edit.js'
export {
  addState,
  addTransition,
  applyLayout,
  emptyMachine,
  moveState,
  nextStateName,
  removeState,
  removeTransition,
  renameState,
  setAlphabet,
  setEdgeLabels,
  setKind,
  setStart,
  toggleAccepting,
} from './fa/edit.js'

export type { EquivalenceSnapshot, PairNode } from './fa/equivalence.js'
export { areEquivalent, equivalence, separatingWord } from './fa/equivalence.js'

export type { SubsetRow, SubsetSnapshot } from './fa/subset.js'
export { nfaToDfa } from './fa/subset.js'

export type { EpsilonSnapshot } from './fa/epsilon.js'
export { epsilonElim } from './fa/epsilon.js'

export type { MinimizeSnapshot } from './fa/minimize.js'
export { minimize, pairKey } from './fa/minimize.js'

export { EMPTY_LITERAL, EPSILON_LITERAL, parseRegex, regexSize, regexToString } from './regex/parse.js'

export type { RegexTreeNode, ThompsonSnapshot } from './regex/thompson.js'
export { regexToENFA } from './regex/thompson.js'

export type { LabelledEdge, StateElimSnapshot } from './regex/stateElim.js'
export { concat as concatRegex, dfaToRegex, star as starRegex, union as unionRegex } from './regex/stateElim.js'

export type { GrammarSnapshot } from './fa/regularGrammar.js'
export { checkRightLinear, grammarToNFA, nfaToGrammar } from './fa/regularGrammar.js'
