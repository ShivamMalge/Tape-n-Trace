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
  pdaTransitionId,
  productStateName,
  tmTransitionId,
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

export type { ClosureSnapshot, Homomorphism } from './fa/closure.js'
export {
  applyClosure,
  complement,
  difference,
  homomorphism,
  intersection,
  inverseHomomorphism,
  reverse as reverseFA,
  union as unionFA,
} from './fa/closure.js'

export type { KeywordMachines, Match, SearchResult } from './fa/textSearch.js'
export { keywordDFA, keywordMachines, keywordNFA, searchText } from './fa/textSearch.js'

export type { AppliedCase, AppliedSource, BloomLevel } from './fa/applied.js'
export { APPLIED, appliedCase } from './fa/applied.js'

export type { LanguageGrade } from './grade/languageEquivalence.js'
export { areEquivalentDetailed, gradeLanguage } from './grade/languageEquivalence.js'

export type { TraceMatch } from './grade/traceMatch.js'
export { compareTraces } from './grade/traceMatch.js'

export type { SampleGrade } from './grade/sample.js'
export { SAMPLE_CAVEAT, sampleCompare } from './grade/sample.js'

export type { Difficulty, PumpingLanguage } from './pumping/oracles.js'
export { PUMPING_LANGUAGES, pumpingLanguage } from './pumping/oracles.js'

export type { AdversaryChoice, Decomposition, EngineAttack, ScoredSplit } from './pumping/regular.js'
export {
  PUMP_I_BOUND,
  adversarySplit,
  allSplits,
  checkPump,
  defenderSplit,
  engineAttackIndex,
  engineAttackWord,
  failingIndices,
  pumped,
  truePumpingLength,
} from './pumping/regular.js'

export type { CflAdversaryChoice, CflDecomposition } from './pumping/cfl.js'
export { allCflSplits, cflAdversarySplit, cflCheckPump, cflPumped } from './pumping/cfl.js'

export type { GameMode, GamePhase, GameVariant, Move, PumpingSession } from './pumping/session.js'
export { advance, proofParagraph, sessionTrace, startSession } from './pumping/session.js'

export type { ParseGrammarOptions } from './cfg/parse.js'
export { EPSILON_TOKENS, grammarToText, parseGrammar, productionToText, tokenise } from './cfg/parse.js'

export type { CfgTreeNode, TreeBuilder } from './cfg/parseTree.js'
export { applyToTree, startTree, treeYield, variablePositions } from './cfg/parseTree.js'

export type { DerivationMode, DerivationStep, DeriveSnapshot, SearchBounds } from './cfg/derive.js'
export { deriveString, findDerivation, generatedStrings, minYields } from './cfg/derive.js'

export type { AmbiguityResult, AmbiguityWitness, NoWitness } from './cfg/ambiguity.js'
export { detectAmbiguity, leftmostDerivationsOf, replay } from './cfg/ambiguity.js'

export type { LeftRecursionSnapshot } from './cfg/leftRecursion.js'
export { eliminateLeftRecursion, isLeftRecursive, primedName } from './cfg/leftRecursion.js'

export type { PdaBranchNode, PdaSnapshot, SimulatePdaOptions } from './pda/simulate.js'
export { acceptsPDA, idLog, idToText, simulatePDA, stackToText, validatePDA } from './pda/simulate.js'

export type { PdaPreset } from './pda/gallery.js'
export { PDA_PRESETS, pdaPreset } from './pda/gallery.js'

export type { PdaAcceptanceSnapshot, PdaAcceptanceTrace } from './pda/acceptance.js'
export { emptyStackToFinalState, finalStateToEmptyStack } from './pda/acceptance.js'

export type { CfgToPdaSnapshot, CfgToPdaTrace } from './pda/fromCFG.js'
export { cfgToPDA } from './pda/fromCFG.js'

export type { DeterminismReport, DeterminismViolation } from './pda/determinism.js'
export { checkDeterminism } from './pda/determinism.js'

export type { UselessSnapshot, UselessTrace } from './cfg/useless.js'
export { eliminateUseless, generatingSymbols, reachableSymbols, wrongOrderUseless } from './cfg/useless.js'

export type { EpsilonProdSnapshot, EpsilonProdTrace } from './cfg/epsilonProd.js'
export { eliminateEpsilon, expandNullable, nullableSymbols } from './cfg/epsilonProd.js'

export type { UnitSnapshot, UnitTrace } from './cfg/unitProd.js'
export { eliminateUnit, isUnitProduction, unitPairs } from './cfg/unitProd.js'

export type { CnfSnapshot, CnfTrace } from './cfg/cnf.js'
export { cnfPreconditions, isCNF, toCNF } from './cfg/cnf.js'

export type { GrammarOpSnapshot, GrammarOpTrace, PdaOpSnapshot, PdaOpTrace, Substitution } from './cfg/closure.js'
export {
  CFL_INTERSECTION_DEMO,
  cflConcat,
  cflHomomorphism,
  cflReversal,
  cflStar,
  cflSubstitution,
  cflInverseHomomorphism,
  cflIntersectRegular,
  cflUnion,
  renameApart,
} from './cfg/closure.js'

export type { SimulateTmOptions, Tape, TmBranchNode, TmConfig, TmSnapshot, TmTrace } from './tm/simulate.js'
export {
  finalConfig,
  idText as tmIdText,
  initialConfig,
  isDeterministicTM,
  movesMade,
  nonblankSpan,
  readCell,
  simulateTM,
  stateText,
  tapeContents,
  tapeIdText,
  tmIdLog,
  validateTM,
  writeCell,
} from './tm/simulate.js'

export type { Technique, TmExpectation, TmPreset } from './tm/gallery.js'
export { TM_PRESETS, tmPreset } from './tm/gallery.js'

export type { ReductionSnapshot, ReductionTrace } from './tm/multitape.js'
export {
  encodeInput,
  encodedStart,
  multitapeToSingle,
  phaseOf,
  simulateReduction,
  splitTracks,
  trackRows,
} from './tm/multitape.js'
