/**
 * The engine's error channel — architecture.md §4.
 *
 * Invalid *user* input returns `Result<T>` carrying **every** problem found, so
 * the editor can show all of them on a half-drawn automaton rather than the
 * first. Exceptions are reserved for programmer error — a violated internal
 * invariant — and never for anything a student can type or draw.
 */

export interface ValidationError {
  /** Machine-readable, e.g. "DFA_NONDETERMINISTIC", "START_NOT_IN_STATES". */
  code: string
  /** Exam-language prose, shown to the student verbatim. */
  message: string
  /** What the editor should point at. */
  subject: { kind: 'state' | 'transition' | 'production' | 'machine'; id?: string }
}

export type Result<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T = never>(errors: ValidationError[]): Result<T> {
  return { ok: false, errors }
}

export function isOk<T>(r: Result<T>): r is { ok: true; value: T } {
  return r.ok
}

export function isErr<T>(r: Result<T>): r is { ok: false; errors: ValidationError[] } {
  return !r.ok
}

/**
 * Thrown only when the engine breaks its own contract. If a student can trigger
 * this by drawing something odd, it is a bug in `validate`, not a bug in the
 * student's machine.
 */
export class EngineInvariantError extends Error {
  override readonly name = 'EngineInvariantError'

  constructor(message: string) {
    super(message)
  }
}

/**
 * Unwrap a result, throwing on failure. For engine-internal use where the value
 * has already been validated, and for tests. Never call this on unvalidated
 * user input — return the `Result` instead and let the editor render it.
 */
export function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.value
  const summary = r.errors.map((e) => `${e.code}: ${e.message}`).join('; ')
  throw new EngineInvariantError(`unwrap() on a failed Result — ${summary}`)
}

/** Build one error without repeating the object shape at every call site. */
export function validationError(
  code: string,
  message: string,
  subject: ValidationError['subject'],
): ValidationError {
  return { code, message, subject }
}

/** Collect several results, keeping every error rather than stopping at the first. */
export function allOf<T>(results: Result<T>[]): Result<T[]> {
  const errors = results.flatMap((r) => (r.ok ? [] : r.errors))
  if (errors.length > 0) return err(errors)
  return ok(results.map((r) => (r as { ok: true; value: T }).value))
}

/** Map over the success case, leaving errors untouched. */
export function mapResult<T, U>(r: Result<T>, f: (value: T) => U): Result<U> {
  return r.ok ? ok(f(r.value)) : r
}
