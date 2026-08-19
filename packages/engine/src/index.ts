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
