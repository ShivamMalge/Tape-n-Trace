/**
 * The committed random seed — architecture.md §11.
 *
 * Randomised tests are seeded so a failure is reproducible: a red CI run can be
 * re-run locally and fail the same way. Changing this value is a deliberate act,
 * not a way to make a failing test go away.
 */

/** Passed to every `fc.assert`. */
export const SEED = 0x7ac3_71ce

/**
 * How many machines a property test generates. phases.md P0.1 asks for 200 for
 * the oracle agreement check.
 */
export const RUNS = 200

/**
 * Generators stay small on purpose (§11): at most 4 states and 2 symbols. State
 * elimination blows regular-expression size up super-exponentially, and an
 * unbounded generator makes CI flaky rather than thorough.
 */
export const MAX_STATES = 4
export const ALPHABET = ['0', '1'] as const

/** Standard `fc.assert` parameters. Spread into a call to override `numRuns`. */
export const fcParams = { seed: SEED, numRuns: RUNS } as const
